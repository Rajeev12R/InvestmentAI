/**
 * server/test-script/test-riskattribution-concentration-correlation.js
 * 
 * Phase 32 — Suite 7: Concentration (Weight vs Risk) & Correlation-Driven Risk
 */

import { RiskAttributionEngine } from '../riskAttribution/riskAttribution.engine.js';

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  passed++;
}

console.log('--- SUITE 7: Weight vs Risk Concentration & Correlation-Driven Risk ---');

// 1. Equal-Weight Portfolio with Highly Divergent Volatilities
const symbols = ['SAFE_BOND', 'MEGA_GROWTH', 'HIGH_BETA_MOM'];
const weights = [0.333333, 0.333333, 0.333334];
const cov = [
  [0.005, 0.001, 0.002],
  [0.001, 0.040, 0.030],
  [0.002, 0.030, 0.160] // High volatility stock
];

const attr = RiskAttributionEngine.runComprehensiveAttribution({
  symbols,
  weights,
  covarianceMatrix: cov,
  periodsPerYear: 252
});

const conc = attr.concentrationAttribution;

// Weight HHI vs Risk HHI
assert(Math.abs(conc.weightHHI - (1.0 / 3.0)) < 1e-4, 'Equal weight HHI ~ 0.3333');
assert(conc.riskHHI > conc.weightHHI, 'Risk HHI is significantly higher than weight HHI due to volatility asymmetry');
assert(conc.effectiveNumberOfConstituentsRisk < conc.effectiveNumberOfConstituentsWeight, 'ENC(Risk) < ENC(Weight)');
assert(conc.topRiskDriver === 'HIGH_BETA_MOM', 'Top risk driver identified as HIGH_BETA_MOM');

// Top-1 Risk vs Top-1 Weight
assert(conc.top1Weight <= 0.35, 'Top-1 weight is ~33%');
assert(conc.top1Risk > 0.50, 'Top-1 risk exceeds 50% for high-beta constituent');

// 2. Correlation & Diversification Ratio
const corrAttr = attr.correlationAttribution;
assert(corrAttr.diversificationRatio > 1.0, 'Diversification ratio > 1.0 for multi-asset portfolio');
assert(attr.portfolioMetrics.diversificationBenefit > 0, 'Diversification benefit is positive');
assert(corrAttr.crossCovarianceRatio > 0, 'Cross-covariance ratio is positive');

// 3. Perfect Correlation Test (Corr = 1.0) -> Diversification Ratio = 1.0
const covPerf = [
  [0.04, 0.06], // std1 = 0.2, std2 = 0.3, cov = 0.2 * 0.3 = 0.06
  [0.06, 0.09]
];
const attrPerf = RiskAttributionEngine.runComprehensiveAttribution({
  symbols: ['P1', 'P2'],
  weights: [0.5, 0.5],
  covarianceMatrix: covPerf,
  periodsPerYear: 252
});

assert(Math.abs(attrPerf.portfolioMetrics.diversificationRatio - 1.0) < 1e-6, 'Perfect correlation has diversification ratio == 1.0 (zero diversification benefit)');
assert(Math.abs(attrPerf.portfolioMetrics.diversificationBenefit) < 1e-6, 'Zero diversification benefit for perfectly correlated assets');

console.log(`PASSED: ${passed}`);
