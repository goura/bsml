# BSML Renderer — Agent Knowledge Base

## Project Overview

A TypeScript toolkit to **parse** and **render** BSML (Balance Sheet Modeling Language) — an HCL-inspired DSL for visualizing corporate balance sheets, capital ties, and financial annotations.

## Directory Structure

```
bsml-renderer/
├── src/
│   ├── index.ts              # Barrel export: parseBSML + all AST types
│   ├── ast/
│   │   └── types.ts           # AST interfaces (BSMLDocument, TreeNode, etc.)
│   ├── parser/
│   │   ├── index.ts           # Public API: parseBSML(input) → BSMLDocument
│   │   ├── lexer.ts           # Chevrotain token definitions
│   │   ├── parser.ts          # CST grammar rules
│   │   └── visitor.ts         # CST → AST visitor
│   └── react/                 # (empty — future renderer)
│       ├── components/
│       ├── edges/
│       ├── hooks/
│       └── styles/
├── tests/
│   ├── fixtures/
│   │   └── fixtures.ts        # 3 input+expected-AST pairs
│   └── parser/
│       └── parser.test.ts     # Vitest: deep-equals against fixtures
├── demo/                      # (empty — future demo app)
├── docs/                      # Documentation and Specifications
│   └── bsml_spec_v1.3.md      # Language spec
├── orders/                    # [DO NOT REFER DIRECTLY] Inbox for tasks between human ↔ agents (details omitted)
├── tmp/                       # Temporary scripts and sandbox testing
├── package.json
└── tsconfig.json
```


## Key Design Decisions

| Decision | Rationale |
|---|---|
| **Chevrotain** over Peg.js | Better perf, built-in error recovery, clean CST/Visitor separation |
| **Label omission** = property absent | Fixtures expect `label` key to be missing (not `undefined`) when DSL omits label |
| `Assets`/`Liabilities`/`Equity` are structural keywords | They map directly to `TreeNode[]` arrays, NOT to `CategoryNode`s |

## Public API

```typescript
import { parseBSML } from './src/index.js';

const ast = parseBSML(`
  BalanceSheet "MyCompany" {
    config { tolerance = 1  currency = "JPY"  unit = "百万円" }
    Assets { cash "現金" : 100 }
    Liabilities {}
    Equity { capital "資本金" : 100 }
  }
`);
// ast: BSMLDocument
```

## Tech Stack

- **Language:** TypeScript (ES2020, strict)
- **Parser:** [Chevrotain](https://chevrotain.io/) v11 (tokenizer + CST parser + visitor)
- **Tests:** [Vitest](https://vitest.dev/) v3
- **Renderer:** React Flow / @xyflow/react (planned, not yet implemented)

## Agent Core Directives

1. **Continuous Updates:** The Agent MUST continuously update this `AGENTS.md` file as the project evolves, ensuring it acts as the accurate single source of truth for the codebase.
2. **KISS / DRY / YAGNI:** The Agent pledges absolute allegiance to KISS (Keep It Simple, Stupid), DRY (Don't Repeat Yourself), and YAGNI (You Aren't Gonna Need It). The Agent will prioritize simplicity, strictly avoid over-engineering, and never build speculative features.
3. **No `orders/` Access:** The `orders/` directory is strictly a temporary mailbox for task instructions. The Agent MUST NOT read from, reference, or depend on files inside `orders/` for ongoing development or runtime behavior. Permanent specifications must be copied to `docs/`.
4. **Temporary Scripts:** Any temporary utility scripts, sandbox codes, or ad-hoc test files MUST be placed either inside the `tmp/` directory or within the specific project directory inside `orders/` (e.g., `orders/0002-feature/`). They should never clutter the main source code directories.

## Spec Reference

Full spec: `docs/bsml_spec_v1.3.md`
