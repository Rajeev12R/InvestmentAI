import assert from 'assert';
import { detectSnapshotChanges } from '../change/change.detector.js';
import { evaluateMateriality } from '../change/materiality.config.js';
import { analyzeValuationDrift } from '../change/valuationDrift.engine.js';
import { analyzeRiskDrift } from '../change/riskDrift.engine.js';
import { monitorThesisBreakers } from '../change/thesisBreakerMonitor.engine.js';
import { analyzeThesisDrift } from '../change/thesisDrift.engine.js';
import { analyzeDecisionDrift } from '../change/decisionDrift.engine.js';
import { analyzePortfolioDrift } from '../change/portfolioChange.engine.js';
import { executeChangeAnalysis } from '../change/change.engine.js';
import { evaluateAlertRules } from '../alerts/alert.engine.js';
import {
  CHANGE_CATEGORIES,
  CHANGE_DIRECTIONS,
  MATERIALITY_LEVELS,
  THESIS_DRIFT_STATUS,
  BREAKER_MONITOR_STATUS
} from '../change/change.types.js';

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

console.log('================================================================');
console.log('PHASE 5 — DETERMINISTIC CHANGE & DRIFT ENGINE TESTS');
console.log('================================================================');

// Helper to create mock snapshot
function createSnapshot(overrides = {}) {
  return {
    snapshotId: overrides.snapshotId || `SNAP_${Date.now()}`,
    workspaceId: 'WS_DEFAULT',
    ticker: overrides.ticker || 'AAPL',
    asOf: overrides.asOf || '2026-09-01',
    createdAt: '2026-09-01T00:00:00.000Z',
    truthPackageHash: 'HASH_' + Math.random().toString(36).substring(2),
    truthPackageVersion: '1.0.0',
    marketState: {
      currentPrice: 150,
      marketCap: 2500e9,
      currency: 'USD',
      beta: 1.2,
      volatility: 0.22,
      ...(overrides.marketState || {})
    },
    financialState: {
      revenue: 400e9,
      fcf: 100e9,
      netIncome: 95e9,
      operatingCashFlow: 110e9,
      totalDebt: 100e9,
      totalCash: 30e9,
      netDebt: 70e9,
      operatingMargin: 0.30,
      fcfMargin: 0.25,
      debtToEbitda: 1.2,
      currentRatio: 1.1,
      reportingPeriod: 'TTM',
      ...(overrides.financialState || {})
    },
    valuationState: {
      dcfFairValue: 180,
      dcfUpside: 20.0,
      reverseDcfGrowth: 8.5,
      relativeFairValue: 175,
      compositeFairValue: 180,
      modelAgreement: 'STRONG',
      ...(overrides.valuationState || {})
    },
    riskState: {
      overallScore: 25,
      overallCategory: 'LOW',
      financialRisk: 'LOW',
      marketRisk: 'LOW',
      liquidityRisk: 'LOW',
      earningsQuality: 'LOW',
      ...(overrides.riskState || {})
    },
    decisionState: {
      decision: 'BUY',
      convictionScore: 85,
      convictionLevel: 'HIGH',
      primaryDrivers: ['Strong FCF margin', 'DCF margin of safety'],
      falsificationTriggers: [],
      ...(overrides.decisionState || {})
    },
    thesisState: {
      summary: 'High quality cash generator with durable ecosystem moat.',
      bullCase: 'Services acceleration',
      baseCase: 'Steady mid-single digit growth',
      bearCase: 'Hardware cycle slowdown'
    },
    thesisBreakerState: overrides.thesisBreakerState || [
      {
        trigger: 'Operating Margin Deterioration below 27.0%',
        currentValue: '30.0%',
        threshold: '27.0%',
        direction: 'CONTRACTION_BELOW_THRESHOLD',
        severity: 'HIGH'
      },
      {
        trigger: 'Balance Sheet Leverage Spike (Net Debt / EBITDA > 3.5x)',
        currentValue: '1.2x',
        threshold: '3.5x',
        direction: 'EXPANSION_ABOVE_THRESHOLD',
        severity: 'CRITICAL'
      }
    ]
  };
}

// 1. Materiality Configuration & Threshold Tests
console.log('\n--- 1. Materiality Engine & Deterministic Thresholds ---');

