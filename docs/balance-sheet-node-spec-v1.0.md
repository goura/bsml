# BSML React Custom Node Specification v1.0

## 1. Overview
This document specifies the implementation of the React Flow custom node component: `<BalanceSheetNode />`.
The goal is to render a strict, proportionally scaled "Japanese-style Balance Sheet (B/S) Box".

### The Visual Mental Model (Japanese B/S abstraction)
A Balance Sheet must be rendered as a single, solid rectangular block divided into two vertical columns of equal total height:
- **Left Column:** Assets (`assets` array).
- **Right Column:** Liabilities (`liabilities` array) stacked directly on top of Equity (`equity` array).

To make it "feel like" a Balance Sheet, the visual abstraction MUST include standard section headers (e.g., "Assets" or "資産の部", "Liabilities" or "負債の部", "Equity" or "純資産の部") and matching total footers (e.g., "Total Assets" or "資産の部合計", "Total Liabilities & Equity" or "負債及び純資産合計"), without compromising the proportional heights. The labels should be configurable.

## 2. Component Props
The component will receive `NodeProps<BalanceSheetNodeData>` from `@xyflow/react`.
The `data` object contains:
- `ast`: The original AST node (containing `assets`, `liabilities`, `equity` arrays).
- `scaleFactor`: Multiplier to convert `amount` to pixels (px).
- `padding`: Optional object for auto-balancing (imbalance or rounding).
- `labels`: Optional object to override default English labels (e.g. `{ assets: "資産の部", totalAssets: "資産の部合計", ... }`).

## 3. Strict CSS & Layout Rules (CRITICAL)
To maintain pixel-perfect mathematical proportions, the AI MUST adhere to these CSS rules. **Failure to do so will break the Balance Sheet visualization.**

1. **Box Sizing:** Every single `div` MUST use `box-sizing: border-box`.
2. **No Layout-Altering Spacing:** Do NOT use `margin`, `padding`, or `gap` between stacked items. Items must touch exactly. Borders are allowed but must be inside the calculated height (hence `border-box`).
3. **Absolute Heights:** The height of any leaf `ItemNode` MUST be explicitly set via inline styles: `style={{ height: `${node.amount * data.scaleFactor}px` }}`.
4. **Category Labels MUST Float:** A `CategoryNode` acts purely as a grouping container. If a category has a `label`, the text MUST be rendered using `position: absolute` (with opacity/watermark styling) inside the category container so it **does not consume any layout height**. The container itself adjusts its height based solely on its children.

## 4. Traditional Structure & Layout Rules (Headers/Footers)

1. **Section Headers:** The component MUST display section labels at the top of the relevant sections: "Assets" (資産の部) for the Left Column, "Liabilities" (負債の部) for the Liabilities sub-section. The exact text should be configurable via props (e.g., `data.labels.assets`), defaulting to English.
2. **Equity Header:** The Equity (純資産の部) header MUST be rendered as a **real fixed-height row** (`BS_HEADER_HEIGHT` px) between the Liabilities sub-section and the Equity items, **not** as an absolute-positioned overlay. It should be visually identical to the Assets and Liabilities headers (same font size, weight, alignment, and border separators). A strong `borderTop` is applied at the Liabilities → Equity transition.
3. **Total Footers:** The component MUST display a total row at the bottom of the Left Column (e.g., "Total Assets"), and at the bottom of the Right Column (e.g., "Total Liabilities & Equity"). The exact text should be configurable via props.
4. **Height Balancing Constraint:** The Assets and Liabilities headers at the very top of each column are placed **outside** the mathematical bar area (`barAreaStyle`), so they do not affect proportional item heights. The Equity header row, however, is inside the right-column bar area and its height IS included in the `totalHeight` / `liabEqColumnHeight` calculation.

## 5. Recursive Rendering Strategy

Create a recursive sub-component: `<TreeNodeRenderer nodes={TreeNode[]} scaleFactor={number} />`

**If `node.type === 'item'`:**
- Render a `div` as a Flex container (`display: flex; justify-content: space-between; align-items: center;`).
- Set inline height: `height: node.amount * scaleFactor`.
- Set background color based on CSS variables (e.g., `var(--bsml-asset-bg)`).
- **Typography ("Ledger" Look):**
  - Display `node.label || node.alias` on the left.
  - Display the mathematically formatted amount (e.g., `1,000,000` with commas) aligned to the right. Format using `Intl.NumberFormat` or similar based on `data.ast.config.currency`.
- **Inject Handles:** Render React Flow `<Handle type="source" />` and `<Handle type="target" />`. 
  - Give handles specific IDs: `id={`handle-${rootAstId}-${node.alias}`}`.
  - Position handles cleanly on the left/right edges of the item box.

**If `node.type === 'category'`:**
- Render a `div` as a Flex container: `display: flex; flex-direction: column;`.
- Border styling to show grouping (e.g., `border: 1px solid var(--bsml-border-color)`).
- Display `node.label || node.alias` as an absolute, semi-transparent overlay inside this div.
- Recursively call `<TreeNodeRenderer nodes={node.children} ... />` inside.

## 6. Main Node Structure

The root `<BalanceSheetNode />` should return:

```tsx
<div className="flex flex-row border-2 border-slate-800 bg-white shadow-xl">
  
  {/* LEFT COLUMN: Assets */}
  <div className="flex flex-col w-64 border-r-2 border-slate-800">
    <TreeNodeRenderer nodes={data.ast.assets} scaleFactor={data.scaleFactor} />
    {/* Inject Imbalance Padding here if data.padding.side === 'assets' */}
  </div>

  {/* RIGHT COLUMN: Liabilities & Equity */}
  <div className="flex flex-col w-64">
    <TreeNodeRenderer nodes={data.ast.liabilities} scaleFactor={data.scaleFactor} />
    <TreeNodeRenderer nodes={data.ast.equity} scaleFactor={data.scaleFactor} />
    {/* Inject Imbalance Padding here if data.padding.side === 'liabilities_equity' */}
  </div>

</div>
```

## 7. Handling Imbalance / Padding
If `data.padding` exists:
- Create a `div` with `style={{ height: `${data.padding.amount * data.scaleFactor}px` }}`.
- If `data.padding.type === 'imbalance'`, style it aggressively: e.g., red background, striped pattern, "IMBALANCE" label in bold.
- If `data.padding.type === 'rounding'`, style it neutrally: e.g., transparent or grey hash pattern.
- Append this div to the bottom of the Left or Right column, depending on `data.padding.side`.

## 8. Blank Slack Cells (Diagonal Slash)
When the bar area of one side is taller than the other (i.e., slack height > 0), a blank filler block is rendered on the shorter side **above** the sub-total row.

- Per Japanese accounting convention, blank cells in a Balance Sheet are filled with a **single diagonal slash** from the **top-right corner to the bottom-left corner** of the cell.
- Implementation: render an SVG (`width: 100%; height: 100%; preserveAspectRatio: none`) with `<line x1="100%" y1="0" x2="0" y2="100%" />` absolutely positioned over the filler div.
- The `invisible` prop on `PaddingBlock` triggers this rendering (distinct from the `rounding` or `imbalance` styles).