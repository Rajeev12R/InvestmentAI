# PHASE 8 — COPILOT WORKFLOW & HUMAN DECISION OPERATIONS

## 1. Human Decision Workflow Model

Phase 8 implements an operational loop that connects analytical AI insights to human investment decisions without relinquishing control to automated algorithms.

```
+-------------------+
|  Copilot Chat     |  (User asks: "Why did AAPL margin drift trigger an alert?")
+-------------------+
          |
          v
+-------------------+
| Copilot Response  |  (Explains verified drift with citations & proposes review)
+-------------------+
          |
          +-----------------------------+
          |                             |
          v                             v
+-----------------------+     +-----------------------+
| Follow-Up Research    |     | Decision Review Queue |
| (Creates FUP item in  |     | (Creates REV item in  |
|  Operations Engine)   |     |  Human Review Queue)  |
+-----------------------+     +-----------------------+
                                        |
                                        v
                              +-----------------------+
                              | Status Lifecycle:     |
                              | REVIEW                |
                              |   -> INVESTIGATING    |
                              |   -> RESOLVED         |
                              +-----------------------+
                                        |
                                        v
                              +-----------------------+
                              | Human Analyst Sign-off|
                              | (Manual Order / Size) |
                              +-----------------------+
```

---

## 2. Review Lifecycle State Machine

1. **`REVIEW`**: An attention item or valuation drift triggered a recommendation (e.g. `CONSIDER_EXIT` or `REVIEW_POSITION`). The item is queued. No trades are executed.
2. **`INVESTIGATING`**: The analyst initiates deep-dive research into 10-Q disclosures or competitive shifts.
3. **`RESOLVED`**: The analyst logs notes, reaches a conclusion, and takes manual portfolio sizing action or dismisses the alert.

---

## 3. Workflow Actions Taxonomy

- `INITIATE_RESEARCH`: Spawns grounded research workflow against sealed truth packages.
- `REQUEST_DECISION_REVIEW`: Synchronizes alert into human Decision Review Queue.
- `CREATE_FOLLOW_UP`: Logs targeted research tasks for follow-up.
- `RESOLVE_REVIEW`: Concludes an investigation with audit notes.
- `DISMISS_ATTENTION`: Acknowledges and silences resolved attention items.
