# PHASE 37 — REST API SPECIFICATION

## Base Route: `/api/decisions`

All endpoints require `Authorization: Bearer <sessionToken>` and optional tenant headers `x-org-id` and `x-workspace-id`.

---

### Endpoints Summary

#### 1. List Decisions
* **Route**: `GET /api/decisions`
* **Query Parameters**: `status`, `ticker`, `portfolioId`, `query`
* **Permission**: `decision.read`

#### 2. Get Decision by ID
* **Route**: `GET /api/decisions/:decisionId`
* **Permission**: `decision.read`

#### 3. Provision Decision Draft
* **Route**: `POST /api/decisions`
* **Body**: `{ portfolioId, ticker, title, decisionType, priority, proposedPosition, thesis, evidence, alternatives, enforceSoD }`
* **Permission**: `decision.create`

#### 4. Update Decision / Version Revision
* **Route**: `PUT /api/decisions/:decisionId`
* **Body**: `{ title, priority, proposedPosition, thesis, evidence, alternatives }`
* **Permission**: `decision.update`

#### 5. Transition Decision Status
* **Route**: `POST /api/decisions/:decisionId/status`
* **Body**: `{ status: "UNDER_REVIEW" | "MONITORED" | "CLOSED" | "CANCELLED" }`
* **Permission**: `decision.update`

#### 6. Submit Peer Review / Challenge
* **Route**: `POST /api/decisions/:decisionId/review`
* **Body**: `{ comment, isChallenge: boolean, challengeCategory: string }`
* **Permission**: `decision.review`

#### 7. Authorize & Approve Decision
* **Route**: `POST /api/decisions/:decisionId/approve`
* **Body**: `{ conditions: Array<string> }`
* **Permission**: `decision.approve`

#### 8. Reject Decision
* **Route**: `POST /api/decisions/:decisionId/reject`
* **Body**: `{ reason: string }`
* **Permission**: `decision.reject`

#### 9. Implementation Handoff
* **Route**: `POST /api/decisions/:decisionId/implement`
* **Body**: `{ executionNotes: string }`
* **Permission**: `decision.implement`

#### 10. Multi-Domain Impact Evaluation
* **Route**: `GET /api/decisions/:decisionId/impact`
* **Permission**: `decision.read`

#### 11. Point-in-Time Sealed Snapshots
* **Route**: `POST /api/decisions/:decisionId/snapshots`
* **Body**: `{ asOf?, analytics? }`
* **Permission**: `decision.update`
