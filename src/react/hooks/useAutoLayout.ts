// useAutoLayout — Dagre-based auto-layout for BSML React Flow nodes
// Pure function (not a React hook); named with `use` prefix for future
// composability but carries no side-effects or state.

import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';
import type { BalanceSheetNode, TreeNode } from '../../ast/types.js';

export interface AutoLayoutOptions {
    /** Default node width used for layout (actual DOM width irrelevant at layout time) */
    nodeWidth?: number;
    /** Default node height used for layout (actual DOM height irrelevant at layout time) */
    nodeHeight?: number;
    /** Dagre rank direction (default: 'LR') */
    rankdir?: 'LR' | 'RL' | 'TB' | 'BT';
    /** Minimum distance between adjacent nodes in same rank (default: 100) */
    nodesep?: number;
    /** Minimum distance between ranks (default: 200) */
    ranksep?: number;
}

type AccountingSide = 'assets' | 'liabilities' | 'equity' | 'unknown';
type AnnotationPlacement = 'left' | 'right';

function collectSectionAliases(nodes: TreeNode[], side: Exclude<AccountingSide, 'unknown'>, aliases: Map<string, Set<AccountingSide>>): void {
    for (const node of nodes) {
        const existing = aliases.get(node.alias) ?? new Set<AccountingSide>();
        existing.add(side);
        aliases.set(node.alias, existing);
        if (node.type === 'category') {
            collectSectionAliases(node.children, side, aliases);
        }
    }
}

function buildAliasSideLookup(bs: BalanceSheetNode): Map<string, AccountingSide> {
    const aliases = new Map<string, Set<AccountingSide>>();
    collectSectionAliases(bs.assets, 'assets', aliases);
    collectSectionAliases(bs.liabilities, 'liabilities', aliases);
    collectSectionAliases(bs.equity, 'equity', aliases);

    const sideLookup = new Map<string, AccountingSide>();
    for (const [alias, sides] of aliases.entries()) {
        if (sides.size !== 1) {
            sideLookup.set(alias, 'unknown');
            continue;
        }
        const [singleSide] = sides;
        sideLookup.set(alias, singleSide);
    }
    return sideLookup;
}

function extractAliasFromSourceHandle(sourceHandle: string | null | undefined, bsId: string): string | null {
    if (!sourceHandle) return null;
    if (sourceHandle === `handle-${bsId}-root-in` || sourceHandle === `handle-${bsId}-root-out`) {
        return null;
    }
    const match = /^handle-([^-]+)-(.+)$/.exec(sourceHandle);
    if (!match) return null;
    const [, handleBsId, alias] = match;
    if (handleBsId !== bsId) return null;
    return alias;
}

function resolveSourceSideFromHandle(
    edge: Edge,
    bs: BalanceSheetNode,
    aliasSideLookup: Map<string, AccountingSide>,
): AccountingSide {
    const alias = extractAliasFromSourceHandle(edge.sourceHandle, bs.id);
    if (!alias) return 'unknown';
    return aliasSideLookup.get(alias) ?? 'unknown';
}

function getBSMLBalanceSheetNodes(nodes: Node[]): Map<string, BalanceSheetNode> {
    const byId = new Map<string, BalanceSheetNode>();
    for (const node of nodes) {
        if (node.type !== 'balanceSheet') continue;
        const ast = (node.data as Record<string, unknown> | undefined)?.ast;
        if (!ast || typeof ast !== 'object') continue;
        byId.set(node.id, ast as BalanceSheetNode);
    }
    return byId;
}

function buildAnnotationPlacementById(
    edges: Edge[],
    nodeTypes: Map<string, Node['type']>,
    bsById: Map<string, BalanceSheetNode>,
): Map<string, AnnotationPlacement> {
    const placementById = new Map<string, AnnotationPlacement>();
    const bsAliasLookupById = new Map<string, Map<string, AccountingSide>>();
    for (const [bsId, bs] of bsById.entries()) {
        bsAliasLookupById.set(bsId, buildAliasSideLookup(bs));
    }

    for (const edge of edges) {
        if (nodeTypes.get(edge.source) !== 'balanceSheet') continue;
        const targetType = nodeTypes.get(edge.target);
        if (targetType !== 'note' && targetType !== 'callout') continue;

        const bs = bsById.get(edge.source);
        if (!bs) continue;
        const aliasSideLookup = bsAliasLookupById.get(bs.id);
        if (!aliasSideLookup) continue;
        const side = resolveSourceSideFromHandle(edge, bs, aliasSideLookup);
        if (side === 'assets') {
            placementById.set(edge.target, 'left');
        } else if (!placementById.has(edge.target)) {
            placementById.set(edge.target, 'right');
        }
    }

    return placementById;
}

/**
 * Given a raw nodes + edges array (positions ignored), returns a new nodes
 * array with `position` set by the Dagre layout engine.
 *
 * The original array and node objects are NOT mutated.
 */
export function applyAutoLayout(
    nodes: Node[],
    edges: Edge[],
    options: AutoLayoutOptions = {},
): Node[] {
    if (nodes.length === 0) return [];

    const {
        nodeWidth = 300,
        nodeHeight = 600,
        rankdir = 'LR',
        nodesep = 100,
        ranksep = 200,
    } = options;

    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir, nodesep, ranksep });

    const nodeTypes = new Map(nodes.map((node) => [node.id, node.type]));
    const bsById = getBSMLBalanceSheetNodes(nodes);
    const shouldUseBSMLAnnotationPlacement = bsById.size > 0;
    const annotationPlacementById = shouldUseBSMLAnnotationPlacement
        ? buildAnnotationPlacementById(edges, nodeTypes, bsById)
        : new Map<string, AnnotationPlacement>();

    for (const node of nodes) {
        const w = (node.data as Record<string, unknown>).calculatedWidth as number | undefined ?? nodeWidth;
        const h = (node.data as Record<string, unknown>).calculatedHeight as number | undefined ?? nodeHeight;
        g.setNode(node.id, { width: w, height: h });
    }

    for (const edge of edges) {
        // Dagre only needs source/target; ignore unknown edges gracefully
        if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
            const targetType = nodeTypes.get(edge.target);
            const isAnnotationTarget = targetType === 'note' || targetType === 'callout';
            const isBalanceSheetSource = nodeTypes.get(edge.source) === 'balanceSheet';
            const layoutPlacement = annotationPlacementById.get(edge.target);
            const shouldReverse = shouldUseBSMLAnnotationPlacement
                && isBalanceSheetSource
                && isAnnotationTarget
                && layoutPlacement === 'left';

            if (shouldReverse) {
                g.setEdge(edge.target, edge.source);
            } else {
                g.setEdge(edge.source, edge.target);
            }
        }
    }

    dagre.layout(g);

    return nodes.map((node) => {
        const w = (node.data as Record<string, unknown>).calculatedWidth as number | undefined ?? nodeWidth;
        const h = (node.data as Record<string, unknown>).calculatedHeight as number | undefined ?? nodeHeight;
        const { x, y } = g.node(node.id);
        return {
            ...node,
            position: {
                x: x - w / 2,
                y: y - h / 2,
            },
        };
    });
}
