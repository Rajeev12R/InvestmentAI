# PHASE 38 — REST API SPECIFICATION

All endpoints are mounted under `/api/dashboard` and require `Authorization: Bearer <token>` with `DASHBOARD_READ` permission.

---

### 1. GET `/api/dashboard/overview`
Retrieves comprehensive workspace-scoped institutional cockpit package.

**Query Parameters:**
* `workspaceId` (string, optional): Workspace identifier (defaults to user token's workspace).
* `asOf` (string, optional): ISO 8601 temporal snapshot timestamp.
* `roleView` (string, optional): One of `PORTFOLIO_MANAGER`, `RISK_OFFICER`, `COMPLIANCE_AUDITOR`, `ORG_ADMIN`.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "cockpitId": "COCKPIT-WS-DEFAULT-001-1772986290000",
    "orgId": "ORG-ROOT-001",
    "workspaceId": "WS-DEFAULT-001",
    "asOf": "2026-09-08T00:00:00.000Z",
    "roleView": "PORTFOLIO_MANAGER",
    "freshness": "FRESH",
    "topMetrics": {
      "totalAum": { "value": 15000000, "status": "VALID", "asOf": "...", "freshness": "FRESH", "source": "portfolio.repository" },
      "annualizedVolatility": { "value": 0.1468, "status": "VALID", "asOf": "...", "freshness": "FRESH", "source": "risk.operating_engine" },
      "parametricVaR95": { "value": 2417431, "status": "VALID", "asOf": "...", "freshness": "FRESH", "source": "risk.var_engine" },
      "complianceStatus": { "value": "COMPLIANT", "status": "OK", "asOf": "...", "freshness": "FRESH", "source": "compliance.mandate_engine" },
      "attentionCount": { "value": 2, "status": "VALID", "asOf": "...", "freshness": "FRESH", "source": "attention.engine" }
    },
    "universe": { ... },
    "riskExposure": { ... },
    "attention": { ... },
    "decisions": { ... },
    "compliance": { ... },
    "changes": { ... }
  }
}
```

---

### 2. GET `/api/dashboard/portfolios`
Retrieves portfolio universe summary and comparative ranking table.

---

### 3. GET `/api/dashboard/risk`
Retrieves risk decomposition (Euler CRC, VaR 95/99, Expected Shortfall 95%) and exposure metrics (HHI, $N_{\text{eff}}$, sector/geography breakdowns).

---

### 4. GET `/api/dashboard/attention`
Retrieves prioritized material attention items ranked by severity (`CRITICAL`, `ACTION_REQUIRED`, `ATTENTION`, `INFORMATION`).

---

### 5. GET `/api/dashboard/decisions`
Retrieves Phase 37 Decision Queue summary and authorization backlog.

---

### 6. GET `/api/dashboard/compliance`
Retrieves multi-portfolio mandate constraints, rule breaches, and audit integrity.

---

### 7. GET `/api/dashboard/changes`
Retrieves "What Changed?" material delta feed since baseline review.
