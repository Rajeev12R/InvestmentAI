# PHASE 40 — POINT-IN-TIME SNAPSHOT MODEL

## 1. Primary Invariant & Temporal Integrity

An institutional deliverable must never depend on mutable live state after generation.

### Governing Invariant
> **Before rendering, construct or reference a sealed point-in-time snapshot containing the exact data used by the report. The report must be 100% reproducible from that snapshot.**

---

## 2. Temporal Semantics

Phase 40 maintains rigorous distinction across temporal dimensions:

1. **Event Time**: Timestamp when an underlying transaction or market quote occurred.
2. **Observation Time**: Timestamp when the system recorded or ingested the data point.
3. **As-Of Time**: Authoritative target point-in-time for portfolio holdings and valuations.
4. **Report Period**: The span defined by `periodStart` and `periodEnd` (e.g. 2026-09-01 to 2026-09-07).
5. **Snapshot Timestamp**: Exact millisecond when the snapshot was frozen and sealed.
6. **Generation Timestamp**: Timestamp when document sections were assembled and hashed.
7. **Approval Timestamp**: Timestamp when authorized human sign-off occurred.
8. **Distribution Timestamp**: Timestamp when the deliverable was dispatched to distribution channels.

*Historical reconstruction strictly queries positions and facts that existed as of the designated date, preventing lookahead bias or retroactive pollution.*

---

## 3. Snapshot Data Structure

```typescript
interface PointInTimeSnapshot {
  snapshotId: string;           // E.g. SNAP-1725753600000-5678
  orgId: string;
  workspaceId: string;
  portfolioId?: string;
  reportType: ReportType;
  asOf: string;                 // ISO-8601
  snapshotTimestamp: string;    // ISO-8601
  periodStart: string;
  periodEnd: string;
  capturedBy: string;           // User ID
  dataVersion: number;
  portfolio?: {
    portfolioId: string;
    name: string;
    type: string;
    strategy: string;
    status: string;
    baseCurrency: string;
    benchmark: string;
    benchmarkName: string;
    aum: number;
    cashBalance: number;
    holdings: Array<{
      ticker: string;
      securityName: string;
      quantity: number;
      price: number;
      marketValue: number;
      weight: number;
      costBasis: number;
      unrealizedPnL: number;
      unrealizedPnLPct: number;
      sector: string;
      geography: string;
      freshness: DataFreshness;
      asOf: string;
    }>;
    mandate: Record<string, any>;
    asOf: string;
  };
  universeSummary?: any[];
  universeMetrics?: Record<string, any>;
  riskMetrics: {
    var95: number;
    var99: number;
    expectedShortfall95: number;
    volatility: number;
    sharpeRatio: number;
    trackingError: number;
    hhi: number;
    effectivePositions: number;
    topRiskContributors: any[];
    freshness: DataFreshness;
    source: string;
  };
  exposureMetrics: {
    sectors: any[];
    geographies: any[];
    freshness: DataFreshness;
    source: string;
  };
  complianceState: {
    status: string;             // COMPLIANT | BREACHED | UNKNOWN
    breachCount: number;
    breaches: any[];
    evaluations: any[];
    freshness: DataFreshness;
    source: string;
  };
  decisions: any[];
  alerts: any[];
  materialChanges: any[];
  evidenceReferences: Array<{
    id: string;
    type: string;
    claim: string;
  }>;
  snapshotHash: string;         // SHA-256 digest
  isSealed: boolean;            // True once frozen
}
```

---

## 4. Cryptographic Sealing & Replay Parity

Snapshot integrity is computed deterministically:
```javascript
export function computeSnapshotHash(snapshot) {
  const { snapshotHash, isSealed, ...rest } = snapshot;
  return computeDeterministicHash(rest);
}
```
Keys are sorted recursively to ensure byte-for-byte normalization. 100 consecutive replay cycles against an immutable snapshot yield identical SHA-256 digests.
