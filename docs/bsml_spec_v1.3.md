# BSML (Balance Sheet Modeling Language) Specification v1.3

## 1. Overview

BSML is a domain-specific language (DSL) designed to model and visualize complex financial structures, including multiple corporate entities, capital ties, inter-company transactions, and annotations.

### Target Architecture

* **Parser:** `Chevrotain` or `Peg.js` (TypeScript) to parse BSML text into AST.
* **Rendering Engine:** `React Flow` (xyflow) or `@xyflow/react`.
* **Node Rendering:** Custom React components using HTML/CSS Flexbox for stacked bar charts.
* **Callout/Note Rendering:** Custom SVG/charts for callouts, and simple transparent HTML divs for text notes.

## 2. Syntax Definition

The syntax is HCL/Terraform-inspired. It supports N-level deep hierarchies using an array-based recursive structure.

```text
// Define a Balance Sheet
BalanceSheet "AssetMgmt" {
    config {
        tolerance = 1
        currency = "JPY"
        unit = "百万円"
    }

    // Structural keywords (Assets, Liabilities, Equity) implicitly mount their children to an array.
    Assets {
        // Syntax: alias "optional_label" { ... } OR alias "optional_label" : amount
        // If the string label is omitted (e.g., `cash : 50`), the engine defaults to displaying the alias.
        current "流動資産" {
            cash "現預金" : 50
        }
        non_current "固定資産" {
            investments "投資その他の資産" {
                own_stock "自社株式" : 10000
                loan_to_kids_co "関係会社長期貸付金" : 300
            }
            tangible {  // String label omitted. Alias 'tangible' acts as the label.
                real_estate_A "投資不動産A" {
                    land_A "土地" : 500
                    building_A "建物" : 300
                }
            }
        }
    }
    Liabilities {
        non_current "固定負債" {
            stock_loan : 5000 // String label omitted.
        }
    }
    Equity {
        capital "資本金" : 100
        retained "利益剰余金" : 6050
    }
}

// ---------------------------------------------------------
// Annotations (Text Nodes)
// ---------------------------------------------------------
note "TaxStrategy1" {
    text = "特例税率適用（1.5%）"
}

// ---------------------------------------------------------
// Edges (Relations and Pointers)
// ---------------------------------------------------------
// Syntax: SourceAlias --> TargetAlias : "Optional Label"
// Use --> for solid lines (financial relations) and -.-> for dotted lines (annotations).

AssetMgmt.loan_to_kids_co --> KidsMgmt.borrowing : "貸付"
AssetMgmt.loan_to_kids_co -.-> TaxStrategy1

// ---------------------------------------------------------
// Callouts (Pie charts)
// ---------------------------------------------------------
pie AssetMgmt.own_stock {
    "Voting Shares" : 8000
    "Non-voting Shares" : 2000
}
```

## 3. Abstract Syntax Tree (AST) Types

AntiGravity MUST implement the parser to output the following TypeScript AST.

*CRITICAL RULES:*
1. `Assets`, `Liabilities`, and `Equity` blocks are NOT `CategoryNode`s. They are structural keywords that map directly to the `TreeNode[]` arrays in the AST.
2. `label` properties are optional. If omitted in the DSL, the parser sets them to `undefined`. The rendering engine MUST fallback to `alias` if `label` is not provided.

```typescript
// Define AST node types
export interface BSMLDocument {
    balanceSheets: BalanceSheetNode[];
    notes: NoteNode[];
    edges: EdgeNode[];
    callouts: CalloutNode[];
}

export interface BalanceSheetNode {
    id: string; 
    config: {
        tolerance: number;
        currency: string;
        unit: string;
    };
    assets: TreeNode[];
    liabilities: TreeNode[];
    equity: TreeNode[];
}

export type TreeNode = CategoryNode | ItemNode;

export interface CategoryNode {
    type: 'category';
    alias: string;         // e.g., "current", "tangible"
    label?: string;        // Optional. e.g., "流動資産". Fallback to alias if undefined.
    children: TreeNode[];  // Arrays preserve rendering order
}

export interface ItemNode {
    type: 'item';
    alias: string;         // e.g., "cash", "stock_loan"
    label?: string;        // Optional. e.g., "現預金". Fallback to alias if undefined.
    amount: number;
}

export interface NoteNode {
    id: string; // e.g., "TaxStrategy1"
    text: string;
}

export interface EdgeNode {
    source: {
        nodeId: string; // bsId or noteId
        alias?: string; // Optional: specific item alias within a BS
    };
    target: {
        nodeId: string;
        alias?: string;
    };
    label?: string; // Optional. e.g., "貸付". Extracted from `: "label"` syntax.
    style: 'solid' | 'dotted'; // Derived from '-->' vs '-.->'
}

export interface CalloutNode {
    source: {
        bsId: string;
        alias: string;
    };
    data: Record<string, number>;
}
```

## 4. Rendering & Layout Rules (Critical for AntiGravity)

### 4.1 Global Scaling
To render boxes, the engine MUST calculate a global scale factor: `Pixels per Amount Unit`.
* Determine the maximum total value (Assets or Liabilities+Equity) across all defined Balance Sheets.
* Map this maximum value to a predefined `MAX_NODE_HEIGHT` (e.g., 600px).

### 4.2 Auto-balancing & Tolerance
For each Balance Sheet:
* Calculate Total Assets (`TA`) and Total Liabilities + Equity (`TL_TE`).
* If `abs(TA - TL_TE) > config.tolerance`, the engine MUST render a glowing red "IMBALANCE" flex item on the shorter side.

### 4.3 Node Structure (React Flow)
* **Balance Sheet Nodes:** Rendered using CSS Flexbox (row for LR split, column for hierarchies). Sizes strictly calculated via the global scale factor.
* **Array-based Rendering:** Iterate over `TreeNode[]`. Use a switch/if block on `node.type` to render a nested flex container (`category`) or a leaf block (`item`). If `label` is undefined, display `alias`.
* **Note Nodes:** A simple `div` with text wrapping, typically styled with a transparent or paper-like background.
* Assign unique HTML `id` attributes (e.g., `id="bs-AssetMgmt-cash"`) to every `TreeNode` so React Flow Handles can connect precisely.

### 4.4 Edges & Labels
* React Flow `<Handle>` components MUST be dynamically injected into the respective DOM elements.
* **Labels:** If `EdgeNode.label` exists, it MUST be passed to React Flow's `label` property to render text along the path.
* **Styles:** If `EdgeNode.style === 'dotted'`, apply `stroke-dasharray` to the SVG path of the edge.

### 4.5 Styling & CSS Variables
The rendering engine MUST use CSS variables to allow external theming.
* `--bsml-asset-bg` / `--bsml-liability-bg` / `--bsml-equity-bg`
* `--bsml-note-bg`: Base background color for text notes.
* Apply CSS `calc()` or alpha layers to represent N-level nesting depth visually.