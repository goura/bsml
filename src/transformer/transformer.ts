// BSML Transformer — spec v1.1
// Pure function: BSMLDocument → React Flow nodes + edges

import type { Node, Edge } from '@xyflow/react';
import type { BSMLDocument, TreeNode } from '../ast/types.js';
import {
    BS_HEADER_HEIGHT,
    BS_NODE_WIDTH,
    CALLOUT_NODE_HEIGHT,
    CALLOUT_NODE_WIDTH,
    DEFAULT_MAX_NODE_HEIGHT,
    MIN_ROW_HEIGHT,
    NOTE_NODE_HEIGHT,
    NOTE_NODE_WIDTH,
} from '../constants/layout.js';
import { LABELS_BY_LANG, normalizeLang } from '../constants/labels.js';
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

function sumRenderedTreeHeight(nodes: TreeNode[], scaleFactor: number): number {
    let total = 0;
    for (const n of nodes) {
        if (n.type === 'item') {
            total += Math.max(n.amount * scaleFactor, MIN_ROW_HEIGHT);
        } else {
            total += sumRenderedTreeHeight(n.children, scaleFactor);
        }
    }
    return total;
}

type AccountingSide = 'assets' | 'liabilities' | 'equity' | 'unknown';

function collectAliases(nodes: TreeNode[], out: Set<string>): void {
    for (const node of nodes) {
        out.add(node.alias);
        if (node.type === 'category') {
            collectAliases(node.children, out);
        }
    }
}

function buildAliasSideLookup(ast: BSMLDocument): Map<string, Map<string, AccountingSide>> {
    const lookup = new Map<string, Map<string, AccountingSide>>();

    for (const bs of ast.balanceSheets) {
        const assetsAliases = new Set<string>();
        const liabilitiesAliases = new Set<string>();
        const equityAliases = new Set<string>();
        collectAliases(bs.assets, assetsAliases);
        collectAliases(bs.liabilities, liabilitiesAliases);
        collectAliases(bs.equity, equityAliases);

        const sideMap = new Map<string, AccountingSide>();
        const allAliases = new Set([
            ...assetsAliases,
            ...liabilitiesAliases,
            ...equityAliases,
        ]);

        for (const alias of allAliases) {
            const inAssets = assetsAliases.has(alias);
            const inLiabilities = liabilitiesAliases.has(alias);
            const inEquity = equityAliases.has(alias);
            const sectionCount = Number(inAssets) + Number(inLiabilities) + Number(inEquity);
            if (sectionCount !== 1) {
                sideMap.set(alias, 'unknown');
            } else if (inAssets) {
                sideMap.set(alias, 'assets');
            } else if (inLiabilities) {
                sideMap.set(alias, 'liabilities');
            } else {
                sideMap.set(alias, 'equity');
            }
        }

        lookup.set(bs.id, sideMap);
    }

    return lookup;
}

function resolveSourceSide(
    sourceNodeId: string,
    sourceAlias: string | undefined,
    aliasSideLookup: Map<string, Map<string, AccountingSide>>,
): AccountingSide {
    if (!sourceAlias) return 'unknown';
    const sideMap = aliasSideLookup.get(sourceNodeId);
    if (!sideMap) return 'unknown';
    return sideMap.get(sourceAlias) ?? 'unknown';
}

