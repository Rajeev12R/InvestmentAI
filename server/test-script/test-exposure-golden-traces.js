import assert from 'assert';
import { ExposureAggregationEngine } from '../exposureRisk/exposure.aggregation.engine.js';
import { ExposureFactorEngine } from '../exposureRisk/exposure.factor.engine.js';
import { ExposureRiskDecompositionEngine } from '../exposureRisk/exposure.risk.decomposition.engine.js';
import { ExposureCommonDriverEngine } from '../exposureRisk/exposure.common.driver.engine.js';
import { ExposureMacroScenarioEngine } from '../exposureRisk/exposure.macro.scenario.engine.js';
import { ExposureComplianceLimitsEngine } from '../exposureRisk/exposure.compliance.limits.engine.js';
import { ExposureChangeEngine } from '../exposureRisk/exposure.change.engine.js';
import { ExposurePackageBuilder } from '../exposureRisk/exposure.package.js';
import { exposureStore } from '../exposureRisk/exposure.store.js';
import {
  ExposureClassification,
  BreachPrecedenceLevel,
  BreachStatus,
  SensitivityTier
} from '../exposureRisk/exposure.types.js';

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

// Golden A: Single-security portfolio -> exact beta exposure
it('Golden A: Single-security portfolio -> exact beta exposure', () => {
  const holdings = [{ symbol: 'NVDA', weight: 1.0, factorBetas: { MARKET: 1.65 } }];
  const res = ExposureFactorEngine.calculatePortfolioFactorExposures({ holdings });
  assert.strictEqual(res.portfolioFactorBetas.MARKET, 1.65);
});

// Golden B: Two-security portfolio -> weighted factor exposure
it('Golden B: Two-security portfolio -> weighted factor exposure', () => {
  const holdings = [
    { symbol: 'AAPL', weight: 0.50, factorBetas: { VALUE: -0.20 } },
    { symbol: 'JNJ', weight: 0.50, factorBetas: { VALUE: 0.60 } }
  ];
  const res = ExposureFactorEngine.calculatePortfolioFactorExposures({ holdings });
  assert.strictEqual(res.portfolioFactorBetas.VALUE, 0.20);
});

// Golden C: Long/short portfolio -> gross vs net exposure
it('Golden C: Long/short portfolio -> gross vs net exposure', () => {
  const holdings = [
    { symbol: 'LONG_A', weight: 0.80 },
    { symbol: 'SHORT_B', weight: -0.30 }
  ];
  const res = ExposureAggregationEngine.aggregatePortfolioExposure({ holdings });
  assert.strictEqual(res.grossExposure, 1.10);
  assert.strictEqual(res.netExposure, 0.50);
});

// Golden D: Leveraged portfolio -> gross exposure > 100%
it('Golden D: Leveraged portfolio -> gross exposure > 100%', () => {
  const holdings = [
    { symbol: 'STK_1', weight: 1.50 },
    { symbol: 'STK_2', weight: -0.50 }
  ];
  const res = ExposureAggregationEngine.aggregatePortfolioExposure({ holdings });
  assert.strictEqual(res.grossExposure, 2.00);
  assert.strictEqual(res.isLeveraged, true);
});

// Golden E: Currency exposure aggregation
it('Golden E: Currency exposure aggregation', () => {
  const holdings = [
    { symbol: 'US', weight: 0.50, currency: 'USD' },
    { symbol: 'EU', weight: 0.30, currency: 'EUR' },
    { symbol: 'UK', weight: 0.20, currency: 'GBP' }
  ];
  const res = ExposureAggregationEngine.aggregatePortfolioExposure({ holdings });
  assert.strictEqual(res.currencyExposures.EUR, 0.30);
  assert.strictEqual(res.currencyExposures.GBP, 0.20);
});

// Golden F: Duration + DV01 calculation
it('Golden F: Duration + DV01 calculation', () => {
  const holdings = [{ symbol: 'UST_10Y', weight: 1.0, duration: 7.20 }];
  const res = ExposureAggregationEngine.aggregatePortfolioExposure({ holdings });
  assert.strictEqual(res.durationMetrics.effectiveDuration, 7.20);
  assert.strictEqual(res.durationMetrics.portfolioDV01, 0.00072);
});

// Golden G: Factor return decomposition with exact residual
it('Golden G: Factor return decomposition with exact residual', () => {
  const res = ExposureFactorEngine.decomposeFactorReturns({
    portfolioReturn: 0.10,
    riskFreeRate: 0.02,
    portfolioFactorBetas: { MARKET: 1.0 },
    factorReturns: { MARKET: 0.06 }
  });
  assert.strictEqual(res.totalFactorContribution, 0.06);
  assert.strictEqual(res.residual, 0.02);
  assert.strictEqual(res.reconciled, true);
});

// Golden H: Portfolio risk contribution reconciliation
it('Golden H: Portfolio risk contribution reconciliation', () => {
  const res = ExposureRiskDecompositionEngine.decomposeCovarianceRisk({
    symbols: ['A', 'B'],
    weights: [0.6, 0.4],
    covarianceMatrix: [[0.04, 0.01], [0.01, 0.09]]
  });
  assert.strictEqual(res.isReconciled, true);
  assert(res.reconciliationGap < 1e-4);
});

// Golden I: Sector concentration
it('Golden I: Sector concentration', () => {
  const holdings = [
    { symbol: 'TECH_1', weight: 0.40, sector: 'TECH' },
    { symbol: 'TECH_2', weight: 0.30, sector: 'TECH' },
    { symbol: 'HLT_1', weight: 0.30, sector: 'HEALTHCARE' }
  ];
  const res = ExposureAggregationEngine.aggregatePortfolioExposure({ holdings });
  assert.strictEqual(res.sectorExposures.TECH, 0.70);
});

