import assert from 'assert';
import { PerformanceLuckEngine } from '../performanceSkill/performance.luck.engine.js';
import { SurvivorshipRisk } from '../performanceSkill/performance.types.js';

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

console.log('=== Suite 9: Luck, Bootstrap Significance & Multiple Testing Control ===');

it('Deterministic bootstrap confidence intervals for Sharpe and Alpha', () => {
  const pReturns = [0.02, 0.015, 0.03, -0.01, 0.025, 0.02, 0.018, 0.022, -0.005, 0.03];
  const bReturns = [0.01, 0.01, 0.015, -0.015, 0.012, 0.01, 0.008, 0.014, -0.01, 0.012];

  const res1 = PerformanceLuckEngine.runBootstrapSignificance({
    portfolioReturns: pReturns,
    benchmarkReturns: bReturns,
    riskFreeRate: 0.02,
    periodsPerYear: 12,
    numBootstraps: 100,
    seed: 42
  });

  const res2 = PerformanceLuckEngine.runBootstrapSignificance({
    portfolioReturns: pReturns,
    benchmarkReturns: bReturns,
    riskFreeRate: 0.02,
    periodsPerYear: 12,
    numBootstraps: 100,
    seed: 42
  });

  // Strict deterministic equality
  assert.strictEqual(res1.sharpe95ConfidenceInterval[0], res2.sharpe95ConfidenceInterval[0]);
  assert.strictEqual(res1.alpha95ConfidenceInterval[0], res2.alpha95ConfidenceInterval[0]);
  assert(res1.probPositiveAlpha >= 0.80);
});

it('Multiple-testing Bonferroni & Harvey-Liu-Zhu haircut', () => {
  // 50 strategies tested with nominal t-stat = 2.1
  const res = PerformanceLuckEngine.applyMultipleTestingAdjustment({
    observedTStat: 2.1,
    numberOfStrategiesTested: 50,
    targetSignificance: 0.05
  });

  assert.strictEqual(res.numberOfStrategiesTested, 50);
  assert(res.requiredTStatForSignificance > 2.5);
  assert(res.haircuttedTStat < 2.1);
  assert.strictEqual(res.passesAdjustedThreshold, false); // Fails after multiple-testing correction
});

it('Minimum Track Record Length calculation (Bailey & Lopez de Prado)', () => {
  const mtrl = PerformanceLuckEngine.computeMinimumTrackRecordLength({
    sharpeRatio: 1.2,
    skewness: -0.5,
    kurtosis: 4.0
  });

  assert(mtrl.minYearsRequired > 0);
  assert(mtrl.minMonthsRequired > 0);
});

it('Survivorship bias assessment', () => {
  const lowRisk = PerformanceLuckEngine.assessSurvivorshipRisk({
    includesDefunctEntities: true,
    pointInTimeConstituents: true,
    backtestInceptionYears: 5
  });
  assert.strictEqual(lowRisk.survivorshipRisk, SurvivorshipRisk.LOW);

  const highRisk = PerformanceLuckEngine.assessSurvivorshipRisk({
    includesDefunctEntities: false,
    pointInTimeConstituents: false,
    backtestInceptionYears: 10
  });
  assert.strictEqual(highRisk.survivorshipRisk, SurvivorshipRisk.UNCONTROLLED);
});

console.log(`PASSED: ${passed} assertions passed.\n`);
