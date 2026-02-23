// Transformer Output Types — spec v1.1

import type { Node, Edge } from '@xyflow/react';
import type { BalanceSheetNode, NoteNode, CalloutNode } from '../ast/types.js';
import type { BSMLLabelSet } from '../constants/labels.js';

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
    /** Pre-calculated pixel width for Dagre layout (set by Transformer) */
    calculatedWidth?: number;
    /** Pre-calculated pixel height for Dagre layout (set by Transformer) */
    calculatedHeight?: number;
    padding?: {
        side: 'assets' | 'liabilities_equity';
        type: 'imbalance' | 'rounding';
        amount: number;
    };
    labels?: BSMLLabelSet;
}

/** Payload for 'note' custom node */
export interface NoteNodeData {
    [key: string]: unknown;
    ast: NoteNode;
    text: string;
    /** Pre-calculated pixel width for Dagre layout */
    calculatedWidth?: number;
    /** Pre-calculated pixel height for Dagre layout */
    calculatedHeight?: number;
}

/** Payload for 'callout' custom node */
export interface CalloutNodeData {
    [key: string]: unknown;
    ast: CalloutNode;
    sourceAlias: string;
    pieData: Record<string, number>;
    /** Pre-calculated pixel width for Dagre layout */
    calculatedWidth?: number;
    /** Pre-calculated pixel height for Dagre layout */
    calculatedHeight?: number;
}
