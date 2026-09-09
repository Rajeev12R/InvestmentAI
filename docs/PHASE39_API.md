# PHASE 39 — REST API SPECIFICATION

All endpoints are mounted under `/api/alerts` and require JWT authentication via `Authorization: Bearer <token>`.

---

## Endpoints

### 1. `GET /api/alerts`
Query institutional alerts with optional filters.
* **Permission**: `alerts:read`
* **Query Parameters**:
  * `status`: Filter by status (`OPEN`, `ACKNOWLEDGED`, `SNOOZED`, `RESOLVED`, `ESCALATED`)
  * `severity`: Filter by severity (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFORMATIONAL`)
  * `category`: Filter by category (`DRIFT`, `COMPLIANCE`, `RISK`, `DECISION`, `FACT`, `PORTFOLIO`)
  * `targetType`: Filter by target entity type (`PORTFOLIO`, `DECISION`, etc.)
  * `assignedTo`: Filter by assigned user ID
  * `scope`: Quick scope (`ALL`, `MY`, `UNASSIGNED`, `SNOOZED`, `RESOLVED`, `ESCALATED`)
  * `search`: Text query matched against title, description, and target ID
  * `limit`: Max records (default: 50)
  * `offset`: Pagination offset (default: 0)

### 2. `GET /api/alerts/summary`
Get priority summary counts, unacknowledged critical counts, and status breakdowns.
* **Permission**: `alerts:read`

### 3. `GET /api/alerts/:id`
Get a single alert with full audit history and notification delivery records.
* **Permission**: `alerts:read`

### 4. `POST /api/alerts/:id/acknowledge`
Acknowledge an open or escalated alert.
* **Permission**: `alerts:acknowledge`
* **Request Body**:
  ```json
  {
    "version": 1,
    "note": "Reviewing with senior portfolio manager."
  }
  ```

### 5. `POST /api/alerts/:id/snooze`
Snooze an alert for a specified duration.
* **Permission**: `alerts:snooze`
* **Request Body**:
  ```json
  {
    "version": 1,
    "durationMinutes": 60,
    "reason": "Waiting for earnings release market open."
  }
  ```

### 6. `POST /api/alerts/:id/resolve`
Mark an alert as resolved with mandatory justification.
* **Permission**: `alerts:resolve`
* **Request Body**:
  ```json
  {
    "version": 2,
    "reason": "Portfolio rebalanced; tracking error back within mandate tolerance."
  }
  ```

### 7. `POST /api/alerts/:id/reopen`
Reopen a previously resolved or dismissed alert.
* **Permission**: `alerts:acknowledge`
* **Request Body**:
  ```json
  {
    "version": 3,
    "reason": "Secondary drift detected post-settlement."
  }
  ```

### 8. `POST /api/alerts/:id/assign`
Assign an alert to a specific user or role.
* **Permission**: `alerts:acknowledge`
* **Request Body**:
  ```json
  {
    "version": 1,
    "assignedTo": "USR-ANALYST-001"
  }
  ```

### 9. `POST /api/alerts/:id/escalate`
Manually escalate an alert to higher tier / senior stakeholders.
* **Permission**: `alerts:acknowledge`
* **Request Body**:
  ```json
  {
    "version": 1,
    "reason": "Breach requires CIO sign-off."
  }
  ```

### 10. `GET /api/alerts/preferences/channels`
Retrieve workspace notification channels and user subscription preferences.
* **Permission**: `alerts:read`

### 11. `PUT /api/alerts/preferences/channels`
Update workspace notification channels and preferences.
* **Permission**: `alerts:configure`

### 12. `POST /api/alerts/sweep/escalations`
Execute the background SLA escalation sweep.
* **Permission**: `alerts:admin`
