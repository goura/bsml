// BSMLCanvas — Main React Flow canvas with auto-layout

import React, { useEffect, useMemo } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    useNodesState,
    useEdgesState,
} from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import { BalanceSheetNode } from './BalanceSheetNode.js';
import { NoteNode } from './NoteNode.js';
import { CalloutNode } from './CalloutNode.js';
import { applyAutoLayout } from '../hooks/useAutoLayout.js';
import type { BSMLReactFlowData } from '../../transformer/types.js';

// ── nodeTypes registry ────────────────────────────────────────────────────────

const nodeTypes = {
    balanceSheet: BalanceSheetNode,
    note: NoteNode,
    callout: CalloutNode,
} as const;

// ── Props ─────────────────────────────────────────────────────────────────────

export interface BSMLCanvasProps {
    /** Raw transformer output — positions will be overwritten by auto-layout */
    data: BSMLReactFlowData;
    /** Override default layout options (optional) */
    layoutOptions?: Parameters<typeof applyAutoLayout>[2];
    /** Container style (default: full parent size) */
    style?: React.CSSProperties;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BSMLCanvas({ data, layoutOptions, style }: BSMLCanvasProps) {
    const layoutedNodes = useMemo(
        () => applyAutoLayout(data.nodes, data.edges, layoutOptions),
        [data.nodes, data.edges, layoutOptions],
    );
    const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(data.edges);

    useEffect(() => {
        setNodes(layoutedNodes);
        setEdges(data.edges);
    }, [layoutedNodes, data.edges, setNodes, setEdges]);

    return (
        <div style={{ width: '100%', height: '100%', ...style }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes as any}
                nodesDraggable={true}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                fitView
                fitViewOptions={{ padding: 0.2 }}
            >
                <Background />
                <Controls />
            </ReactFlow>
        </div>
    );
}

export default BSMLCanvas;
