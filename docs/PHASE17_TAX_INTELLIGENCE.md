# PHASE 17 — INSTITUTIONAL TAX-AWARE PORTFOLIO INTELLIGENCE & AFTER-TAX OPTIMIZATION

## 1. Executive Summary & Architectural Position

Phase 17 of InvestmentAI delivers a deterministic, institutional-grade tax intelligence and after-tax optimization layer. It evaluates tax lots, cost basis allocation methods, holding periods ($T_0$ strictness), realized and unrealized capital gains/losses, dividend distributions, transaction taxes, tax drag, after-tax expected returns, tax-loss harvesting opportunities, and multi-objective tax-aware rebalancing candidates.

### Architectural Hierarchy

```text
Truth Layer (Phase 1) + Market Data (Phase 10/11)
       ↓
Valuation (Phase 2A/2B) + Risk (Phase 3)
       ↓
Portfolio Performance (Phase 12) + Process Intelligence (Phase 13)
       ↓
Portfolio Construction (Phase 14)
       ↓
Implementation (Phase 15)
       ↓
Compliance & Governance (Phase 16)
       ↓
Tax Intelligence (Phase 17)
       ↓
After-Tax Analysis & Tax Drag
       ↓
Tax-Aware Rebalance / Harvesting Candidates
       ↓
Sealed TaxIntelligencePackage (SHA-256 + deepFreeze)
       ↓
Copilot Read-Only Explanations
       ↓
Human Review (NO BROKER EXECUTION)
```

Tax Intelligence sits above Phases 1–16 and consumes their sealed outputs without mutating them.

---

## 2. Core Formulas & Mathematical Foundations

### 1. Cost Basis Allocation
$$\text{Cost Basis} = \sum_{i} (\text{quantity}_i \times \text{acquisitionPrice}_i) + \text{explicit adjustments}$$
Methods supported: `FIFO`, `LIFO`, `SPECIFIC_LOT`.

### 2. Holding Period
$$\text{daysHeld} = \lfloor \frac{\text{realizationDate} - \text{acquisitionDate}}{86400000} \rfloor$$
Classification:
- $\text{daysHeld} \ge \text{thresholdDays} \implies \text{LONG\_TERM}$
- $\text{daysHeld} < \text{thresholdDays} \implies \text{SHORT\_TERM}$

### 3. Realized Gain / Loss
$$\text{Gross Proceeds} = \text{quantity} \times \text{salePrice}$$
$$\text{RealizedGainLoss} = \text{Gross Proceeds} - \text{AllocatedCostBasis} - \text{TransactionCosts}$$
$$\text{EstimatedTax} = (\text{Net STCG} \times \tau_{\text{stcg}}) + (\text{Net LTCG} \times \tau_{\text{ltcg}}) + (\text{Gross Proceeds} \times \tau_{\text{stt}})$$

### 4. Unrealized Gain / Loss (Mark-to-Market)
$$\text{UnrealizedGainLoss} = \text{CurrentMarketValue} - \text{RemainingCostBasis}$$
$$\text{EmbeddedTaxLiability} = \sum_{\text{gain lots}} (\text{UnrealizedGain}_i \times \tau_i)$$

### 5. Tax Drag
$$\text{Tax Drag} = \text{Pre-Tax Return} - \text{After-Tax Return}$$
$$\text{Tax Drag \%} = \frac{\text{Pre-Tax Return} - \text{After-Tax Return}}{\text{Pre-Tax Return}}$$

### 6. After-Tax Return
$$\text{AfterTaxTWR} = \text{PreTaxTWR} - \frac{\text{TotalActualTaxes} + \text{TransactionCosts}}{\text{PortfolioValue}}$$

### 7. After-Tax Expected Return
$$\text{AfterTaxExpectedReturn} = \text{VerifiedExpectedReturn} - \text{ExpectedTaxDrag}$$

### 8. Multi-Objective Tax-Aware Objective Overlay
$$\text{Utility} = \text{ExpectedAfterTaxReturn} - \lambda_1 \text{Risk} - \lambda_2 \text{TransactionCost} - \lambda_3 \text{TaxCost} - \lambda_4 \text{TurnoverPenalty}$$

---

## 3. Institutional Boundaries & AI Guardrails

1. **Decision Support Only:** `isExecuted = false`. No automated execution, order routing, or broker connectivity.
2. **No Tax Advice Disclaimer:** InvestmentAI does not provide legal, financial, or tax filing advice.
3. **Zero Fallback Prohibition:** Missing tax data or unknown jurisdictions yield explicit states (`UNAVAILABLE`, `INSUFFICIENT_DATA`, `TAX_RULE_UNAVAILABLE`, `COST_BASIS_UNAVAILABLE`, `JURISDICTION_UNAVAILABLE`, `AFTER_TAX_RESULT_UNAVAILABLE`). Coercing missing data to $0.0$ is strictly prohibited.
4. **AI Boundary:** Copilot has read-only access to sealed `TaxIntelligencePackage` artifacts and cannot override tax calculations or manufacture lots.
