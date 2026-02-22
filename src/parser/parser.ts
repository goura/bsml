import { CstParser } from 'chevrotain';
import {
    allTokens,
    BalanceSheet,
    Assets,
    Liabilities,
    Equity,
    Note,
    Pie,
    Config,
    Text,
    DottedArrow,
    SolidArrow,
    LBrace,
    RBrace,
    Colon,
    Equals,
    Dot,
    NumberLiteral,
    StringLiteral,
    Identifier,
} from './lexer.js';

export class BSMLParser extends CstParser {
    constructor() {
        super(allTokens);
        this.performSelfAnalysis();
    }

    // ── Top-level ──────────────────────────────────────────────

    public document = this.RULE('document', () => {
        this.MANY(() => {
            this.OR([
                { ALT: () => this.SUBRULE(this.balanceSheet) },
                { ALT: () => this.SUBRULE(this.noteBlock) },
                { ALT: () => this.SUBRULE(this.edge) },
                { ALT: () => this.SUBRULE(this.pieBlock) },
            ]);
        });
    });

    // ── BalanceSheet ───────────────────────────────────────────

    private balanceSheet = this.RULE('balanceSheet', () => {
        this.CONSUME(BalanceSheet);
        this.CONSUME(StringLiteral); // id
        this.CONSUME(LBrace);
        this.OPTION(() => this.SUBRULE(this.configBlock));
        this.OPTION2(() => this.SUBRULE(this.assetsBlock));
        this.OPTION3(() => this.SUBRULE(this.liabilitiesBlock));
        this.OPTION4(() => this.SUBRULE(this.equityBlock));
        this.CONSUME(RBrace);
    });

    private configBlock = this.RULE('configBlock', () => {
        this.CONSUME(Config);
        this.CONSUME(LBrace);
        this.MANY(() => this.SUBRULE(this.configEntry));
        this.CONSUME(RBrace);
    });

    private configEntry = this.RULE('configEntry', () => {
        this.CONSUME(Identifier);
        this.CONSUME(Equals);
        this.OR([
            { ALT: () => this.CONSUME(StringLiteral) },
            { ALT: () => this.CONSUME(NumberLiteral) },
        ]);
    });

    private assetsBlock = this.RULE('assetsBlock', () => {
        this.CONSUME(Assets);
        this.CONSUME(LBrace);
        this.MANY(() => this.SUBRULE(this.treeNode));
        this.CONSUME(RBrace);
    });

    private liabilitiesBlock = this.RULE('liabilitiesBlock', () => {
        this.CONSUME(Liabilities);
        this.CONSUME(LBrace);
        this.MANY(() => this.SUBRULE(this.treeNode));
        this.CONSUME(RBrace);
    });

    private equityBlock = this.RULE('equityBlock', () => {
        this.CONSUME(Equity);
        this.CONSUME(LBrace);
        this.MANY(() => this.SUBRULE(this.treeNode));
        this.CONSUME(RBrace);
    });

    // ── TreeNode (recursive: category or item) ────────────────

    private treeNode = this.RULE('treeNode', () => {
        this.CONSUME(Identifier);                        // alias
        this.OPTION(() => this.CONSUME(StringLiteral));  // optional label
        this.OR([
            {
                // Category: { children* }
                ALT: () => {
                    this.CONSUME(LBrace);
                    this.MANY(() => this.SUBRULE(this.treeNode));
                    this.CONSUME(RBrace);
                },
            },
            {
                // Item: : amount
                ALT: () => {
                    this.CONSUME(Colon);
                    this.CONSUME(NumberLiteral);
                },
            },
        ]);
    });

    // ── Note ──────────────────────────────────────────────────

    private noteBlock = this.RULE('noteBlock', () => {
        this.CONSUME(Note);
        this.CONSUME(StringLiteral);  // id
        this.CONSUME(LBrace);
        this.CONSUME(Text);
        this.CONSUME(Equals);
        this.CONSUME2(StringLiteral); // text content
        this.CONSUME(RBrace);
    });

    // ── Edge ──────────────────────────────────────────────────

    private edge = this.RULE('edge', () => {
        this.SUBRULE(this.edgeRef, { LABEL: 'source' });
        this.OR([
            { ALT: () => this.CONSUME(SolidArrow) },
            { ALT: () => this.CONSUME(DottedArrow) },
        ]);
        this.SUBRULE2(this.edgeRef, { LABEL: 'target' });
        this.OPTION(() => {
            this.CONSUME(Colon);
            this.CONSUME(StringLiteral); // edge label
        });
    });

    private edgeRef = this.RULE('edgeRef', () => {
        this.CONSUME(Identifier); // nodeId (or just identifier for notes)
        this.OPTION(() => {
            this.CONSUME(Dot);
            this.CONSUME2(Identifier); // alias within BS
        });
    });

    // ── Pie (Callout) ─────────────────────────────────────────

    private pieBlock = this.RULE('pieBlock', () => {
        this.CONSUME(Pie);
        this.SUBRULE(this.pieSourceRef);  // source ref (alias is mandatory)
        this.CONSUME(LBrace);
        this.MANY(() => this.SUBRULE(this.pieEntry));
        this.CONSUME(RBrace);
    });

    private pieSourceRef = this.RULE('pieSourceRef', () => {
        this.CONSUME(Identifier); // bsId
        this.CONSUME(Dot);
        this.CONSUME2(Identifier); // alias
    });

    private pieEntry = this.RULE('pieEntry', () => {
        this.CONSUME(StringLiteral); // label
        this.CONSUME(Colon);
        this.CONSUME(NumberLiteral); // value
    });
}

// Singleton parser instance (Chevrotain parsers are stateless after construction)
export const parserInstance = new BSMLParser();
