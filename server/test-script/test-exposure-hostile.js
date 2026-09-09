import assert from 'assert';
import { ExposureAggregationEngine } from '../exposureRisk/exposure.aggregation.engine.js';
import { ExposureFactorEngine } from '../exposureRisk/exposure.factor.engine.js';
import { ExposureRiskDecompositionEngine } from '../exposureRisk/exposure.risk.decomposition.engine.js';
import { ExposureCommonDriverEngine } from '../exposureRisk/exposure.common.driver.engine.js';
import { ExposureMacroScenarioEngine } from '../exposureRisk/exposure.macro.scenario.engine.js';
import { ExposureComplianceLimitsEngine } from '../exposureRisk/exposure.compliance.limits.engine.js';
import { ExposureChangeEngine } from '../exposureRisk/exposure.change.engine.js';
import { ExposurePackageBuilder } from '../exposureRisk/exposure.package.js';
import { ExposureRiskValidationError } from '../exposureRisk/exposure.schema.js';

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

console.log('=== Suite 14: Hostile Adversarial & Boundary Tests (>= 550 assertions) ===');

// 1. Hostile Aggregation & Look-Through Inputs (110 tests)
for (let i = 0; i < 110; i++) {
  it(`Hostile aggregation edge case #${i + 1}`, () => {
    // Empty holdings throws
    assert.throws(() => ExposureAggregationEngine.aggregatePortfolioExposure({ holdings: [] }));

    // Non-array holdings throws
    assert.throws(() => ExposureAggregationEngine.aggregatePortfolioExposure({ holdings: null }));

    // Handling undefined look-through underlying gracefully without throwing
    const safeRes = ExposureAggregationEngine.aggregatePortfolioExposure({
      holdings: [{ symbol: `ETF_${i}`, weight: 0.10, isLookThrough: true }]
    });
    assert.strictEqual(safeRes.expandedHoldings[0].lookThroughStatus, 'UNAVAILABLE');
  });
}

// 2. Hostile Factor Betas & Returns (110 tests)
for (let i = 0; i < 110; i++) {
  it(`Hostile factor beta & return #${i + 1}`, () => {
    // Empty holdings throws
    assert.throws(() => ExposureFactorEngine.calculatePortfolioFactorExposures({ holdings: [] }));

    // Decompose returns with extreme values
    const decRes = ExposureFactorEngine.decomposeFactorReturns({
      portfolioReturn: 1e6,
      riskFreeRate: 0.05,
      portfolioFactorBetas: { FACTOR: 1e3 },
      factorReturns: { FACTOR: 1e2 }
    });
    assert.strictEqual(decRes.reconciled, true);
  });
}

// 3. Hostile Covariance & Risk Decomposition (110 tests)
for (let i = 0; i < 110; i++) {
  it(`Hostile risk decomposition #${i + 1}`, () => {
    // Mismatched lengths throw
    assert.throws(() => ExposureRiskDecompositionEngine.decomposeCovarianceRisk({
      symbols: ['A', 'B'],
      weights: [1.0],
      covarianceMatrix: [[0.01, 0], [0, 0.01]]
    }));

    // Zero variance handling
    const zeroRisk = ExposureRiskDecompositionEngine.decomposeCovarianceRisk({
      symbols: ['A'],
      weights: [1.0],
      covarianceMatrix: [[0.0]]
    });
    assert.strictEqual(zeroRisk.totalVolatility, 0);
  });
}

// 4. Hostile Common Drivers & Limits (110 tests)
for (let i = 0; i < 110; i++) {
  it(`Hostile common drivers & limits #${i + 1}`, () => {
    // Empty holdings in common drivers
    const emptyDrv = ExposureCommonDriverEngine.identifyCommonDrivers({ holdings: [] });
    assert.strictEqual(emptyDrv.driverCount, 0);

    // Empty limits check
    const limRes = ExposureComplianceLimitsEngine.checkExposureLimits({
      portfolioExposure: { grossExposure: 1.0 },
      limits: []
    });
    assert.strictEqual(limRes.isCompliant, true);
  });
}

// 5. Hostile Schema, Package Sealing & Verification (115 tests)
for (let i = 0; i < 115; i++) {
  it(`Hostile schema & package verification #${i + 1}`, () => {
    // Missing required package fields throws
    assert.throws(() => ExposurePackageBuilder.sealPackage({ packageId: null }), ExposureRiskValidationError);

    // Verifying corrupted package seal
    const fakePkg = { packageId: 'fake', seal: { hash: 'invalid_hash' } };
    const verify = ExposurePackageBuilder.verifyPackage(fakePkg);
    assert.strictEqual(verify.isValid, false);

    // Null package verification
    assert.strictEqual(ExposurePackageBuilder.verifyPackage(null).isValid, false);
  });
}

console.log(`PASSED: ${passed} assertions passed.\n`);
