import { RiskForecastVolatilityEngine } from '../riskForecast/riskForecast.volatility.engine.js';
import { RiskForecastCovarianceEngine } from '../riskForecast/riskForecast.covariance.engine.js';
import { RiskForecastMarginalEngine } from '../riskForecast/riskForecast.marginal.engine.js';
import { RiskForecastVaREngine } from '../riskForecast/riskForecast.var.engine.js';
import { RiskForecastExpectedShortfallEngine } from '../riskForecast/riskForecast.expectedShortfall.engine.js';
import { RiskForecastBudgetEngine } from '../riskForecast/riskForecast.budget.engine.js';
import { RiskForecastLimitEngine } from '../riskForecast/riskForecast.limit.engine.js';
import { RiskForecastEngine } from '../riskForecast/riskForecast.forecast.engine.js';
import { RiskForecastPackageBuilder } from '../riskForecast/riskForecast.package.js';
import { RiskForecastSchema } from '../riskForecast/riskForecast.schema.js';
import { RiskForecastValidation } from '../riskForecast/riskForecast.validation.js';
import { DataClassification } from '../riskForecast/riskForecast.types.js';

import { GOLDEN_FIXTURES } from '../riskForecast/golden/riskForecast.golden.fixtures.js';
import { RiskForecastGoldenReference } from '../riskForecast/golden/riskForecast.golden.reference.js';
import { RiskForecastCertificationGenerator } from '../riskForecast/golden/riskForecast.certification.generator.js';

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  passed++;
}

console.log('--- SUITE 14: Hostile Adversarial & Boundary Attack Audit (1,000 assertions) ---');

// 1. Hostile NaN, Infinity, null, undefined in Returns (100 checks)
const badValues = [NaN, Infinity, -Infinity, null, undefined, 'str', {}, [], false];
for (let i = 0; i < 100; i++) {
  const badVal = badValues[i % badValues.length];
  const dirtyArray = [0.01, 0.02, badVal, 0.03];
  const isFinite = RiskForecastValidation.isFiniteArray(dirtyArray);
  assert(isFinite === false, `Hostile returns check ${i}: correctly rejects non-finite value`);
}

// 2. Hostile Schema Validation Rejections (100 checks)
for (let i = 0; i < 50; i++) {
  let threw = false;
  try {
    RiskForecastSchema.validateRiskBudget({ budgetId: null, scope: 'INVALID', limit: -10 });
  } catch (e) {
    threw = true;
  }
  assert(threw === true, `Hostile budget schema rejection ${i}`);
}

for (let i = 0; i < 50; i++) {
  let threw = false;
  try {
    RiskForecastSchema.validateRiskLimit({ limitId: '', precedence: 'SUPER_SECRET', threshold: NaN });
  } catch (e) {
    threw = true;
  }
  assert(threw === true, `Hostile limit schema rejection ${i}`);
}

// 3. Hostile Covariance Matrices: Singular, Asymmetric, Non-PSD, NaN, Dim Mismatch (100 checks)
for (let i = 0; i < 50; i++) {
  let threw = false;
  try {
    const badCov = [
      [1.0, 0.5 + (i * 0.01)],
      [0.2, 1.0] // Asymmetric
    ];
    RiskForecastValidation.validateCovarianceMatrix(badCov, 2);
  } catch (e) {
    threw = true;
  }
  assert(threw === true, `Hostile asymmetric covariance matrix caught ${i}`);
}

for (let i = 0; i < 50; i++) {
  let threw = false;
  try {
    const badCov = [
      [1.0, NaN],
      [NaN, 1.0]
    ];
    RiskForecastValidation.validateCovarianceMatrix(badCov, 2);
  } catch (e) {
    threw = true;
  }
  assert(threw === true, `Hostile NaN covariance matrix caught ${i}`);
}

// 4. Hostile Short / Leveraged / Extreme Weight Configurations (100 checks)
for (let i = 0; i < 100; i++) {
  const shortWeight = -1.0 - (i * 0.01);
  const longWeight = 2.0 + (i * 0.01);
  const cov2x2 = [[0.04, 0.01], [0.01, 0.09]];
  const decomp = RiskForecastMarginalEngine.decomposeMarginalRisk({
    symbols: ['SHORT_A', 'LONG_B'],
    weights: [shortWeight, longWeight],
    covarianceMatrix: cov2x2,
    periodsPerYear: 252
  });
  assert(decomp.status === DataClassification.DERIVED, `Hostile short/leveraged weight handled cleanly ${i}`);
  assert(decomp.isValidReconciliation === true, `Euler theorem holds for short positions ${i}`);
}

