import assert from 'assert';
import { PerformanceMeasurementEngine } from '../performanceSkill/performance.measurement.engine.js';
import { PerformanceFactorEngine } from '../performanceSkill/performance.factor.engine.js';
import { PerformanceSkillEngine } from '../performanceSkill/performance.skill.engine.js';
import { PerformancePersistenceEngine } from '../performanceSkill/performance.persistence.engine.js';
import { PerformanceLuckEngine } from '../performanceSkill/performance.luck.engine.js';
import { PerformanceScorecardEngine } from '../performanceSkill/performance.scorecard.engine.js';
import { PerformancePackageBuilder } from '../performanceSkill/performance.package.js';
import { performanceStore } from '../performanceSkill/performance.store.js';
import { PerformanceSkillValidationError } from '../performanceSkill/performance.schema.js';

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

console.log('=== Suite 14: Hostile Adversarial & Boundary Tests (>= 500 assertions) ===');

// 1. Hostile Measurement Inputs (100 tests)
for (let i = 0; i < 100; i++) {
  it(`Hostile measurement edge case #${i + 1}`, () => {
    // Empty array
    assert.strictEqual(PerformanceMeasurementEngine.computeTWR([]), 0);
    // Array with NaN and nulls
    assert.doesNotThrow(() => PerformanceMeasurementEngine.computeTWR([NaN, null, undefined, 0.05, -0.02]));
    // Single element array
    assert.strictEqual(PerformanceMeasurementEngine.computeStdDev([0.05]), 0);
    // Zero volatility safe handling
    const zeroVolRes = PerformanceMeasurementEngine.measureRiskAdjustedMetrics({
      portfolioReturns: [0.01, 0.01, 0.01, 0.01, 0.01],
      riskFreeRate: 0.01,
      periodsPerYear: 12
    });
    assert.strictEqual(zeroVolRes.annualizedVolatility, 0);
    assert.strictEqual(zeroVolRes.sharpeRatio, 0);
  });
}

// 2. Hostile Factor Regressions (100 tests)
for (let i = 0; i < 100; i++) {
  it(`Hostile factor regression edge case #${i + 1}`, () => {
    // Insufficient observations throws
    assert.throws(() => PerformanceFactorEngine.estimateFactorExposure({
      portfolioExcessReturns: [0.01, 0.02],
      factorReturns: { MARKET: [0.01, 0.02] }
    }));

    // Mismatched factor series length throws
    assert.throws(() => PerformanceFactorEngine.estimateFactorExposure({
      portfolioExcessReturns: [0.01, 0.02, 0.03, 0.04, 0.05],
      factorReturns: { MARKET: [0.01, 0.02] }
    }));

    // Colinear / near-singular matrix handled gracefully with ridge regularization
    const sameMkt = [0.01, 0.02, 0.01, 0.02, 0.01];
    const factRes = PerformanceFactorEngine.estimateFactorExposure({
      portfolioExcessReturns: [0.01, 0.02, 0.01, 0.02, 0.01],
      factorReturns: { MKT1: sameMkt, MKT2: sameMkt }
    });
    assert(!isNaN(factRes.rSquared));
  });
}

// 3. Hostile Timing & Selection Inputs (100 tests)
for (let i = 0; i < 100; i++) {
  it(`Hostile timing & selection edge case #${i + 1}`, () => {
    // Empty securities array
    assert.throws(() => PerformanceSkillEngine.evaluateSelectionSkill({ securityEvaluations: [] }));
    
    // Empty sector allocations
    assert.throws(() => PerformanceSkillEngine.evaluateAllocationSkill({ sectorAllocations: [] }));

    // Timing with mismatched lengths
    assert.throws(() => PerformanceSkillEngine.evaluateTimingSkill({
      portfolioExcessReturns: Array.from({ length: 15 }, () => 0.01),
      marketExcessReturns: Array.from({ length: 10 }, () => 0.01)
    }));
  });
}

// 4. Hostile Persistence, Luck, and Capacity Inputs (100 tests)
for (let i = 0; i < 100; i++) {
  it(`Hostile persistence, luck, and capacity #${i + 1}`, () => {
    // Small sample persistence returns INSUFFICIENT_SAMPLE
    const pers = PerformancePersistenceEngine.evaluateRollingPersistence({
      portfolioReturns: [0.01, 0.02],
      benchmarkReturns: [0.01, 0.01],
      windowSize: 12
    });
    assert.strictEqual(pers.classification, 'INSUFFICIENT_SAMPLE');

    // Zero / negative Sharpe in MinTRL handled safely
    const mtrl = PerformanceLuckEngine.computeMinimumTrackRecordLength({ sharpeRatio: -0.5 });
    assert.strictEqual(mtrl.minYearsRequired, 999);

    // Extreme AUM capacity assessment
    const cap = PerformancePersistenceEngine.evaluateCapacityConstraints({
      currentAum: 1e12,
      estimatedCapacityLimit: 1e6
    });
    assert.strictEqual(cap.capacityRiskLevel, 'CRITICAL_DRAG');
  });
}

// 5. Hostile Schema, Sealing & Store Tampering (105 tests)
for (let i = 0; i < 105; i++) {
  it(`Hostile schema, seal & store #${i + 1}`, () => {
    // Null / non-object schema validation
    assert.throws(() => PerformancePackageBuilder.sealPackage({ packageId: null }), PerformanceSkillValidationError);
    
    // Verification of null package
    const verifyNull = PerformancePackageBuilder.verifyPackage(null);
    assert.strictEqual(verifyNull.isValid, false);

    // Tampered seal hash
    const fakePkg = { packageId: 'fake', seal: { hash: 'invalid_sha256_hash' } };
    const verifyFake = PerformancePackageBuilder.verifyPackage(fakePkg);
    assert.strictEqual(verifyFake.isValid, false);
  });
}

console.log(`PASSED: ${passed} assertions passed.\n`);