runTest('Price change < 5% is non-material', () => {
  const res = evaluateMateriality({
    category: CHANGE_CATEGORIES.PRICE,
    previousValue: 150,
    currentValue: 153,
    percentageChange: 2.0
  });
  assert.strictEqual(res.isMaterial, false);
  assert.ok(res.level === MATERIALITY_LEVELS.LOW || res.level === MATERIALITY_LEVELS.NEGLIGIBLE);
});

runTest('Price change >= 5% is material', () => {
  const res = evaluateMateriality({
    category: CHANGE_CATEGORIES.PRICE,
    previousValue: 150,
    currentValue: 160,
    percentageChange: 6.67
  });
  assert.strictEqual(res.isMaterial, true);
  assert.strictEqual(res.level, MATERIALITY_LEVELS.MATERIAL);
});

runTest('FCF change >= 10% is material', () => {
  const res = evaluateMateriality({
    category: CHANGE_CATEGORIES.FREE_CASH_FLOW,
    previousValue: 100e9,
    currentValue: 88e9,
    percentageChange: -12.0
  });
  assert.strictEqual(res.isMaterial, true);
  assert.strictEqual(res.level, MATERIALITY_LEVELS.MATERIAL);
});

runTest('FCF change >= 25% is critical', () => {
  const res = evaluateMateriality({
    category: CHANGE_CATEGORIES.FREE_CASH_FLOW,
    previousValue: 100e9,
    currentValue: 70e9,
    percentageChange: -30.0
  });
  assert.strictEqual(res.isMaterial, true);
  assert.strictEqual(res.level, MATERIALITY_LEVELS.CRITICAL);
});

runTest('Operating margin change >= 150 bps is material', () => {
  const res = evaluateMateriality({
    category: CHANGE_CATEGORIES.MARGINS,
    previousValue: 0.30,
    currentValue: 0.28,
    absoluteChange: -0.02 // 200 bps
  });
  assert.strictEqual(res.isMaterial, true);
  assert.strictEqual(res.level, MATERIALITY_LEVELS.MATERIAL);
});

runTest('Decision change is always highly material or critical', () => {
  const res1 = evaluateMateriality({
    category: CHANGE_CATEGORIES.DECISION,
    previousValue: 'BUY',
    currentValue: 'HOLD'
  });
  assert.strictEqual(res1.isMaterial, true);
  assert.strictEqual(res1.level, MATERIALITY_LEVELS.HIGHLY_MATERIAL);

  const res2 = evaluateMateriality({
    category: CHANGE_CATEGORIES.DECISION,
    previousValue: 'WATCH',
    currentValue: 'AVOID'
  });
  assert.strictEqual(res2.isMaterial, true);
  assert.strictEqual(res2.level, MATERIALITY_LEVELS.CRITICAL);
});

// 2. Change Detector Tests
console.log('\n--- 2. Differential Change Detector & Directional Logic ---');

runTest('Detects positive revenue variance as IMPROVING', () => {
  const s0 = createSnapshot();
  const s1 = createSnapshot({ financialState: { revenue: 440e9 } });
  const changes = detectSnapshotChanges(s0, s1);

  const revChange = changes.find(c => c.field === 'financialState.revenue');
  assert.ok(revChange);
  assert.strictEqual(revChange.percentageChange, 10.0);
  assert.strictEqual(revChange.direction, CHANGE_DIRECTIONS.IMPROVING);
  assert.strictEqual(revChange.isMaterial, true);
});

runTest('Detects debt increase as DETERIORATING', () => {
  const s0 = createSnapshot();
  const s1 = createSnapshot({ financialState: { totalDebt: 125e9 } });
  const changes = detectSnapshotChanges(s0, s1);

  const debtChange = changes.find(c => c.field === 'financialState.totalDebt');
  assert.ok(debtChange);
  assert.strictEqual(debtChange.percentageChange, 25.0);
  assert.strictEqual(debtChange.direction, CHANGE_DIRECTIONS.DETERIORATING);
  assert.strictEqual(debtChange.materiality, MATERIALITY_LEVELS.MATERIAL);
});

