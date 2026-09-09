# PHASE 17 — TAX DATA BOUNDARY & ZERO-FALLBACK SPECIFICATION

## 1. Non-Silent Fallback Invariants

The following values are strictly forbidden as silent substitutes for missing or unverified tax data:

| Prohibited Fallback | Permitted Deterministic State | Rationale |
| :--- | :--- | :--- |
| `taxRate = 0.0` | `TAX_RULE_UNAVAILABLE` | Zero rate is only allowed if explicit statutory rule proves exempt. |
| `costBasis = 0.0` | `COST_BASIS_UNAVAILABLE` | Zero basis cannot be inferred without proof of zero acquisition cost. |
| `holdingPeriod = 0` | `TAX_LOT_UNAVAILABLE` | Holding period requires valid acquisition and realization timestamps. |
| `jurisdiction = 'US'` | `JURISDICTION_UNAVAILABLE` | Country jurisdiction must be explicitly declared on account. |
| `basisMethod = 'FIFO'` | `COST_BASIS_UNAVAILABLE` | Basis method must be explicitly configured or sourced. |
| `afterTaxReturn = preTaxReturn` | `AFTER_TAX_RESULT_UNAVAILABLE` | Tax friction cannot be silently omitted. |

---

## 2. Temporal Strictness ($T_0$ Rules)

1. **Future Acquisitions:** Rejection with `TEMPORAL_VIOLATION` if $\text{acquisitionDate} > T_0$.
2. **Future Disposals:** Rejection with `TEMPORAL_VIOLATION` if $\text{disposalDate} > T_0$.
3. **Future Tax Rules:** Rejection with `TEMPORAL_VIOLATION` if tax rule is not yet effective at $T_0$.
4. **Retroactive Revision:** Corrections create a new version ($V_1 \to V_2$) referencing the predecessor hash. Historical packages remain immutable.

---

## 3. Data Provenance Classifications

1. `REAL_DATA`: Authoritative verified market data and live executions.
2. `LIVE_CONNECTED`: Active real-time feed connectivity.
3. `INTEGRATION_PROVEN`: Verified cross-phase integrated pipelines.
4. `PRODUCTION_PROVEN_ENGINE`: Deterministic calculation engines validated against edge cases.
5. `GOLDEN_SYNTHETIC`: Deterministic test fixtures with strict audit trails.
6. `CONFIGURED`: Static statutory tax rules loaded from verified legislative versions.
7. `REAL_DATA + GOLDEN_SYNTHETIC TAX LOTS`: Real market prices mapped to synthetic test lots.
