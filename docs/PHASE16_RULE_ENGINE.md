# Phase 16 — Institutional Rule Engine Specification

## 1. Supported Policy Rule Types

The deterministic rule engine evaluates 15 institutional rule types:

| # | Rule Type | Description | Evaluation Logic |
| :--- | :--- | :--- | :--- |
| 1 | `POSITION_LIMIT` | Max single asset weight or specific ticker limit | $w_i \le \text{Threshold}$ |
| 2 | `SECTOR_LIMIT` | Max aggregate exposure to a GICS Sector | $\sum_{i \in \text{Sector}} w_i \le \text{Threshold}$ |
| 3 | `INDUSTRY_LIMIT` | Max aggregate exposure to an Industry | $\sum_{i \in \text{Industry}} w_i \le \text{Threshold}$ |
| 4 | `GEOGRAPHY_LIMIT` | Max exposure to a Country or Region | $\sum_{i \in \text{Geo}} w_i \le \text{Threshold}$ |
| 5 | `CONCENTRATION_LIMIT`| Herfindahl-Hirschman Index (HHI) or Top-N | $\sum w_i^2 \le \text{Threshold}$ |
| 6 | `LIQUIDITY_LIMIT` | Max proposed order participation relative to 30d ADV | $\frac{\text{Order Shares}}{\text{ADV}_{30}} \le \text{Threshold}$ |
| 7 | `TURNOVER_LIMIT` | Max annual or monthly portfolio turnover | $\text{Turnover} \le \text{Threshold}$ |
| 8 | `CASH_LIMIT` | Min and Max cash buffer allocation | $\text{Min} \le w_{\text{Cash}} \le \text{Max}$ |
| 9 | `LEVERAGE_LIMIT` | Gross and Net leverage ceiling | $\text{Gross Leverage} \le \text{Threshold}$ |
| 10 | `SHORTING_LIMIT` | Long-only requirement (Short positions prohibited) | $w_i \ge 0 \quad \forall i$ |
| 11 | `SECURITY_ELIGIBILITY`| Prohibited or Allowed asset list enforcement | $i \notin \text{Prohibited} \land i \in \text{Allowed}$ |
| 12 | `MARKET_CAP_LIMIT` | Minimum / Maximum market capitalization | $\text{MarketCap}_i \ge \text{Threshold}$ |
| 13 | `RATING_LIMIT` | Minimum credit or quality rating | $\text{Rating}_i \ge \text{Min Rating}$ |
| 14 | `ESG_OR_CUSTOM_RESTRICTION` | Minimum ESG score or custom deterministic metric | $\text{ESG}_i \ge \text{Threshold}$ |
| 15 | `DECISION_AUTHORITY` | Governance check for required approval role | $\text{ApproverRole} \in \{\text{RequiredRoles}\}$ |

## 2. Missing Data & Zero-Coercion Invariant

The rule engine strictly distinguishes between passing an evaluation and lacking necessary data:
- Missing price, sector, geography, or ADV produces `INSUFFICIENT_DATA` or `UNAVAILABLE`.
- Missing values are never converted to `0.0` or evaluated as "compliant".
- Missing data causes the overall evaluation status to reflect `INSUFFICIENT_DATA` rather than `PASS`.
