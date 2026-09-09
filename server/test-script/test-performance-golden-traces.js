import assert from 'assert';
import { PerformanceMeasurementEngine } from '../performanceSkill/performance.measurement.engine.js';
import { PerformanceFactorEngine } from '../performanceSkill/performance.factor.engine.js';
import { PerformanceSkillEngine } from '../performanceSkill/performance.skill.engine.js';
import { PerformancePersistenceEngine } from '../performanceSkill/performance.persistence.engine.js';
import { PerformanceLuckEngine } from '../performanceSkill/performance.luck.engine.js';
import { PerformanceScorecardEngine } from '../performanceSkill/performance.scorecard.engine.js';
import { PerformancePackageBuilder } from '../performanceSkill/performance.package.js';
import {
  SkillConfidenceLevel,
  ProcessDisciplineLevel,
  PersistenceClassification,
  CapacityRiskLevel,
  SurvivorshipRisk
} from '../performanceSkill/performance.types.js';

let passed = 0;
function it(desc, fn) {
  try {
    fn();
    passed++;
  } catch (err) {
    console.error(`FAILED: ${desc}`);
    throw err;
  }
}

console.log('=== Suite 13: Golden Traces A–T (20 Institutional Archetypes) ===');

// Golden A: Quality Compounder
it('Golden A: Quality Compounder (High Selection Breadth, Persistent Alpha)', () => {
  const securities = Array.from({ length: 40 }, (_, i) => ({
    symbol: `Q_${i}`,
    activeWeight: 0.025,
    activeReturn: i < 28 ? 0.025 : -0.015
  }));
  const sel = PerformanceSkillEngine.evaluateSelectionSkill({ securityEvaluations: securities });
  assert.strictEqual(sel.breadth, 40);
  assert(sel.hitRate >= 0.70);
});

// Golden B: Pure Macro Timer
it('Golden B: Pure Macro Timer (High Treynor-Mazuy Gamma)', () => {
  const N = 40;
  const rm = Array.from({ length: N }, (_, i) => Math.sin(i * 0.4) * 0.03);
  const rp = rm.map(m => 0.002 + 1.0 * m + 3.0 * m * m);
  const timing = PerformanceSkillEngine.evaluateTimingSkill({
    portfolioExcessReturns: rp,
    marketExcessReturns: rm,
    model: 'TREYNOR_MAZUY'
  });
  assert(timing.timingCoefficient > 0);
  assert(timing.timingTStat > 2.0);
});

// Golden C: Beta Rider
it('Golden C: Beta Rider (High Beta, Flagged Systematic)', () => {
  const N = 36;
  const rm = Array.from({ length: N }, (_, i) => Math.sin(i * 0.5) * 0.04);
  const rp = rm.map((m, i) => 1.35 * m + (Math.sin(i * 2) * 0.001));
  const fact = PerformanceFactorEngine.estimateFactorExposure({
    portfolioExcessReturns: rp,
    factorReturns: { MARKET_BETA: rm }
  });
  assert(fact.factorBetas.MARKET_BETA > 1.2);
  assert.strictEqual(fact.skillConfidence, SkillConfidenceLevel.PERFORMANCE_LIKELY_SYSTEMATIC);
});

// Golden D: Undisciplined Lucky Long
it('Golden D: Undisciplined Lucky Long (Positive Return, 4 Mandate Breaches)', () => {
  const proc = PerformanceSkillEngine.evaluateProcessSkill({
    mandateAdherenceRate: 0.65,
    riskLimitBreaches: 4,
    decisionConsistencyRate: 0.55
  });
  assert.strictEqual(proc.disciplineLevel, ProcessDisciplineLevel.UNDISCIPLINED);
});

// Golden E: Disciplined Underperformer
it('Golden E: Disciplined Underperformer (Process Disciplined decoupled from negative return)', () => {
  const proc = PerformanceSkillEngine.evaluateProcessSkill({
    mandateAdherenceRate: 1.0,
    riskLimitBreaches: 0,
    decisionConsistencyRate: 1.0
  });
  assert.strictEqual(proc.disciplineLevel, ProcessDisciplineLevel.DISCIPLINED);
  assert.strictEqual(proc.processDecoupledFromReturn, true);
});