function annotationTargetHandleForSourceSide(sourceSide: AccountingSide): 'target-left' | 'target-right' {
    return sourceSide === 'assets' ? 'target-right' : 'target-left';
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
    const balanceSheetIds = new Set(ast.balanceSheets.map((bs) => bs.id));
    const noteIds = new Set(ast.notes.map((note) => note.id));
    const calloutIds = new Set(ast.callouts.map((callout) => `callout-${callout.source.bsId}-${callout.source.alias}`));
    const aliasSideLookup = buildAliasSideLookup(ast);

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
        const { bs, assetsTotal, liabEqTotal } = t;
        const labels = LABELS_BY_LANG[normalizeLang(bs.config.lang)];

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

        const assetsRenderedHeight = sumRenderedTreeHeight(bs.assets, scaleFactor);
        const liabilitiesRenderedHeight = sumRenderedTreeHeight(bs.liabilities, scaleFactor);
        const equityRenderedHeight = sumRenderedTreeHeight(bs.equity, scaleFactor);
        const liabEqRenderedHeight = liabilitiesRenderedHeight + equityRenderedHeight;
        const paddingRenderedHeight = padding ? padding.amount * scaleFactor : 0;
        const assetsColumnHeight =
            assetsRenderedHeight + (padding?.side === 'assets' ? paddingRenderedHeight : 0) + MIN_ROW_HEIGHT;
        const liabEqColumnHeight =
            liabEqRenderedHeight + (padding?.side === 'liabilities_equity' ? paddingRenderedHeight : 0) + MIN_ROW_HEIGHT * 3 + BS_HEADER_HEIGHT;
        const contentHeight = Math.max(assetsColumnHeight, liabEqColumnHeight);
        const data: BalanceSheetNodeData = {
            ast: bs,
            scaleFactor,
            totalHeight: contentHeight,
            calculatedWidth: BS_NODE_WIDTH,
            calculatedHeight: contentHeight + BS_HEADER_HEIGHT,
            padding,
            labels,
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
        const sourceHandle = e.source.alias
            ? `handle-${e.source.nodeId}-${e.source.alias}`
            : balanceSheetIds.has(e.source.nodeId)
                ? `handle-${e.source.nodeId}-root-out`
                : undefined;
        const targetHandleFromAlias = e.target.alias
            ? `handle-${e.target.nodeId}-${e.target.alias}`
            : balanceSheetIds.has(e.target.nodeId)
                ? `handle-${e.target.nodeId}-root-in`
                : undefined;
        const isAnnotationTarget = noteIds.has(e.target.nodeId) || calloutIds.has(e.target.nodeId);
        const sourceSide = resolveSourceSide(e.source.nodeId, e.source.alias, aliasSideLookup);
        const targetHandle = isAnnotationTarget
            ? annotationTargetHandleForSourceSide(sourceSide)
            : targetHandleFromAlias;
        edges.push({
            id: `edge-${e.source.nodeId}-${sourceAlias}-to-${e.target.nodeId}-${targetAlias}-index-${idx}`,
            source: e.source.nodeId,
            sourceHandle,
            target: e.target.nodeId,
            targetHandle,
            type: 'smoothstep',
            label: e.label,
            animated: dotted || undefined,
            style: dotted
                ? { strokeDasharray: '5,5' }
                : undefined,
        });
    }

    // 5) Create callout nodes (+ implicit edge from source handle)
    for (const [idx, callout] of ast.callouts.entries()) {
        const calloutNodeId = `callout-${callout.source.bsId}-${callout.source.alias}`;
        const data: CalloutNodeData = {
            ast: callout,
            sourceAlias: callout.source.alias,
            pieData: callout.data,
            calculatedWidth: CALLOUT_NODE_WIDTH,
            calculatedHeight: CALLOUT_NODE_HEIGHT,
        };
        nodes.push({
            id: calloutNodeId,
            type: 'callout',
            position: { x: 0, y: 0 },
            data,
        });

        const sourceSide = resolveSourceSide(callout.source.bsId, callout.source.alias, aliasSideLookup);
        edges.push({
            id: `edge-callout-${callout.source.bsId}-${callout.source.alias}-index-${idx}`,
            source: callout.source.bsId,
            sourceHandle: `handle-${callout.source.bsId}-${callout.source.alias}`,
            target: calloutNodeId,
            targetHandle: annotationTargetHandleForSourceSide(sourceSide),
            type: 'smoothstep',
            animated: false,
            style: { stroke: '#94a3b8' },
        });
    }

    return { nodes, edges };
}
