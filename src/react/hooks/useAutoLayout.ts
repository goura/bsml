// useAutoLayout — Dagre-based auto-layout for BSML React Flow nodes
// Pure function (not a React hook); named with `use` prefix for future
// composability but carries no side-effects or state.

import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';

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

    for (const node of nodes) {
        const w = (node.data as Record<string, unknown>).calculatedWidth as number | undefined ?? nodeWidth;
        const h = (node.data as Record<string, unknown>).calculatedHeight as number | undefined ?? nodeHeight;
        g.setNode(node.id, { width: w, height: h });
    }

    for (const edge of edges) {
        // Dagre only needs source/target; ignore unknown edges gracefully
        if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
            g.setEdge(edge.source, edge.target);
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