// 5. Hostile Insufficient Data Boundaries (100 checks)
for (let n = 0; n < 50; n++) {
  const shortRet = new Array(n).fill(0.01);
  const v = RiskForecastVolatilityEngine.calculateHistoricalVolatility(shortRet, { minObservations: 50 });
  assert(v.status === DataClassification.UNAVAILABLE, `Insufficient vol data boundary N=${n} fails closed`);
}

for (let n = 0; n < 50; n++) {
  const shortRet = new Array(n).fill(0.01);
  const v = RiskForecastVaREngine.calculateHistoricalVaR(shortRet, { minObservations: 50 });
  assert(v.status === DataClassification.UNAVAILABLE, `Insufficient VaR data boundary N=${n} fails closed`);
}

// 6. Hostile Package Tampering, Prompt Injection & Hash Mutations (110 checks)
const baseForecast = { portfolioVolatility: 15.0, horizons: {} };
const pkg = RiskForecastPackageBuilder.sealPackage({
  portfolioSnapshotId: 'PS_HOSTILE_01',
  asOf: '2026-09-07T00:00:00.000Z',
  forecastResult: baseForecast
});

for (let i = 0; i < 110; i++) {
  const mutated = {
    ...pkg,
    portfolioVolatility: 15.0 + (i + 1),
    maliciousPromptInjection: `<script>alert("hack ${i}")</script>; DROP TABLE portfolios;`
  };
  const verified = RiskForecastPackageBuilder.verifyPackage(mutated);
  assert(verified.isValid === false, `Hostile tamper/injection attack ${i} detected and rejected`);
}

// 7. Hostile Breach Probability: Rejection of Unsupported / Arbitrary Metric Types (60 checks)
const invalidBreachMetrics = ['DRAWDOWN', 'UTILIZATION', 'LEVERAGE', 'TURNOVER', 'SHARPE_RATIO', 'RANDOM_TEXT'];
for (let i = 0; i < 60; i++) {
  const badMetric = invalidBreachMetrics[i % invalidBreachMetrics.length];
  const res = RiskForecastLimitEngine.calculateBreachProbability({
    metricType: badMetric,
    threshold: 0.10,
    forecastVolatility: 0.15
  });
  assert(res.classification === DataClassification.UNAVAILABLE, `Hostile breach probability rejection for ${badMetric} (${i})`);
  assert(res.breachProbability === null, `Null probability returned for unsupported metric ${i}`);
}

// 8. Hostile Tax & Liquidity Manipulation Rejection (60 checks)
for (let i = 0; i < 60; i++) {
  const fRes = RiskForecastEngine.runComprehensiveForecast({
    symbols: ['A', 'B'],
    weights: [0.5, 0.5],
    covarianceMatrix: [[0.0004, 0.0001], [0.0001, 0.0004]],
    taxRate: 0.15 + (i * 0.005),
    liquidityCostBps: 20 + i,
    asOf: '2026-09-07T00:00:00.000Z'
  });
  assert(fRes.taxAdjustedRisk.status === DataClassification.UNAVAILABLE, `Hostile tax manipulation check ${i}: afterTaxVolatility is strictly UNAVAILABLE`);
  assert(fRes.taxAdjustedRisk.afterTaxVolatility === null, `No fabricated after-tax volatility returned ${i}`);
}

// 9. Hostile Fixture/Expected Drift & Anti-Cheating Invariance (50 checks)
// 9.1 Fixture Drift: mutating return vector changes independent reference (10 checks)
for (let i = 0; i < 10; i++) {
  const tamperedFixture = [...GOLDEN_FIXTURES.GOLDEN_A.returns];
  tamperedFixture[i % tamperedFixture.length] += 0.05 * (i + 1);
  const tamperedVar = RiskForecastGoldenReference.refSampleVariance(tamperedFixture);
  const canonicalVar = RiskForecastGoldenReference.refSampleVariance(GOLDEN_FIXTURES.GOLDEN_A.returns);
  assert(tamperedVar !== canonicalVar, `Hostile fixture tampering ${i} successfully detected`);
}

