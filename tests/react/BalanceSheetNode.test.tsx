// BalanceSheetNode component tests — spec v1.0 (Bun TDD)
// bun test tests/react/BalanceSheetNode.test.tsx

import { expect, test, describe, mock, afterEach } from 'bun:test';
import React from 'react';

// Mock @xyflow/react so Handle renders as a plain div (no Zustand store needed)
mock.module('@xyflow/react', () => ({
    Handle: ({ id, 'data-testid': testId, style, position, type, className }: any) =>
        React.createElement('div', {
            id,
            'data-testid': testId,
            style,
            'data-position': position,
            'data-handle-type': type,
            className,
        }),
    Position: { Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom' },
}));

import { render, screen, cleanup } from '@testing-library/react';
import { BalanceSheetNode } from '../../src/react/components/BalanceSheetNode.js';
import type { BalanceSheetNodeData } from '../../src/transformer/types.js';
import { MIN_ROW_HEIGHT } from '../../src/constants/layout.js';

afterEach(cleanup);

// ── Mock data (matches spec §2) ───────────────────────────────────────────────
const mockScaleFactor = 2.0;

const mockData: BalanceSheetNodeData = {
    ast: {
        id: 'TestBS',
        config: { tolerance: 10, currency: 'JPY', unit: 'M' },
        assets: [
            {
                type: 'category',
                alias: 'current',
                label: 'Current',
                children: [
                    { type: 'item', alias: 'cash', label: 'Cash', amount: 100 },
                ],
            },
        ],
        liabilities: [
            { type: 'item', alias: 'debt', label: 'Debt', amount: 80 },
        ],
        equity: [],
    },
    scaleFactor: mockScaleFactor,
    totalHeight: 200,
    padding: { side: 'liabilities_equity', type: 'imbalance', amount: 20 },
    labels: {
        assetsHeader: 'Assets',
        liabilitiesHeader: 'Liabilities',
        equityHeader: 'Equity',
        assetsTotal: 'Total Assets',
        liabilitiesTotal: 'Total Liabilities',
        equityTotal: 'Total Equity',
        liabilitiesEquityTotal: 'Total Liabilities & Equity',
    },
};

// NodeProps minimal shim — only `data` is required by our component
function makeProps(data: BalanceSheetNodeData) {
    return { data } as any;
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('BalanceSheetNode', () => {

    // Test 1: Mathematical Height Calculation (Pixel Perfection)
    // Also enforces spec §3 "No Layout-Altering Spacing" — padding/margin on item divs
    // would corrupt the proportional layout even if height is correct.
    test('T1: item height = amount * scaleFactor in px, no layout-altering spacing', () => {
        render(<BalanceSheetNode {...makeProps(mockData)} />);

        const cashEl = screen.getByTestId('item-cash');

        // ── Height ────────────────────────────────────────────────────────────
        // 100 (amount) × 2.0 (scaleFactor) = 200px — strict equality, not contains
        expect(cashEl.style.height).toBe('200px');

        // ── Spec §3: No layout-altering spacing on leaf item divs ─────────────
        // Any padding/margin value that is non-empty and non-zero will fail this.
        const cashStyle = cashEl.style;
        expect(cashStyle.marginTop).toBe('');
        expect(cashStyle.marginBottom).toBe('');
        expect(cashStyle.marginLeft).toBe('');
        expect(cashStyle.marginRight).toBe('');
        // paddingTop/Bottom must be absent ('') or explicitly zero ('0px').
        // A non-zero value like '10px' would make the effective box taller than
        // `height`, breaking the proportional layout — this assertion catches that.
        // (happy-dom serializes `padding: '0 8px'` → paddingTop: '0px', so we
        //  accept both '' and '0px' as "zero".)
        const zeroOrAbsent = (v: string) => v === '' || v === '0px' || v === '0';
        expect(zeroOrAbsent(cashStyle.paddingTop)).toBe(true);    // regression: '10px' → false → FAIL
        expect(zeroOrAbsent(cashStyle.paddingBottom)).toBe(true); // regression: '10px' → false → FAIL

        // ── Box sizing must be border-box ─────────────────────────────────────
        expect(cashStyle.boxSizing).toBe('border-box');
        expect(cashStyle.flexShrink).toBe('0');

        // ── debt item ─────────────────────────────────────────────────────────
        const debtEl = screen.getByTestId('item-debt');
        expect(debtEl.style.height).toBe('160px'); // 80 * 2.0
        expect(debtEl.style.marginTop).toBe('');
        expect(debtEl.style.marginBottom).toBe('');
        expect(zeroOrAbsent(debtEl.style.paddingTop)).toBe(true);
        expect(zeroOrAbsent(debtEl.style.paddingBottom)).toBe(true);
        expect(debtEl.style.boxSizing).toBe('border-box');
        expect(debtEl.style.flexShrink).toBe('0');
    });

    // Test 2: Ledger Typography & Number Formatting
    test('T2: item contains label text and formatted amount', () => {
        render(<BalanceSheetNode {...makeProps(mockData)} />);

        const cashEl = screen.getByTestId('item-cash');
        expect(cashEl.textContent).toContain('Cash');
        // Intl.NumberFormat('en-US') formats 100 → "100"
        expect(cashEl.textContent).toContain('100');

        const debtEl = screen.getByTestId('item-debt');
        expect(debtEl.textContent).toContain('Debt');
        expect(debtEl.textContent).toContain('80');
    });

    test('T2c: renders four subtotal rows with labels and amounts', () => {
        render(<BalanceSheetNode {...makeProps(mockData)} />);
        expect(screen.getByTestId('subtotal-assets').textContent).toContain('Total Assets');
        expect(screen.getByTestId('subtotal-assets').textContent).toContain('100');
        expect(screen.getByTestId('subtotal-liabilities').textContent).toContain('Total Liabilities');
        expect(screen.getByTestId('subtotal-liabilities').textContent).toContain('80');
        expect(screen.getByTestId('subtotal-equity').textContent).toContain('Total Equity');
        expect(screen.getByTestId('subtotal-equity').textContent).toContain('0');
        expect(screen.getByTestId('subtotal-liabilities-equity').textContent).toContain('Total Liabilities & Equity');
        expect(screen.getByTestId('subtotal-liabilities-equity').textContent).toContain('80');
    });

    test('T2b: tiny amount row respects MIN_ROW_HEIGHT clamp', () => {
        const tinyData: BalanceSheetNodeData = {
            ...mockData,
            scaleFactor: 0.1,
            ast: {
                ...mockData.ast,
                assets: [{ type: 'item', alias: 'tiny_cash', label: 'Tiny Cash', amount: 1 }],
                liabilities: [],
                equity: [],
            },
            padding: undefined,
        };

        render(<BalanceSheetNode {...makeProps(tinyData)} />);
        const tinyEl = screen.getByTestId('item-tiny_cash');
        expect(tinyEl.style.height).toBe(`${MIN_ROW_HEIGHT}px`);
    });

    // Test 3: Column Rendering & Imbalance Padding Injection
    test('T3: left+right columns exist; padding div is in right column with correct height', () => {
        render(<BalanceSheetNode {...makeProps(mockData)} />);

        const leftCol = screen.getByTestId('col-assets');
        expect(leftCol).toBeDefined();

        const rightCol = screen.getByTestId('col-liabilities-equity');
        expect(rightCol).toBeDefined();

        const paddingEl = screen.getByTestId('padding-imbalance');
        expect(paddingEl).toBeDefined();
        // padding sits inside the right column
        expect(rightCol.contains(paddingEl)).toBe(true);
        // height = 20 * 2.0 = 40px
        expect(paddingEl.style.height).toBe('40px');
    });

    // Test 4: Handle ID Injection (Crucial for React Flow Edges)
    test('T4: handles have correct id format handle-{astId}-{alias}', () => {
        const { container } = render(<BalanceSheetNode {...makeProps(mockData)} />);

        const cashHandle = container.querySelector('#handle-TestBS-cash');
        expect(cashHandle).not.toBeNull();

        const debtHandle = container.querySelector('#handle-TestBS-debt');
        expect(debtHandle).not.toBeNull();
    });

    // Test 5: Category Absolute Positioning
    test('T5: category label uses absolute positioning', () => {
        render(<BalanceSheetNode {...makeProps(mockData)} />);

        const categoryLabel = screen.getByTestId('category-label-current');
        expect(categoryLabel.className).toContain('absolute');
    });

    // Test 6: B/S Structural Elements (Configurable Labels)
    test('T6: section headers and subtotal labels are rendered from labels prop', () => {
        render(<BalanceSheetNode {...makeProps(mockData)} />);

        // Section headers  
        expect(screen.getByText('Assets')).toBeDefined();
        expect(screen.getByText('Liabilities')).toBeDefined();
        expect(screen.getByText('Equity')).toBeDefined();

        // Totals are in-bar rows (no outer footers)
        expect(screen.getByText('Total Assets')).toBeDefined();
        expect(screen.getByText('Total Liabilities & Equity')).toBeDefined();
    });

    test('T7: assets item handles are on left; liabilities/equity item handles are on right', () => {
        const { container } = render(<BalanceSheetNode {...makeProps(mockData)} />);

        const cashHandles = Array.from(container.querySelectorAll('#handle-TestBS-cash'));
        expect(cashHandles.length).toBeGreaterThan(0);
        for (const el of cashHandles) {
            expect((el as HTMLElement).dataset.position).toBe('left');
            expect(el.className).toContain('bsml-invisible-handle');
        }

        const debtHandles = Array.from(container.querySelectorAll('#handle-TestBS-debt'));
        expect(debtHandles.length).toBeGreaterThan(0);
        for (const el of debtHandles) {
            expect((el as HTMLElement).dataset.position).toBe('right');
            expect(el.className).toContain('bsml-invisible-handle');
        }
    });

    test('T8: renders root handles for alias-less edges', () => {
        const { container } = render(<BalanceSheetNode {...makeProps(mockData)} />);
        expect(container.querySelector('#handle-TestBS-root-in')).not.toBeNull();
        expect(container.querySelector('#handle-TestBS-root-out')).not.toBeNull();
    });
});
