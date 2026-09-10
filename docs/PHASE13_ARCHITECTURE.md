# PHASE 13 — INSTITUTIONAL INVESTMENT PROCESS INTELLIGENCE ARCHITECTURE

## 1. Architectural Philosophy & Isolation Rule

Phase 13 establishes an institutional-grade **Investment Process Intelligence & Decision Performance Layer** for evaluating the quality, consistency, calibration, and evolution of investment decisions over time.

### Non-Negotiable Boundary
Phase 13 is strictly an **ANALYSIS** layer. It NEVER acts as a new source of financial truth.
- Financial Truth remains owned by Phase 1 / Phase 11.
- Valuation remains owned by Phase 2.
- Risk remains owned by Phase 3.
- Research remains owned by Phase 4.
- Change Intelligence remains owned by Phase 5.
- Ingestion remains owned by Phase 6 / Phase 10.
- Attention remains owned by Phase 7.
- Copilot remains owned by Phase 8.
- Security and Governance remain owned by Phase 9.
- Market and Fundamental Fact Quality remain owned by Phase 11.
- Portfolio Performance remains owned by Phase 12.

Phase 13 consumes outputs from these upstream systems and evaluates the investment process over time. It derives new process metrics and calibration scores, but NEVER modifies upstream facts or historical decision records.

---

## 2. Core Causal Chain

The system operates across a strictly unidirectional causal chain:

```
INVESTMENT DECISION (T0)
        ↓
DECISION SNAPSHOT (Immutable)
        ↓
THESIS VERSION (V1, V2, ...)
        ↓
EVIDENCE SUPPORT (Available at T0)
        ↓
EXPECTED DRIVERS & FALSIFICATION CONDITIONS
        ↓
PREDICTIONS & FORECAST LEDGER
        ↓
RISK BUDGET & POSITION SIZING
        ↓
TIME PROGRESSION (T0 → T1)
        ↓
OBSERVED FACTS & BENCHMARK PERFORMANCE
        ↓
OUTCOME OBSERVATION
        ↓
FORECAST SCORING & CALIBRATION (Brier Score)
        ↓
THESIS ASSESSMENT (WORKING, STRENGTHENING, WEAKENING, BROKEN)
        ↓
DECISION QUALITY EVALUATION (Independent of Return)
        ↓
2x2 DECISION VS OUTCOME MATRIX
        ↓
PROCESS DRIFT & INVESTOR SCORECARD
        ↓
GROUNDED LEARNING FEEDBACK LOOP
```

---

## 3. Core Engine Components

1. **`DecisionSnapshotEngine` (`server/processIntelligence/decisionSnapshot.engine.js`)**:
   - Records immutable $T_0$ beliefs, prices, conviction, position size, and evidence hashes.
   - Prevents retroactive historical reconstruction.

2. **`ThesisVersioningEngine` (`server/processIntelligence/thesisVersioning.engine.js`)**:
   - Manages immutable thesis versions ($V_1 \rightarrow V_2 \rightarrow V_3$).
   - Never mutates old versions; links revisions via `supersedesThesisId`.

3. **`ForecastLedgerEngine` (`server/processIntelligence/forecastLedger.engine.js`)**:
   - Independent forecast recording and deterministic scoring (numeric range, point, directional, threshold, event).
   - Prohibits price increase from masquerading as fundamental forecast validation.

4. **`CalibrationEngine` (`server/processIntelligence/calibration.engine.js`)**:
   - Evaluates empirical accuracy across confidence buckets (50–59%, 60–69%, 70–79%, 80–89%, 90–100%).
   - Calculates exact Brier Score: $BS = \frac{1}{N}\sum(p_i - o_i)^2$.

5. **`ThesisEvaluationEngine` (`server/processIntelligence/thesisEvaluation.engine.js`)**:
   - Determines thesis state (`WORKING`, `STRENGTHENING`, `WEAKENING`, `BROKEN`, `VALIDATED`, `INSUFFICIENT_DATA`).
   - Explicitly supports `WORKING + LOSS` and `BROKEN + PROFIT`.

6. **`DecisionQualityEngine` (`server/processIntelligence/decisionQuality.engine.js`)**:
   - Evaluates process dimensions (Evidence Quality, Coverage, Valuation Discipline, Risk Discipline, Thesis Clarity, Falsification Awareness, Forecast Quality).
   - Classifies 2x2 Matrix with benchmark excess awareness.

7. **`ProcessDriftEngine` (`server/processIntelligence/processDrift.engine.js`)**:
   - Detects systematic behavioral drift across decisions (buying on weak evidence, holding after falsification, oversizing, conviction inflation).

8. **`InvestorScorecardEngine` (`server/processIntelligence/investorScorecard.engine.js`)**:
   - Aggregates multi-dimensional process scores, evaluates survivorship bias, and generates factual learning insights.

9. **`TemporalIntegrityEngine` (`server/processIntelligence/temporalIntegrity.engine.js`)**:
   - Strictly enforces $T_0$ information boundaries (`informationAvailableAt(t0, evidence)`).
   - Evaluates restatement impact ($V_1 \rightarrow V_2$) without altering historical decision quality.

10. **`ProcessIntelligencePackage` (`server/processIntelligence/processIntelligencePackage.js`)**:
    - Generates canonical, SHA-256 sealed, deeply frozen analytical packages.
