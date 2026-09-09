# PHASE 17 — TAX POLICY & JURISDICTION GOVERNANCE

## 1. Supported Tax Jurisdictions

### United States (`US`)
- **Rule Version:** `US-IRC-2024.1`
- **Holding Period Threshold:** 365 days
- **Short-Term Capital Gains (STCG):** 37.0% (top federal bracket)
- **Long-Term Capital Gains (LTCG):** 20.0% (top preferential bracket)
- **Qualified Dividends:** 20.0%
- **Non-Qualified Dividends:** 37.0%
- **Wash-Sale Window:** 30 days lookback / 30 days lookforward
- **Status:** `CONFIGURED`

### India (`IN`)
- **Rule Version:** `IN-FINACT-2024.2`
- **Holding Period Threshold:** 365 days (listed equities)
- **Short-Term Capital Gains (STCG):** 20.0% (Section 111A, post-Budget 2024)
- **Long-Term Capital Gains (LTCG):** 12.5% (Section 112A, post-Budget 2024)
- **Dividends:** 30.0% (taxable at investor slab / corporate rate)
- **Securities Transaction Tax (STT):** 0.1% (0.001)
- **Wash-Sale Window:** 30 days (configured compliance boundary)
- **Status:** `CONFIGURED`

---

## 2. Account Tax Treatment

| Account Type | Capital Gains Treatment | Dividend Treatment | Tax Drag Impact |
| :--- | :--- | :--- | :--- |
| `TAXABLE` | Subject to STCG / LTCG rates | Subject to Qualified / Non-Qualified rates | Full real-time drag |
| `TAX_DEFERRED` | No immediate realization tax | No immediate dividend tax | 0% immediate drag |
| `TAX_EXEMPT` | 0% capital gains tax | 0% dividend tax | 0% tax drag |
| `UNKNOWN` | `TAX_RULE_UNAVAILABLE` | `TAX_RULE_UNAVAILABLE` | Blocked until classified |

*Rule: An `UNKNOWN` account type must NEVER default to `TAXABLE` or `TAX_EXEMPT`.*

---

## 3. Versioned Tax Policies

### `TAX_POLICY_V1`
- **Effective From:** 2024-01-01T00:00:00.000Z
- **Effective To:** 2025-12-31T23:59:59.999Z
- **Objective Weights:**
  - $\lambda_1$ Risk = 1.0
  - $\lambda_2$ Transaction Cost = 1.0
  - $\lambda_3$ Tax Cost = 1.5
  - $\lambda_4$ Turnover Penalty = 0.5
- **Harvesting:** Min loss $100, Min loss 2.0%, Hurdle multiple 1.5x

### `TAX_POLICY_V2`
- **Effective From:** 2026-01-01T00:00:00.000Z
- **Supersedes:** `TAX_POLICY_V1`
- **Objective Weights:**
  - $\lambda_1$ Risk = 1.0
  - $\lambda_2$ Transaction Cost = 1.0
  - $\lambda_3$ Tax Cost = 2.0 (stricter penalty on realized tax)
  - $\lambda_4$ Turnover Penalty = 0.75
- **Harvesting:** Min loss $50, Min loss 1.5%, Hurdle multiple 1.2x
