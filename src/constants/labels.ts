export type BSMLLang = 'default' | 'ja';

export interface BSMLLabelSet {
    assetsHeader: string;
    liabilitiesHeader: string;
    equityHeader: string;
    assetsTotal: string;
    liabilitiesTotal: string;
    equityTotal: string;
    liabilitiesEquityTotal: string;
}

export const LABELS_BY_LANG: Record<BSMLLang, BSMLLabelSet> = {
    default: {
        assetsHeader: 'Assets',
        liabilitiesHeader: 'Liabilities',
        equityHeader: 'Equity',
        assetsTotal: 'Total Assets',
        liabilitiesTotal: 'Total Liabilities',
        equityTotal: 'Total Equity',
        liabilitiesEquityTotal: 'Total Liabilities & Equity',
    },
    ja: {
        assetsHeader: '資産の部',
        liabilitiesHeader: '負債の部',
        equityHeader: '純資産の部',
        assetsTotal: '資産の部合計',
        liabilitiesTotal: '負債の部合計',
        equityTotal: '純資産の部合計',
        liabilitiesEquityTotal: '負債・純資産の部合計',
    },
};

export function normalizeLang(lang?: string): BSMLLang {
    return lang === 'ja' ? 'ja' : 'default';
}

export function isCompleteLabelSet(value: unknown): value is BSMLLabelSet {
    if (!value || typeof value !== 'object') return false;
    const labels = value as Record<string, unknown>;
    return (
        typeof labels.assetsHeader === 'string' &&
        typeof labels.liabilitiesHeader === 'string' &&
        typeof labels.equityHeader === 'string' &&
        typeof labels.assetsTotal === 'string' &&
        typeof labels.liabilitiesTotal === 'string' &&
        typeof labels.equityTotal === 'string' &&
        typeof labels.liabilitiesEquityTotal === 'string'
    );
}
