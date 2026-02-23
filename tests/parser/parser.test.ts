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

    it('does not tokenize "piechart" as Pie keyword', () => {
        const input = `
BalanceSheet "ExampleCorp" {
  Assets {
    piechart "Pie Chart Asset" : 100
  }
  Liabilities {}
  Equity { capital : 100 }
}
`;
        const result = parseBSML(input);
        expect(result.balanceSheets[0].assets[0]).toEqual({
            type: 'item',
            alias: 'piechart',
            label: 'Pie Chart Asset',
            amount: 100,
        });
        expect(result.callouts).toEqual([]);
    });

    it('rejects pie block without alias in source ref', () => {
        const input = `
BalanceSheet "ExampleCorp" {
  Assets { cash : 100 }
  Liabilities {}
  Equity { capital : 100 }
}
pie ExampleCorp {
  "A" : 100
}
`;
        expect(() => parseBSML(input)).toThrow(/Parser errors:/);
    });

    it('parses optional config.lang string', () => {
        const input = `
BalanceSheet "LangCorp" {
  config {
    tolerance = 0
    currency = "USD"
    unit = "M"
    lang = "ja"
  }
  Assets {}
  Liabilities {}
  Equity {}
}
`;
        const result = parseBSML(input);
        expect(result.balanceSheets[0].config.lang).toBe('ja');
    });
});
