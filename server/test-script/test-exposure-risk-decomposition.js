import assert from 'assert';
import { ExposureRiskDecompositionEngine } from '../exposureRisk/exposure.risk.decomposition.engine.js';

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

console.log('=== Suite 6: Covariance Risk Decomposition & Marginal Risk ===');

it('Decompose risk and verify exact reconciliation (sum(CRC) == Total Volatility)', () => {
  const symbols = ['SEC_A', 'SEC_B', 'SEC_C'];
  const weights = [0.50, 0.30, 0.20];
  // 3x3 periodic daily covariance matrix
  const cov = [
    [0.0004, 0.0001, 0.00005],
    [0.0001, 0.0009, 0.0002],
    [0.00005, 0.0002, 0.0016]
  ];

  const res = ExposureRiskDecompositionEngine.decomposeCovarianceRisk({
    symbols,
    weights,
    covarianceMatrix: cov,
    periodsPerYear: 252
  });

  assert(res.totalVolatility > 0);
  assert.strictEqual(res.isReconciled, true);
  assert(res.reconciliationGap < 1e-4);
  assert.strictEqual(Object.keys(res.componentRiskContributions).length, 3);
  assert.strictEqual(Object.keys(res.marginalRiskContributions).length, 3);
});

it('Detect exposure vs risk contribution divergence', () => {
  const symbols = ['STABLE_MEGA', 'VOLATILE_SMALL'];
  // 90% weight in low vol (var=0.0001), 10% weight in ultra high vol (var=0.04)
  const weights = [0.90, 0.10];
  const cov = [
    [0.0001, 0.0000],
    [0.0000, 0.0400]
  ];

  const res = ExposureRiskDecompositionEngine.decomposeCovarianceRisk({
    symbols,
    weights,
    covarianceMatrix: cov,
    periodsPerYear: 252
  });

  // Volatile small stock is only 10% weight, but constitutes > 70% of risk!
  assert(res.percentageRiskContributions.VOLATILE_SMALL > 0.60);
  assert(res.exposureVsRiskDivergences.length >= 1);
  assert.strictEqual(res.exposureVsRiskDivergences[0].symbol, 'VOLATILE_SMALL');
});

it('Systematic vs Idiosyncratic risk separation', () => {
  const res = ExposureRiskDecompositionEngine.decomposeSystematicVsIdiosyncraticRisk({
    totalPortfolioVariance: 0.04,
    factorExplainedVariance: 0.03
  });

  assert.strictEqual(res.totalVolatility, 0.20);
  assert.strictEqual(res.systematicFraction, 0.75);
  assert.strictEqual(res.idiosyncraticFraction, 0.25);
});

console.log(`PASSED: ${passed} assertions passed.\n`);
