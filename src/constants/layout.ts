// Layout constants — Single Source of Truth for dimensions used by transform/layout/render

/** Width of each balance-sheet column in BalanceSheetNode */
export const COLUMN_WIDTH = 256;
/** Vertical divider width between asset and liabilities/equity columns */
export const DIVIDER_WIDTH = 2;
/** Border width used on each side of the root BalanceSheet node */
export const OUTER_BORDER_WIDTH = 2;

/** Header overlay height budget used for Dagre sizing */
export const BS_HEADER_HEIGHT = 40;
/** Default max content height for the tallest balance-sheet bar area */
export const DEFAULT_MAX_NODE_HEIGHT = 600;
/** Minimum height per rendered item row to keep text legible */
export const MIN_ROW_HEIGHT = 24;

/** Calculated total width for a BalanceSheet node */
export const BS_NODE_WIDTH =
    COLUMN_WIDTH * 2 + DIVIDER_WIDTH + OUTER_BORDER_WIDTH * 2; // 518

export const NOTE_NODE_WIDTH = 200;
export const NOTE_NODE_HEIGHT = 100;

export const CALLOUT_NODE_WIDTH = 250;
export const CALLOUT_NODE_HEIGHT = 250;
