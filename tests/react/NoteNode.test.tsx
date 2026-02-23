// NoteNode component tests (Bun TDD)
// bun test tests/react/NoteNode.test.tsx

import { expect, test, describe, mock, afterEach } from 'bun:test';
import React from 'react';

mock.module('@xyflow/react', () => ({
    Handle: ({ id, 'data-testid': testId, style }: any) =>
        React.createElement('div', { id, 'data-testid': testId, style }),
    Position: { Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom' },
}));

import { render, screen, cleanup } from '@testing-library/react';
import { NoteNode } from '../../src/react/components/NoteNode.js';
import type { NoteNodeData } from '../../src/transformer/types.js';

afterEach(cleanup);

const mockAst: NoteNodeData['ast'] = { id: 'TestNote', text: 'Debt ratio needs adjustment.' };

function makeProps(text: string) {
    const data: NoteNodeData = { ast: mockAst, text };
    return { data } as any;
}

describe('NoteNode', () => {
    test('T1: outer div is 200×100px with border-box sizing', () => {
        render(<NoteNode {...makeProps('Hello note')} />);
        const el = screen.getByTestId('note-node');
        expect(el.style.width).toBe('200px');
        expect(el.style.height).toBe('100px');
        expect(el.style.boxSizing).toBe('border-box');
    });

    test('T2: renders the text content', () => {
        render(<NoteNode {...makeProps('Debt ratio needs adjustment.')} />);
        expect(screen.getByText('Debt ratio needs adjustment.')).toBeDefined();
    });

    test('T3: has explicit target-left and target-right handles', () => {
        const { container } = render(<NoteNode {...makeProps('memo')} />);
        expect(container.querySelector('#target-left')).not.toBeNull();
        expect(container.querySelector('#target-right')).not.toBeNull();
    });
});
