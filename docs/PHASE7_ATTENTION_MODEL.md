# Phase 7 Attention Model & Scoring Taxonomy

## 1. Attention Scoring Formula
The Attention Engine employs a fully transparent, additive scoring formula defined in `server/attention/attentionThresholds.js`:

$$\text{Attention Score} = S_{\text{decision}} + S_{\text{breaker}} + S_{\text{valuation}} + S_{\text{risk}} + S_{\text{event}} + S_{\text{exposure}} + S_{\text{recency}} + S_{\text{confidence}}$$

### Component Breakdown
- **Decision Change Contribution ($S_{\text{decision}}$, Max 30 pts)**:
  - `BUY_TO_AVOID`: 30 pts
  - `BUY_TO_WATCH`: 25 pts
  - `HOLD_TO_AVOID`: 25 pts
  - `WATCH_TO_AVOID`: 20 pts
  - `AVOID_TO_BUY`: 20 pts
  - `WATCH_TO_BUY`: 18 pts
- **Thesis Breaker Contribution ($S_{\text{breaker}}$, Max 25 pts)**:
  - `TRIGGERED`: 25 pts
  - `APPROACHING`: 18 pts
  - `UNKNOWN`: 8 pts
  - `STABLE`: 0 pts
- **Valuation Drift Contribution ($S_{\text{valuation}}$, Max 20 pts)**:
  - $|\Delta \text{DCF}| \ge 10\%$: 20 pts
  - $|\Delta \text{DCF}| \ge 5\%$: 12 pts
  - $|\Delta \text{DCF}| < 5\%$: Scaled up to 8 pts
- **Risk Drift Contribution ($S_{\text{risk}}$, Max 15 pts)**:
  - Critical elevation: 15 pts
  - High elevation: 12 pts
  - Moderate deterioration: 8 pts
  - Improving: 3 pts
- **Event Materiality ($S_{\text{event}}$, Max 15 pts)**:
  - `HIGH`: 15 pts | `MEDIUM`: 10 pts | `LOW`: 5 pts
- **Portfolio Exposure ($S_{\text{exposure}}$, Max 10 pts)**:
  - Weight $\ge 35\%$: 10 pts (Scaled $\min(10, \text{weight} \times 30)$)
- **Recency ($S_{\text{recency}}$, Max 5 pts)**:
  - 48-hour half-life linear decay: $\max(0, 1 - \frac{\text{hours}}{48}) \times 5$
- **Confidence ($S_{\text{confidence}}$, Max 5 pts)**:
  - Deterministic confidence multiplier: $\text{confidence} \times 5$

---

## 2. Priority Classification Thresholds
- **CRITICAL**: $\text{Score} \ge 85$
- **HIGH**: $\text{Score} \ge 65$
- **MEDIUM**: $\text{Score} \ge 40$
- **LOW**: $\text{Score} \ge 20$
- **INFORMATIONAL**: $\text{Score} < 20$

---

## 3. Canonical Taxonomy (20 Categories)
1. `DECISION_CHANGE`
2. `THESIS_BREAKER`
3. `THESIS_DRIFT`
4. `VALUATION_DRIFT`
5. `RISK_ESCALATION`
6. `RISK_DETERIORATION`
7. `EARNINGS_CHANGE`
8. `GUIDANCE_CHANGE`
9. `MATERIAL_EVENT`
10. `MARKET_DISLOCATION`
11. `PORTFOLIO_CONCENTRATION`
12. `CORRELATION_RISK`
13. `POSITION_SIZE_RISK`
14. `DATA_QUALITY`
15. `STALE_INFORMATION`
16. `CONFLICTING_SIGNAL`
17. `NEW_CATALYST`
18. `WATCHLIST_CHANGE`
19. `HOLDING_CHANGE`
20. `RESEARCH_FOLLOWUP`