runTest('Skips UNAVAILABLE fields without corrupting diffs', () => {
  const s0 = createSnapshot({ financialState: { debtToEbitda: 'UNAVAILABLE' } });
  const s1 = createSnapshot({ financialState: { debtToEbitda: 2.1 } });
  const changes = detectSnapshotChanges(s0, s1);
  const lev = changes.find(c => c.field === 'financialState.debtToEbitda');
  assert.strictEqual(lev, undefined, 'Unavailable previous field should be omitted from numerical delta');
});

// 3. Valuation Drift Engine Tests
console.log('\n--- 3. Valuation Drift Engine ---');

runTest('Identifies DCF fair value expansion', () => {
  const s0 = createSnapshot({ valuationState: { compositeFairValue: 180 } });
  const s1 = createSnapshot({ valuationState: { compositeFairValue: 200 } });
  const drift = analyzeValuationDrift(s0, s1);

  assert.strictEqual(drift.hasDrift, true);
  assert.strictEqual(drift.direction, CHANGE_DIRECTIONS.IMPROVING);
  assert.strictEqual(drift.fairValueChangePct, 11.11);
  assert.ok(drift.interpretation.includes('expanded by +11.1%'));
});

runTest('Identifies DCF fair value compression', () => {
  const s0 = createSnapshot({ valuationState: { compositeFairValue: 180 } });
  const s1 = createSnapshot({ valuationState: { compositeFairValue: 160 } });
  const drift = analyzeValuationDrift(s0, s1);

  assert.strictEqual(drift.hasDrift, true);
  assert.strictEqual(drift.direction, CHANGE_DIRECTIONS.DETERIORATING);
  assert.strictEqual(drift.fairValueChangePct, -11.11);
  assert.ok(drift.interpretation.includes('compressed by -11.1%'));
});

runTest('Tracks Reverse DCF implied growth delta', () => {
  const s0 = createSnapshot({ valuationState: { reverseDcfGrowth: 8.5 } });
  const s1 = createSnapshot({ valuationState: { reverseDcfGrowth: 12.0 } });
  const drift = analyzeValuationDrift(s0, s1);

  assert.strictEqual(drift.previousReverseDcfGrowth, 8.5);
  assert.strictEqual(drift.currentReverseDcfGrowth, 12.0);
  assert.strictEqual(drift.growthDelta, 3.5);
});

// 4. Risk Drift Engine Tests
console.log('\n--- 4. Risk Drift Engine & Category Matrix ---');

runTest('Detects single category risk escalation', () => {
  const s0 = createSnapshot({ riskState: { financialRisk: 'LOW', overallCategory: 'LOW' } });
  const s1 = createSnapshot({ riskState: { financialRisk: 'HIGH', overallCategory: 'MEDIUM' } });
  const drift = analyzeRiskDrift(s0, s1);

  assert.strictEqual(drift.hasDrift, true);
  assert.strictEqual(drift.overallDirection, CHANGE_DIRECTIONS.DETERIORATING);
  assert.strictEqual(drift.transitions.length, 2);
  assert.ok(drift.transitions.some(t => t.field === 'financialRisk' && t.currentLevel === 'HIGH'));
});

runTest('Detects risk improvement', () => {
  const s0 = createSnapshot({ riskState: { overallCategory: 'HIGH', overallScore: 70 } });
  const s1 = createSnapshot({ riskState: { overallCategory: 'LOW', overallScore: 20 } });
  const drift = analyzeRiskDrift(s0, s1);

  assert.strictEqual(drift.overallDirection, CHANGE_DIRECTIONS.IMPROVING);
  assert.strictEqual(drift.transitions[0].direction, CHANGE_DIRECTIONS.IMPROVING);
});

// 5. Thesis Breaker Monitor Tests
console.log('\n--- 5. Thesis Breaker Monitoring Engine ---');

runTest('Evaluates operating margin breaker as TRIGGERED when breached', () => {
  const s1 = createSnapshot({
    financialState: { operatingMargin: 0.25 } // 25% < threshold 27%
  });
  const breakers = monitorThesisBreakers(null, s1);
  const marginBreaker = breakers.find(b => b.trigger.includes('Operating Margin'));

  assert.ok(marginBreaker);
  assert.strictEqual(marginBreaker.status, BREAKER_MONITOR_STATUS.TRIGGERED);
  assert.ok(marginBreaker.detail.includes('breached trigger threshold'));
});

