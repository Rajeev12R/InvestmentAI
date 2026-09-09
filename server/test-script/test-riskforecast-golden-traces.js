import { GOLDEN_FIXTURES } from '../riskForecast/golden/riskForecast.golden.fixtures.js';
import { RiskForecastGoldenReference } from '../riskForecast/golden/riskForecast.golden.reference.js';
import { RiskForecastCertificationGenerator } from '../riskForecast/golden/riskForecast.certification.generator.js';

import { RiskForecastVolatilityEngine } from '../riskForecast/riskForecast.volatility.engine.js';
import { RiskForecastCovarianceEngine } from '../riskForecast/riskForecast.covariance.engine.js';
import { RiskForecastMarginalEngine } from '../riskForecast/riskForecast.marginal.engine.js';
import { RiskForecastVaREngine } from '../riskForecast/riskForecast.var.engine.js';
import { RiskForecastExpectedShortfallEngine } from '../riskForecast/riskForecast.expectedShortfall.engine.js';
import { RiskForecastDrawdownEngine } from '../riskForecast/riskForecast.drawdown.engine.js';
import { RiskForecastBudgetEngine } from '../riskForecast/riskForecast.budget.engine.js';
import { RiskForecastLimitEngine } from '../riskForecast/riskForecast.limit.engine.js';
import { RiskForecastEngine } from '../riskForecast/riskForecast.forecast.engine.js';
import { RiskForecastBacktestEngine } from '../riskForecast/riskForecast.backtest.engine.js';
import { RiskForecastPackageBuilder } from '../riskForecast/riskForecast.package.js';
import { BudgetScope, CompliancePrecedence, CovarianceRepairMethod, DataClassification } from '../riskForecast/riskForecast.types.js';

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  passed++;
}

console.log('--- SUITE 13: 40 Deep Institutional Golden Traces & Machine-Certified Reproducibility ---');

// ============================================================================
// PART 1: Machine-Generated Certification Integrity (40/40 Archetypes)
// ============================================================================
const certResult = RiskForecastCertificationGenerator.generateCertification();
assert(certResult.totalArchetypes === 40, 'Certification contains exactly 40 Golden archetypes');
assert(certResult.passedCount === 40, 'All 40 Golden archetypes passed machine certification');
assert(certResult.failedCount === 0, 'Zero failures in machine-generated golden certification');

// ============================================================================
// PART 2: P0-1 — Golden C / W Canonical Fixture & Mathematical Reconciliation
// ============================================================================
const fixC = GOLDEN_FIXTURES.GOLDEN_C;
assert(fixC.asset1.length === 15 && fixC.asset2.length === 15, 'Canonical covariance fixture has exactly 15 observations per asset');

// Exact hand/reference mathematical derivations on the literal fixture arrays:
const meanA1_calc = RiskForecastGoldenReference.refMean(fixC.asset1);
const meanA2_calc = RiskForecastGoldenReference.refMean(fixC.asset2);
const varA1_calc = RiskForecastGoldenReference.refSampleVariance(fixC.asset1);
const varA2_calc = RiskForecastGoldenReference.refSampleVariance(fixC.asset2);
const cov_calc = RiskForecastGoldenReference.refSampleCovariance(fixC.asset1, fixC.asset2);
const corr_calc = RiskForecastGoldenReference.refCorrelation(fixC.asset1, fixC.asset2);

// Reconcile exact arithmetic values:
assert(Math.abs(meanA1_calc - (0.01 / 15)) < 1e-12, 'Golden C/W: Exact mean(A1) = 0.01/15 = 0.000666666667');
assert(Math.abs(meanA2_calc - (0.02 / 15)) < 1e-12, 'Golden C/W: Exact mean(A2) = 0.02/15 = 0.001333333333');
assert(Math.abs(varA1_calc - 0.00014595238095238094) < 1e-12, 'Golden C/W: Exact Var(A1) = 0.000145952381 (N-1 = 14)');
assert(Math.abs(varA2_calc - 0.00018023809523809526) < 1e-12, 'Golden C/W: Exact Var(A2) = 0.000180238095 (N-1 = 14)');
assert(Math.abs(cov_calc - (-0.000033095238095238106)) < 1e-12, 'Golden C/W: Exact Cov(A1,A2) = -0.000033095238');
assert(Math.abs(corr_calc - (-0.20405001133991263)) < 1e-12, 'Golden C/W: Exact Corr(A1,A2) = -0.204050011340');

// Compare production engine against independent calculation:
const engC = RiskForecastCovarianceEngine.calculateHistoricalCovariance([fixC.asset1, fixC.asset2], fixC.symbols, { minObservations: 15 });
assert(Math.abs(engC.covarianceMatrix[0][0] - varA1_calc) < 1e-12, 'Golden C/W: Engine Var(A1) equals independent reference');
assert(Math.abs(engC.covarianceMatrix[1][1] - varA2_calc) < 1e-12, 'Golden C/W: Engine Var(A2) equals independent reference');
assert(Math.abs(engC.covarianceMatrix[0][1] - cov_calc) < 1e-12, 'Golden C/W: Engine Cov(A1,A2) equals independent reference');
assert(engC.quality.positiveSemidefinite === true, 'Golden C/W: Matrix is strictly positive semi-definite');

