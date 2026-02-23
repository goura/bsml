import { afterEach, describe, expect, mock, test } from 'bun:test';
import React from 'react';
import { cleanup, render } from '@testing-library/react';
import type { BSMLReactFlowData } from '../../src/transformer/types.js';

let lastReactFlowProps: any = null;

mock.module('@xyflow/react', () => ({
    ReactFlow: (props: any) => {
        lastReactFlowProps = props;
        return React.createElement('div', { 'data-testid': 'react-flow' }, props.children);
    },
    useNodesState: (initialNodes: any[]) => {
        const [nodes, setNodes] = React.useState(initialNodes);
        const onNodesChange = () => {};
        return [nodes, setNodes, onNodesChange];
    },
    useEdgesState: (initialEdges: any[]) => {
        const [edges, setEdges] = React.useState(initialEdges);
        const onEdgesChange = () => {};
        return [edges, setEdges, onEdgesChange];
    },
    Background: () => React.createElement('div', { 'data-testid': 'background' }),
    Controls: () => React.createElement('div', { 'data-testid': 'controls' }),
    Handle: ({ id, 'data-testid': testId, style }: any) =>
        React.createElement('div', { id, 'data-testid': testId, style }),
    Position: { Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom' },
}));

import { BSMLCanvas } from '../../src/react/components/BSMLCanvas.js';

afterEach(() => {
    cleanup();
    lastReactFlowProps = null;
});

describe('BSMLCanvas', () => {
    test('passes nodesDraggable=true to ReactFlow', () => {
        const data: BSMLReactFlowData = {
            nodes: [
                {
                    id: 'N1',
                    type: 'note',
                    position: { x: 0, y: 0 },
                    data: { text: 'memo', ast: { id: 'N1', text: 'memo' }, calculatedWidth: 200, calculatedHeight: 100 },
                },
            ],
            edges: [],
        };

        render(<BSMLCanvas data={data} />);

        expect(lastReactFlowProps).toBeDefined();
        expect(lastReactFlowProps.nodesDraggable).toBe(true);
    });

    test('wires onNodesChange and onEdgesChange handlers to ReactFlow', () => {
        const data: BSMLReactFlowData = {
            nodes: [
                {
                    id: 'N1',
                    type: 'note',
                    position: { x: 0, y: 0 },
                    data: { text: 'memo', ast: { id: 'N1', text: 'memo' }, calculatedWidth: 200, calculatedHeight: 100 },
                },
            ],
            edges: [],
        };

        render(<BSMLCanvas data={data} />);

        expect(lastReactFlowProps).toBeDefined();
        expect(typeof lastReactFlowProps.onNodesChange).toBe('function');
        expect(typeof lastReactFlowProps.onEdgesChange).toBe('function');
    });
});
