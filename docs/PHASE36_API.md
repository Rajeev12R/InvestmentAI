# PHASE 36 — REST API SPECIFICATION

## Base Route: `/api/portfolios`

All endpoints require `Authorization: Bearer <sessionToken>` and optional tenant headers `x-org-id` and `x-workspace-id`.

---

### Endpoints Summary

#### 1. List Portfolios
* **Route**: `GET /api/portfolios`
* **Query Parameters**: `status`, `strategy`, `query`
* **Permission**: `portfolio.read`

#### 2. Get Portfolio by ID
* **Route**: `GET /api/portfolios/:portfolioId`
* **Permission**: `portfolio.read`

#### 3. Provision New Portfolio
* **Route**: `POST /api/portfolios`
* **Body**: `{ name, description, strategy, type, status, baseCurrency, benchmark, mandate, cashBalance, holdings }`
* **Permission**: `portfolio.create`

#### 4. Update Portfolio Mandate & Metadata
* **Route**: `PUT /api/portfolios/:portfolioId`
* **Body**: `{ name, description, strategy, type, mandate, managerId }`
* **Permission**: `portfolio.update`

#### 5. Transition Portfolio Status
* **Route**: `POST /api/portfolios/:portfolioId/status`
* **Body**: `{ status: "ACTIVE" | "PAUSED" | "CLOSED" | "ARCHIVED" }`
* **Permission**: `portfolio.status.manage`

#### 6. Holdings Reconciliation & Update
* **Route**: `PUT /api/portfolios/:portfolioId/holdings`
* **Body**: `{ holdings: Array<Holding>, cashBalance: number }`
* **Permission**: `portfolio.holdings.manage`

#### 7. Get Portfolio Operating Summary
* **Route**: `GET /api/portfolios/:portfolioId/summary`
* **Permission**: `portfolio.read`

#### 8. Create Point-in-Time Sealed Snapshot
* **Route**: `POST /api/portfolios/:portfolioId/snapshots`
* **Body**: `{ snapshotId?, asOf?, analytics? }`
* **Permission**: `portfolio.snapshot.create`

#### 9. List Portfolio Snapshots
* **Route**: `GET /api/portfolios/:portfolioId/snapshots`
* **Permission**: `portfolio.read`

#### 10. Generate Optimization Proposal
* **Route**: `POST /api/portfolios/:portfolioId/optimize`
* **Body**: `{ objective: "MAX_SHARPE" | "MIN_VARIANCE", constraints: {} }`
* **Permission**: `portfolio.optimize`