// Golden F: Capacity-Constrained Quant
it('Golden F: Capacity-Constrained Quant (Severe Slippage Drag)', () => {
  const cap = PerformancePersistenceEngine.evaluateCapacityConstraints({
    currentAum: 800000000,
    estimatedCapacityLimit: 500000000,
    advParticipationRate: 0.12
  });
  assert.strictEqual(cap.capacityRiskLevel, CapacityRiskLevel.CRITICAL_DRAG);
});

// Golden G: Concentrated Stock Picker
it('Golden G: Concentrated Stock Picker (Low Breadth, High Uncertainty)', () => {
  const securities = [
    { symbol: 'STK_1', activeWeight: 0.35, activeReturn: 0.20 },
    { symbol: 'STK_2', activeWeight: 0.35, activeReturn: -0.15 },
    { symbol: 'STK_3', activeWeight: 0.30, activeReturn: 0.10 }
  ];
  const sel = PerformanceSkillEngine.evaluateSelectionSkill({ securityEvaluations: securities });
  assert.strictEqual(sel.breadth, 3);
  assert(sel.concentrationHHI > 0.30);
});

// Golden H: Factor-Neutral Multi-Strategy
it('Golden H: Factor-Neutral Multi-Strategy (Zero Factor Exposures, Pure Alpha)', () => {
  const N = 40;
  const mkt = Array.from({ length: N }, (_, i) => Math.sin(i * 0.3) * 0.02);
  const y = Array.from({ length: N }, () => 0.008);
  const fact = PerformanceFactorEngine.estimateFactorExposure({
    portfolioExcessReturns: y,
    factorReturns: { MARKET_BETA: mkt }
  });
  assert(Math.abs(fact.factorBetas.MARKET_BETA) < 0.05);
});

// Golden I: Downside Protection Specialist
it('Golden I: Downside Protection Specialist (Henriksson-Merton Gamma)', () => {
  const N = 40;
  const rm = Array.from({ length: N }, (_, i) => Math.sin(i * 0.4) * 0.03);
  const rp = rm.map(m => 0.001 + 0.8 * m + Math.max(0, -m) * 0.9);
  const hm = PerformanceSkillEngine.evaluateTimingSkill({
    portfolioExcessReturns: rp,
    marketExcessReturns: rm,
    model: 'HENRIKSSON_MERTON'
  });
  assert(hm.timingCoefficient > 0);
});

// Golden J: ESG / Mandate Constrained
it('Golden J: ESG / Mandate Constrained (High Adherence, Moderate Alpha)', () => {
  const proc = PerformanceSkillEngine.evaluateProcessSkill({
    mandateAdherenceRate: 0.99,
    riskLimitBreaches: 0,
    decisionConsistencyRate: 0.96
  });
  assert.strictEqual(proc.disciplineLevel, ProcessDisciplineLevel.DISCIPLINED);
});

// Golden K: Deep Value Contrarian
it('Golden K: Deep Value Contrarian (High Value Factor Beta)', () => {
  const N = 36;
  const hml = Array.from({ length: N }, (_, i) => Math.sin(i * 0.5) * 0.03);
  const rp = hml.map(v => 0.001 + 1.25 * v);
  const fact = PerformanceFactorEngine.estimateFactorExposure({
    portfolioExcessReturns: rp,
    factorReturns: { VALUE_HML: hml }
  });
  assert(fact.factorBetas.VALUE_HML > 1.0);
});

// Golden L: Momentum Follower
it('Golden L: Momentum Follower (High Momentum Beta)', () => {
  const N = 36;
  const wml = Array.from({ length: N }, (_, i) => Math.sin(i * 0.5) * 0.04);
  const rp = wml.map(m => 0.002 + 1.15 * m);
  const fact = PerformanceFactorEngine.estimateFactorExposure({
    portfolioExcessReturns: rp,
    factorReturns: { MOMENTUM_WML: wml }
  });
  assert(fact.factorBetas.MOMENTUM_WML > 1.0);
});

// Golden M: Multi-Testing Overfitter
it('Golden M: Multi-Testing Overfitter (500 Strategies Tested, Haircut Fails)', () => {
  const adj = PerformanceLuckEngine.applyMultipleTestingAdjustment({
    observedTStat: 2.2,
    numberOfStrategiesTested: 500
  });
  assert.strictEqual(adj.passesAdjustedThreshold, false);
});

