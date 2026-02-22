import { createToken, Lexer, ITokenConfig } from 'chevrotain';

// Skipped tokens
export const WhiteSpace = createToken({
    name: 'WhiteSpace',
    pattern: /\s+/,
    group: Lexer.SKIPPED,
});

export const LineComment = createToken({
    name: 'LineComment',
    pattern: /\/\/[^\n\r]*/,
    group: Lexer.SKIPPED,
});

// Keywords (must be defined BEFORE Identifier)
export const BalanceSheet = createToken({ name: 'BalanceSheet', pattern: /\bBalanceSheet\b/ });
export const Assets = createToken({ name: 'Assets', pattern: /\bAssets\b/ });
export const Liabilities = createToken({ name: 'Liabilities', pattern: /\bLiabilities\b/ });
export const Equity = createToken({ name: 'Equity', pattern: /\bEquity\b/ });
export const Note = createToken({ name: 'Note', pattern: /\bnote\b/ });
export const Pie = createToken({ name: 'Pie', pattern: /\bpie\b/ });
export const Config = createToken({ name: 'Config', pattern: /\bconfig\b/ });
export const Text = createToken({ name: 'Text', pattern: /\btext\b/ });

// Operators / punctuation (multi-char before single-char)
export const DottedArrow = createToken({ name: 'DottedArrow', pattern: /-.->/ });
export const SolidArrow = createToken({ name: 'SolidArrow', pattern: /-->/ });
export const LBrace = createToken({ name: 'LBrace', pattern: /\{/ });
export const RBrace = createToken({ name: 'RBrace', pattern: /\}/ });
export const Colon = createToken({ name: 'Colon', pattern: /:/ });
export const Equals = createToken({ name: 'Equals', pattern: /=/ });
export const Dot = createToken({ name: 'Dot', pattern: /\./ });

// Literals
export const NumberLiteral = createToken({
    name: 'NumberLiteral',
    pattern: /\d+(\.\d+)?/,
});

export const StringLiteral = createToken({
    name: 'StringLiteral',
    pattern: /"[^"]*"/,
});

// Identifier — MUST come after all keywords
export const Identifier = createToken({
    name: 'Identifier',
    pattern: /[a-zA-Z_][a-zA-Z0-9_]*/,
});

// Token order matters: keywords before Identifier, multi-char operators before single-char
export const allTokens = [
    WhiteSpace,
    LineComment,
    // Keywords
    BalanceSheet,
    Assets,
    Liabilities,
    Equity,
    Note,
    Pie,
    Config,
    Text,
    // Multi-char operators
    DottedArrow,
    SolidArrow,
    // Punctuation
    LBrace,
    RBrace,
    Colon,
    Equals,
    Dot,
    // Literals
    NumberLiteral,
    StringLiteral,
    // Identifier last
    Identifier,
];

export const BSMLLexer = new Lexer(allTokens);
