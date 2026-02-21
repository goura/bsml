import { CstNode, IToken } from 'chevrotain';
import { parserInstance } from './parser.js';
import type {
    BSMLDocument,
    BalanceSheetNode,
    TreeNode,
    CategoryNode,
    ItemNode,
    NoteNode,
    EdgeNode,
    CalloutNode,
} from '../ast/types.js';

// Helper: strip surrounding quotes from a string literal token
function unquote(token: IToken): string {
    return token.image.slice(1, -1);
}

// Build the visitor class from the parser's base visitor
const BaseVisitor = parserInstance.getBaseCstVisitorConstructor();

class BSMLVisitor extends BaseVisitor {
    constructor() {
        super();
        this.validateVisitor();
    }

    document(ctx: any): BSMLDocument {
        const doc: BSMLDocument = {
            balanceSheets: [],
            notes: [],
            edges: [],
            callouts: [],
        };

        if (ctx.balanceSheet) {
            for (const bs of ctx.balanceSheet) {
                doc.balanceSheets.push(this.visit(bs));
            }
        }
        if (ctx.noteBlock) {
            for (const n of ctx.noteBlock) {
                doc.notes.push(this.visit(n));
            }
        }
        if (ctx.edge) {
            for (const e of ctx.edge) {
                doc.edges.push(this.visit(e));
            }
        }
        if (ctx.pieBlock) {
            for (const p of ctx.pieBlock) {
                doc.callouts.push(this.visit(p));
            }
        }

        return doc;
    }

    balanceSheet(ctx: any): BalanceSheetNode {
        const id = unquote(ctx.StringLiteral[0]);

        // Parse config
        const config = ctx.configBlock
            ? this.visit(ctx.configBlock[0])
            : { tolerance: 0, currency: '', unit: '' };

        const assets: TreeNode[] = ctx.assetsBlock
            ? this.visit(ctx.assetsBlock[0])
            : [];
        const liabilities: TreeNode[] = ctx.liabilitiesBlock
            ? this.visit(ctx.liabilitiesBlock[0])
            : [];
        const equity: TreeNode[] = ctx.equityBlock
            ? this.visit(ctx.equityBlock[0])
            : [];

        return { id, config, assets, liabilities, equity };
    }

    configBlock(ctx: any): BalanceSheetNode['config'] {
        const config: any = { tolerance: 0, currency: '', unit: '' };
        if (ctx.configEntry) {
            for (const entry of ctx.configEntry) {
                const [key, value] = this.visit(entry);
                config[key] = value;
            }
        }
        return config;
    }

    configEntry(ctx: any): [string, string | number] {
        const key = ctx.Identifier[0].image;
        if (ctx.StringLiteral) {
            return [key, unquote(ctx.StringLiteral[0])];
        }
        return [key, Number(ctx.NumberLiteral[0].image)];
    }

    assetsBlock(ctx: any): TreeNode[] {
        return this._collectTreeNodes(ctx);
    }

    liabilitiesBlock(ctx: any): TreeNode[] {
        return this._collectTreeNodes(ctx);
    }

    equityBlock(ctx: any): TreeNode[] {
        return this._collectTreeNodes(ctx);
    }

    treeNode(ctx: any): TreeNode {
        const alias: string = ctx.Identifier[0].image;
        const label: string | undefined = ctx.StringLiteral
            ? unquote(ctx.StringLiteral[0])
            : undefined;

        // Category (has braces → children)
        if (ctx.LBrace) {
            const children: TreeNode[] = ctx.treeNode
                ? ctx.treeNode.map((child: CstNode) => this.visit(child))
                : [];
            const node: CategoryNode = { type: 'category', alias, children };
            if (label !== undefined) {
                node.label = label;
            }
            return node;
        }

        // Item (has colon → amount)
        const amount = Number(ctx.NumberLiteral[0].image);
        const node: ItemNode = { type: 'item', alias, amount };
        if (label !== undefined) {
            node.label = label;
        }
        return node;
    }

    noteBlock(ctx: any): NoteNode {
        const id = unquote(ctx.StringLiteral[0]);
        const text = unquote(ctx.StringLiteral[1]);
        return { id, text };
    }

    edge(ctx: any): EdgeNode {
        const source = this.visit(ctx.source[0]);
        const target = this.visit(ctx.target[0]);

        const style: 'solid' | 'dotted' = ctx.DottedArrow ? 'dotted' : 'solid';

        const edge: EdgeNode = { source, target, style };
        if (ctx.StringLiteral) {
            edge.label = unquote(ctx.StringLiteral[0]);
        }
        return edge;
    }

    edgeRef(ctx: any): { nodeId: string; alias?: string } {
        const nodeId = ctx.Identifier[0].image;
        const ref: { nodeId: string; alias?: string } = { nodeId };
        if (ctx.Identifier.length > 1) {
            ref.alias = ctx.Identifier[1].image;
        }
        return ref;
    }

    pieBlock(ctx: any): CalloutNode {
        const ref = this.visit(ctx.edgeRef[0]);
        const data: Record<string, number> = {};
        if (ctx.pieEntry) {
            for (const entry of ctx.pieEntry) {
                const [label, value] = this.visit(entry);
                data[label] = value;
            }
        }
        return {
            source: { bsId: ref.nodeId, alias: ref.alias },
            data,
        };
    }

    pieEntry(ctx: any): [string, number] {
        return [unquote(ctx.StringLiteral[0]), Number(ctx.NumberLiteral[0].image)];
    }

    // ── Private helpers ──────────────────────────────────────

    private _collectTreeNodes(ctx: any): TreeNode[] {
        if (!ctx.treeNode) return [];
        return ctx.treeNode.map((child: CstNode) => this.visit(child));
    }
}

export const visitorInstance = new BSMLVisitor();
