import { describe, it, expect } from 'bun:test';
import { transform } from '../../src/transformer/index.js';
import type { BSMLDocument } from '../../src/ast/types.js';
import type { BSMLReactFlowData } from '../../src/transformer/types.js';
import { BS_HEADER_HEIGHT, BS_NODE_WIDTH, MIN_ROW_HEIGHT } from '../../src/constants/layout.js';
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
                totalHeight: 712,
                calculatedWidth: BS_NODE_WIDTH,
                calculatedHeight: 712 + BS_HEADER_HEIGHT,
                padding: {
                    side: "liabilities_equity",
                    type: "imbalance",
                    amount: 200
                },
                labels: {
                    assetsHeader: 'Assets',
                    liabilitiesHeader: 'Liabilities',
                    equityHeader: 'Equity',
                    assetsTotal: 'Total Assets',
                    liabilitiesTotal: 'Total Liabilities',
                    equityTotal: 'Total Equity',
                    liabilitiesEquityTotal: 'Total Liabilities & Equity',
                },
            }
        },
        {
            id: "WarningNote",
            type: "note",
            position: { x: 0, y: 0 },
            data: {
                ast: orderFixtureInput.notes[0],
                text: "Debt ratio needs adjustment.",
                calculatedWidth: 200,
                calculatedHeight: 100,
            }
        },
        {
            id: "callout-AssetMgmt-cash",
            type: "callout",
            position: { x: 0, y: 0 },
            data: {
                ast: orderFixtureInput.callouts[0],
                sourceAlias: "cash",
                pieData: { "USD": 600, "JPY": 400 },
                calculatedWidth: 250,
                calculatedHeight: 250,
            }
        }
    ],
    edges: [
        {
            id: "edge-AssetMgmt-debt-to-WarningNote-root-index-0",
            source: "AssetMgmt",
            target: "WarningNote",
            sourceHandle: "handle-AssetMgmt-debt",
            targetHandle: "target-left",
            type: "smoothstep",
            label: "Check leverage",
            animated: true,
            style: { strokeDasharray: "5,5" }
        },
        {
            id: "edge-callout-AssetMgmt-cash-index-0",
            source: "AssetMgmt",
            target: "callout-AssetMgmt-cash",
            sourceHandle: "handle-AssetMgmt-cash",
            targetHandle: "target-right",
            type: "smoothstep",
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

    it('calculatedHeight includes subtotal-row heights plus header constant', () => {
        // orderFixture: maxSideValue = 1000 (assets), scaleFactor = 0.6
        // assets side = 600 + 24 (subtotal) = 624
        // liabilities/equity side = 480 + 120 (imbalance) + 72 (3 subtotals) + 40 (equity header) = 712
        // contentHeight = 712
        // calculatedWidth = BS_NODE_WIDTH (constant)
        const result = transform(orderFixtureInput);
        const bsNode = result.nodes.find((n) => n.type === 'balanceSheet');
        expect(bsNode).toBeDefined();
        expect((bsNode!.data as any).calculatedWidth).toBe(BS_NODE_WIDTH);
        expect((bsNode!.data as any).calculatedHeight).toBe(712 + BS_HEADER_HEIGHT);
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
        expect((bsNode!.data as any).totalHeight).toBe(3 * MIN_ROW_HEIGHT + BS_HEADER_HEIGHT);
    });

    it('fixture 1: dotted edge produces animated + strokeDasharray', () => {
        const result = transform(fixture1_ast);
        const dottedEdge = result.edges.find((e) =>
            e.id.startsWith('edge-Startup-cash-to-Warning-root')
        );
        expect(dottedEdge).toBeDefined();
        expect(dottedEdge!.type).toBe('smoothstep');
        expect(dottedEdge!.animated).toBe(true);
        expect((dottedEdge!.style as any).strokeDasharray).toBe('5,5');
    });

    it('fixture 4: solid edge with label', () => {
        const result = transform(fixture4_ast);
        const solidEdge = result.edges.find((e) =>
            e.id.includes('loan_to_sub-to-SubCorp')
        );
        expect(solidEdge).toBeDefined();
        expect(solidEdge!.type).toBe('smoothstep');
        expect(solidEdge!.label).toBe('貸付');
        // solid edges should not have animated/strokeDasharray
        expect(solidEdge!.animated).toBeUndefined();
    });

    it('note node has calculatedWidth=200, calculatedHeight=100', () => {
        const result = transform(orderFixtureInput);
        const noteNode = result.nodes.find((n) => n.type === 'note');
        expect(noteNode).toBeDefined();
        expect((noteNode!.data as any).calculatedWidth).toBe(200);
        expect((noteNode!.data as any).calculatedHeight).toBe(100);
    });

    it('callout node has calculatedWidth=250, calculatedHeight=250', () => {
        const result = transform(orderFixtureInput);
        const calloutNode = result.nodes.find((n) => n.type === 'callout');
        expect(calloutNode).toBeDefined();
        expect((calloutNode!.data as any).calculatedWidth).toBe(250);
        expect((calloutNode!.data as any).calculatedHeight).toBe(250);
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
        expect(implicitEdge!.targetHandle).toBe('target-right');
        expect(implicitEdge!.type).toBe('smoothstep');
        expect(implicitEdge!.animated).toBe(false);
    });

    it('small rows are clamped by MIN_ROW_HEIGHT and totalHeight may exceed default max', () => {
        const tinyItems = Array.from({ length: 30 }, (_, i) => ({
            type: 'item' as const,
            alias: `a_${i}`,
            amount: 1,
        }));
        const tinyLiabilities = Array.from({ length: 30 }, (_, i) => ({
            type: 'item' as const,
            alias: `l_${i}`,
            amount: 1,
        }));

        const ast: BSMLDocument = {
            balanceSheets: [
                {
                    id: 'LargeRef',
                    config: { tolerance: 0, currency: 'USD', unit: 'M' },
                    assets: [{ type: 'item', alias: 'big_asset', amount: 1000 }],
                    liabilities: [],
                    equity: [{ type: 'item', alias: 'big_equity', amount: 1000 }],
                },
                {
                    id: 'TinyRows',
                    config: { tolerance: 0, currency: 'USD', unit: 'M' },
                    assets: tinyItems,
                    liabilities: tinyLiabilities,
                    equity: [],
                },
            ],
            notes: [],
            edges: [],
            callouts: [],
        };

        const result = transform(ast);
        const tinyNode = result.nodes.find((n) => n.id === 'TinyRows');
        expect(tinyNode).toBeDefined();

        // global scale is based on max side (1000) => scaleFactor = 600 / 1000 = 0.6.
        // each tiny row would be 0.6px without clamp, but is clamped to MIN_ROW_HEIGHT.
        const expectedTotalHeight = 30 * MIN_ROW_HEIGHT;
        expect((tinyNode!.data as any).totalHeight).toBe(expectedTotalHeight + 3 * MIN_ROW_HEIGHT + BS_HEADER_HEIGHT);
        expect((tinyNode!.data as any).calculatedHeight).toBe(
            expectedTotalHeight + 3 * MIN_ROW_HEIGHT + BS_HEADER_HEIGHT + BS_HEADER_HEIGHT,
        );
        expect((tinyNode!.data as any).totalHeight).toBeGreaterThan(600);
    });

    it('calculatedHeight uses max(assets, liabilities+equity) where each side is sum of clamped rows', () => {
        const ast: BSMLDocument = {
            balanceSheets: [
                {
                    id: 'Ref',
                    config: { tolerance: 0, currency: 'USD', unit: 'M' },
                    assets: [{ type: 'item', alias: 'ref_asset', amount: 1000 }],
                    liabilities: [],
                    equity: [{ type: 'item', alias: 'ref_equity', amount: 1000 }],
                },
                {
                    id: 'ClampCase',
                    config: { tolerance: 0, currency: 'USD', unit: 'M' },
                    assets: [
                        { type: 'item', alias: 'a1', amount: 1 },
                        { type: 'item', alias: 'a2', amount: 1 },
                    ],
                    liabilities: [{ type: 'item', alias: 'l1', amount: 1 }],
                    equity: [{ type: 'item', alias: 'e1', amount: 1 }],
                },
            ],
            notes: [],
            edges: [],
            callouts: [],
        };

        const result = transform(ast);
        const clampNode = result.nodes.find((n) => n.id === 'ClampCase');
        expect(clampNode).toBeDefined();

        const expectedAssets = 2 * MIN_ROW_HEIGHT;
        const expectedLiabEq = 2 * MIN_ROW_HEIGHT;
        expect((clampNode!.data as any).totalHeight).toBe(Math.max(expectedAssets + MIN_ROW_HEIGHT, expectedLiabEq + 3 * MIN_ROW_HEIGHT + BS_HEADER_HEIGHT));
        expect((clampNode!.data as any).calculatedHeight).toBe(
            Math.max(expectedAssets + MIN_ROW_HEIGHT, expectedLiabEq + 3 * MIN_ROW_HEIGHT + BS_HEADER_HEIGHT) + BS_HEADER_HEIGHT,
        );
    });

    it('alias-less balanceSheet->balanceSheet edges use root handles (stable attachment)', () => {
        const ast: BSMLDocument = {
            balanceSheets: [
                {
                    id: 'A',
                    config: { tolerance: 0, currency: 'USD', unit: 'M' },
                    assets: [{ type: 'item', alias: 'cash', amount: 100 }],
                    liabilities: [],
                    equity: [{ type: 'item', alias: 'cap', amount: 100 }],
                },
                {
                    id: 'B',
                    config: { tolerance: 0, currency: 'USD', unit: 'M' },
                    assets: [{ type: 'item', alias: 'cash', amount: 10 }],
                    liabilities: [],
                    equity: [{ type: 'item', alias: 'cap', amount: 10 }],
                },
            ],
            notes: [{ id: 'N', text: 'note' }],
            edges: [
                { source: { nodeId: 'A' }, target: { nodeId: 'B' }, style: 'solid' },
                { source: { nodeId: 'A' }, target: { nodeId: 'N' }, style: 'solid' },
            ],
            callouts: [],
        };

        const result = transform(ast);
        const bsEdge = result.edges.find((e) => e.id.startsWith('edge-A-root-to-B-root-index-0'));
        expect(bsEdge).toBeDefined();
        expect(bsEdge!.sourceHandle).toBe('handle-A-root-out');
        expect(bsEdge!.targetHandle).toBe('handle-B-root-in');

        const noteEdge = result.edges.find((e) => e.id.startsWith('edge-A-root-to-N-root-index-1'));
        expect(noteEdge).toBeDefined();
        expect(noteEdge!.targetHandle).toBe('target-left');
    });

    it('annotation target handle routes by source accounting side', () => {
        const ast: BSMLDocument = {
            balanceSheets: [
                {
                    id: 'R',
                    config: { tolerance: 0, currency: 'USD', unit: 'M' },
                    assets: [{ type: 'item', alias: 'a', amount: 100 }],
                    liabilities: [{ type: 'item', alias: 'l', amount: 20 }],
                    equity: [{ type: 'item', alias: 'e', amount: 80 }],
                },
            ],
            notes: [{ id: 'N', text: 'note' }],
            edges: [
                { source: { nodeId: 'R', alias: 'a' }, target: { nodeId: 'N' }, style: 'solid' },
                { source: { nodeId: 'R', alias: 'l' }, target: { nodeId: 'N' }, style: 'solid' },
                { source: { nodeId: 'R', alias: 'e' }, target: { nodeId: 'N' }, style: 'solid' },
            ],
            callouts: [],
        };

        const result = transform(ast);
        expect(result.edges[0].targetHandle).toBe('target-right');
        expect(result.edges[1].targetHandle).toBe('target-left');
        expect(result.edges[2].targetHandle).toBe('target-left');
    });

    it('unknown or ambiguous source alias routes to annotation target-left', () => {
        const ast: BSMLDocument = {
            balanceSheets: [
                {
                    id: 'R',
                    config: { tolerance: 0, currency: 'USD', unit: 'M' },
                    assets: [{ type: 'item', alias: 'dup', amount: 10 }],
                    liabilities: [{ type: 'item', alias: 'dup', amount: 10 }],
                    equity: [],
                },
            ],
            notes: [{ id: 'N', text: 'note' }],
            edges: [
                { source: { nodeId: 'R', alias: 'dup' }, target: { nodeId: 'N' }, style: 'solid' },
                { source: { nodeId: 'R', alias: 'missing' }, target: { nodeId: 'N' }, style: 'solid' },
            ],
            callouts: [],
        };

        const result = transform(ast);
        expect(result.edges[0].targetHandle).toBe('target-left');
        expect(result.edges[1].targetHandle).toBe('target-left');
    });

    it('injects full English labels by default and full Japanese labels for lang=ja', () => {
        const ast: BSMLDocument = {
            balanceSheets: [
                {
                    id: 'En',
                    config: { tolerance: 0, currency: 'USD', unit: 'M' },
                    assets: [],
                    liabilities: [],
                    equity: [],
                },
                {
                    id: 'Ja',
                    config: { tolerance: 0, currency: 'JPY', unit: 'M', lang: 'ja' },
                    assets: [],
                    liabilities: [],
                    equity: [],
                },
                {
                    id: 'Fallback',
                    config: { tolerance: 0, currency: 'EUR', unit: 'M', lang: 'fr' },
                    assets: [],
                    liabilities: [],
                    equity: [],
                },
            ],
            notes: [],
            edges: [],
            callouts: [],
        };

        const result = transform(ast);
        const en = result.nodes.find((n) => n.id === 'En')!;
        const ja = result.nodes.find((n) => n.id === 'Ja')!;
        const fallback = result.nodes.find((n) => n.id === 'Fallback')!;

        expect((en.data as any).labels.assetsTotal).toBe('Total Assets');
        expect((en.data as any).labels.liabilitiesEquityTotal).toBe('Total Liabilities & Equity');
        expect((ja.data as any).labels.assetsTotal).toBe('資産の部合計');
        expect((ja.data as any).labels.liabilitiesEquityTotal).toBe('負債・純資産の部合計');
        expect((fallback.data as any).labels.assetsTotal).toBe('Total Assets');
    });
});
