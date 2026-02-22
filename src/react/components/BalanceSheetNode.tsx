// BalanceSheetNode — React Flow custom node (spec v1.0)

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps, Node } from '@xyflow/react';
import type { BalanceSheetNodeData } from '../../transformer/types.js';
import type { TreeNode } from '../../ast/types.js';

// ── CSS variables (fallbacks for environments without the stylesheet) ──────────
const colors = {
    assetBg: 'var(--bsml-asset-bg, #eff6ff)',
    liabilityBg: 'var(--bsml-liability-bg, #fefce8)',
    equityBg: 'var(--bsml-equity-bg, #f0fdf4)',
    border: 'var(--bsml-border-color, #1e293b)',
    categoryLabel: 'var(--bsml-category-label-color, rgba(30,41,59,0.2))',
    headerFooter: 'var(--bsml-header-footer-color, rgba(30,41,59,0.35))',
} as const;

// ── Shared box-sizing reset ───────────────────────────────────────────────────
const boxBorder: React.CSSProperties = { boxSizing: 'border-box' };

// ── Number formatter ─────────────────────────────────────────────────────────
function formatAmount(amount: number, currency: string): string {
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'decimal',
            maximumFractionDigits: 2,
        }).format(amount);
    } catch {
        return String(amount);
    }
}

// ── TreeNodeRenderer (recursive) ─────────────────────────────────────────────
interface TreeNodeRendererProps {
    nodes: TreeNode[];
    scaleFactor: number;
    rootAstId: string;
    section: 'assets' | 'liabilities' | 'equity';
}

function TreeNodeRenderer({ nodes, scaleFactor, rootAstId, section }: TreeNodeRendererProps) {
    const itemBg =
        section === 'assets'
            ? colors.assetBg
            : section === 'liabilities'
                ? colors.liabilityBg
                : colors.equityBg;

    return (
        <>
            {nodes.map((node) => {
                if (node.type === 'item') {
                    const heightPx = node.amount * scaleFactor;
                    return (
                        <div
                            key={node.alias}
                            data-testid={`item-${node.alias}`}
                            style={{
                                ...boxBorder,
                                height: `${heightPx}px`,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '0 8px',
                                backgroundColor: itemBg,
                                borderBottom: `1px solid ${colors.border}`,
                                position: 'relative',
                                fontSize: '11px',
                                overflow: 'hidden',
                            }}
                        >
                            <Handle
                                type="target"
                                position={Position.Left}
                                id={`handle-${rootAstId}-${node.alias}`}
                                data-testid={`handle-${node.alias}`}
                                style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)' }}
                            />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {node.label ?? node.alias}
                            </span>
                            <span style={{ fontVariantNumeric: 'tabular-nums', marginLeft: 4, flexShrink: 0 }}>
                                {formatAmount(node.amount, '')}
                            </span>
                            <Handle
                                type="source"
                                position={Position.Right}
                                id={`handle-${rootAstId}-${node.alias}`}
                                data-testid={`handle-${node.alias}`}
                                style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }}
                            />
                        </div>
                    );
                }

                // CategoryNode
                return (
                    <div
                        key={node.alias}
                        data-testid={`category-${node.alias}`}
                        style={{
                            ...boxBorder,
                            display: 'flex',
                            flexDirection: 'column',
                            border: `1px solid ${colors.border}`,
                            position: 'relative',
                        }}
                    >
                        {/* Floating label — position: absolute so it consumes zero layout height */}
                        {(node.label ?? node.alias) && (
                            <span
                                className="absolute"
                                data-testid={`category-label-${node.alias}`}
                                style={{
                                    position: 'absolute',
                                    top: 4,
                                    left: 6,
                                    fontSize: '10px',
                                    color: colors.categoryLabel,
                                    pointerEvents: 'none',
                                    zIndex: 1,
                                    userSelect: 'none',
                                }}
                            >
                                {node.label ?? node.alias}
                            </span>
                        )}
                        <TreeNodeRenderer
                            nodes={node.children}
                            scaleFactor={scaleFactor}
                            rootAstId={rootAstId}
                            section={section}
                        />
                    </div>
                );
            })}
        </>
    );
}

// ── Floating overlay helper (headers / footers) ───────────────────────────────
function FloatingLabel({ text, position }: { text: string; position: 'top' | 'bottom' }) {
    const style: React.CSSProperties = {
        position: 'absolute',
        [position]: 2,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontSize: '9px',
        fontWeight: 600,
        color: colors.headerFooter,
        pointerEvents: 'none',
        zIndex: 2,
        userSelect: 'none',
    };
    return <span style={style}>{text}</span>;
}

