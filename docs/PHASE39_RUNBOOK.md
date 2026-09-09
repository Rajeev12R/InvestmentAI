# PHASE 39 — OPERATIONAL RUNBOOK

## 1. Daily Operating Rhythm

1. **Morning Inspection**:
   * Open the Institutional Attention Center (`/app/attention`).
   * Review the priority count summary cards: Critical Unacknowledged, High Priority, Pending Action, Snoozed, SLA Escalated.
   * Verify all `CRITICAL` alerts have assigned owners and active resolution notes.

2. **Handling Critical Alerts**:
   * Click the alert to open the 6-tab Institutional Detail Drawer.
   * Inspect **Details**, **Context / Target**, **Evidence / Attribution**, **Audit Trail**, **Notifications**, and **Actions**.
   * Click **Acknowledge** (`POST /api/alerts/:id/acknowledge`) to record active investigation with OCC `version`.
   * Follow the suggested action link to the affected Portfolio (`/app/portfolio-os`) or Decision Workbench (`/app/decisions`).

3. **Resolving or Snoozing**:
   * If awaiting market open or scheduled rebalancing, click **Snooze** and select duration with institutional rationale.
   * Once corrective action is completed and verified, click **Resolve** with mandatory sign-off reasoning.

---

## 2. Background SLA Sweep Execution

The SLA sweep runs periodically or on-demand to enforce escalation policies:

```bash
# On-demand manual sweep via API (Requires alerts:admin)
curl -X POST http://localhost:5001/api/alerts/sweep/escalations \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

---

## 3. Running Test Regressions

```bash
# Run standalone Phase 39 regression suite (45 assertions)
node server/test-script/phase39AlertsAttentionCenterTests.js

# Run master platform regression suite (Phases 1–39: 356 suites)
node server/test-script/runAllRegressions.js
```
