# Normalized Market Data & Freshness Engine — Phase 10

## 1. Freshness Classification Thresholds

| Freshness Level | Age Threshold | Interpretation | System Treatment |
| :--- | :--- | :--- | :--- |
| **REALTIME** | $< 15$ Minutes | Live intraday trading market price. | Active trading valuation & exposure. |
| **RECENT** | $< 24$ Hours | Closing price from current/previous trading session. | End-of-day portfolio rebalancing. |
| **STALE** | $24\text{ Hours} - 7\text{ Days}$ | Weekend/holiday or delayed quote. | Explicitly tagged: `STALE — AS OF <timestamp>`. |
| **EXPIRED** | $> 7$ Days | Outdated price series. | Excluded from realtime decision signals. |
| **UNAVAILABLE** | $\infty$ | Missing or rejected data. | Displayed strictly as `UNAVAILABLE` (Never 0). |

---

## 2. Streaming vs Polling Contract
* **HTTP Polling:** Active default mode querying normalized REST endpoints on configurable intervals.
* **Streaming Interface (`MarketStreamAdapter`):** When WebSocket sockets are not established, explicitly returns `STREAMING_UNAVAILABLE`. The system never fabricates synthetic price movements to simulate a live ticker tape.
