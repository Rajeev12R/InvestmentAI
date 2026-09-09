# Phase 7 Operations Runbook & Verification Guide

## 1. Running Regression & Hostile Audit Suites

### Master Regression Runner (Phases 1–7)
```bash
PATH="/Users/ranjan/.nvm/versions/node/v20.19.4/bin:$PATH" node server/test-script/runAllRegressions.js
```

### Individual Phase 7 Suites
```bash
# Attention Intelligence Suite (45 assertions)
PATH="/Users/ranjan/.nvm/versions/node/v20.19.4/bin:$PATH" node server/test-script/phase7AttentionTests.js

# Portfolio Intelligence & Exposure Suite (35 assertions)
PATH="/Users/ranjan/.nvm/versions/node/v20.19.4/bin:$PATH" node server/test-script/phase7PortfolioIntelligenceTests.js

# Decision Operations & Reviews Suite (30 assertions)
PATH="/Users/ranjan/.nvm/versions/node/v20.19.4/bin:$PATH" node server/test-script/phase7OperationsTests.js

# Hostile Red-Team Audit Attacks A-AI (35 assertions)
PATH="/Users/ranjan/.nvm/versions/node/v20.19.4/bin:$PATH" node server/test-script/phase7HostileAudit.js

# Production Reality Audit (30 assertions)
PATH="/Users/ranjan/.nvm/versions/node/v20.19.4/bin:$PATH" node server/test-script/phase7ProductionRealityAudit.js
```

---

## 2. Frontend Production Verification
```bash
cd client
PATH="/Users/ranjan/.nvm/versions/node/v20.19.4/bin:$PATH" npm run build
```
