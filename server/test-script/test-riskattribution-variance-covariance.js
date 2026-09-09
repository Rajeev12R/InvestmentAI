/**
 * server/test-script/test-riskattribution-variance-covariance.js
 * 
 * Phase 32 — Suite 4: Variance Attribution & Cross-Covariance Allocation
 */

import { RiskAttributionEngine } from '../riskAttribution/riskAttribution.engine.js';
import { CovarianceAllocationConvention } from '../riskAttribution/riskAttribution.types.js';

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  passed++;
}

console.log('--- SUITE 4: Variance Attribution & Cross-Covariance Allocation ---');

const symbols = ['TECH', 'FIN', 'HEALTH', 'ENERGY'];
const weights = [0.35, 0.25, 0.25, 0.15];
const cov = [
  [0.060, 0.025, 0.015, 0.010],
  [0.025, 0.040, 0.012, 0.018],
  [0.015, 0.012, 0.030, 0.008],
  [0.010, 0.018, 0.008, 0.070]
];

const attr = RiskAttributionEngine.runComprehensiveAttribution({
  symbols,
  weights,
  covarianceMatrix: cov,
  periodsPerYear: 252
});

const totalVar = attr.portfolioMetrics.portfolioVariance;
const sumVarCont = attr.reconciliation.sumVarianceContribution;
const sumStandalone = attr.reconciliation.sumStandaloneVariance;
const sumCrossCov = attr.reconciliation.sumCrossCovariance;

// 1. Variance Contribution Sum Reconciles Exactly to Portfolio Variance
assert(Math.abs(sumVarCont - totalVar) < 1e-6, 'sum(VarianceContribution_i) == Total Portfolio Variance');

// 2. Standalone Variance + Cross-Covariance == Total Variance
assert(Math.abs((sumStandalone + sumCrossCov) - totalVar) < 1e-6, 'Total Variance == Standalone Variance + Cross-Covariance');

// 3. Check individual asset variance breakdown
for (let i = 0; i < symbols.length; i++) {
  const p = attr.positions[i];
  const expectedStandalone = weights[i] * weights[i] * cov[i][i] * 252;
  assert(Math.abs(p.standaloneVarianceContribution - expectedStandalone) < 1e-6, `Standalone variance correct for ${symbols[i]}`);
  assert(Math.abs((p.standaloneVarianceContribution + p.crossCovarianceContribution) - p.varianceContribution) < 1e-6, `Standalone + Cross-Cov == Total VarCont for ${symbols[i]}`);
}

// 4. Positive correlation increases cross-covariance contribution
assert(sumCrossCov > 0, 'Cross-covariance is positive for positively correlated assets');
assert(attr.correlationAttribution.crossCovarianceRatio > 0 && attr.correlationAttribution.crossCovarianceRatio < 1, 'Cross-covariance ratio is between 0 and 1');

// 5. Test Perfect Orthogonal (Uncorrelated) Assets => Cross-Covariance = 0
const covDiag = [
  [0.04, 0.00, 0.00],
  [0.00, 0.09, 0.00],
  [0.00, 0.00, 0.16]
];
const attrDiag = RiskAttributionEngine.runComprehensiveAttribution({
  symbols: ['A', 'B', 'C'],
  weights: [0.5, 0.3, 0.2],
  covarianceMatrix: covDiag,
  periodsPerYear: 252
});

assert(Math.abs(attrDiag.reconciliation.sumCrossCovariance) < 1e-12, 'Uncorrelated portfolio has exactly ZERO cross-covariance');
assert(Math.abs(attrDiag.reconciliation.sumStandaloneVariance - attrDiag.portfolioMetrics.portfolioVariance) < 1e-12, 'Uncorrelated portfolio variance is 100% standalone variance');

console.log(`PASSED: ${passed}`);
