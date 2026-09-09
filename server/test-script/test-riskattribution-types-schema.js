/**
 * server/test-script/test-riskattribution-types-schema.js
 * 
 * Phase 32 — Suite 1: Risk Attribution Types, Taxonomy, Validation & Numerical Safety
 */

import { AttributionType, ConfidenceStatus, CovarianceAllocationConvention, HierarchyLevel, ResidualPolicy, DataClassification, deepFreeze } from '../riskAttribution/riskAttribution.types.js';
import { RiskAttributionConfig } from '../riskAttribution/riskAttribution.config.js';
import { RiskAttributionValidation } from '../riskAttribution/riskAttribution.validation.js';

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  passed++;
}

console.log('--- SUITE 1: Phase 32 Risk Attribution Types, Taxonomy, Validation & Numerical Safety ---');

// 1. AttributionType Enumeration
assert(AttributionType.MARGINAL === 'MARGINAL', 'AttributionType.MARGINAL exists');
assert(AttributionType.COMPONENT === 'COMPONENT', 'AttributionType.COMPONENT exists');
assert(AttributionType.PERCENTAGE === 'PERCENTAGE', 'AttributionType.PERCENTAGE exists');
assert(AttributionType.VARIANCE === 'VARIANCE', 'AttributionType.VARIANCE exists');
assert(AttributionType.FACTOR === 'FACTOR', 'AttributionType.FACTOR exists');
assert(AttributionType.SECTOR === 'SECTOR', 'AttributionType.SECTOR exists');
assert(AttributionType.GEOGRAPHY === 'GEOGRAPHY', 'AttributionType.GEOGRAPHY exists');
assert(AttributionType.SLEEVE === 'SLEEVE', 'AttributionType.SLEEVE exists');
assert(AttributionType.CONCENTRATION === 'CONCENTRATION', 'AttributionType.CONCENTRATION exists');
assert(AttributionType.CORRELATION === 'CORRELATION', 'AttributionType.CORRELATION exists');
assert(AttributionType.TAIL_RISK === 'TAIL_RISK', 'AttributionType.TAIL_RISK exists');
assert(AttributionType.STRESS === 'STRESS', 'AttributionType.STRESS exists');
assert(AttributionType.REGIME === 'REGIME', 'AttributionType.REGIME exists');
assert(AttributionType.LIQUIDITY === 'LIQUIDITY', 'AttributionType.LIQUIDITY exists');
assert(AttributionType.ACTIVE === 'ACTIVE', 'AttributionType.ACTIVE exists');

// 2. ConfidenceStatus
assert(ConfidenceStatus.CALCULATED === 'CALCULATED', 'ConfidenceStatus.CALCULATED exists');
assert(ConfidenceStatus.DERIVED === 'DERIVED', 'ConfidenceStatus.DERIVED exists');
assert(ConfidenceStatus.MODEL_BASED === 'MODEL_BASED', 'ConfidenceStatus.MODEL_BASED exists');
assert(ConfidenceStatus.SCENARIO === 'SCENARIO', 'ConfidenceStatus.SCENARIO exists');
assert(ConfidenceStatus.UNAVAILABLE === 'UNAVAILABLE', 'ConfidenceStatus.UNAVAILABLE exists');

// 3. HierarchyLevel & ResidualPolicy
assert(HierarchyLevel.PORTFOLIO === 'PORTFOLIO', 'HierarchyLevel.PORTFOLIO exists');
assert(HierarchyLevel.FACTOR === 'FACTOR', 'HierarchyLevel.FACTOR exists');
assert(ResidualPolicy.RECONCILED_WITHIN_TOLERANCE === 'RECONCILED_WITHIN_TOLERANCE', 'ResidualPolicy.RECONCILED_WITHIN_TOLERANCE exists');
assert(ResidualPolicy.EXPLICIT_RESIDUAL === 'EXPLICIT_RESIDUAL', 'ResidualPolicy.EXPLICIT_RESIDUAL exists');

