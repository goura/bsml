// BSML Transformer — spec v1.1
// Pure function: BSMLDocument → React Flow nodes + edges

import type { Node, Edge } from '@xyflow/react';
import type { BSMLDocument, TreeNode } from '../ast/types.js';
import {
    BS_HEADER_HEIGHT,
    BS_NODE_WIDTH,
    BS_PADDING_BOTTOM,
    CALLOUT_NODE_HEIGHT,
    CALLOUT_NODE_WIDTH,
    DEFAULT_MAX_NODE_HEIGHT,
    NOTE_NODE_HEIGHT,
    NOTE_NODE_WIDTH,
} from '../constants/layout.js';
import type { BSMLReactFlowData, BalanceSheetNodeData, NoteNodeData, CalloutNodeData } from './types.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function sumTree(nodes: TreeNode[]): number {
    let total = 0;
    for (const n of nodes) {
        if (n.type === 'item') {
            total += n.amount;
        } else {
            total += sumTree(n.children);
        }
    }
    return total;
}

// ── Main Transformer ──────────────────────────────────────────────────────────

/**
 * Transform BSML AST into React Flow compatible nodes + edges.
 *
 * @param ast - Parsed BSML AST document
 * @param maxNodeHeight - Maximum pixel height for the tallest balance sheet node (default 600)
 */
export function transform(ast: BSMLDocument, maxNodeHeight = DEFAULT_MAX_NODE_HEIGHT): BSMLReactFlowData {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // 1) Calculate totals and global max
    const totals = ast.balanceSheets.map((bs) => {
        const assetsTotal = sumTree(bs.assets);
        const liabilitiesTotal = sumTree(bs.liabilities);
        const equityTotal = sumTree(bs.equity);
        const liabEqTotal = liabilitiesTotal + equityTotal;
        const maxSide = Math.max(assetsTotal, liabEqTotal);
        return { bs, assetsTotal, liabilitiesTotal, equityTotal, liabEqTotal, maxSide };
    });

    const globalMax = totals.length > 0 ? Math.max(...totals.map((t) => t.maxSide)) : 0;
    const scaleFactor = globalMax === 0 ? 0 : maxNodeHeight / globalMax;

    // 2) Create balanceSheet nodes
    for (const t of totals) {
        const { bs, assetsTotal, liabEqTotal, maxSide } = t;

        let padding: BalanceSheetNodeData['padding'] | undefined = undefined;
        const diff = Math.abs(assetsTotal - liabEqTotal);
        if (diff > 0) {
            if (diff > bs.config.tolerance) {
                padding = {
                    side: assetsTotal < liabEqTotal ? 'assets' : 'liabilities_equity',
                    type: 'imbalance',
                    amount: diff,
                };
            } else {
                padding = {
                    side: assetsTotal < liabEqTotal ? 'assets' : 'liabilities_equity',
                    type: 'rounding',
                    amount: diff,
                };
            }
        }

        const contentHeight = maxSide * scaleFactor;
        const data: BalanceSheetNodeData = {
            ast: bs,
            scaleFactor,
            totalHeight: contentHeight,
            calculatedWidth: BS_NODE_WIDTH,
            calculatedHeight: contentHeight + BS_HEADER_HEIGHT + BS_PADDING_BOTTOM,
            padding,
        };

        nodes.push({
            id: bs.id,
            type: 'balanceSheet',
            position: { x: 0, y: 0 },
            data,
        });
    }

    // 3) Create note nodes
    for (const note of ast.notes) {
        const data: NoteNodeData = {
            ast: note,
            text: note.text,
            calculatedWidth: NOTE_NODE_WIDTH,
            calculatedHeight: NOTE_NODE_HEIGHT,
        };
        nodes.push({
            id: note.id,
            type: 'note',
            position: { x: 0, y: 0 },
            data,
        });
    }

    // 4) Create explicit edges
    for (const [idx, e] of ast.edges.entries()) {
        const dotted = e.style === 'dotted';
        const sourceAlias = e.source.alias ?? 'root';
        const targetAlias = e.target.alias ?? 'root';
        edges.push({
            id: `edge-${e.source.nodeId}-${sourceAlias}-to-${e.target.nodeId}-${targetAlias}-index-${idx}`,
            source: e.source.nodeId,
            sourceHandle: e.source.alias ? `handle-${e.source.nodeId}-${e.source.alias}` : undefined,
            target: e.target.nodeId,
            targetHandle: e.target.alias ? `handle-${e.target.nodeId}-${e.target.alias}` : undefined,
            label: e.label,
            animated: dotted || undefined,
            style: dotted
                ? { strokeDasharray: '5,5' }
                : undefined,
        });
    }

    // 5) Create callout nodes (+ implicit edge from source handle)
    for (const [idx, callout] of ast.callouts.entries()) {
        const data: CalloutNodeData = {
            ast: callout,
            sourceAlias: callout.source.alias,
            pieData: callout.data,
            calculatedWidth: CALLOUT_NODE_WIDTH,
            calculatedHeight: CALLOUT_NODE_HEIGHT,
        };
        nodes.push({
            id: `callout-${callout.source.bsId}-${callout.source.alias}`,
            type: 'callout',
            position: { x: 0, y: 0 },
            data,
        });

        edges.push({
            id: `edge-callout-${callout.source.bsId}-${callout.source.alias}-index-${idx}`,
            source: callout.source.bsId,
            sourceHandle: `handle-${callout.source.bsId}-${callout.source.alias}`,
            target: `callout-${callout.source.bsId}-${callout.source.alias}`,
            animated: false,
            style: { stroke: '#94a3b8' },
        });
    }

    return { nodes, edges };
}
