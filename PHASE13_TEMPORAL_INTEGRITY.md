# PHASE 13 — TEMPORAL INTEGRITY & RESTATEMENT SPECIFICATION

## 1. The $T_0$ Information Boundary

A cornerstone requirement of institutional investment process evaluation is preventing hindsight bias and temporal contamination:

$$\text{Decision Evaluation Evidence} \subseteq \text{Facts Available at } T_0$$

```
   T0 (Decision Time)                     T1 (Outcome Time)
─────────┼────────────────────────────────────────┼───────────► Time
         │                                        │
    Decision Made                            Outcome Observed
         │                                        │
  Snapshot Sealed                          Facts Verified
         │                                        │
[Only T <= T0 evidence]                   [T0 to T1 facts evaluated]
```

### Temporal Invariants
1. **No Future Evidence Injection**: Any fact or news item with timestamp $t > T_0$ is rejected during decision quality evaluation.
2. **Historical Valuation Immutability**: The DCF or multiples fair value recorded in `DecisionSnapshot.valuationState` at $T_0$ cannot be overwritten by today's valuation model.
3. **Historical Risk Budget Immutability**: The volatility, beta, and position size recorded at $T_0$ remain immutable.

---

## 2. Restatement Handling ($V_1 \rightarrow V_2$)

When Phase 11 identifies a financial restatement (e.g. FY2024 Revenue restated from \$383B to \$380B in a subsequent 10-K/A):

1. **Historical Decision Evaluation Integrity**:
   The decision quality evaluation at $T_0$ continues to use the $V_1$ information that the investor actually had access to.
2. **Restatement Impact Exposure**:
   Phase 13 separately generates a `RestatementImpact` object:
   - `decisionTimeTruth`: Original $V_1$ value.
   - `currentRestatedTruth`: Restated $V_2$ value.
   - `absoluteDelta` & `percentageChange`.
   - `restatementImpact`: `MATERIAL` ($>10\%$) vs. `IMMATERIAL` vs. `NONE`.

Phase 13 NEVER silently recomputes historical decision quality using restated numbers.
