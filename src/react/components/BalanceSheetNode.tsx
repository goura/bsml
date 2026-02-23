// BalanceSheetNode — React Flow custom node (spec v1.0)

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps, Node } from '@xyflow/react';
import type { BalanceSheetNodeData } from '../../transformer/types.js';
import type { TreeNode } from '../../ast/types.js';
import { BS_HEADER_HEIGHT, MIN_ROW_HEIGHT } from '../../constants/layout.js';
import { LABELS_BY_LANG, isCompleteLabelSet, normalizeLang } from '../../constants/labels.js';

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

function sumTreeAmount(nodes: TreeNode[]): number {
    let total = 0;
    for (const node of nodes) {
        if (node.type === 'item') {
            total += node.amount;
        } else {
            total += sumTreeAmount(node.children);
        }
    }
    return total;
}

function sumRenderedTreeHeight(nodes: TreeNode[], scaleFactor: number): number {
    let total = 0;
    for (const node of nodes) {
        if (node.type === 'item') {
            total += Math.max(node.amount * scaleFactor, MIN_ROW_HEIGHT);
        } else {
            total += sumRenderedTreeHeight(node.children, scaleFactor);
        }
    }
    return total;
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

    const handlePosition = section === 'assets' ? Position.Left : Position.Right;
    const handleOffset = handlePosition === Position.Left ? { left: 0 } : { right: 0 };

    return (
        <>
            {nodes.map((node) => {
                if (node.type === 'item') {
                    const heightPx = Math.max(node.amount * scaleFactor, MIN_ROW_HEIGHT);
                    return (
                        <div
                            key={node.alias}
                            data-testid={`item-${node.alias}`}
                            style={{
                                ...boxBorder,
                                height: `${heightPx}px`,
                                display: 'flex',
                                flexShrink: 0,
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
                                position={handlePosition}
                                id={`handle-${rootAstId}-${node.alias}`}
                                data-testid={`handle-${node.alias}`}
                                className="bsml-invisible-handle"
                                style={{
                                    position: 'absolute',
                                    ...handleOffset,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                }}
                            />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {node.label ?? node.alias}
                            </span>
                            <span style={{ fontVariantNumeric: 'tabular-nums', marginLeft: 4, flexShrink: 0 }}>
                                {formatAmount(node.amount, '')}
                            </span>
                            <Handle
                                type="source"
                                position={handlePosition}
                                id={`handle-${rootAstId}-${node.alias}`}
                                data-testid={`handle-${node.alias}`}
                                className="bsml-invisible-handle"
                                style={{
                                    position: 'absolute',
                                    ...handleOffset,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                }}
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
                            flexShrink: 0,
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

// ── Padding block (imbalance / rounding) ─────────────────────────────────────
interface PaddingBlockProps {
    heightPx: number;
    type: 'imbalance' | 'rounding';
    dataTestId?: string;
    invisible?: boolean;
}

function PaddingBlock({ heightPx, type, dataTestId, invisible }: PaddingBlockProps) {
    const style: React.CSSProperties =
        invisible
            ? {
                ...boxBorder,
                height: `${heightPx}px`,
                flexShrink: 0,
                background: 'transparent',
            }
            : type === 'imbalance'
            ? {
                ...boxBorder,
                height: `${heightPx}px`,
                backgroundColor: 'rgba(239,68,68,0.4)',
                display: 'flex',
                flexShrink: 0,
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 700,
                color: '#7f1d1d',
            }
            : {
                ...boxBorder,
                height: `${heightPx}px`,
                flexShrink: 0,
                background:
                    'repeating-linear-gradient(45deg,transparent,transparent 4px,rgba(100,116,139,0.15) 4px,rgba(100,116,139,0.15) 8px)',
            };

    return (
        <div data-testid={dataTestId ?? `padding-${type}`} style={style}>
            {!invisible && type === 'imbalance' ? 'IMBALANCE' : null}
        </div>
    );
}

function SubtotalRow({ label, amount, testId }: { label: string; amount: number; testId: string }) {
    return (
        <div
            data-testid={testId}
            style={{
                ...boxBorder,
                height: `${MIN_ROW_HEIGHT}px`,
                display: 'flex',
                flexShrink: 0,
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0 8px',
                fontSize: '11px',
                fontWeight: 700,
                borderTop: `1px solid ${colors.border}`,
                backgroundColor: 'rgba(148,163,184,0.12)',
            }}
        >
            <span>{label}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatAmount(amount, '')}</span>
        </div>
    );
}

// ── Root BalanceSheetNode ─────────────────────────────────────────────────────
type BSFlowNode = Node<BalanceSheetNodeData, 'balanceSheet'>;

export function BalanceSheetNode({ data }: NodeProps<BSFlowNode>) {
    const { ast, scaleFactor, padding, labels } = data as BalanceSheetNodeData;
    const assetsSubtotal = sumTreeAmount(ast.assets);
    const liabilitiesSubtotal = sumTreeAmount(ast.liabilities);
    const equitySubtotal = sumTreeAmount(ast.equity);
    const renderedAssetsHeight = sumRenderedTreeHeight(ast.assets, scaleFactor);
    const renderedLiabilitiesHeight = sumRenderedTreeHeight(ast.liabilities, scaleFactor);
    const renderedEquityHeight = sumRenderedTreeHeight(ast.equity, scaleFactor);
    const renderedPaddingHeight = padding ? padding.amount * scaleFactor : 0;

    const assetsNaturalHeight =
        renderedAssetsHeight + (padding?.side === 'assets' ? renderedPaddingHeight : 0) + MIN_ROW_HEIGHT;
    const liabilitiesNaturalHeight = renderedLiabilitiesHeight + MIN_ROW_HEIGHT;
    const equityNaturalHeight =
        renderedEquityHeight + (padding?.side === 'liabilities_equity' ? renderedPaddingHeight : 0) + MIN_ROW_HEIGHT;
    const rightNaturalHeight = liabilitiesNaturalHeight + equityNaturalHeight + MIN_ROW_HEIGHT;

    const assetsSlackHeight = Math.max(data.totalHeight - assetsNaturalHeight, 0);
    const rightSlackHeight = Math.max(data.totalHeight - rightNaturalHeight, 0);
    const equitySlackHeight = rightSlackHeight;

    const langLabels = LABELS_BY_LANG[normalizeLang(ast.config.lang)];
    const L = isCompleteLabelSet(labels) ? labels : langLabels;

    const colStyle: React.CSSProperties = {
        ...boxBorder,
        display: 'flex',
        flexDirection: 'column',
        width: 256,
        flexShrink: 0,
    };

    const headerStyle: React.CSSProperties = {
        ...boxBorder,
        height: `${BS_HEADER_HEIGHT}px`,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '10px',
        fontWeight: 600,
        color: colors.headerFooter,
        userSelect: 'none',
    };

    const barAreaStyle: React.CSSProperties = {
        ...boxBorder,
        height: `${data.totalHeight}px`,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
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
                position: 'relative',
            }}
        >
            {/* Root handles: used for alias-less inter-node edges (e.g., Company --> Subsidiary) */}
            <Handle
                type="target"
                position={Position.Left}
                id={`handle-${ast.id}-root-in`}
                className="bsml-invisible-handle"
                style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)' }}
            />
            <Handle
                type="source"
                position={Position.Right}
                id={`handle-${ast.id}-root-out`}
                className="bsml-invisible-handle"
                style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }}
            />

            {/* LEFT COLUMN: Assets */}
            <div
                data-testid="col-assets"
                style={{ ...colStyle, borderRight: `2px solid ${colors.border}` }}
            >
                <div style={headerStyle}>{L.assetsHeader}</div>
                <div style={barAreaStyle}>
                    <TreeNodeRenderer
                        nodes={ast.assets}
                        scaleFactor={scaleFactor}
                        rootAstId={ast.id}
                        section="assets"
                    />
                    {(padding?.side === 'assets' || assetsSlackHeight > 0) && (
                        <PaddingBlock
                            heightPx={(padding?.side === 'assets' ? renderedPaddingHeight : 0) + assetsSlackHeight}
                            type={padding?.side === 'assets' ? padding.type : 'rounding'}
                            invisible={padding?.side !== 'assets'}
                            dataTestId={padding?.side === 'assets' ? `padding-${padding.type}` : 'padding-assets-slack'}
                        />
                    )}
                    <SubtotalRow label={L.assetsTotal} amount={assetsSubtotal} testId="subtotal-assets" />
                </div>
            </div>

            {/* RIGHT COLUMN: Liabilities & Equity */}
            <div data-testid="col-liabilities-equity" style={colStyle}>
                <div style={headerStyle}>{L.liabilitiesHeader}</div>
                <div style={barAreaStyle}>
                    <div style={{ ...boxBorder, display: 'flex', flexDirection: 'column' }}>
                        <TreeNodeRenderer
                            nodes={ast.liabilities}
                            scaleFactor={scaleFactor}
                            rootAstId={ast.id}
                            section="liabilities"
                        />
                        <SubtotalRow label={L.liabilitiesTotal} amount={liabilitiesSubtotal} testId="subtotal-liabilities" />
                    </div>
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
                            {L.equityHeader}
                        </span>
                    </div>
                    <div style={{ ...boxBorder, display: 'flex', flexDirection: 'column', borderTop: `1px solid ${colors.border}` }}>
                        <TreeNodeRenderer
                            nodes={ast.equity}
                            scaleFactor={scaleFactor}
                            rootAstId={ast.id}
                            section="equity"
                        />
                        {(padding?.side === 'liabilities_equity' || equitySlackHeight > 0) && (
                            <PaddingBlock
                                heightPx={(padding?.side === 'liabilities_equity' ? renderedPaddingHeight : 0) + equitySlackHeight}
                                type={padding?.side === 'liabilities_equity' ? padding.type : 'rounding'}
                                invisible={padding?.side !== 'liabilities_equity'}
                                dataTestId={padding?.side === 'liabilities_equity' ? `padding-${padding.type}` : 'padding-equity-slack'}
                            />
                        )}
                        <SubtotalRow label={L.equityTotal} amount={equitySubtotal} testId="subtotal-equity" />
                    </div>
                    <SubtotalRow
                        label={L.liabilitiesEquityTotal}
                        amount={liabilitiesSubtotal + equitySubtotal}
                        testId="subtotal-liabilities-equity"
                    />
                </div>
            </div>
        </div>
    );
}

export default BalanceSheetNode;