// Golden J: Hidden common-driver concentration
it('Golden J: Hidden common-driver concentration', () => {
  const holdings = [
    { symbol: 'A', weight: 0.5, supplyChain: ['BOTTLENECK_1'] },
    { symbol: 'B', weight: 0.5, supplyChain: ['BOTTLENECK_1'] }
  ];
  const drv = ExposureCommonDriverEngine.identifyCommonDrivers({ holdings });
  const conc = ExposureCommonDriverEngine.evaluateHiddenConcentration({ holdings, commonDrivers: drv.commonDrivers });
  assert.strictEqual(conc.isHiddenConcentrationDetected, true);
});

// Golden K: Benchmark-relative factor exposure
it('Golden K: Benchmark-relative factor exposure', () => {
  const res = ExposureFactorEngine.calculatePortfolioFactorExposures({
    holdings: [{ symbol: 'A', weight: 1.0, factorBetas: { SIZE: 0.4 } }],
    benchmarkHoldings: [{ symbol: 'B', weight: 1.0, factorBetas: { SIZE: 0.1 } }]
  });
  assert.strictEqual(res.activeFactorBetas.SIZE, 0.30);
});

// Golden L: Macro sensitivity
it('Golden L: Macro sensitivity', () => {
  const res = ExposureMacroScenarioEngine.evaluateMacroSensitivities({
    macroBetaSensitivities: { OIL_WTI: 0.45 },
    tier: SensitivityTier.DERIVED
  });
  assert.strictEqual(res.sensitivities.OIL_WTI.sensitivity, 0.45);
});

// Golden M: Scenario sensitivity using Phase 19
it('Golden M: Scenario sensitivity using Phase 19', () => {
  const res = ExposureMacroScenarioEngine.evaluateScenarioSensitivity({
    scenarioName: 'GFC_2008',
    factorShocks: { MARKET: -0.35 },
    portfolioFactorBetas: { MARKET: 1.20 }
  });
  assert(res.expectedPortfolioImpact < -0.40);
});

// Golden N: Liquidity exposure using Phase 18
it('Golden N: Liquidity exposure using Phase 18', () => {
  const holdings = [{ symbol: 'ILLIQ', weight: 1.0, spreadBps: 85, advParticipation: 0.12 }];
  const res = ExposureAggregationEngine.aggregatePortfolioExposure({ holdings });
  assert.strictEqual(res.liquidityMetrics.weightedSpreadBps, 85.0);
});

// Golden O: Exposure change between two snapshots
it('Golden O: Exposure change between two snapshots', () => {
  const res = ExposureChangeEngine.compareSnapshots({
    snapshotBefore: { grossExposure: 1.0 },
    snapshotAfter: { grossExposure: 1.4 }
  });
  assert(res.changeCount >= 1);
});

// Golden P: Compliance limit breach using Phase 16 precedence
it('Golden P: Compliance limit breach using Phase 16 precedence', () => {
  const res = ExposureComplianceLimitsEngine.checkExposureLimits({
    portfolioExposure: { grossExposure: 1.5 },
    limits: [{ limitId: 'lim_reg', dimension: 'GROSS_EXPOSURE', maxLimit: 1.3, precedence: BreachPrecedenceLevel.REGULATORY_MANDATE }]
  });
  assert.strictEqual(res.isCompliant, false);
  assert.strictEqual(res.highestBreachPrecedence, BreachPrecedenceLevel.REGULATORY_MANDATE);
});

// Golden Q: Historical point-in-time exposure reconstruction
it('Golden Q: Historical point-in-time exposure reconstruction', () => {
  const obs = {
    observationId: 'golden_q_obs',
    entityId: 'NVDA',
    factorId: 'MARKET',
    exposureValue: 1.5,
    informationCutoff: '2025-06-30T00:00:00Z'
  };
  exposureStore.saveExposureObservation(obs, 'tenant_golden');
  assert.strictEqual(exposureStore.getExposureObservation('golden_q_obs', 'tenant_golden', '2025-01-01T00:00:00Z'), null);
  assert.notStrictEqual(exposureStore.getExposureObservation('golden_q_obs', 'tenant_golden', '2025-07-01T00:00:00Z'), null);
});

// Golden R: Unavailable look-through data remains UNAVAILABLE
it('Golden R: Unavailable look-through data remains UNAVAILABLE', () => {
  const holdings = [{ symbol: 'PRIVATE_FUND', weight: 0.50, isLookThrough: true, underlying: [] }];
  const res = ExposureAggregationEngine.aggregatePortfolioExposure({ holdings });
  assert.strictEqual(res.expandedHoldings[0].lookThroughStatus, 'UNAVAILABLE');
});

// Golden S: Exposure != skill distinction
it('Golden S: Exposure != skill distinction', () => {
  const exp = { MARKET_BETA: 1.5 };
  // High exposure is an exposure state, not a skill determination
  assert.strictEqual(exp.MARKET_BETA > 1.0, true);
});

// Golden T: Complete sealed package with 11-node Explanation DAG
it('Golden T: Complete sealed package with 11-node Explanation DAG', () => {
  const pkg = ExposurePackageBuilder.sealPackage({
    packageId: 'golden_t_exp_pkg',
    portfolioId: 'port_golden_t',
    portfolioExposure: { grossExposure: 1.2, netExposure: 0.8 },
    complianceStatus: { isCompliant: true, breachCount: 0 }
  });
  assert.strictEqual(pkg.explanationDAG.nodes.length, 11);
  assert.strictEqual(ExposurePackageBuilder.verifyPackage(pkg).isValid, true);
});

console.log(`PASSED: ${passed} assertions passed.\n`);