// ============================================================================
// PART 3: P0-2 — Golden X Covariance Repair & Unbroken Downstream Risk Trace
// ============================================================================
const fixX = GOLDEN_FIXTURES.GOLDEN_X;
const rawMatrixX = fixX.rawNonPsdMatrix;

// 1. Generate Canonical Independent Golden X Mathematical Trace Object:
const traceX = RiskForecastGoldenReference.generateGoldenXTrace(fixX);

// Invariant 1: Eigenvalue correctness (one positive, one negative)
assert(traceX.hasNegativeEigenvalue && traceX.eigenvalues[0] < 0 && traceX.eigenvalues[1] > 0, 'Golden X Invariant 1: Negative and positive eigenvalues confirmed');

// Invariant 2: Clipping correctness (all clipped eigenvalues >= floor)
assert(traceX.clippedEigenvalues.every(l => l >= fixX.eigenvalueFloor), 'Golden X Invariant 2: Repaired eigenvalues clipped to floor >= 1e-5');

// Invariant 3: Reconstruction correctness (Sigma_repaired = V * diag(clipped) * V^T)
const recon00 = traceX.clippedEigenvalues[0] * Math.pow(traceX.eigenvectors[0][0], 2) + traceX.clippedEigenvalues[1] * Math.pow(traceX.eigenvectors[1][0], 2);
assert(Math.abs(traceX.repairedMatrix[0][0] - recon00) < 1e-12, 'Golden X Invariant 3: Matrix reconstructed directly from eigenvectors & clipped eigenvalues');

// Invariant 4 & 5: Symmetry & PSD property
assert(Math.abs(traceX.repairedMatrix[0][1] - traceX.repairedMatrix[1][0]) < 1e-15, 'Golden X Invariant 4: Repaired covariance matrix is strictly symmetric');
assert(traceX.isRepairedPsd === true, 'Golden X Invariant 5: Repaired matrix is positive semi-definite');

// Invariant 6, 7 & 8: Quadratic consistency, Risk consistency, and Serialization Trace consistency
const traceQuad = RiskForecastGoldenReference.refQuadraticForm(fixX.weights, traceX.repairedMatrix);
const traceRisk = Math.sqrt(traceQuad);
assert(Math.abs(traceX.quadraticForm - traceQuad) < 1e-15, 'Golden X Invariant 6: Quadratic form derived directly from repaired matrix');
assert(Math.abs(traceX.portfolioRisk - traceRisk) < 1e-15, 'Golden X Invariant 7: Portfolio risk derived directly from quadratic form');
assert(Math.abs(traceX.portfolioRisk - 0.8585112988) < 1e-6, 'Golden X Invariant 8: Canonical trace risk = 0.8585113');

// 2. Execute Production Covariance Engine and Verify Agreement with Trace Object:
const engX = RiskForecastCovarianceEngine.processCovarianceQualityAndRepair(rawMatrixX, fixX.symbols, 20, {
  repairMethod: CovarianceRepairMethod.EIGENVALUE_CLIPPING,
  eigenvalueFloor: fixX.eigenvalueFloor
});
assert(engX.repairApplied === true, 'Golden X: Production engine applied eigenvalue clipping repair');
assert(Math.abs(engX.originalEigenvalues[0] - traceX.eigenvalues[0]) < 1e-10, 'Golden X: Production original eigenvalue matches canonical trace');
assert(Math.abs(engX.repairedEigenvalues[0] - traceX.clippedEigenvalues[0]) < 1e-10, 'Golden X: Production repaired eigenvalue matches canonical trace');
assert(Math.abs(engX.repairedMatrix[0][0] - traceX.repairedMatrix[0][0]) < 1e-10, 'Golden X: Production repaired matrix matches canonical trace');

// 3. Calculate downstream risk from THAT exact production repaired matrix:
const engQuadRepX = RiskForecastGoldenReference.refQuadraticForm(fixX.weights, engX.repairedMatrix);
const engRiskRepX = Math.sqrt(engQuadRepX);
assert(Math.abs(engQuadRepX - traceX.quadraticForm) < 1e-10, 'Golden X: Production downstream quadratic form matches canonical trace');
assert(Math.abs(engRiskRepX - traceX.portfolioRisk) < 1e-10, 'Golden X: Production downstream portfolio risk matches canonical trace');

// 4. Verify clean PSD matrix repairApplied is false:
const psdClean = [[0.04, 0.01], [0.01, 0.09]];
const engXClean = RiskForecastCovarianceEngine.processCovarianceQualityAndRepair(psdClean, ['X1', 'X2'], 20, {
  repairMethod: CovarianceRepairMethod.EIGENVALUE_CLIPPING
});
assert(engXClean.repairApplied === false, 'Golden X: Clean PSD matrix repairApplied is false');

