# BSML Renderer — Agent Knowledge Base

## Project Overview

KISS! DRY! YAGNI!

EDIT THIS FILE AFTER YOU EDITED SOMETHING IN THIS PROJECT

This is a TypeScript toolkit to **parse** and **render** BSML (Balance Sheet Modeling Language) — an HCL-inspired DSL for visualizing corporate balance sheets, capital ties, and financial annotations.

## Directory Structure

```
bsml-renderer/
├── .github/
│   ├── workflows/
│   │   └── ci.yml             # GitHub Actions: bun test + bun run build on push/PR
│   └── assets/
│       └── screenshot-ja.png  # README screenshot
├── src/
│   ├── index.ts              # Barrel export: parseBSML, transform + all types
│   ├── constants/
│   │   ├── layout.ts          # Shared dimensions for transformer + layout + annotation nodes
│   │   └── labels.ts          # Lang dictionary + fallback/validation helpers
│   ├── ast/
│   │   └── types.ts           # AST interfaces (BSMLDocument, TreeNode, etc.)
│   ├── parser/
│   │   ├── index.ts           # Public API: parseBSML(input) → BSMLDocument
│   │   ├── lexer.ts           # Chevrotain token definitions
│   │   ├── parser.ts          # CST grammar rules
│   │   └── visitor.ts         # CST → AST visitor
│   ├── transformer/
│   │   ├── index.ts           # Barrel export: transform + types
│   │   ├── transformer.ts     # Pure fn: BSMLDocument → React Flow nodes+edges
│   │   └── types.ts           # BSMLReactFlowData, BalanceSheetNodeData, etc.
│   └── react/                 # React Flow custom node components
│       ├── components/
│       │   ├── BalanceSheetNode.tsx  # Custom React Flow node (spec v1.0)
│       │   ├── BSMLCanvas.tsx       # Main React Flow canvas with auto-layout
│       │   ├── NoteNode.tsx         # Note annotation node with external invisible handles
│       │   └── CalloutNode.tsx      # Pie-callout annotation node with external invisible handles
│       ├── edges/
│       ├── hooks/
│       │   └── useAutoLayout.ts     # Dagre auto-layout (applyAutoLayout)
│       └── styles/
│           └── bsml.css             # CSS custom properties
├── bunfig.toml                # Bun test config (happy-dom preload)
├── tests/
│   ├── fixtures/
│   │   └── fixtures.ts        # 4 input+expected-AST pairs
│   ├── parser/
│   │   └── parser.test.ts     # Bun test: deep-equals against fixtures
│   ├── integration/
│   │   └── pipeline.test.ts   # End-to-end pipeline test (parseBSML→transform→layout)
│   ├── transformer/
│   │   └── transformer.test.ts # Bun test: transform output against expected data
│   └── react/
│       ├── happydom.ts         # Preload: registers happy-dom globals
│       ├── BalanceSheetNode.test.tsx  # 10 component tests (TDD, no snapshots)
│       ├── BSMLCanvas.test.tsx        # Canvas wiring tests (ReactFlow props)
│       ├── NoteNode.test.tsx          # Note node rendering tests
│       ├── CalloutNode.test.tsx       # Callout pie/legend rendering tests
│       └── useAutoLayout.test.ts     # 10 layout tests (T1–T10, including annotation-side placement)
├── demo/                      # Interactive BSML playground (Vite + Monaco + React Flow)
│   ├── package.json           # Demo-specific dependencies
│   ├── vite.config.ts         # Vite config with bsml-renderer alias
│   ├── tsconfig.json          # TypeScript config for demo
│   ├── index.html             # HTML shell
│   └── src/
│       ├── main.tsx           # React 19 entry point
│       ├── App.tsx            # Resizable split-pane: Monaco editor ↔ BSMLCanvas
│       ├── App.css            # Resizable layout, divider, error banner styles
│       └── defaultCode.ts     # Pre-filled BSML example
├── docs/                      # Documentation and Specifications
│   └── bsml_spec_v1.3.md      # Language spec
├── orders/                    # [DO NOT REFER DIRECTLY] Inbox for tasks between human ↔ agents (details omitted)
├── tmp/                       # Temporary scripts and sandbox testing
├── LICENSE
├── package.json
├── tsup.config.ts             # tsup build config (ESM + CJS dual output)
└── tsconfig.json
```


## Key Design Decisions

