// BSML AST Type Definitions — spec v1.3

export interface BSMLDocument {
    balanceSheets: BalanceSheetNode[];
    notes: NoteNode[];
    edges: EdgeNode[];
    callouts: CalloutNode[];
}

export interface BalanceSheetNode {
    id: string;
    config: {
        tolerance: number;
        currency: string;
        unit: string;
        lang?: string;
    };
    assets: TreeNode[];
    liabilities: TreeNode[];
    equity: TreeNode[];
}

export type TreeNode = CategoryNode | ItemNode;

export interface CategoryNode {
    type: 'category';
    alias: string;
    label?: string;
    children: TreeNode[];
}

export interface ItemNode {
    type: 'item';
    alias: string;
    label?: string;
    amount: number;
}

export interface NoteNode {
    id: string;
    text: string;
}

export interface EdgeNode {
    source: {
        nodeId: string;
        alias?: string;
    };
    target: {
        nodeId: string;
        alias?: string;
    };
    label?: string;
    style: 'solid' | 'dotted';
}

export interface CalloutNode {
    source: {
        bsId: string;
        alias: string;
    };
    data: Record<string, number>;
}