runTest('Evaluates operating margin breaker as APPROACHING when within buffer', () => {
  const s1 = createSnapshot({
    financialState: { operatingMargin: 0.28 } // 28% is within 27% + 1.5%
  });
  const breakers = monitorThesisBreakers(null, s1);
  const marginBreaker = breakers.find(b => b.trigger.includes('Operating Margin'));

  assert.strictEqual(marginBreaker.status, BREAKER_MONITOR_STATUS.APPROACHING);
});

runTest('Evaluates leverage breaker as TRIGGERED when Debt/EBITDA >= 3.5x', () => {
  const s1 = createSnapshot({
    financialState: { debtToEbitda: 4.2 }
  });
  const breakers = monitorThesisBreakers(null, s1);
  const levBreaker = breakers.find(b => b.trigger.includes('Leverage Spike'));

  assert.strictEqual(levBreaker.status, BREAKER_MONITOR_STATUS.TRIGGERED);
});

runTest('Detects breaker RESOLVED transition from previous snapshot', () => {
  const s0 = createSnapshot({
    thesisBreakerState: [
      { trigger: 'Operating Margin Deterioration below 27.0%', status: BREAKER_MONITOR_STATUS.TRIGGERED, threshold: '27.0%', direction: 'CONTRACTION_BELOW_THRESHOLD' }
    ]
  });
  const s1 = createSnapshot({
    financialState: { operatingMargin: 0.32 },
    thesisBreakerState: [
      { trigger: 'Operating Margin Deterioration below 27.0%', threshold: '27.0%', direction: 'CONTRACTION_BELOW_THRESHOLD' }
    ]
  });
  const breakers = monitorThesisBreakers(s0, s1);
  assert.strictEqual(breakers[0].status, BREAKER_MONITOR_STATUS.RESOLVED);
});

// 6. Thesis Drift Engine Tests
console.log('\n--- 6. Deterministic Thesis Drift Engine ---');

runTest('Classifies THESIS_STRENGTHENED when positive fundamental pillars dominate', () => {
  const s0 = createSnapshot();
  const s1 = createSnapshot({
    financialState: { revenue: 440e9, operatingMargin: 0.34 }
  });
  const rawChanges = detectSnapshotChanges(s0, s1);
  const valDrift = analyzeValuationDrift(s0, s1);
  const riskDrift = analyzeRiskDrift(s0, s1);
  const breakers = monitorThesisBreakers(s0, s1);

  const thesisDrift = analyzeThesisDrift({
    previousSnapshot: s0,
    currentSnapshot: s1,
    changes: rawChanges,
    monitoredBreakers: breakers,
    valuationDrift: valDrift,
    riskDrift
  });

  assert.strictEqual(thesisDrift.status, THESIS_DRIFT_STATUS.THESIS_STRENGTHENED);
  assert.ok(thesisDrift.score > 0);
  assert.strictEqual(thesisDrift.pillars.growth, 'ACCELERATING');
});

runTest('Classifies THESIS_INVALIDATED when a thesis breaker triggers', () => {
  const s0 = createSnapshot();
  const s1 = createSnapshot({
    financialState: { debtToEbitda: 4.5 }
  });
  const rawChanges = detectSnapshotChanges(s0, s1);
  const valDrift = analyzeValuationDrift(s0, s1);
  const riskDrift = analyzeRiskDrift(s0, s1);
  const breakers = monitorThesisBreakers(s0, s1);

  const thesisDrift = analyzeThesisDrift({
    previousSnapshot: s0,
    currentSnapshot: s1,
    changes: rawChanges,
    monitoredBreakers: breakers,
    valuationDrift: valDrift,
    riskDrift
  });

  assert.strictEqual(thesisDrift.status, THESIS_DRIFT_STATUS.THESIS_INVALIDATED);
  assert.strictEqual(thesisDrift.score, -100);
});

// 7. Decision Drift & Alert Rules Tests
console.log('\n--- 7. Decision Drift & Alert Rules ---');

runTest('Detects BUY to HOLD downgrade transition', () => {
  const s0 = createSnapshot({ decisionState: { decision: 'BUY', convictionScore: 85 } });
  const s1 = createSnapshot({ decisionState: { decision: 'HOLD', convictionScore: 60 } });
  const drift = analyzeDecisionDrift(s0, s1);

  assert.strictEqual(drift.hasChanged, true);
  assert.strictEqual(drift.transitionType, 'DOWNGRADE');
  assert.strictEqual(drift.convictionDelta, -25);
});

