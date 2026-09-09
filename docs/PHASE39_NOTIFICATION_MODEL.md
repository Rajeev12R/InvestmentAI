# PHASE 39 — NOTIFICATION DELIVERY MODEL & CHANNELS

## 1. Core Decoupling Invariant

**Alert existence is strictly decoupled from notification delivery status.**
* An alert is created, deduplicated, and stored in the institutional record regardless of downstream notification dispatch.
* If an external provider (Email, Webhook, Push) fails or is unconfigured, the alert remains active and intact in `IN_APP` and the audit log.
* Downstream channel delivery results in one of:
  * `SENT`: Successfully handed off to external delivery provider.
  * `PENDING`: Enqueued for dispatch.
  * `FAILED`: External provider returned an error.
  * `NOT_CONFIGURED`: Channel is enabled in policy but transport credentials/endpoints are unconfigured in environment.
  * `SKIPPED`: Suppressed due to cooldown or severity threshold.

---

## 2. Notification Channels

Phase 39 supports three institutional notification channels:

### 1. `IN_APP`
* Real-time operational inbox and attention drawer in the Institutional Attention Center (`/app/attention`).
* Always enabled for institutional users with workspace access.
* Zero external transport dependency.

### 2. `EMAIL`
* SMTP / SendGrid / SES gateway transport for digest and immediate critical notifications.
* Defaults to `NOT_CONFIGURED` when SMTP credentials are not set in the environment, ensuring zero crash or silent swallow.

### 3. `PUSH` (Mobile / Web Push / Webhook)
* Webhook / APNS / FCM gateway.
* Defaults to `NOT_CONFIGURED` when webhook endpoint or push keys are unconfigured.

---

## 3. Cooldown & Threshold Routing Policy

Alert dispatch respects severity-tiered routing rules:

```typescript
const DEFAULT_COOLDOWN_MS = {
  CRITICAL: 5 * 60 * 1000,       // 5 minutes
  HIGH: 30 * 60 * 1000,          // 30 minutes
  MEDIUM: 60 * 60 * 1000,        // 60 minutes
  LOW: 120 * 60 * 1000,          // 2 hours
  INFORMATIONAL: 240 * 60 * 1000 // 4 hours
};
```

Recipients are determined dynamically by alert domain:
* **COMPLIANCE**: Notifies `COMPLIANCE_OFFICER`, `RISK_MANAGER`, `PORTFOLIO_MANAGER`.
* **RISK**: Notifies `RISK_MANAGER`, `PORTFOLIO_MANAGER`.
* **DRIFT**: Notifies `PORTFOLIO_MANAGER`, `ANALYST`.
* **DECISION**: Notifies `PORTFOLIO_MANAGER`, `ANALYST`, `REVIEWER`.
