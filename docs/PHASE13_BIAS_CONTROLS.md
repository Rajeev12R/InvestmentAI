# PHASE 13 — BIAS CONTROLS & DATASET COMPLETENESS

## 1. Mitigation of Cognitive & Selection Biases

| Bias Type | Institutional Risk | Phase 13 Architectural Countermeasure |
| :--- | :--- | :--- |
| **Outcome Bias** | Judging a decision solely by whether it made money | Strict 2x2 matrix separating Decision Quality (Score 0–100) from Financial Outcome. |
| **Hindsight Bias** | Pretending future information was obvious at decision time | Immutable `DecisionSnapshot` capturing sealed $T_0$ state with `informationAvailableAt` boundary. |
| **Survivorship Bias** | Evaluating only active holdings or profitable positions | Enforcing `evaluationCoverage = evaluatedDecisions / eligibleDecisions` across all historical decisions (active, closed, rebalanced). |
| **Overconfidence Bias** | Inflated certainty in predictive claims | Calibration error calculation across 5 confidence buckets with empirical accuracy verification. |
| **Small Sample Fallacy** | Claiming skill from a few lucky trades | Explicit `INSUFFICIENT_SAMPLE` state when $N < 5$ per bucket or $N < 10$ overall. |

---

## 2. Dataset Completeness Metrics

Every aggregate investor scorecard exposes:
- `totalEligibleDecisions`
- `evaluatedDecisionsCount`
- `evaluationCoverage` ($\ge 80\%$ required for `isSurvivorshipBiasProtected: true`)
- `closedDecisionsCount`
- `openDecisionsCount`
- `missingObservationsCount`
