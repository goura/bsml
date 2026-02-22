// NoteNode — React Flow custom node for BSML annotations

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps, Node } from '@xyflow/react';
import { NOTE_NODE_HEIGHT, NOTE_NODE_WIDTH } from '../../constants/layout.js';
import type { NoteNodeData } from '../../transformer/types.js';

type NoteFlowNode = Node<NoteNodeData, 'note'>;

export function NoteNode({ data }: NodeProps<NoteFlowNode>) {
    const { text } = data as NoteNodeData;
    return (
        <div
            data-testid="note-node"
            style={{
                boxSizing: 'border-box',
                width: `${NOTE_NODE_WIDTH}px`,
                height: `${NOTE_NODE_HEIGHT}px`,
                position: 'relative',
            }}
        >
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#fefce8',
                    border: '1px solid #ca8a04',
                    borderRadius: 4,
                    padding: '8px 10px',
                    fontSize: 12,
                    lineHeight: 1.4,
                    overflow: 'hidden',
                    boxShadow: '2px 2px 6px rgba(0,0,0,0.12)',
                    boxSizing: 'border-box',
                }}
            >
                <span>{text}</span>
            </div>
            <Handle type="target" position={Position.Left} className="bsml-invisible-handle" />
            <Handle type="source" position={Position.Right} className="bsml-invisible-handle" />
        </div>
    );
}

export default NoteNode;