// 4. Config & Tolerances
assert(RiskAttributionConfig.TOLERANCES.ABSOLUTE_RECONCILIATION === 1e-6, 'Absolute tolerance is 1e-6');
assert(RiskAttributionConfig.TOLERANCES.ZERO_VOLATILITY_EPSILON === 1e-12, 'Zero vol epsilon is 1e-12');
assert(RiskAttributionConfig.CANONICAL_STRESS_SCENARIOS.GFC_2008 !== undefined, 'GFC_2008 stress scenario defined');
assert(RiskAttributionConfig.CANONICAL_REGIMES.CRISIS_DISLOCATION !== undefined, 'CRISIS_DISLOCATION regime defined');

// 5. DeepFreeze Immutability
const testObj = { a: 1, nested: { b: 2 } };
deepFreeze(testObj);
assert(Object.isFrozen(testObj) && Object.isFrozen(testObj.nested), 'deepFreeze freezes recursively');
try {
  testObj.a = 99;
} catch (e) {}
assert(testObj.a === 1, 'deepFreeze prevents mutation');

// 6. RiskAttributionValidation: Portfolio Inputs
assert(RiskAttributionValidation.validatePortfolioInputs(['AAPL', 'MSFT'], [0.5, 0.5]) === true, 'Valid portfolio passes validation');
let caughtErr = false;
try {
  RiskAttributionValidation.validatePortfolioInputs([], []);
} catch (e) { caughtErr = true; }
assert(caughtErr, 'Empty symbols throws error');

caughtErr = false;
try {
  RiskAttributionValidation.validatePortfolioInputs(['AAPL'], [0.5, 0.5]);
} catch (e) { caughtErr = true; }
assert(caughtErr, 'Mismatched array length throws error');

// 7. RiskAttributionValidation: Covariance Matrix
const validCov = [[0.04, 0.01], [0.01, 0.09]];
assert(RiskAttributionValidation.validateCovarianceMatrix(validCov, 2) === true, 'Symmetric 2x2 cov matrix passes validation');

caughtErr = false;
try {
  RiskAttributionValidation.validateCovarianceMatrix([[0.04, 0.05], [0.01, 0.09]], 2);
} catch (e) { caughtErr = true; }
assert(caughtErr, 'Asymmetric cov matrix throws error');

caughtErr = false;
try {
  RiskAttributionValidation.validateCovarianceMatrix([[-0.04, 0.00], [0.00, 0.09]], 2);
} catch (e) { caughtErr = true; }
assert(caughtErr, 'Negative diagonal variance throws error');

// 8. Matrix Algebra Helpers
const mv = RiskAttributionValidation.matrixVectorMultiply(validCov, [0.6, 0.4]);
assert(Math.abs(mv[0] - (0.04*0.6 + 0.01*0.4)) < 1e-12, 'Matrix vector mult row 0 correct');
assert(Math.abs(mv[1] - (0.01*0.6 + 0.09*0.4)) < 1e-12, 'Matrix vector mult row 1 correct');

const qf = RiskAttributionValidation.quadraticForm([0.6, 0.4], validCov);
assert(Math.abs(qf - (0.6*mv[0] + 0.4*mv[1])) < 1e-12, 'Quadratic form correct');

// 9. Standard Normal Quantile
const q95 = RiskAttributionValidation.standardNormalQuantile(0.95);
assert(Math.abs(q95 - 1.6448536) < 1e-5, 'Normal quantile 0.95 = 1.64485');
const q99 = RiskAttributionValidation.standardNormalQuantile(0.99);
assert(Math.abs(q99 - 2.3263478) < 1e-5, 'Normal quantile 0.99 = 2.32635');

// 10. Safe Division
assert(RiskAttributionValidation.safeDiv(10, 2) === 5, 'safeDiv 10 / 2 = 5');
assert(RiskAttributionValidation.safeDiv(10, 0, 0) === 0, 'safeDiv 10 / 0 returns fallback');

console.log(`PASSED: ${passed}`);
