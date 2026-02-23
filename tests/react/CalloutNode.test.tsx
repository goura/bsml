// CalloutNode component tests (Bun TDD)
// bun test tests/react/CalloutNode.test.tsx

import { expect, test, describe, mock, afterEach } from 'bun:test';
import React from 'react';

mock.module('@xyflow/react', () => ({
    Handle: ({ id, 'data-testid': testId, style }: any) =>
        React.createElement('div', { id, 'data-testid': testId, style }),
    Position: { Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom' },
}));

import { render, screen, cleanup } from '@testing-library/react';
import { CalloutNode } from '../../src/react/components/CalloutNode.js';
import type { CalloutNodeData } from '../../src/transformer/types.js';

afterEach(cleanup);

const mockAst: CalloutNodeData['ast'] = {
    source: { bsId: 'TestCorp', alias: 'affiliated_stock' },
    data: { '普通株式': 600, '優先株式': 400 },
};

function makeProps(pieData: Record<string, number> = mockAst.data) {
    const data: CalloutNodeData = {
        ast: mockAst,
        sourceAlias: 'affiliated_stock',
        pieData,
    };
    return { data } as any;
}

describe('CalloutNode', () => {
    test('T1: outer div is 250×250px with border-box sizing', () => {
        render(<CalloutNode {...makeProps()} />);
        const el = screen.getByTestId('callout-node');
        expect(el.style.width).toBe('250px');
        expect(el.style.height).toBe('250px');
        expect(el.style.boxSizing).toBe('border-box');
    });

    test('T2: SVG element is present', () => {
        const { container } = render(<CalloutNode {...makeProps()} />);
        const svg = container.querySelector('svg[data-testid="pie-svg"]');
        expect(svg).not.toBeNull();
    });

    test('T3: at least one data circle exists in SVG', () => {
        const { container } = render(<CalloutNode {...makeProps()} />);
        const circles = container.querySelectorAll('circle');
        // background track + one per segment (2 entries) = at least 3
        expect(circles.length).toBeGreaterThanOrEqual(2);
    });

    test('T4: legend renders all pieData keys', () => {
        render(<CalloutNode {...makeProps()} />);
        expect(screen.getByText(/普通株式/)).toBeDefined();
        expect(screen.getByText(/優先株式/)).toBeDefined();
    });

    test('T5: percentages are shown (60.0% and 40.0% for 600/400 split)', () => {
        render(<CalloutNode {...makeProps()} />);
        expect(screen.getByText(/60\.0%/)).toBeDefined();
        expect(screen.getByText(/40\.0%/)).toBeDefined();
    });

    test('T6: zero-total edge case renders without crash and shows 0.0%', () => {
        render(<CalloutNode {...makeProps({ A: 0, B: 0 })} />);
        const spans = screen.getAllByText(/0\.0%/);
        expect(spans.length).toBe(2);
    });

    test('T7: has explicit target-left and target-right handles', () => {
        const { container } = render(<CalloutNode {...makeProps()} />);
        expect(container.querySelector('#target-left')).not.toBeNull();
        expect(container.querySelector('#target-right')).not.toBeNull();
    });
});
