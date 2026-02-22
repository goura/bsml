export const DEFAULT_BSML = `\
BalanceSheet "HoldingCo" {
  config {
    tolerance = 10
    currency = "USD"
    unit = "Millions"
  }
  Assets {
    non_current {
      core_ip "Core IP" : 5000
      loan_to_sub "Loan to SubCo" : 1200
    }
  }
  Liabilities {
    non_current {
      bank_loan "Bank Loan" : 2000
    }
  }
  Equity { retained "Retained Earnings" : 4200 }
}

BalanceSheet "SubCo" {
  config {
    tolerance = 5
    currency = "USD"
    unit = "Millions"
  }
  Assets {
    non_current {
      equipment "Equipment" : 900
      investments "Investments" : 400
    }
  }
  Liabilities {
    non_current {
      interco "Intercompany Loan" : 1200
    }
  }
  Equity { capital "Capital" : 100 }
}

note "SubCoMemo" { text = "Core operating subsidiary" }

HoldingCo.loan_to_sub --> SubCo.interco
SubCo.equipment -.-> SubCoMemo
`;
