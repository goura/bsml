// Transformer Output Types — spec v1.1

import type { Node, Edge } from '@xyflow/react';
import type { BalanceSheetNode, NoteNode, CalloutNode } from '../ast/types.js';

export interface BSMLReactFlowData {
    nodes: Node[];
    edges: Edge[];
}

// ---------------------------------------------------------
// Custom Node Data Payloads
// ---------------------------------------------------------

/** Payload for 'balanceSheet' custom node */
export interface BalanceSheetNodeData {
    [key: string]: unknown;
    ast: BalanceSheetNode;
    scaleFactor: number;
    totalHeight: number;
    padding?: {
        side: 'assets' | 'liabilities_equity';
        type: 'imbalance' | 'rounding';
        amount: number;
    };
}

/** Payload for 'note' custom node */
export interface NoteNodeData {
    [key: string]: unknown;
    ast: NoteNode;
    text: string;
}

/** Payload for 'callout' custom node */
export interface CalloutNodeData {
    [key: string]: unknown;
    ast: CalloutNode;
    sourceAlias: string;
    pieData: Record<string, number>;
}
