// Test fixtures — copied from orders/0001-parser/fixtures.ts
// Adapted to use relative import path for the project's types.ts

import { BSMLDocument } from '../../src/ast/types.js';

// ============================================================================
// Fixture 1: Imbalance, Empty Categories, and English identifiers
// ============================================================================
export const fixture1_input = `
BalanceSheet "Startup" {
    config {
        tolerance = 10
        currency = "USD"
        unit = "k"
    }
    Assets {
        current "Current Assets" {
            cash "Cash" : 100
        }
        non_current "Non-Current Assets" {}
    }
    Liabilities {
        current "Current Liab" {
            debt "Short-term Debt" : 200
        }
    }
    Equity {
        capital "Capital" : 50
    }
}

note "Warning" {
    text = "Needs more funding. Imbalance of 50k detected."
}

Startup.cash -.-> Warning
`;

export const fixture1_ast: BSMLDocument = {
    balanceSheets: [
        {
            id: "Startup",
            config: {
                tolerance: 10,
                currency: "USD",
                unit: "k"
            },
            assets: [
                {
                    type: "category",
                    alias: "current",
                    label: "Current Assets",
                    children: [
                        { type: "item", alias: "cash", label: "Cash", amount: 100 }
                    ]
                },
                {
                    type: "category",
                    alias: "non_current",
                    label: "Non-Current Assets",
                    children: []
                }
            ],
            liabilities: [
                {
                    type: "category",
                    alias: "current",
                    label: "Current Liab",
                    children: [
                        { type: "item", alias: "debt", label: "Short-term Debt", amount: 200 }
                    ]
                }
            ],
            equity: [
                { type: "item", alias: "capital", label: "Capital", amount: 50 }
            ]
        }
    ],
    notes: [
        {
            id: "Warning",
            text: "Needs more funding. Imbalance of 50k detected."
        }
    ],
    edges: [
        {
            source: { nodeId: "Startup", alias: "cash" },
            target: { nodeId: "Warning" },
            style: "dotted"
        }
    ],
    callouts: []
};


// ============================================================================
// Fixture 2: Deep Nesting, Multiple Edges, and Pie Charts
// ============================================================================
export const fixture2_input = `
BalanceSheet "ExampleCorp" {
    config {
        tolerance = 0
        currency = "JPY"
        unit = "百万円"
    }
    Assets {
        non_current "固定資産" {
            investments "投資その他の資産" {
                securities "投資有価証券" : 1500
                affiliated_stock "関係会社株式" : 3000
            }
            tangible "有形固定資産" {
                headquarters "本社ビル" {
                    land "土地" : 300
                    building "建物" : 200
                }
            }
        }
    }
    Liabilities {
        non_current "固定負債" {
            long_term_debt "長期借入金" : 500
        }
    }
    Equity {
        capital "資本金" : 4500
    }
}

note "ValuationNote" {
    text = "長期的な投資戦略に基づく資産形成。"
}

ExampleCorp.land -.-> ValuationNote
ExampleCorp.securities -.-> ValuationNote

pie ExampleCorp.affiliated_stock {
    "普通株式" : 2000
    "優先株式" : 1000
}
`;

