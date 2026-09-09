# PHASE 37 — GOVERNANCE & DECISION INTEGRITY

## 1. Segregation of Duties (SoD) Governance Policy

InvestmentAI supports institutional Segregation of Duties policy enforcement:
* **Creator-Approver Separation**: When SoD is enabled on an investment decision, the person who created the decision cannot authorize or approve it.
* **Independent Review**: Peer reviews and challenges must be submitted and recorded prior to approval.
* **Role Verification**: Only users with `OWNER`, `ADMIN`, or authorized supervisory roles can grant approval.

---

## 2. Invalidation & Stale Approval Protection

An approved decision remains valid only as long as its underlying context remains unchanged:
* **Portfolio Drift**: If the portfolio holdings mutate after an approval is granted, the approval is invalidated to `STALE`.
* **Decision Version Drift**: Material updates to thesis or target weight generate a new version revision, invalidating previous approvals.
* **Implementation Gate**: Stale approvals are strictly blocked from proceeding to implementation handoff.

---

## 3. Evidence Lineage & Disagreement Visibility

* All decision claims must trace back to concrete evidence records (`FUNDAMENTAL`, `VALUATION`, `MACRO`, `TECHNICAL`, `RISK`, `QUANTITATIVE`, `REGULATORY`).
* Disagreements are surfaced explicitly: supporting evidence is highlighted alongside counter-theses and bear arguments without arbitrary score synthesis.