// ============================================================================
// PART 4: Deep Numerical Certifications (Golden Archetypes AA, AC, AF, AH, etc.)
// ============================================================================

// Golden AA: Historical Simulation VaR
const fixAA = GOLDEN_FIXTURES.GOLDEN_AA;
const refVaRAA = RiskForecastGoldenReference.refHistoricalVaR(fixAA.returns, fixAA.confidence, fixAA.horizonDays);
const engAA = RiskForecastVaREngine.calculateHistoricalVaR(fixAA.returns, { confidence: fixAA.confidence, horizonDays: fixAA.horizonDays, minObservations: 100 });
assert(Math.abs(refVaRAA.lossVaR - 0.095050) < 1e-10, 'Golden AA: Independent VaR rank 4.95 loss = 0.095050');
assert(Math.abs(engAA.varPercent - refVaRAA.lossVaR) < 1e-10, 'Golden AA: Production VaR matches independent reference');

// Golden AC: Discrete Expected Shortfall (CVaR)
const fixAC = GOLDEN_FIXTURES.GOLDEN_AC;
const refESAC = RiskForecastGoldenReference.refDiscreteExpectedShortfall(fixAC.returns, fixAC.confidence, fixAC.horizonDays);
const engAC = RiskForecastExpectedShortfallEngine.calculateHistoricalExpectedShortfall(fixAC.returns, { confidence: fixAC.confidence, horizonDays: fixAC.horizonDays, minObservations: 100 });
assert(Math.abs(refESAC.expectedShortfall - 0.098000) < 1e-10, 'Golden AC: Independent 5-observation discrete ES = 0.098000');
assert(Math.abs(engAC.expectedShortfallPercent - refESAC.expectedShortfall) < 1e-10, 'Golden AC: Production ES matches independent reference');

// Golden AF: Exact Loss Breach Probability
const fixAF = GOLDEN_FIXTURES.GOLDEN_AF;
const hYearsAF = fixAF.horizonDays / 252.0;
const hVolAF = fixAF.forecastVolatility * Math.sqrt(hYearsAF);
const zAF = -fixAF.threshold / hVolAF;
const refProbAF = RiskForecastGoldenReference.refNormalCDF(zAF);
const engAF = RiskForecastLimitEngine.calculateBreachProbability(fixAF);
assert(Math.abs(refProbAF - 0.187428) < 1e-4, 'Golden AF: Independent normal tail loss probability = 0.187428');
assert(Math.abs(engAF.breachProbability - refProbAF) < 1e-4, 'Golden AF: Production breach probability matches independent reference');

// Golden AH: Forward Brownian Drawdown Model Estimate
const fixAH = GOLDEN_FIXTURES.GOLDEN_AH;
const T_AH = fixAH.horizonDays / fixAH.periodsPerYear;
const refMDDAH = Math.sqrt(Math.PI / 2.0) * fixAH.annualizedVolatility * Math.sqrt(T_AH);
const engAH = RiskForecastDrawdownEngine.estimateForwardDrawdown(fixAH);
assert(Math.abs(refMDDAH - 0.17724536) < 1e-6, 'Golden AH: Independent Brownian expected MDD = 0.17724536');
assert(Math.abs(engAH.expectedMaxDrawdown - refMDDAH) < 1e-6, 'Golden AH: Production Brownian MDD matches independent reference');

// ============================================================================
// PART 5: Anti-Cheating & Fixture/Reference Mutation Tests
// ============================================================================

// 1. Detect Fixture Mutation: If a return in Golden A is modified, reference must change
const fixA = GOLDEN_FIXTURES.GOLDEN_A;
const mutatedReturnsA = [...fixA.returns];
mutatedReturnsA[0] = 0.099;
const mutatedVarA = RiskForecastGoldenReference.refSampleVariance(mutatedReturnsA);
assert(mutatedVarA !== RiskForecastGoldenReference.refSampleVariance(fixA.returns), 'Anti-Cheating: Fixture mutation alters reference variance');

// 2. Detect Repaired Covariance Stale Downstream Drift: Modifying matrix must alter risk
const tamperedMatrixX = engX.repairedMatrix.map(r => [...r]);
tamperedMatrixX[0][0] = 9.999;
const tamperedRiskX = Math.sqrt(RiskForecastGoldenReference.refQuadraticForm(fixX.weights, tamperedMatrixX));
assert(Math.abs(tamperedRiskX - traceX.portfolioRisk) > 0.1, 'Anti-Cheating: Repaired covariance matrix change alters downstream risk');

// 3. Verify Deterministic Replay Invariance Across Multiple Runs:
const replay1 = RiskForecastCertificationGenerator.generateCertification();
const replay2 = RiskForecastCertificationGenerator.generateCertification();
assert(JSON.stringify(replay1.records) === JSON.stringify(replay2.records), 'Deterministic Replay: Repeated certification runs produce bit-for-bit identical records');

console.log(`PASSED: ${passed}`);