// Golden N: High Turnover Arbitrage
it('Golden N: High Turnover Arbitrage (High Hit Rate, Moderate Breadth)', () => {
  const securities = Array.from({ length: 50 }, (_, i) => ({
    symbol: `ARB_${i}`,
    activeWeight: 0.02,
    activeReturn: i < 40 ? 0.01 : -0.008
  }));
  const sel = PerformanceSkillEngine.evaluateSelectionSkill({ securityEvaluations: securities });
  assert.strictEqual(sel.hitRate, 0.80);
});

// Golden O: Sovereign Bond Duration Timer
it('Golden O: Sovereign Bond Duration Timer (Duration Timing)', () => {
  const N = 40;
  const rates = Array.from({ length: N }, (_, i) => Math.sin(i * 0.3) * 0.02);
  const rp = rates.map(r => 0.001 - 5.0 * r + 15.0 * (r * r));
  const tim = PerformanceSkillEngine.evaluateTimingSkill({
    portfolioExcessReturns: rp,
    marketExcessReturns: rates,
    timingDimension: 'DURATION_TIMING'
  });
  assert(tim.timingCoefficient > 0);
});

// Golden P: Emerging Markets Growth
it('Golden P: Emerging Markets Growth (Regime Dependent Alpha)', () => {
  const obs = [
    { regime: 'EM_EXPANSION', portfolioReturn: 0.08, benchmarkReturn: 0.04 },
    { regime: 'DOLLAR_STRENGTH', portfolioReturn: -0.06, benchmarkReturn: -0.02 }
  ];
  const reg = PerformancePersistenceEngine.evaluateRegimeConditionality({ regimeObservations: obs });
  assert.strictEqual(reg.isRegimeDependent, true);
});

// Golden Q: Low-Vol Anomaly Specialist
it('Golden Q: Low-Vol Anomaly Specialist (Consistent Low Volatility)', () => {
  const returns = Array.from({ length: 24 }, () => 0.008);
  const maxDd = PerformanceMeasurementEngine.computeMaxDrawdown(returns);
  assert.strictEqual(maxDd.maxDrawdown, 0);
});

// Golden R: Global Macro Currency Timer
it('Golden R: Global Macro Currency Timer (FX Allocation Attribution)', () => {
  const sectors = [
    { sector: 'USD', portfolioWeight: 0.50, benchmarkWeight: 0.30, portfolioSectorReturn: 0.04, benchmarkSectorReturn: 0.03 },
    { sector: 'EUR', portfolioWeight: 0.20, benchmarkWeight: 0.35, portfolioSectorReturn: -0.02, benchmarkSectorReturn: -0.01 },
    { sector: 'JPY', portfolioWeight: 0.30, benchmarkWeight: 0.35, portfolioSectorReturn: -0.01, benchmarkSectorReturn: -0.01 }
  ];
  const alloc = PerformanceSkillEngine.evaluateAllocationSkill({ sectorAllocations: sectors });
  assert(alloc.allocationContribution > 0);
});

// Golden S: Survivorship-Biased Backtest
it('Golden S: Survivorship-Biased Backtest (Flagged UNCONTROLLED risk)', () => {
  const sur = PerformanceLuckEngine.assessSurvivorshipRisk({
    includesDefunctEntities: false,
    pointInTimeConstituents: false
  });
  assert.strictEqual(sur.survivorshipRisk, SurvivorshipRisk.UNCONTROLLED);
});

// Golden T: Master Institutional Portfolio Package
it('Golden T: Master Institutional Portfolio Package (Full DAG Sealed)', () => {
  const pkg = PerformancePackageBuilder.sealPackage({
    packageId: 'golden_t_master_pkg',
    portfolioId: 'port_golden_t',
    managerId: 'mgr_master',
    performanceEvaluation: { portfolioReturn: 0.16, benchmarkReturn: 0.10 },
    riskAdjusted: { sharpeRatio: 1.65, maxDrawdown: 0.07 },
    scorecard: { finalScore: 88, confidenceLevel: SkillConfidenceLevel.SUPPORTED_SKILL_INDICATOR }
  });
  assert.strictEqual(PerformancePackageBuilder.verifyPackage(pkg).isValid, true);
});

console.log(`PASSED: ${passed} assertions passed.\n`);
