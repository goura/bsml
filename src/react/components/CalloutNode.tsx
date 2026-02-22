// CalloutNode — React Flow custom node for BSML ownership breakdowns (pure SVG pie)

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps, Node } from '@xyflow/react';
import { CALLOUT_NODE_HEIGHT, CALLOUT_NODE_WIDTH } from '../../constants/layout.js';
import type { CalloutNodeData } from '../../transformer/types.js';

// Donut chart via stroke-dasharray trick
// r=50 → circumference = 2π×50 ≈ 314.16
const RADIUS = 50;
const CIRC = 2 * Math.PI * RADIUS;
const CX = 90; // center-x of SVG circle area
const CY = 90; // center-y
const SVG_W = 180;
const SVG_H = 180;

const COLORS = [
    '#3b82f6', '#f59e0b', '#10b981', '#ef4444',
    '#8b5cf6', '#06b6d4', '#f97316', '#ec4899',
];

type CalloutFlowNode = Node<CalloutNodeData, 'callout'>;

export function CalloutNode({ data }: NodeProps<CalloutFlowNode>) {
    const { pieData, sourceAlias } = data as CalloutNodeData;

    const entries = Object.entries(pieData);
    const total = entries.reduce((s, [, v]) => s + v, 0);

    // Build segments: each circle gets its own dasharray + dashoffset
    let offset = 0;
    const segments = entries.map(([key, value], i) => {
        const fraction = total === 0 ? 0 : value / total;
        const dash = fraction * CIRC;
        const segment = (
            <circle
                key={key}
                cx={CX}
                cy={CY}
                r={RADIUS}
                fill="none"
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={36}
                strokeDasharray={`${dash} ${CIRC}`}
                strokeDashoffset={-offset}
                style={{ transform: 'rotate(-90deg)', transformOrigin: `${CX}px ${CY}px` }}
            />
        );
        offset += dash;
        return segment;
    });

    const pct = (v: number) =>
        total === 0 ? '0.0%' : `${((v / total) * 100).toFixed(1)}%`;

    return (
        <div
            data-testid="callout-node"
            style={{
                boxSizing: 'border-box',
                width: `${CALLOUT_NODE_WIDTH}px`,
                height: `${CALLOUT_NODE_HEIGHT}px`,
                position: 'relative',
            }}
        >
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    padding: '8px',
                    boxShadow: '2px 2px 6px rgba(0,0,0,0.10)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                }}
            >
                <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                    {sourceAlias}
                </div>

                <svg
                    data-testid="pie-svg"
                    width={SVG_W}
                    height={SVG_H}
                    viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                >
                    {/* Background track */}
                    <circle cx={CX} cy={CY} r={RADIUS} fill="none" stroke="#e2e8f0" strokeWidth={36} />
                    {segments}
                </svg>

                {/* Legend */}
                <div style={{ fontSize: 10, lineHeight: 1.6, width: '100%', paddingLeft: 4 }}>
                    {entries.map(([key, value], i) => (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{
                                display: 'inline-block',
                                width: 8, height: 8,
                                borderRadius: '50%',
                                backgroundColor: COLORS[i % COLORS.length],
                                flexShrink: 0,
                            }} />
                            <span>{key}: {pct(value)}</span>
                        </div>
                    ))}
                </div>
            </div>
            <Handle type="target" position={Position.Left} className="bsml-invisible-handle" />
            <Handle type="source" position={Position.Right} className="bsml-invisible-handle" />
        </div>
    );
}

export default CalloutNode;