| Decision | Rationale |
|---|---|
| **Chevrotain** over Peg.js | Better perf, built-in error recovery, clean CST/Visitor separation |
| **Label omission** = property absent | Fixtures expect `label` key to be missing (not `undefined`) when DSL omits label |
| `Assets`/`Liabilities`/`Equity` are structural keywords | They map directly to `TreeNode[]` arrays, NOT to `CategoryNode`s |
| **`calculatedHeight` vs `totalHeight`** | `totalHeight` = bar-area px (used by React component); `calculatedHeight` = full node px including header (used by Dagre) |
| **Layout constants are centralized** | `src/constants/layout.ts` is the single source of truth for widths/heights used by transformer and annotation nodes |
| **Minimum row height is enforced** | `MIN_ROW_HEIGHT` keeps tiny financial rows readable and is applied in both renderer and transformer sizing |
| **Edge routing defaults to smoothstep** | All edges are emitted as `type: 'smoothstep'` for clearer paths |
| **Alias-less B/S edges use root handles** | Inter-company edges like `Company --> Subsidiary` attach to `handle-<BSId>-root-out` / `handle-<BSId>-root-in` to avoid “random row” attachments |
| **Per-row handles respect accounting columns** | Asset item handles are on the left edge; Liability/Equity item handles are on the right edge |
| **All item handles are stealth handles** | Item row `target`/`source` handles use `.bsml-invisible-handle` + absolute positioning so no default dots affect UI or flex layout |
| **Block subtotals are rendered inside bars** | Each sheet renders 4 subtotal rows (`assetsTotal`, `liabilitiesTotal`, `equityTotal`, `liabilitiesEquityTotal`) inside the columns; no outer footer totals are rendered |
| **Subtotal rows are part of layout math** | Transformer includes subtotal row heights in both `totalHeight` and `calculatedHeight` (`+1*MIN_ROW_HEIGHT` on assets, `+3*MIN_ROW_HEIGHT` on liabilities/equity side) |
| **Annotation targets route by source accounting side** | Edges to Note/Callout choose `target-left`/`target-right` from source side (`assets` → right, otherwise left) to avoid wraparound connectors |
| **BSML annotation auto-layout is side-aware** | `applyAutoLayout` uses BSML-only preprocessing (when `balanceSheet` nodes include `data.ast`) to rank annotation nodes left for assets-origin links and right otherwise, without changing actual React Flow edge semantics |
| **Localization is `config.lang`-driven** | Supported `lang`: `"default"` and `"ja"`; unknown values fallback to `"default"` and transformer injects a full label set to avoid mixed locales |
| **Demo locale selector overrides AST lang at render-time** | Demo UI exposes `default/ja` switcher; it clones parsed AST and forces `config.lang` for every balance sheet before `transform()`, leaving editor text untouched |
| **Canvas drag is stateful** | `BSMLCanvas` uses `useNodesState`/`useEdgesState` and wires `onNodesChange`/`onEdgesChange`, so manual drag/edge edits persist after initial Dagre layout |
| **Leaf rows must not flex-shrink** | `BalanceSheetNode` row/category/padding blocks set `flexShrink: 0` to prevent Flexbox from compressing clamped `MIN_ROW_HEIGHT` rows |
| **Keyword lexing uses word boundaries** | Prevents collisions where identifiers like `piechart` could be split/misread as keyword tokens |
| **Pie source alias is mandatory** | `pie` syntax is strictly `pie <BSId>.<alias> { ... }` to guarantee stable per-item handle IDs |
| **Demo panes are user-resizable** | The demo split view uses a draggable divider with clamped editor width (20%–80%), with stacked fallback on narrow screens |

## Public API

```typescript
import { parseBSML, transform } from './src/index.js';

const ast = parseBSML(`
  BalanceSheet "MyCompany" {
    config { tolerance = 1  currency = "JPY"  unit = "百万円" }
    Assets { cash "現金" : 100 }
    Liabilities {}
    Equity { capital "資本金" : 100 }
  }
`);
// ast: BSMLDocument

const { nodes, edges } = transform(ast);
// nodes: Node[]  (React Flow compatible)
// edges: Edge[]  (React Flow compatible)
```

## Tech Stack

- **Language:** TypeScript (ES2020, strict, JSX: react-jsx)
- **Parser:** [Chevrotain](https://chevrotain.io/) v11 (tokenizer + CST parser + visitor)
- **Transformer:** Pure function layer — AST → React Flow nodes + edges (spec v1.1)
- **Build:** [tsup](https://tsup.egoist.dev/) (esbuild-based, ESM + CJS dual output)
- **Tests:** [Bun test runner](https://bun.sh/docs/cli/test) + [@testing-library/react](https://testing-library.com/docs/react-testing-library/intro/) + happy-dom
- **CI:** GitHub Actions (`.github/workflows/ci.yml`) — runs on every push/PR to `main`
- **Renderer:** `<BalanceSheetNode />` custom React Flow node (spec v1.0)
- **Demo App:** Vite + `@monaco-editor/react` resizable split-pane playground (`demo/`)

## Agent Core Directives

1. **Continuous Updates:** The Agent MUST continuously update this `AGENTS.md` file as the project evolves, ensuring it acts as the accurate single source of truth for the codebase.
2. **KISS / DRY / YAGNI:** The Agent pledges absolute allegiance to KISS (Keep It Simple, Stupid), DRY (Don't Repeat Yourself), and YAGNI (You Aren't Gonna Need It). The Agent will prioritize simplicity, strictly avoid over-engineering, and never build speculative features.
3. **No `orders/` Access:** The `orders/` directory is strictly a temporary mailbox for task instructions. The project should NOT reference files inside `orders/` for development or runtime behavior. Permanent specifications must be copied to `docs/`.
4. **Completion Reports:** After completing an order, the Agent MUST write a `report.md` inside the order directory (e.g., `orders/0002-transformer/report.md`) summarizing what was built, files created/modified, test results, and notes for next steps. See existing reports for format reference.
5. **Temporary Scripts:** Any temporary utility scripts, sandbox codes, or ad-hoc test files MUST be placed either inside the `tmp/` directory or within the specific project directory inside `orders/` (e.g., `orders/0002-feature/`). They should never clutter the main source code directories.

## Spec Reference

- Language spec: `docs/bsml_spec_v1.3.md`
- Transformer spec: `docs/transformer_spec_v1.1.md`
- BalanceSheetNode React component spec: `docs/balance-sheet-node-spec-v1.0.md`
