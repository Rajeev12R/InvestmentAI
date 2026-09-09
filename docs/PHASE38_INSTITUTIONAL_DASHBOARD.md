# PHASE 38 — INSTITUTIONAL DASHBOARD & INTELLIGENCE COCKPIT

## 1. Primary Objective & Architectural Philosophy

Phase 38 establishes the **Institutional Dashboard & Intelligence Cockpit** (`/app/overview`) as the primary operational surface of InvestmentAI.

It unifies the authoritative domain outputs from:
* **Phase 1–33**: Quantitative Intelligence, Solvers, Euler CRC, VaR/ES, Attributions, Scenarios
* **Phase 34**: SaaS Product Shell & Centralized API Client
* **Phase 35**: Multi-Tenant Organization & Workspace Control Plane
* **Phase 36**: Institutional Portfolio Operating System
* **Phase 37**: Investment Decision Workbench

### Core Principle
The Dashboard is an **intelligence presentation, attention orchestration, portfolio overview, and decision operating surface**. It is **not** an independent calculation engine and performs **zero financial formula recalculations**. All values are produced exclusively by backend authoritative engines.

```text
Organization (Phase 35)
    ↓
Workspace (Phase 35)
    ↓
Portfolio Universe (Phase 36)
    ↓
Risk / Performance / Exposure (Phases 30, 31, 32, 28)
    ↓
Attention Engine (Phase 12, 16)
    ↓
Decision Queue (Phase 37)
    ↓
Executive Action
```

---

## 2. Institutional Cockpit Layout

The cockpit provides a clear, unified view answering:
1. **WHERE AM I?** Current Organization (`ORG-ROOT-001`) and Workspace (`WS-DEFAULT-001`).
2. **WHAT PORTFOLIOS DO I OPERATE?** Portfolio universe with AUM, strategy, performance, and risk metrics.
3. **WHAT HAS CHANGED?** Synthesized material change feed (drift, compliance events, decision revisions).
4. **WHAT MATTERS & WHAT IS AT RISK?** Euler CRC risk contributors, VaR (95%/99%), ES 95%, HHI concentration index, $N_{\text{eff}}$.
5. **WHAT NEEDS ATTENTION?** Severity-ranked action items (`CRITICAL`, `ACTION_REQUIRED`, `ATTENTION`, `INFORMATION`).
6. **WHAT DECISIONS ARE PENDING?** Phase 37 decision backlog (peer reviews, challenges, approvals, stale status).

---

## 3. Metric Data Contract & Freshness

Every metric exposed through the cockpit implements a strict data contract:

```typescript
interface DashboardMetric<T> {
  value: T | null;
  status: 'VALID' | 'OK' | 'WARNING' | 'BREACH' | 'UNAVAILABLE' | 'PENDING';
  asOf: string; // ISO 8601 Point-in-Time timestamp
  freshness: 'FRESH' | 'STALE' | 'PARTIAL' | 'UNAVAILABLE' | 'UNKNOWN' | 'INVALID';
  source: string; // Authoritative domain engine identifier
  unit?: string;
  formatted?: string;
  metadata?: Record<string, any>;
}
```

### Freshness Semantics
* **`FRESH`**: All domain sub-services returned up-to-date values as of current close or live ticker.
* **`STALE`**: Underlying portfolio, risk, or decision baseline has drifted past the validity window.
* **`PARTIAL`**: One or more sub-domains experienced an outage or timeout while other domains remain available.
* **`UNAVAILABLE`**: The requested domain service could not be evaluated.
* **`UNKNOWN`**: Never converted to `PASS` or `OK`; explicitly flagged for auditor review.

---

## 4. Role-Aware Views

The cockpit adapts its presentation based on the operator's persona while maintaining server-side RBAC enforcement:
* **Portfolio Manager (PM)**: Prioritizes portfolio universe, return alpha, volatility budget, active decisions.
* **Risk Officer**: Prioritizes Euler component risk contributions, parametric VaR, stress scenarios, risk budget breaches.
* **Compliance Auditor**: Prioritizes mandate constraints, single-position bounds, breach histories, SoD authorization status.
* **Organization Admin**: Prioritizes multi-workspace tenant health, active members, cryptographic snapshot integrity.

---

## 5. Domain Failure Isolation

To prevent cascade failures from rendering the entire application unusable, all domain lookups execute through `Promise.allSettled`. If an outage occurs in Risk or Decision storage, the affected domain marks its status as `DomainStatus.UNAVAILABLE` and returns `null` or empty arrays rather than crashing the route or fabricating fake zeros.
