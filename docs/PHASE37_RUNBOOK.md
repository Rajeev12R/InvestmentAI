# PHASE 37 — DECISION WORKBENCH RUNBOOK

## Quick Start & Verification

### 1. Execute Dedicated Phase 37 Regression Suite
```bash
PATH="/Users/ranjan/.nvm/versions/node/v20.19.4/bin:$PATH" node server/test-script/runPhase37Regression.js
```

### 2. Execute Complete Master Regression Suite (Phases 1–37)
```bash
PATH="/Users/ranjan/.nvm/versions/node/v20.19.4/bin:$PATH" node server/test-script/runAllRegressions.js
```

### 3. Verify Client Production Build
```bash
cd client && PATH="/Users/ranjan/.nvm/versions/node/v20.19.4/bin:$PATH" npm run build
```

### 4. Access Decision Workbench UI
Navigate to `http://localhost:5173/app/decisions` to view the Decision Registry and open any decision into the interactive Decision Workbench.
