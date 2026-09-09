# PHASE 36 — OPERATING SYSTEM RUNBOOK

## Quick Start & Verification

### 1. Execute Dedicated Phase 36 Regression Suite
```bash
node server/test-script/runPhase36Regression.js
```

### 2. Execute Complete Master Regression Suite (Phases 1–36)
```bash
node server/test-script/runAllRegressions.js
```

### 3. Verify Client Production Build
```bash
cd client && npm run build
```

### 4. Start Development Servers
```bash
# Terminal 1: Express Server
npm run dev

# Terminal 2: React Frontend
cd client && npm run dev
```

Navigate to `http://localhost:5173/app/portfolios` in browser to view the Portfolio Operating System registry and cockpit.