export const fixture2_ast: BSMLDocument = {
    balanceSheets: [
        {
            id: "ExampleCorp",
            config: {
                tolerance: 0,
                currency: "JPY",
                unit: "百万円"
            },
            assets: [
                {
                    type: "category",
                    alias: "non_current",
                    label: "固定資産",
                    children: [
                        {
                            type: "category",
                            alias: "investments",
                            label: "投資その他の資産",
                            children: [
                                { type: "item", alias: "securities", label: "投資有価証券", amount: 1500 },
                                { type: "item", alias: "affiliated_stock", label: "関係会社株式", amount: 3000 }
                            ]
                        },
                        {
                            type: "category",
                            alias: "tangible",
                            label: "有形固定資産",
                            children: [
                                {
                                    type: "category",
                                    alias: "headquarters",
                                    label: "本社ビル",
                                    children: [
                                        { type: "item", alias: "land", label: "土地", amount: 300 },
                                        { type: "item", alias: "building", label: "建物", amount: 200 }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ],
            liabilities: [
                {
                    type: "category",
                    alias: "non_current",
                    label: "固定負債",
                    children: [
                        { type: "item", alias: "long_term_debt", label: "長期借入金", amount: 500 }
                    ]
                }
            ],
            equity: [
                { type: "item", alias: "capital", label: "資本金", amount: 4500 }
            ]
        }
    ],
    notes: [
        {
            id: "ValuationNote",
            text: "長期的な投資戦略に基づく資産形成。"
        }
    ],
    edges: [
        {
            source: { nodeId: "ExampleCorp", alias: "land" },
            target: { nodeId: "ValuationNote" },
            style: "dotted"
        },
        {
            source: { nodeId: "ExampleCorp", alias: "securities" },
            target: { nodeId: "ValuationNote" },
            style: "dotted"
        }
    ],
    callouts: [
        {
            source: { bsId: "ExampleCorp", alias: "affiliated_stock" },
            data: {
                "普通株式": 2000,
                "優先株式": 1000
            }
        }
    ]
};


// ============================================================================
// Fixture 3: PascalCase aliases without labels (label omission)
// ============================================================================
export const fixture3_input = `
BalanceSheet "ExampleCorp" {
    config {
        tolerance = 0
        currency = "JPY"
        unit = "百万円"
    }
    Assets {
        NonCurrent {
            Investments {
                securities "投資有価証券" : 1500
            }
            Tangible {
                Headquarters {
                    land "土地" : 300
                    building "建物" : 200
                }
            }
        }
    }
    Liabilities {
        NonCurrent {
            long_term_debt "長期借入金" : 500
        }
    }
    Equity {
        capital "資本金" : 1500
    }
}

note "ValuationNote" {
    text = "長期的な投資戦略に基づく資産形成。"
}

ExampleCorp.land -.-> ValuationNote
ExampleCorp.securities -.-> ValuationNote
`;

export const fixture3_ast: BSMLDocument = {
    balanceSheets: [
        {
            id: "ExampleCorp",
            config: {
                tolerance: 0,
                currency: "JPY",
                unit: "百万円"
            },
            assets: [
                {
                    type: "category",
                    alias: "NonCurrent",
                    children: [
                        {
                            type: "category",
                            alias: "Investments",
                            children: [
                                { type: "item", alias: "securities", label: "投資有価証券", amount: 1500 }
                            ]
                        },
                        {
                            type: "category",
                            alias: "Tangible",
                            children: [
                                {
                                    type: "category",
                                    alias: "Headquarters",
                                    children: [
                                        { type: "item", alias: "land", label: "土地", amount: 300 },
                                        { type: "item", alias: "building", label: "建物", amount: 200 }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ],
            liabilities: [
                {
                    type: "category",
                    alias: "NonCurrent",
                    children: [
                        { type: "item", alias: "long_term_debt", label: "長期借入金", amount: 500 }
                    ]
                }
            ],
            equity: [
                { type: "item", alias: "capital", label: "資本金", amount: 1500 }
            ]
        }
    ],
    notes: [
        {
            id: "ValuationNote",
            text: "長期的な投資戦略に基づく資産形成。"
        }
    ],
    edges: [
        {
            source: { nodeId: "ExampleCorp", alias: "land" },
            target: { nodeId: "ValuationNote" },
            style: "dotted"
        },
        {
            source: { nodeId: "ExampleCorp", alias: "securities" },
            target: { nodeId: "ValuationNote" },
            style: "dotted"
        }
    ],
    callouts: []
};


// ============================================================================
// Fixture 4: Multiple Balance Sheets with Inter-Company Relations
// ============================================================================
export const fixture4_input = `
BalanceSheet "ParentCorp" {
    config {
        tolerance = 0
        currency = "JPY"
        unit = "百万円"
    }
    Assets {
        current {
            cash "現預金" : 1000
        }
        non_current {
            loan_to_sub "関係会社貸付金" : 500
        }
    }
    Liabilities {
        current {
            debt "短期借入金" : 200
        }
    }
    Equity {
        capital "資本金" : 1300
    }
}

BalanceSheet "SubCorp" {
    config {
        tolerance = 0
        currency = "JPY"
        unit = "百万円"
    }
    Assets {
        current {
            cash "現預金" : 600
        }
    }
    Liabilities {
        current {
            borrowing_from_parent "関係会社借入金" : 500
        }
    }
    Equity {
        capital "資本金" : 100
    }
}

note "TransactionNote" {
    text = "運転資金の貸付"
}

ParentCorp.loan_to_sub --> SubCorp.borrowing_from_parent : "貸付"
ParentCorp.loan_to_sub -.-> TransactionNote
`;

export const fixture4_ast: BSMLDocument = {
    balanceSheets: [
        {
            id: "ParentCorp",
            config: {
                tolerance: 0,
                currency: "JPY",
                unit: "百万円"
            },
            assets: [
                {
                    type: "category",
                    alias: "current",
                    children: [
                        { type: "item", alias: "cash", label: "現預金", amount: 1000 }
                    ]
                },
                {
                    type: "category",
                    alias: "non_current",
                    children: [
                        { type: "item", alias: "loan_to_sub", label: "関係会社貸付金", amount: 500 }
                    ]
                }
            ],
            liabilities: [
                {
                    type: "category",
                    alias: "current",
                    children: [
                        { type: "item", alias: "debt", label: "短期借入金", amount: 200 }
                    ]
                }
            ],
            equity: [
                { type: "item", alias: "capital", label: "資本金", amount: 1300 }
            ]
        },
        {
            id: "SubCorp",
            config: {
                tolerance: 0,
                currency: "JPY",
                unit: "百万円"
            },
            assets: [
                {
                    type: "category",
                    alias: "current",
                    children: [
                        { type: "item", alias: "cash", label: "現預金", amount: 600 }
                    ]
                }
            ],
            liabilities: [
                {
                    type: "category",
                    alias: "current",
                    children: [
                        { type: "item", alias: "borrowing_from_parent", label: "関係会社借入金", amount: 500 }
                    ]
                }
            ],
            equity: [
                { type: "item", alias: "capital", label: "資本金", amount: 100 }
            ]
        }
    ],
    notes: [
        {
            id: "TransactionNote",
            text: "運転資金の貸付"
        }
    ],
    edges: [
        {
            source: { nodeId: "ParentCorp", alias: "loan_to_sub" },
            target: { nodeId: "SubCorp", alias: "borrowing_from_parent" },
            label: "貸付",
            style: "solid"
        },
        {
            source: { nodeId: "ParentCorp", alias: "loan_to_sub" },
            target: { nodeId: "TransactionNote" },
            style: "dotted"
        }
    ],
    callouts: []
};
