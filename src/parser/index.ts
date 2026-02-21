import { BSMLLexer } from './lexer.js';
import { parserInstance } from './parser.js';
import { visitorInstance } from './visitor.js';
import type { BSMLDocument } from '../ast/types.js';

export class BSMLParseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'BSMLParseError';
    }
}

/**
 * Parse BSML source text into an AST.
 * @throws {BSMLParseError} on lexing or parsing errors.
 */
export function parseBSML(input: string): BSMLDocument {
    // 1. Lex
    const lexResult = BSMLLexer.tokenize(input);
    if (lexResult.errors.length > 0) {
        const msgs = lexResult.errors.map((e) => e.message).join('\n');
        throw new BSMLParseError(`Lexer errors:\n${msgs}`);
    }

    // 2. Parse (CST)
    parserInstance.input = lexResult.tokens;
    const cst = parserInstance.document();
    if (parserInstance.errors.length > 0) {
        const msgs = parserInstance.errors.map((e) => e.message).join('\n');
        throw new BSMLParseError(`Parser errors:\n${msgs}`);
    }

    // 3. Visit (CST → AST)
    return visitorInstance.visit(cst);
}
