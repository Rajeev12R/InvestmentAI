# Phase 16 — Institutional Policy Model & Versioning Specification

## 1. Policy Structure

Every investment policy statement (IPS) is represented as an immutable, versioned document:

```json
{
  "policyId": "POL-GLOBAL-GROWTH",
  "policyVersion": "1.0.0",
  "workspaceId": "WS-INST-1",
  "name": "Global Growth Core Mandate",
  "description": "Long-only equity mandate with sector and liquidity limits",
  "precedence": 3,
  "effectiveFrom": "2026-01-01T00:00:00.000Z",
  "effectiveTo": null,
  "status": "ACTIVE",
  "rules": [
    {
      "ruleId": "RULE-POS-MAX",
      "ruleType": "POSITION_LIMIT",
      "scope": "PORTFOLIO",
      "targetKey": null,
      "threshold": 0.10,
      "operator": "<=",
      "severity": "HIGH",
      "ruleHash": "sha256-..."
    }
  ],
  "policyHash": "sha256-..."
}
```

## 2. Policy Versioning Lifecycle

- **Version 1.0.0 ($V1$):** Created upon initial mandate approval. Effective from `2026-01-01` to `2026-06-30`.
- **Version 2.0.0 ($V2$):** Created when limits are modified. Effective from `2026-07-01` onward.
- **Immutability Invariant:** Any retrospective audit evaluation at timestamp $T_0$ during the first half of 2026 automatically resolves and evaluates against $V1$. $V1$ is never modified or overwritten by $V2$.

## 3. Precedence Hierarchy & Conflict Resolution

When multiple policies apply to a single portfolio (e.g. firm-wide mandate vs. client-specific mandate vs. strategy preference):

1. **`REGULATORY_HARD` (Level 1):** Statutory restrictions (e.g. UCITS 5/10/40, SEC 1940 Act). Cannot be waived under any circumstance.
2. **`FIRM_MANDATE` (Level 2):** Firm-wide risk governance rules. Trumps client-specific strategy deviations.
3. **`PORTFOLIO_MANDATE` (Level 3):** Client IPS agreement. Trumps strategy optimization preferences.
4. **`STRATEGY_POLICY` (Level 4):** Quantitative investment model parameters.
5. **`SOFT_PREFERENCE` (Level 5):** Advisory operational guidelines.

### Conflict Rules:
- Higher precedence rules strictly override lower precedence rules for overlapping constraint dimensions.
- If two applicable policies of identical precedence level contain contradictory, mutually irreconcilable limits (e.g. Policy A demands Cash $\ge 20\%$ while Policy B caps Cash $\le 10\%$), the evaluation engine returns **`CONFLICT`**.
- The system **never** silently chooses whichever policy produces a PASS status.
