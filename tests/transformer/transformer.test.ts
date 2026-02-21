import { describe, it, expect } from 'bun:test';
import { transform } from '../../src/transformer/index.js';
import type { BSMLDocument } from '../../src/ast/types.js';
import type { BSMLReactFlowData } from '../../src/transformer/types.js';
import {
    fixture1_ast,
    fixture2_ast,
    fixture3_ast,
    fixture4_ast,
} from '../fixtures/fixtures.js';

// ============================================================================
// Order fixture: comprehensive test from orders/0002-transformer
// ============================================================================
const orderFixtureInput: BSMLDocument = {
    balanceSheets: [
        {
            id: "AssetMgmt",
            config: { tolerance: 50, currency: "JPY", unit: "M" },
            assets: [
                {
                    type: "category", alias: "current", label: "Current", children: [
                        { type: "item", alias: "cash", label: "Cash", amount: 1000 }
                    ]
                }
            ],
            liabilities: [
                { type: "item", alias: "debt", label: "Debt", amount: 800 }
            ],
            equity: []
        }
    ],
    notes: [
        { id: "WarningNote", text: "Debt ratio needs adjustment." }
    ],
    callouts: [
        {
            source: { bsId: "AssetMgmt", alias: "cash" },
            data: { "USD": 600, "JPY": 400 }
        }
    ],
    edges: [
        {
            source: { nodeId: "AssetMgmt", alias: "debt" },
            target: { nodeId: "WarningNote" },
            style: "dotted",
            label: "Check leverage"
        }
    ]
};

const orderFixtureExpected: BSMLReactFlowData = {
    nodes: [
        {
            id: "AssetMgmt",
            type: "balanceSheet",
            position: { x: 0, y: 0 },
            data: {
                ast: orderFixtureInput.balanceSheets[0],
                scaleFactor: 0.6,
                totalHeight: 600,
                padding: {
                    side: "liabilities_equity",
                    type: "imbalance",
                    amount: 200
                }
            }
        },
        {
            id: "WarningNote",
            type: "note",
            position: { x: 0, y: 0 },
            data: {
                ast: orderFixtureInput.notes[0],
                text: "Debt ratio needs adjustment."
            }
        },
        {
            id: "callout-AssetMgmt-cash",
            type: "callout",
            position: { x: 0, y: 0 },
            data: {
                ast: orderFixtureInput.callouts[0],
                sourceAlias: "cash",
                pieData: { "USD": 600, "JPY": 400 }
            }
        }
    ],
    edges: [
        {
            id: "edge-AssetMgmt-debt-to-WarningNote-root-index-0",
            source: "AssetMgmt",
            target: "WarningNote",
            sourceHandle: "handle-AssetMgmt-debt",
            targetHandle: undefined,
            label: "Check leverage",
            animated: true,
            style: { strokeDasharray: "5,5" }
        },
        {
            id: "edge-callout-AssetMgmt-cash-index-0",
            source: "AssetMgmt",
            target: "callout-AssetMgmt-cash",
            sourceHandle: "handle-AssetMgmt-cash",
            animated: false,
            style: { stroke: "#94a3b8" }
        }
    ]
};

// ============================================================================
// Tests
// ============================================================================

describe('BSML Transformer', () => {
    it('order fixture: imbalance, explicit dotted edge, implicit callout edge', () => {
        const result = transform(orderFixtureInput);
        expect(result).toEqual(orderFixtureExpected);
    });

    it('fixture 3: balanced BS produces no padding', () => {
        // fixture3: assets = 1500+300+200 = 2000, liabilities+equity = 500+1500 = 2000
        const result = transform(fixture3_ast);
        const bsNode = result.nodes.find((n) => n.type === 'balanceSheet');
        expect(bsNode).toBeDefined();
        expect((bsNode!.data as any).padding).toBeUndefined();
    });

    it('fixture 1: imbalance > tolerance produces imbalance padding', () => {
        // fixture1: assets = 100, liab+equity = 200+50 = 250, diff = 150 > tolerance(10)
        const result = transform(fixture1_ast);
        const bsNode = result.nodes.find((n) => n.type === 'balanceSheet');
        expect(bsNode).toBeDefined();
        const padding = (bsNode!.data as any).padding;
        expect(padding).toBeDefined();
        expect(padding.type).toBe('imbalance');
        expect(padding.side).toBe('assets');
        expect(padding.amount).toBe(150);
    });

    it('fixture 4: global scale factor is consistent across multiple balance sheets', () => {
        // ParentCorp: assets=1500, liab+eq=1500 → maxSide=1500
        // SubCorp:    assets=600,  liab+eq=600  → maxSide=600
        // globalMax = 1500, scaleFactor = 600/1500 = 0.4
        const result = transform(fixture4_ast);
        const bsNodes = result.nodes.filter((n) => n.type === 'balanceSheet');
        expect(bsNodes).toHaveLength(2);
        const sf0 = (bsNodes[0].data as any).scaleFactor;
        const sf1 = (bsNodes[1].data as any).scaleFactor;
        expect(sf0).toBe(sf1);
        expect(sf0).toBe(0.4);
    });

    it('zero-amount edge case: scaleFactor is 0', () => {
        const emptyAst: BSMLDocument = {
            balanceSheets: [{
                id: "Empty",
                config: { tolerance: 0, currency: "USD", unit: "k" },
                assets: [],
                liabilities: [],
                equity: []
            }],
            notes: [],
            edges: [],
            callouts: []
        };
        const result = transform(emptyAst);
        const bsNode = result.nodes.find((n) => n.type === 'balanceSheet');
        expect((bsNode!.data as any).scaleFactor).toBe(0);
        expect((bsNode!.data as any).totalHeight).toBe(0);
    });

    it('fixture 1: dotted edge produces animated + strokeDasharray', () => {
        const result = transform(fixture1_ast);
        const dottedEdge = result.edges.find((e) =>
            e.id.startsWith('edge-Startup-cash-to-Warning-root')
        );
        expect(dottedEdge).toBeDefined();
        expect(dottedEdge!.animated).toBe(true);
        expect((dottedEdge!.style as any).strokeDasharray).toBe('5,5');
    });

    it('fixture 4: solid edge with label', () => {
        const result = transform(fixture4_ast);
        const solidEdge = result.edges.find((e) =>
            e.id.includes('loan_to_sub-to-SubCorp')
        );
        expect(solidEdge).toBeDefined();
        expect(solidEdge!.label).toBe('貸付');
        // solid edges should not have animated/strokeDasharray
        expect(solidEdge!.animated).toBeUndefined();
    });

    it('fixture 2: callout generates implicit edge + callout node', () => {
        const result = transform(fixture2_ast);
        const calloutNode = result.nodes.find((n) => n.id === 'callout-ExampleCorp-affiliated_stock');
        expect(calloutNode).toBeDefined();
        expect(calloutNode!.type).toBe('callout');
        expect((calloutNode!.data as any).sourceAlias).toBe('affiliated_stock');
        expect((calloutNode!.data as any).pieData).toEqual({ "普通株式": 2000, "優先株式": 1000 });

        const implicitEdge = result.edges.find((e) =>
            e.id === 'edge-callout-ExampleCorp-affiliated_stock-index-0'
        );
        expect(implicitEdge).toBeDefined();
        expect(implicitEdge!.source).toBe('ExampleCorp');
        expect(implicitEdge!.target).toBe('callout-ExampleCorp-affiliated_stock');
        expect(implicitEdge!.sourceHandle).toBe('handle-ExampleCorp-affiliated_stock');
        expect(implicitEdge!.animated).toBe(false);
    });
});
