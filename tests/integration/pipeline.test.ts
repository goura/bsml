// Full Pipeline Integration Test — Order 0007
// parseBSML → transform → applyAutoLayout end-to-end with scale disparity
//
// bun test tests/integration/pipeline.test.ts

import { expect, test, describe } from 'bun:test';
import { parseBSML } from '../../src/parser/index.js';
import { transform } from '../../src/transformer/transformer.js';
import { applyAutoLayout } from '../../src/react/hooks/useAutoLayout.js';
import type { Node } from '@xyflow/react';

// ── BSML Payload ──────────────────────────────────────────────────────────────

const BSML_INPUT = `
BalanceSheet "MegaHoldings" {
  config {
    tolerance = 10
    currency = "USD"
    unit = "Millions"
  }
  Assets {
    non_current {
      core_ip "Core Intellectual Property" : 10000
      loan_to_alpha "Loan to Alpha" : 1000
      loan_to_beta "Loan to Beta" : 500
    }
  }
  Liabilities {
    non_current {
      bank_loan "Syndicated Loan" : 3000
    }
  }
  Equity { retained_earnings "Retained Earnings" : 8500 }
}

BalanceSheet "AlphaVentures" {
  config {
    tolerance = 5
    currency = "USD"
    unit = "Millions"
  }
  Assets {
    non_current {
      facilities "R&D Facilities" : 300
      investments "Startup Equity" : 800
    }
  }
  Liabilities {
    non_current {
      borrowed_from_parent "Intercompany Loan" : 1000
    }
  }
  Equity { capital "Capital" : 100 }
}

BalanceSheet "BetaLogistics" {
  config {
    tolerance = 5
    currency = "USD"
    unit = "Millions"
  }
  Assets {
    non_current {
      fleet "Vehicle Fleet" : 600
    }
  }
  Liabilities {
    non_current {
      borrowed_from_parent "Intercompany Loan" : 500
    }
  }
  Equity { capital "Capital" : 100 }
}

note "AlphaMemo" { text = "High-risk R&D operations" }
note "BetaMemo" { text = "Asset-heavy logistics branch" }

MegaHoldings.loan_to_alpha --> AlphaVentures.borrowed_from_parent
MegaHoldings.loan_to_beta --> BetaLogistics.borrowed_from_parent
AlphaVentures.facilities -.-> AlphaMemo
BetaLogistics.fleet -.-> BetaMemo
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
}

/** Extract axis-aligned bounding box from a laid-out node. */
function nodeToRect(node: Node): Rect {
    const data = node.data as Record<string, unknown>;
    return {
        x: node.position.x,
        y: node.position.y,
        w: (data.calculatedWidth as number) ?? 300,
        h: (data.calculatedHeight as number) ?? 600,
    };
}

/** True if two rectangles overlap (sharing only an edge does NOT count). */
function rectsOverlap(a: Rect, b: Rect): boolean {
    return (
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y
    );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Full Pipeline Integration', () => {
    // Run the pipeline once; share results across tests.
    const ast = parseBSML(BSML_INPUT);
    const { nodes: rawNodes, edges } = transform(ast);
    const laidOut = applyAutoLayout(rawNodes, edges);

    // T1: parseBSML succeeds
    test('T1: parseBSML succeeds without lexical/parsing errors', () => {
        // parseBSML would throw BSMLParseError on any issue; if we reach
        // here the parse has already succeeded, but let's assert the shape.
        expect(ast.balanceSheets).toHaveLength(3);
        expect(ast.notes).toHaveLength(2);
        expect(ast.edges).toHaveLength(4);
    });

    // T2: transform produces the expected counts
    test('T2: transform generates expected node and edge counts', () => {
        const bsNodes = rawNodes.filter((n) => n.type === 'balanceSheet');
        const noteNodes = rawNodes.filter((n) => n.type === 'note');
        expect(bsNodes).toHaveLength(3);
        expect(noteNodes).toHaveLength(2);
        // Total nodes ≥ 5 (may include imbalance placeholders)
        expect(rawNodes.length).toBeGreaterThanOrEqual(5);
        // 4 explicit edges (2 solid + 2 dotted)
        expect(edges).toHaveLength(4);
    });

    // T3: applyAutoLayout assigns valid positions
    test('T3: all nodes have finite x and y positions after layout', () => {
        expect(laidOut.length).toBe(rawNodes.length);
        for (const node of laidOut) {
            expect(Number.isFinite(node.position.x)).toBe(true);
            expect(Number.isFinite(node.position.y)).toBe(true);
        }
    });

    // T4: scale disparity — MegaHoldings is much taller than AlphaVentures
    test('T4: MegaHoldings calculatedHeight is massively larger than AlphaVentures', () => {
        const mega = rawNodes.find((n) => n.id === 'MegaHoldings')!;
        const alpha = rawNodes.find((n) => n.id === 'AlphaVentures')!;

        const megaH = (mega.data as Record<string, unknown>).calculatedHeight as number;
        const alphaH = (alpha.data as Record<string, unknown>).calculatedHeight as number;

        expect(megaH).toBeGreaterThan(0);
        expect(alphaH).toBeGreaterThan(0);
        // With MIN_ROW_HEIGHT clamping, smaller sheets get extra height floor.
        // Mega should still be much taller despite the floor inflation.
        expect(megaH / alphaH).toBeGreaterThan(3.5);
    });

    // T5: no bounding-box overlap between any pair of nodes
    test('T5: laid-out node bounding boxes do not overlap', () => {
        for (let i = 0; i < laidOut.length; i++) {
            for (let j = i + 1; j < laidOut.length; j++) {
                const a = nodeToRect(laidOut[i]);
                const b = nodeToRect(laidOut[j]);
                const overlap = rectsOverlap(a, b);
                if (overlap) {
                    throw new Error(
                        `Overlap detected between "${laidOut[i].id}" ` +
                        `(x=${a.x.toFixed(0)}, y=${a.y.toFixed(0)}, w=${a.w}, h=${a.h}) ` +
                        `and "${laidOut[j].id}" ` +
                        `(x=${b.x.toFixed(0)}, y=${b.y.toFixed(0)}, w=${b.w}, h=${b.h})`
                    );
                }
                expect(overlap).toBe(false);
            }
        }
    });
});
