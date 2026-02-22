// BSMLCanvas — Main React Flow canvas with auto-layout

import React from 'react';
import { ReactFlow, Background, Controls } from '@xyflow/react';
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
    const layoutedNodes = applyAutoLayout(data.nodes, data.edges, layoutOptions);

    return (
        <div style={{ width: '100%', height: '100%', ...style }}>
            <ReactFlow
                nodes={layoutedNodes}
                edges={data.edges}
                nodeTypes={nodeTypes as any}
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