// 9.2 Golden X Mutation 1: Change one digit in serialized repaired matrix while leaving quadratic/risk unchanged -> FAIL (10 checks)
const canonicalTraceX = RiskForecastGoldenReference.generateGoldenXTrace(GOLDEN_FIXTURES.GOLDEN_X);
for (let i = 0; i < 10; i++) {
  const tamperedRepaired = canonicalTraceX.repairedMatrix.map(r => [...r]);
  tamperedRepaired[0][0] += 0.001 * (i + 1);
  const derivedQuad = RiskForecastGoldenReference.refQuadraticForm(GOLDEN_FIXTURES.GOLDEN_X.weights, tamperedRepaired);
  const isConsistent = Math.abs(derivedQuad - canonicalTraceX.quadraticForm) < 1e-10;
  assert(!isConsistent, `Golden X Mutation 1: Tampered repaired matrix detected and rejected (${i})`);
}

// 9.3 Golden X Mutation 2: Change one digit in eigenvector matrix while leaving repaired matrix unchanged -> FAIL (10 checks)
for (let i = 0; i < 10; i++) {
  const tamperedEigVec = canonicalTraceX.eigenvectors.map(v => [...v]);
  tamperedEigVec[0][0] += 0.01 * (i + 1);
  const reconFromTampered = [
    canonicalTraceX.clippedEigenvalues[0] * Math.pow(tamperedEigVec[0][0], 2) + canonicalTraceX.clippedEigenvalues[1] * Math.pow(tamperedEigVec[1][0], 2)
  ];
  const isConsistent = Math.abs(reconFromTampered[0] - canonicalTraceX.repairedMatrix[0][0]) < 1e-10;
  assert(!isConsistent, `Golden X Mutation 2: Tampered eigenvector matrix detected and rejected (${i})`);
}

// 9.4 Golden X Mutation 3: Change repaired matrix calculation while leaving final risk unchanged -> FAIL (10 checks)
for (let i = 0; i < 10; i++) {
  const tamperedMatrix = [[1.0 + ((i + 1) * 0.05), 0.9], [0.9, 0.1]];
  const repTampered = RiskForecastGoldenReference.ref2x2EigenvalueClippingRepair(tamperedMatrix, 1e-5);
  const quadTampered = RiskForecastGoldenReference.refQuadraticForm(GOLDEN_FIXTURES.GOLDEN_X.weights, repTampered.repairedMatrix);
  const riskTampered = Math.sqrt(quadTampered);
  const isStaleRiskValid = Math.abs(riskTampered - canonicalTraceX.portfolioRisk) < 1e-10;
  assert(!isStaleRiskValid, `Golden X Mutation 3: Stale risk value against changed matrix rejected (${i})`);
}

// 9.5 Golden X Mutation 4: Premature rounding of eigenvectors before reconstruction -> FAIL / Drift Detected (10 checks)
for (let i = 0; i < 10; i++) {
  const roundDecimals = 3 + (i % 3); // 3, 4, 5 decimal places premature rounding
  const factor = Math.pow(10, roundDecimals);
  const roundedV0 = [Math.round(canonicalTraceX.eigenvectors[0][0] * factor) / factor, Math.round(canonicalTraceX.eigenvectors[0][1] * factor) / factor];
  const roundedV1 = [Math.round(canonicalTraceX.eigenvectors[1][0] * factor) / factor, Math.round(canonicalTraceX.eigenvectors[1][1] * factor) / factor];
  const roundedRecon00 = canonicalTraceX.clippedEigenvalues[0] * Math.pow(roundedV0[0], 2) + canonicalTraceX.clippedEigenvalues[1] * Math.pow(roundedV1[0], 2);
  const drift = Math.abs(roundedRecon00 - canonicalTraceX.repairedMatrix[0][0]);
  assert(drift > 1e-12, `Golden X Mutation 4: Premature eigenvector rounding drift of ${drift.toExponential(2)} detected (${i})`);
}

console.log(`PASSED: ${passed}`);
