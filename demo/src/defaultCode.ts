export const DEFAULT_BSML = `\
BalanceSheet "CloudMatrix" {
  config { tolerance = 1 currency = "JPY" unit = "百万円" }
  Assets {
    cash "現金及び預金" : 15000
    software "自社利用ソフトウェア" : 8000
    goodwill "のれん" : 3500
    investments "関係会社株式" : 2000
  }
  Liabilities {
    loan "長期借入金" : 5000
    bonds "社債" : 3000
  }
  Equity {
    capital "資本金" : 5000
    retained_earnings "利益剰余金" : 15500
  }
}

BalanceSheet "DataShield" {
  config { unit = "百万円" }
  Assets {
    cash "現金" : 400
    tech "技術資産" : 1200
  }
  Liabilities {
    debt "短期借入金" : 200
  }
  Equity {
    capital "資本金" : 1400
  }
}

note "MA_Note" {
  text = "2025年に完全子会社化。のれん償却期間は10年（定額法）。"
}

// Pie callout MUST target an existing item alias so the implicit edge can
// connect to a real \`handle-CloudMatrix-<alias>\` in the BalanceSheetNode DOM.
pie CloudMatrix.loan {
  "Aメガバンク" : 2500
  "B地方銀行" : 1500
  "C信用金庫" : 1000
}

// Edges use arrow operators; dotted edges are intended for annotations.
CloudMatrix.investments --> DataShield.capital : "100% 買収"
CloudMatrix.goodwill -.-> MA_Note
`;
