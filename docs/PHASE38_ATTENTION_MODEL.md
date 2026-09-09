# PHASE 38 — ATTENTION & CHANGE INTELLIGENCE SPECIFICATION

## 1. Attention Model Philosophy

The Phase 38 Attention Engine prioritizes **materiality over volume** to prevent alert fatigue for investment executives.

Events are filtered and ranked according to institutional risk thresholds rather than raw event counts.

### Severity Tiers
1. **`CRITICAL`**: Hard mandate rule breaches, regulatory compliance violations, or immediate risk limits breached.
2. **`BLOCKED`**: Operations or implementations stalled pending mandatory Segregation of Duties (SoD) authorization.
3. **`ACTION_REQUIRED`**: Single-position concentration approaching mandate bounds, stale decision approvals, or rebalance triggers.
4. **`ATTENTION`**: Peer review pending, challenge logged on active thesis, or macro regime sensitivity alerts.
5. **`INFORMATION`**: Regular point-in-time snapshot seals or non-material benchmark updates.

---

## 2. Attention Card Data Contract

Every attention item surfaces structured context:
* **`what`**: Concise, unambiguous headline describing the condition.
* **`why`**: Mathematical or operational root-cause explanation.
* **`materiality`**: Institutional materiality assessment (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
* **`asOf`**: Timestamp of the detection.
* **`source`**: Authoritative domain service (e.g., `compliance.mandate_engine`, `exposure.concentration_engine`).
* **`affectedPortfolio`**: Name and ID of the affected portfolio vehicle.
* **`affectedSecurity`**: Optional ticker and security metadata.
* **`recommendedNextAction`**: Prescriptive system recommendation.
* **`actionUrl`**: Direct link to the appropriate workbench or portfolio management screen.
