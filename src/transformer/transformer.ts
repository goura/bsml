// BSML Transformer — spec v1.1
// Pure function: BSMLDocument → React Flow nodes + edges

import type { Node, Edge } from '@xyflow/react';
import type { BSMLDocument, TreeNode } from '../ast/types.js';
import type { BSMLReactFlowData, BalanceSheetNodeData, NoteNodeData, CalloutNodeData } from './types.js';

/**
 * Recursively sums all leaf `ItemNode.amount` values in a tree.
 * CategoryNodes have no amount — only their children contribute.
 */
function sumTreeAmounts(trees: TreeNode[]): number {
    let total = 0;
    for (const node of trees) {
        if (node.type === 'item') {
            total += node.amount;
        } else {
            total += sumTreeAmounts(node.children);
        }
    }
    return total;
}

/**
 * Transforms a BSMLDocument AST into React Flow–compatible nodes and edges.
 *
 * @param ast - The parsed BSMLDocument
 * @param maxNodeHeight - Maximum pixel height for the tallest balance sheet node (default 600)
 */
export function transform(ast: BSMLDocument, maxNodeHeight = 600): BSMLReactFlowData {
    // ── 3.1 Per-BS Totals ──────────────────────────────────────────────
    const bsTotals = ast.balanceSheets.map((bs) => {
        const totalAssets = sumTreeAmounts(bs.assets);
        const totalLiabilitiesAndEquity =
            sumTreeAmounts(bs.liabilities) + sumTreeAmounts(bs.equity);
        const maxSideValue = Math.max(totalAssets, totalLiabilitiesAndEquity);
        return { bs, totalAssets, totalLiabilitiesAndEquity, maxSideValue };
    });

    // ── 3.2 Global Scaling ─────────────────────────────────────────────
    const globalMaxAmount = Math.max(...bsTotals.map((t) => t.maxSideValue), 0);
    const scaleFactor =
        globalMaxAmount === 0 || Number.isNaN(globalMaxAmount)
            ? 0
            : maxNodeHeight / globalMaxAmount;

    // ── 3.3 Node Generation ────────────────────────────────────────────
    const nodes: Node[] = [];

    for (const { bs, totalAssets, totalLiabilitiesAndEquity, maxSideValue } of bsTotals) {
        const difference = Math.abs(totalAssets - totalLiabilitiesAndEquity);

        let padding: BalanceSheetNodeData['padding'];
        if (difference > bs.config.tolerance) {
            padding = {
                side: totalAssets < totalLiabilitiesAndEquity ? 'assets' : 'liabilities_equity',
                type: 'imbalance',
                amount: difference,
            };
        } else if (difference > 0) {
            padding = {
                side: totalAssets < totalLiabilitiesAndEquity ? 'assets' : 'liabilities_equity',
                type: 'rounding',
                amount: difference,
            };
        }

        const data: BalanceSheetNodeData = {
            ast: bs,
            scaleFactor,
            totalHeight: maxSideValue * scaleFactor,
            padding,
        };

        nodes.push({
            id: bs.id,
            type: 'balanceSheet',
            position: { x: 0, y: 0 },
            data,
        });
    }

    for (const note of ast.notes) {
        const data: NoteNodeData = { ast: note, text: note.text };
        nodes.push({
            id: note.id,
            type: 'note',
            position: { x: 0, y: 0 },
            data,
        });
    }

    for (const callout of ast.callouts) {
        const data: CalloutNodeData = {
            ast: callout,
            sourceAlias: callout.source.alias,
            pieData: callout.data,
        };
        nodes.push({
            id: `callout-${callout.source.bsId}-${callout.source.alias}`,
            type: 'callout',
            position: { x: 0, y: 0 },
            data,
        });
    }

    // ── 3.4 Edge Generation ────────────────────────────────────────────
    const edges: Edge[] = [];

    // Explicit edges (from AST)
    ast.edges.forEach((edge, i) => {
        const srcAlias = edge.source.alias || 'root';
        const tgtAlias = edge.target.alias || 'root';

        const rfEdge: Edge = {
            id: `edge-${edge.source.nodeId}-${srcAlias}-to-${edge.target.nodeId}-${tgtAlias}-index-${i}`,
            source: edge.source.nodeId,
            target: edge.target.nodeId,
            sourceHandle: edge.source.alias
                ? `handle-${edge.source.nodeId}-${edge.source.alias}`
                : undefined,
            targetHandle: edge.target.alias
                ? `handle-${edge.target.nodeId}-${edge.target.alias}`
                : undefined,
        };

        if (edge.label) {
            rfEdge.label = edge.label;
        }

        if (edge.style === 'dotted') {
            rfEdge.animated = true;
            rfEdge.style = { strokeDasharray: '5,5' };
        }

        edges.push(rfEdge);
    });

    // Implicit edges (for callouts)
    ast.callouts.forEach((callout, j) => {
        edges.push({
            id: `edge-callout-${callout.source.bsId}-${callout.source.alias}-index-${j}`,
            source: callout.source.bsId,
            target: `callout-${callout.source.bsId}-${callout.source.alias}`,
            sourceHandle: `handle-${callout.source.bsId}-${callout.source.alias}`,
            animated: false,
            style: { stroke: '#94a3b8' },
        });
    });

    return { nodes, edges };
}
