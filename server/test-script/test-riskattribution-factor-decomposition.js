/**
 * server/test-script/test-riskattribution-factor-decomposition.js
 * 
 * Phase 32 — Suite 5: Linear Factor Model Risk Decomposition & Exact Residual
 */

import { RiskAttributionEngine } from '../riskAttribution/riskAttribution.engine.js';

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  passed++;
}

console.log('--- SUITE 5: Factor Risk Decomposition (Systematic vs Idiosyncratic) ---');

const symbols = ['STOCK_1', 'STOCK_2', 'STOCK_3'];
const weights = [0.45, 0.35, 0.20];

const factorExposures = {
  factorNames: ['MARKET', 'SIZE', 'VALUE'],
  exposures: {
    STOCK_1: [1.2, 0.6, -0.3],
    STOCK_2: [0.9, -0.2, 0.5],
    STOCK_3: [1.1, 0.1, 0.2]
  },
  factorCovariance: [
    [0.035, 0.004, 0.001],
    [0.004, 0.015, -0.002],
    [0.001, -0.002, 0.012]
  ],
  idiosyncraticVariances: {
    STOCK_1: 0.015,
    STOCK_2: 0.012,
    STOCK_3: 0.018
  }
};

// Construct implied full asset covariance matrix from factor model: Sigma = B * F * B^T + D
const B = [
  factorExposures.exposures.STOCK_1,
  factorExposures.exposures.STOCK_2,
  factorExposures.exposures.STOCK_3
];
const F = factorExposures.factorCovariance;
const D = [factorExposures.idiosyncraticVariances.STOCK_1, factorExposures.idiosyncraticVariances.STOCK_2, factorExposures.idiosyncraticVariances.STOCK_3];

const cov = [];
for (let i = 0; i < 3; i++) {
  cov[i] = [];
  for (let j = 0; j < 3; j++) {
    let systematic_ij = 0;
    for (let f1 = 0; f1 < 3; f1++) {
      for (let f2 = 0; f2 < 3; f2++) {
        systematic_ij += B[i][f1] * F[f1][f2] * B[j][f2];
      }
    }
    const idio_ij = (i === j) ? D[i] : 0;
    cov[i][j] = systematic_ij + idio_ij;
  }
}

const attr = RiskAttributionEngine.runComprehensiveAttribution({
  symbols,
  weights,
  covarianceMatrix: cov,
  factorExposures,
  periodsPerYear: 252
});

const fa = attr.factorAttribution;
assert(fa !== null, 'Factor attribution is generated');
assert(fa.isReconciled === true, 'Factor decomposition reconciles exactly');

// 1. Systematic + Idiosyncratic == Total Calculated Variance
const sysVar = fa.systematicVariance;
const idioVar = fa.idiosyncraticVariance;
const totalVar = fa.totalCalculatedVariance;
assert(Math.abs((sysVar + idioVar) - totalVar) < 1e-6, 'Systematic Variance + Idiosyncratic Variance == Total Variance');

// 2. Percentages sum to 100%
const sysPct = fa.systematicVariancePercentage;
const idioPct = fa.idiosyncraticVariancePercentage;
assert(Math.abs((sysPct + idioPct) - 100.0) < 1e-4, 'Systematic % + Idiosyncratic % == 100%');

// 3. Portfolio Factor Betas Check
const expectedMarketBeta = 0.45 * 1.2 + 0.35 * 0.9 + 0.20 * 1.1; // 0.54 + 0.315 + 0.22 = 1.075
const actualMarketBeta = fa.portfolioFactorExposures.find(f => f.factor === 'MARKET').beta;
assert(Math.abs(actualMarketBeta - expectedMarketBeta) < 1e-10, 'Portfolio Market Beta matches w^T * Beta_market');

// 4. Factor contributions sum to systematic variance
const sumFactorContribs = fa.factorContributions.reduce((s, fc) => s + fc.varianceContribution, 0);
assert(Math.abs(sumFactorContribs - sysVar) < 1e-6, 'Sum of individual factor contributions equals systematic variance');

console.log(`PASSED: ${passed}`);
