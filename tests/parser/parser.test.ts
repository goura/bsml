import { describe, it, expect } from 'bun:test';
import { parseBSML } from '../../src/parser/index.js';
import {
    fixture1_input, fixture1_ast,
    fixture2_input, fixture2_ast,
    fixture3_input, fixture3_ast,
    fixture4_input, fixture4_ast,
} from '../fixtures/fixtures.js';

describe('BSML Parser', () => {
    it('fixture 1: empty category, English identifiers, dotted edge', () => {
        const result = parseBSML(fixture1_input);
        expect(result).toEqual(fixture1_ast);
    });

    it('fixture 2: deep nesting, pie callout, multiple edges, Japanese labels', () => {
        const result = parseBSML(fixture2_input);
        expect(result).toEqual(fixture2_ast);
    });

    it('fixture 3: PascalCase aliases without labels (label omission)', () => {
        const result = parseBSML(fixture3_input);
        expect(result).toEqual(fixture3_ast);
    });

    it('fixture 4: multiple balance sheets with inter-company relations', () => {
        const result = parseBSML(fixture4_input);
        expect(result).toEqual(fixture4_ast);
    });
});
