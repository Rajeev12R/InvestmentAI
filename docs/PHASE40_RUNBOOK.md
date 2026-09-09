# PHASE 40 — OPERATIONAL RUNBOOK

## 1. Daily Operating Procedures

### A. Creating a New Institutional Deliverable
1. Navigate to `/app/reports` (or click "Institutional Reports" in Cockpit Overview).
2. Click **+ New Report**.
3. Select the desired `reportType` (e.g. `PORTFOLIO_OVERVIEW`, `EXPOSURE_RISK_REPORT`, `COMPLIANCE_REPORT`).
4. Select target portfolio, reporting period start and end dates.
5. Click **Create Draft**.

### B. Generating and Freezing Point-in-Time Snapshot
1. Open the report in the Report Library.
2. In the Detail Drawer, click **Generate**.
3. The system captures an immutable point-in-time snapshot, derives all quantitative metrics from upstream domain engines, computes the SHA-256 snapshot seal, and transitions the report to `GENERATED`.

### C. Validating Report Integrity
1. Click **Validate** in the Detail Drawer.
2. The validator verifies:
   - AUM Holdings reconciliation (stocks + cash == AUM)
   - Risk metric constraints (VaR >= 0, ES >= VaR)
   - Mandate compliance integrity (`UNKNOWN` is never treated as `PASS`)
   - Section completeness against the chosen template version
3. Upon passing, the report status advances to `READY_FOR_REVIEW`. If validation fails, an alert is dispatched to Phase 39 Attention Center.

### D. Human Review & Independent Sign-Off (SoD)
1. An independent authorized reviewer (not the creator) navigates to the **Approvals** tab.
2. Reviewer inspects preview, evidence provenance, and freshness disclosures.
3. Reviewer clicks **Approve**.
4. Report transitions to `APPROVED`.

### E. Distribution & Artifact Export
1. Click **Distribute** to dispatch report deliverables to configured institutional channels (`IN_APP`, `DOWNLOAD`, `EMAIL`, `WEBHOOK`).
2. Download direct PDF, HTML, or CSV artifacts via the **Document Preview** tab or API download endpoint.

### F. Revisions & Supersession
1. If financial restatements or retroactive data adjustments require corrections to an already distributed report, call `POST /api/reports/:id/supersede`.
2. The original report is marked `SUPERSEDED` and preserved permanently in the audit ledger.
3. A successor revision (Report v2) is initialized with traceable lineage.

---

## 2. Troubleshooting & Diagnostics

| Symptom | Probable Cause | Corrective Action |
| :--- | :--- | :--- |
| `HTTP 401 Unauthorized` | Missing or expired auth token | Authenticate via `/api/auth/login` and attach `Authorization: Bearer <token>` |
| `HTTP 403 Forbidden` (SoD Violation) | Report creator attempting self-approval | Assign an independent reviewer with `reports.approve` permission to sign off |
| `HTTP 404 Not Found` on report access | Cross-tenant / cross-workspace IDOR block | Verify `x-org-id` and `x-workspace-id` headers match report ownership |
| `HTTP 409 Conflict` | Concurrent modification version conflict | Re-fetch report metadata to obtain latest monotonic `version` integer |
| `VALIDATION_FAILED` (AUM Diff) | Stock position sum + cash does not equal reported AUM | Verify holdings data in portfolio repository before snapshot capture |
| `EMAIL` status `NOT_CONFIGURED` | Missing SMTP credentials | Configure `SMTP_HOST` or `SENDGRID_API_KEY` in server environment |

---

## 3. Disaster Recovery & Reproducibility Verification

To verify that any archived or distributed deliverable remains cryptographically reproducible:
```bash
curl -H "Authorization: Bearer $TOKEN" \
     -H "x-workspace-id: WS-DEFAULT-001" \
     https://investmentai.local/api/reports/RPT-1725753600000-1234/verification
```
Verify `reproducible: true` and `snapshotIntegrity.valid: true`.