// ── Padding block (imbalance / rounding) ─────────────────────────────────────
interface PaddingBlockProps {
    amount: number;
    scaleFactor: number;
    type: 'imbalance' | 'rounding';
}

function PaddingBlock({ amount, scaleFactor, type }: PaddingBlockProps) {
    const heightPx = amount * scaleFactor;
    const style: React.CSSProperties =
        type === 'imbalance'
            ? {
                ...boxBorder,
                height: `${heightPx}px`,
                backgroundColor: 'rgba(239,68,68,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 700,
                color: '#7f1d1d',
            }
            : {
                ...boxBorder,
                height: `${heightPx}px`,
                background:
                    'repeating-linear-gradient(45deg,transparent,transparent 4px,rgba(100,116,139,0.15) 4px,rgba(100,116,139,0.15) 8px)',
            };

    return (
        <div data-testid={`padding-${type}`} style={style}>
            {type === 'imbalance' ? 'IMBALANCE' : null}
        </div>
    );
}

// ── Default labels ────────────────────────────────────────────────────────────
const DEFAULT_LABELS = {
    assets: 'Assets',
    liabilities: 'Liabilities',
    equity: 'Equity',
    totalAssets: 'Total Assets',
    totalLiabilitiesEquity: 'Total Liabilities & Equity',
} as const;

// ── Root BalanceSheetNode ─────────────────────────────────────────────────────
type BSFlowNode = Node<BalanceSheetNodeData, 'balanceSheet'>;

export function BalanceSheetNode({ data }: NodeProps<BSFlowNode>) {
    const { ast, scaleFactor, padding, labels } = data as BalanceSheetNodeData;

    const L = {
        assets: labels?.assets ?? DEFAULT_LABELS.assets,
        liabilities: labels?.liabilities ?? DEFAULT_LABELS.liabilities,
        equity: labels?.equity ?? DEFAULT_LABELS.equity,
        totalAssets: labels?.totalAssets ?? DEFAULT_LABELS.totalAssets,
        totalLiabilitiesEquity: labels?.totalLiabilitiesEquity ?? DEFAULT_LABELS.totalLiabilitiesEquity,
    };

    const colStyle: React.CSSProperties = {
        ...boxBorder,
        display: 'flex',
        flexDirection: 'column',
        width: 256,
        position: 'relative',
    };

    return (
        <div
            style={{
                ...boxBorder,
                display: 'flex',
                flexDirection: 'row',
                border: `2px solid ${colors.border}`,
                backgroundColor: '#ffffff',
                boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
            }}
        >
            {/* LEFT COLUMN: Assets */}
            <div
                data-testid="col-assets"
                style={{ ...colStyle, borderRight: `2px solid ${colors.border}` }}
            >
                <FloatingLabel text={L.assets} position="top" />
                <TreeNodeRenderer
                    nodes={ast.assets}
                    scaleFactor={scaleFactor}
                    rootAstId={ast.id}
                    section="assets"
                />
                {padding?.side === 'assets' && (
                    <PaddingBlock amount={padding.amount} scaleFactor={scaleFactor} type={padding.type} />
                )}
                <FloatingLabel text={L.totalAssets} position="bottom" />
            </div>

            {/* RIGHT COLUMN: Liabilities & Equity */}
            <div data-testid="col-liabilities-equity" style={colStyle}>
                <FloatingLabel text={L.liabilities} position="top" />
                <TreeNodeRenderer
                    nodes={ast.liabilities}
                    scaleFactor={scaleFactor}
                    rootAstId={ast.id}
                    section="liabilities"
                />
                {/* Equity sub-section label — always rendered, zero-height */}
                <div style={{ position: 'relative', height: 0, overflow: 'visible' }}>
                    <span
                        data-testid="equity-label"
                        style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            textAlign: 'center',
                            fontSize: '9px',
                            fontWeight: 600,
                            color: colors.headerFooter,
                            pointerEvents: 'none',
                            userSelect: 'none',
                            zIndex: 2,
                        }}
                    >
                        {L.equity}
                    </span>
                </div>
                <TreeNodeRenderer
                    nodes={ast.equity}
                    scaleFactor={scaleFactor}
                    rootAstId={ast.id}
                    section="equity"
                />
                {padding?.side === 'liabilities_equity' && (
                    <PaddingBlock amount={padding.amount} scaleFactor={scaleFactor} type={padding.type} />
                )}
                <FloatingLabel text={L.totalLiabilitiesEquity} position="bottom" />
            </div>
        </div>
    );
}

export default BalanceSheetNode;
