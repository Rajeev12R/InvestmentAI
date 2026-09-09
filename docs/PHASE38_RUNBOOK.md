# PHASE 38 — OPERATIONAL RUNBOOK

## 1. Quick Verification Commands

### Standalone Phase 38 Verification
```bash
export PATH="/Users/ranjan/.nvm/versions/node/v20.19.4/bin:$PATH"
node server/test-script/runPhase38Regression.js
```
Expected output:
* 49 / 49 assertions PASS
* Exit code: 0

### Full Master Regression (Phases 1–38)
```bash
export PATH="/Users/ranjan/.nvm/versions/node/v20.19.4/bin:$PATH"
node server/test-script/runAllRegressions.js
```
Expected output:
* 355 test suites PASS
* 20,783 total master assertions PASS
* 0 failures

### Frontend Build Verification
```bash
cd client && npm run build
```
Expected output:
* Clean Vite production build with 0 errors.

---

## 2. Troubleshooting & Common Scenarios

* **Domain Status `UNAVAILABLE`**:
  If a domain sub-service fails, check server logs for errors in underlying repository or mathematical helpers. The cockpit will continue serving unaffected domains with `freshness: PARTIAL`.

* **Stale Attention Items**:
  Verify that the portfolio baseline hash matches the current holdings. If baseline drifted, rebalance or refresh portfolio state in Phase 36 Portfolio Operating System.
