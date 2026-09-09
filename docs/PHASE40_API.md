# PHASE 40 — REST API SPECIFICATION

All endpoints are mounted under `/api/reports`. Every route strictly enforces `authenticate`, `requireAuth`, tenant boundary headers (`x-org-id`, `x-workspace-id`), and RBAC permissions.

---

## Endpoint Summary

| Method | Path | Permission Required | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/reports/templates` | `reports.read` | Discover available institutional report templates |
| `GET` | `/api/reports` | `reports.read` | List reports filtered by status, type, portfolio, or search query |
| `GET` | `/api/reports/summary` | `reports.read` | Get aggregate counts by status (pending review, approved, distributed) |
| `GET` | `/api/reports/:reportId` | `reports.read` | Retrieve report metadata and linked snapshot |
| `POST` | `/api/reports` | `reports.create` | Create a new report draft |
| `POST` | `/api/reports/:reportId/generate` | `reports.generate` | Capture point-in-time snapshot and assemble data |
| `POST` | `/api/reports/:reportId/validate` | `reports.validate` | Run deterministic reconciliation and validation |
| `POST` | `/api/reports/:reportId/submit-review` | `reports.review` | Submit validated report for human review |
| `POST` | `/api/reports/:reportId/approve` | `reports.approve` | Approve report (enforces Separation of Duties by default) |
| `POST` | `/api/reports/:reportId/reject` | `reports.approve` | Reject report and return it to DRAFT with reason |
| `POST` | `/api/reports/:reportId/distribute` | `reports.distribute` | Dispatch report to configured channels (IN_APP, EMAIL, etc.) |
| `POST` | `/api/reports/:reportId/supersede` | `reports.supersede` | Mark report as SUPERSEDED and create successor draft |
| `GET` | `/api/reports/:reportId/verification` | `reports.read` | Retrieve cryptographic lineage verification and reproducibility |
| `GET` | `/api/reports/:reportId/artifact` | `reports.read` | Download report deliverable (formats: `HTML`, `PDF`, `CSV`) |
| `GET` | `/api/reports/:reportId/audit` | `reports.read` | Retrieve append-only audit trail of all lifecycle transitions |

---

## Detailed Request & Response Examples

### 1. Create Report Draft
`POST /api/reports`
```json
{
  "reportType": "PORTFOLIO_OVERVIEW",
  "portfolioId": "PORT-DEFAULT-001",
  "templateId": "TMPL-PORTFOLIO-OVERVIEW-V1",
  "title": "Global Flagship Portfolio Overview — September 2026",
  "asOf": "2026-09-08T00:00:00.000Z",
  "periodStart": "2026-09-01T00:00:00.000Z",
  "periodEnd": "2026-09-07T00:00:00.000Z"
}
```
**Response (201 Created):**
```json
{
  "success": true,
  "report": {
    "reportId": "RPT-1725753600000-1234",
    "status": "DRAFT",
    "version": 1,
    "validationStatus": "PENDING",
    "approvalStatus": "PENDING",
    "distributionStatus": "NOT_DISTRIBUTED"
  }
}
```

### 2. Generate Report
`POST /api/reports/:reportId/generate`
**Response (200 OK):**
```json
{
  "success": true,
  "report": {
    "reportId": "RPT-1725753600000-1234",
    "status": "GENERATED",
    "snapshotId": "SNAP-1725753600000-5678",
    "sourceSnapshotHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "reportHash": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"
  },
  "snapshotId": "SNAP-1725753600000-5678"
}
```

### 3. Validate Report
`POST /api/reports/:reportId/validate`
**Response (200 OK):**
```json
{
  "success": true,
  "report": {
    "reportId": "RPT-1725753600000-1234",
    "status": "READY_FOR_REVIEW",
    "validationStatus": "PASSED"
  },
  "validation": {
    "isValid": true,
    "status": "PASSED",
    "errors": [],
    "warnings": [],
    "reconciliation": {
      "aumReconciliation": { "passed": true, "diff": 0 },
      "riskConstraints": { "passed": true, "var95": 0.021, "expectedShortfall95": 0.029 },
      "complianceIntegrity": { "status": "COMPLIANT", "unknownRuleChecked": true }
    }
  }
}
```

### 4. Approve Report (with Separation of Duties)
`POST /api/reports/:reportId/approve`
```json
{
  "enforceSoD": true
}
```
**Response if self-approved (403 Forbidden):**
```json
{
  "success": false,
  "error": "Separation of Duties violation: report creator cannot self-approve"
}
```
**Response when authorized (200 OK):**
```json
{
  "success": true,
  "report": {
    "reportId": "RPT-1725753600000-1234",
    "status": "APPROVED",
    "approvedBy": "USR-REVIEWER-001",
    "approvedAt": "2026-09-08T00:05:00.000Z"
  }
}
```

### 5. Download Artifact
`GET /api/reports/:reportId/artifact?format=PDF`
**Response (200 OK):**
* Content-Type: `application/pdf`
* Content-Disposition: `attachment; filename="RPT-1725753600000-1234.pdf"`
* Body: Raw binary buffer of the sealed institutional deliverable.
