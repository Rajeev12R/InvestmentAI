# PHASE 8 — INVESTOR COPILOT REST API SPECIFICATION

All Phase 8 endpoints are mounted under `/api/copilot`.

---

## Endpoints

### 1. `POST /api/copilot/chat`
Processes an investor message through the full Copilot pipeline.

**Request Body:**
```json
{
  "workspaceId": "DEFAULT_WORKSPACE",
  "conversationId": "CONV-AAPL-1718000000",
  "message": "Why is AAPL classified as WATCH?",
  "ticker": "AAPL",
  "depth": "STANDARD"
}
```

**Response (200 OK):**
```json
{
  "conversationId": "CONV-AAPL-1718000000",
  "messageId": "MSG-1718000010",
  "answer": "AAPL currently holds a deterministic system decision of WATCH...",
  "intent": {
    "intent": "DECISION_EXPLANATION",
    "confidence": 0.95,
    "tickers": ["AAPL"]
  },
  "citations": [
    {
      "citationId": "CIT-AAPL-1",
      "claim": "Verified signal from DECISION_ENGINE",
      "evidenceId": "DEC-AAPL-STATUS",
      "sourceType": "DECISION_ENGINE",
      "sourceAuthority": "INSTITUTIONAL_DECISION",
      "authorityTier": "AUTHORITATIVE",
      "verifiedHash": "a1b2c3..."
    }
  ],
  "suggestedQuestions": [
    "What specific thesis breaker would shift AAPL to BUY?",
    "How does the current valuation compare with peer multiples?"
  ],
  "contextHash": "a1b2c3d4...",
  "safety": { "isSafe": true, "injectionDetected": false }
}
```

---

### 2. `POST /api/copilot/question`
Direct single-shot inquiry returning structured explanations without persisting conversation history.

---

### 3. `GET /api/copilot/conversations`
Lists all active conversations for a given workspace.

**Query Parameters:**
- `workspaceId`: Target workspace ID (e.g. `?workspaceId=DEFAULT_WORKSPACE`)

---

### 4. `GET /api/copilot/conversations/:id`
Retrieves full message history for a specific conversation.

---

### 5. `POST /api/copilot/research`
Initiates a deterministic grounded research workflow for a given ticker and question.

---

### 6. `POST /api/copilot/review`
Synchronizes a review request or status transition into the human Decision Review Queue.

---

### 7. `POST /api/copilot/followup`
Creates an investigation follow-up task.

---

### 8. `GET /api/copilot/context/:ticker`
Inspects the active, sealed, cryptographic context DTO for a given ticker symbol.