runTest('Generates high-priority alert for decision downgrade', () => {
  const s0 = createSnapshot({ decisionState: { decision: 'BUY' } });
  const s1 = createSnapshot({ decisionState: { decision: 'HOLD' } });
  const changeReport = executeChangeAnalysis({ previousSnapshot: s0, currentSnapshot: s1 });
  const alerts = evaluateAlertRules({
    workspaceId: 'WS_DEFAULT',
    changeReport,
    previousSnapshot: s0,
    currentSnapshot: s1
  });

  assert.ok(alerts.some(a => a.type === 'DECISION_DOWNGRADE' && a.severity === 'HIGH'));
});

// 8. Portfolio Drift Engine Tests
console.log('\n--- 8. Portfolio Concentration & HHI Drift ---');

runTest('Computes HHI concentration increase on position sizing shift', () => {
  const p0 = {
    holdings: [
      { ticker: 'AAPL', quantity: 100, averageCost: 150 },
      { ticker: 'MSFT', quantity: 100, averageCost: 150 },
      { ticker: 'GOOGL', quantity: 100, averageCost: 150 },
      { ticker: 'AMZN', quantity: 100, averageCost: 150 }
    ]
  };
  const p1 = {
    holdings: [
      { ticker: 'AAPL', quantity: 400, averageCost: 150 }, // 70% concentration
      { ticker: 'MSFT', quantity: 50, averageCost: 150 },
      { ticker: 'GOOGL', quantity: 50, averageCost: 150 },
      { ticker: 'AMZN', quantity: 50, averageCost: 150 }
    ]
  };
  const drift = analyzePortfolioDrift(p0, p1);

  assert.strictEqual(drift.hasChanged, true);
  assert.strictEqual(drift.diversificationShift, 'CONCENTRATING');
  assert.ok(drift.hhiDelta > 1000);
});

// 9. Time-Travel History Simulation Tests (T0 -> T1 -> T2 -> T3 -> T4)
console.log('\n--- 9. Time-Travel Multi-Period Simulation ---');

runTest('Multi-period progression: T0(BUY) -> T1(HOLD) -> T2(WATCH/BREAKER) -> T3(RECOVERY)', () => {
  const T0 = createSnapshot({ snapshotId: 'T0', decisionState: { decision: 'BUY' }, valuationState: { compositeFairValue: 200 } });
  const T1 = createSnapshot({ snapshotId: 'T1', decisionState: { decision: 'HOLD' }, valuationState: { compositeFairValue: 170 } });
  const T2 = createSnapshot({
    snapshotId: 'T2',
    decisionState: { decision: 'WATCH' },
    financialState: { debtToEbitda: 4.0 },
    thesisBreakerState: [
      { trigger: 'Balance Sheet Leverage Spike (Net Debt / EBITDA > 3.5x)', status: BREAKER_MONITOR_STATUS.TRIGGERED, threshold: '3.5x', direction: 'EXPANSION_ABOVE_THRESHOLD' }
    ]
  });
  const T3 = createSnapshot({ snapshotId: 'T3', decisionState: { decision: 'HOLD' }, financialState: { debtToEbitda: 1.5, operatingMargin: 0.33 } });

  const r0_1 = executeChangeAnalysis({ previousSnapshot: T0, currentSnapshot: T1 });
  assert.strictEqual(r0_1.decisionDrift.transitionType, 'DOWNGRADE');

  const r1_2 = executeChangeAnalysis({ previousSnapshot: T1, currentSnapshot: T2 });
  assert.strictEqual(r1_2.thesisDrift.status, THESIS_DRIFT_STATUS.THESIS_INVALIDATED);

  const r2_3 = executeChangeAnalysis({ previousSnapshot: T2, currentSnapshot: T3 });
  assert.strictEqual(r2_3.thesisBreakers.find(b => b.trigger.includes('Leverage')).status, BREAKER_MONITOR_STATUS.RESOLVED);
});

console.log('================================================================');
console.log(`CHANGE TESTS COMPLETE: ${passed} PASSED, ${failed} FAILED`);
console.log('================================================================');

if (failed > 0) process.exit(1);
