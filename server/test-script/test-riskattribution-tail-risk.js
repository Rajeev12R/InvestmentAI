/**
 * server/test-script/test-riskattribution-tail-risk.js
 * 
 * Phase 32 — Suite 8: Tail-Risk Attribution (Component VaR, Component ES & Tail Shortfall)
 */

import { RiskAttributionEngine } from '../riskAttribution/riskAttribution.engine.js';
import { ConfidenceStatus } from '../riskAttribution/riskAttribution.types.js';

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  passed++;
}

console.log('--- SUITE 8: Tail-Risk Attribution (Parametric CVaR, Component ES & Empirical Tail) ---');

const symbols = ['STOCK_A', 'STOCK_B', 'STOCK_C'];
const weights = [0.4, 0.35, 0.25];
const cov = [
  [0.040, 0.015, 0.010],
  [0.015, 0.060, 0.020],
  [0.010, 0.020, 0.090]
];

// 1. Parametric Tail Risk Decomposition (95% Confidence)
const attr95 = RiskAttributionEngine.runComprehensiveAttribution({
  symbols,
  weights,
  covarianceMatrix: cov,
  confidence: 0.95,
  periodsPerYear: 252
});

const tail95 = attr95.tailRiskAttribution;
assert(tail95 !== null, 'Tail risk attribution computed');
assert(tail95.reconciliationErrorVaR < 1e-6, 'Component VaR reconciles to Total Parametric VaR: sum(CVaR) == Total VaR');
assert(tail95.reconciliationErrorES < 1e-6, 'Component Expected Shortfall reconciles: sum(CES) == Total ES');
assert(tail95.totalParametricExpectedShortfall > tail95.totalParametricVaR, 'Expected Shortfall is strictly greater than VaR');

// 2. Parametric Tail Risk Decomposition (99% Confidence)
const attr99 = RiskAttributionEngine.runComprehensiveAttribution({
  symbols,
  weights,
  covarianceMatrix: cov,
  confidence: 0.99,
  periodsPerYear: 252
});

const tail99 = attr99.tailRiskAttribution;
assert(tail99.totalParametricVaR > tail95.totalParametricVaR, '99% VaR is greater than 95% VaR');
assert(tail99.reconciliationErrorVaR < 1e-6, '99% Component VaR reconciles to Total VaR');

// 3. Empirical Tail Shortfall with Sufficient Returns Matrix (T = 50 periods)
const historicalReturns = [];
for (let i = 0; i < 3; i++) {
  const row = [];
  for (let t = 0; t < 50; t++) {
    // Generate synthetic periodic returns
    const r = (Math.sin(i * 10 + t * 0.2) * 0.02) - (t === 5 || t === 12 ? 0.08 : 0);
    row.push(r);
  }
  historicalReturns.push(row);
}

const attrEmp = RiskAttributionEngine.runComprehensiveAttribution({
  symbols,
  weights,
  covarianceMatrix: cov,
  historicalReturns,
  confidence: 0.95
});

const empTail = attrEmp.tailRiskAttribution.empiricalTailAttribution;
assert(empTail.status === ConfidenceStatus.CALCULATED, 'Empirical tail attribution status is CALCULATED when returns supplied');
assert(empTail.positions.length === 3, 'Empirical shortfall computed for all 3 positions');
assert(empTail.tailObservations > 0, 'Tail observation count is positive');

// 4. Missing Empirical Data Fallback (Never Fabricate Values)
const attrMissing = RiskAttributionEngine.runComprehensiveAttribution({
  symbols,
  weights,
  covarianceMatrix: cov,
  historicalReturns: null
});

const missingTail = attrMissing.tailRiskAttribution.empiricalTailAttribution;
assert(missingTail.status === ConfidenceStatus.UNAVAILABLE, 'Missing historical returns correctly returns UNAVAILABLE status');
assert(typeof missingTail.reason === 'string', 'Documented reason for UNAVAILABLE state provided');

console.log(`PASSED: ${passed}`);
