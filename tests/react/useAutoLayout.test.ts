// useAutoLayout tests — bun:test (no snapshots)
// bun test tests/react/useAutoLayout.test.ts

import { expect, test, describe } from 'bun:test';
import type { Node, Edge } from '@xyflow/react';
import { applyAutoLayout } from '../../src/react/hooks/useAutoLayout.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeNode(id: string): Node {
    return { id, type: 'balanceSheet', position: { x: 0, y: 0 }, data: {} };
}

function makeEdge(id: string, source: string, target: string): Edge {
    return { id, source, target };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('applyAutoLayout', () => {

    // T1: Two connected nodes end up in different ranks → distinct x positions.
    // (Disconnected nodes share rank under LR layout and get the same x — that
    //  is correct Dagre behaviour and tested via uniqueness only for connected graphs.)
    test('T1: two connected nodes get distinct x positions', () => {
        const nodes = [makeNode('a'), makeNode('b')];
        const edges = [makeEdge('e1', 'a', 'b')];
        const result = applyAutoLayout(nodes, edges);

        expect(result).toHaveLength(2);

        const [a, b] = result;
        // Source and target must be in different ranks → different x values
        expect(a.position.x).not.toBe(b.position.x);
    });

    // T2: All returned position values must be finite (no NaN / Infinity)
    test('T2: positions are finite numbers', () => {
        const nodes = [makeNode('x'), makeNode('y'), makeNode('z')];
        const edges = [makeEdge('e1', 'x', 'y'), makeEdge('e2', 'y', 'z')];
        const result = applyAutoLayout(nodes, edges);

        for (const node of result) {
            expect(Number.isFinite(node.position.x)).toBe(true);
            expect(Number.isFinite(node.position.y)).toBe(true);
        }
    });

    // T3: The function must NOT mutate the original nodes array or objects
    test('T3: original nodes array is not mutated (pure function)', () => {
        const nodes = [makeNode('p'), makeNode('q')];
        const original = nodes.map((n) => ({ ...n, position: { ...n.position } }));

        applyAutoLayout(nodes, []);

        // Array identity must be unchanged
        expect(nodes[0].position.x).toBe(original[0].position.x);
        expect(nodes[0].position.y).toBe(original[0].position.y);
        expect(nodes[1].position.x).toBe(original[1].position.x);
        expect(nodes[1].position.y).toBe(original[1].position.y);
    });

    // T4: Empty input returns empty array without throwing
    test('T4: empty nodes returns empty array', () => {
        const result = applyAutoLayout([], []);
        expect(result).toEqual([]);
    });

    // T5: Single node should still get a finite position
    test('T5: single node gets a finite non-NaN position', () => {
        const result = applyAutoLayout([makeNode('solo')], []);
        expect(result).toHaveLength(1);
        expect(Number.isFinite(result[0].position.x)).toBe(true);
        expect(Number.isFinite(result[0].position.y)).toBe(true);
    });

    // T6: Edges referencing unknown node IDs are safely ignored
    test('T6: dangling edge references do not crash', () => {
        const nodes = [makeNode('known')];
        const edges = [makeEdge('e1', 'known', 'unknown')];
        expect(() => applyAutoLayout(nodes, edges)).not.toThrow();
    });

    // T7: Custom options are respected — wider ranksep should produce larger x spread
    test('T7: larger ranksep produces a wider x-axis spread for connected nodes', () => {
        const nodes = [makeNode('src'), makeNode('tgt')];
        const edges = [makeEdge('e', 'src', 'tgt')];

        const tight = applyAutoLayout(nodes, edges, { ranksep: 50 });
        const wide = applyAutoLayout(nodes, edges, { ranksep: 800 });

        const tightSpread = Math.abs(tight[0].position.x - tight[1].position.x);
        const wideSpread = Math.abs(wide[0].position.x - wide[1].position.x);

        expect(wideSpread).toBeGreaterThan(tightSpread);
    });

    // T8: Nodes with a large calculatedHeight create a larger Y-spread than small ones.
    // Dagre places nodes so that they don't overlap; taller nodes need more room,
    // so the Y distance between two nodes in the same rank must be greater.
    test('T8: nodes with large calculatedHeight produce a greater Y-spread than small ones', () => {
        const makeTallNode = (id: string, h: number): Node => ({
            id,
            type: 'balanceSheet',
            position: { x: 0, y: 0 },
            data: { calculatedWidth: 300, calculatedHeight: h },
        });

        // Two disconnected nodes share the same rank → Dagre staggers them vertically.
        const smallNodes = [makeTallNode('a', 200), makeTallNode('b', 200)];
        const largeNodes = [makeTallNode('c', 1200), makeTallNode('d', 1200)];

        const smallResult = applyAutoLayout(smallNodes, []);
        const largeResult = applyAutoLayout(largeNodes, []);

        const smallYSpread = Math.abs(smallResult[0].position.y - smallResult[1].position.y);
        const largeYSpread = Math.abs(largeResult[0].position.y - largeResult[1].position.y);

        expect(largeYSpread).toBeGreaterThan(smallYSpread);
    });

    // T9: A node without calculatedHeight falls back to the default (600) without throwing.
    test('T9: node without calculatedHeight falls back to default and produces finite positions', () => {
        // makeNode produces nodes with data: {} — no calculatedHeight
        const result = applyAutoLayout([makeNode('fallback')], []);
        expect(result).toHaveLength(1);
        expect(Number.isFinite(result[0].position.x)).toBe(true);
        expect(Number.isFinite(result[0].position.y)).toBe(true);
    });
});
