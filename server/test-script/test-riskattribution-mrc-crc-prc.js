/**
 * server/test-script/test-riskattribution-mrc-crc-prc.js
 * 
 * Phase 32 — Suite 3: Marginal, Component & Percentage Risk Contributions (Euler's Theorem)
 */

import { RiskAttributionEngine } from '../riskAttribution/riskAttribution.engine.js';
import { ConfidenceStatus } from '../riskAttribution/riskAttribution.types.js';

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  passed++;
}

console.log('--- SUITE 3: Marginal (MRC), Component (CRC) & Percentage (PRC) Risk Contributions ---');

// 1. Two-Asset Clean Euler Verification
const symbols2 = ['ASSET_A', 'ASSET_B'];
const weights2 = [0.6, 0.4];
const cov2 = [
  [0.04, 0.01],
  [0.01, 0.09]
];
const attr2 = RiskAttributionEngine.runComprehensiveAttribution({
  symbols: symbols2,
  weights: weights2,
  covarianceMatrix: cov2,
  periodsPerYear: 252
});

const vol2 = attr2.portfolioMetrics.portfolioVolatility;
const crcA = attr2.positions[0].componentRiskContribution;
const crcB = attr2.positions[1].componentRiskContribution;

assert(Math.abs((crcA + crcB) - vol2) < 1e-6, 'Euler Theorem: CRC_A + CRC_B == portfolio volatility');
assert(Math.abs((attr2.positions[0].percentageRiskContribution + attr2.positions[1].percentageRiskContribution) - 1.0) < 1e-5, 'PRC_A + PRC_B == 1.0 (100%)');
assert(attr2.reconciliation.isReconciled === true, 'Reconciliation status is strictly true');

// 2. Multi-Asset Portfolio (5 Assets with Negative Correlations)
const symbols5 = ['EQ_US', 'EQ_EU', 'EQ_EM', 'BOND', 'GOLD'];
const weights5 = [0.30, 0.20, 0.15, 0.25, 0.10];
const cov5 = [
  [0.035,  0.020,  0.025, -0.002,  0.005],
  [0.020,  0.045,  0.030, -0.001,  0.008],
  [0.025,  0.030,  0.060, -0.003,  0.012],
  [-0.002, -0.001, -0.003,  0.004, -0.001],
  [0.005,  0.008,  0.012, -0.001,  0.030]
];

const attr5 = RiskAttributionEngine.runComprehensiveAttribution({
  symbols: symbols5,
  weights: weights5,
  covarianceMatrix: cov5,
  periodsPerYear: 252
});

const vol5 = attr5.portfolioMetrics.portfolioVolatility;
const sumCRC5 = attr5.positions.reduce((s, p) => s + p.componentRiskContribution, 0);
const sumPRC5 = attr5.positions.reduce((s, p) => s + p.percentageRiskContribution, 0);

assert(Math.abs(sumCRC5 - vol5) < 1e-6, '5-Asset Euler Theorem: sum(CRC) == portfolio volatility');
assert(Math.abs(sumPRC5 - 1.0) < 1e-5, '5-Asset sum(PRC) == 1.0');
assert(attr5.reconciliation.residual.crcGap <= 1e-6, 'CRC residual gap within tolerance');

// 3. Zero-Risk / Degenerate Portfolio Safety (Zero Volatility)
const symbolsZero = ['CASH_1', 'CASH_2'];
const weightsZero = [0.5, 0.5];
const covZero = [
  [0.0, 0.0],
  [0.0, 0.0]
];
const attrZero = RiskAttributionEngine.runComprehensiveAttribution({
  symbols: symbolsZero,
  weights: weightsZero,
  covarianceMatrix: covZero
});

assert(attrZero.portfolioMetrics.portfolioVolatility === 0, 'Zero volatility portfolio returns vol = 0');
assert(attrZero.portfolioMetrics.isZeroRisk === true, 'isZeroRisk flag is true');
assert(!Number.isNaN(attrZero.positions[0].marginalRiskContribution), 'MRC is not NaN for zero-vol portfolio');
assert(!Number.isNaN(attrZero.positions[0].componentRiskContribution), 'CRC is not NaN for zero-vol portfolio');
assert(!Number.isNaN(attrZero.positions[0].percentageRiskContribution), 'PRC is not NaN for zero-vol portfolio');
assert(attrZero.positions[0].marginalRiskContribution === 0, 'MRC is 0 for zero-vol portfolio');
assert(attrZero.positions[0].componentRiskContribution === 0, 'CRC is 0 for zero-vol portfolio');

// 4. Active / Tracking Error Decomposition Against Benchmark
const bWeights5 = [0.40, 0.25, 0.10, 0.20, 0.05];
const attrActive = RiskAttributionEngine.runComprehensiveAttribution({
  symbols: symbols5,
  weights: weights5,
  benchmarkWeights: bWeights5,
  covarianceMatrix: cov5
});

assert(attrActive.activeRiskAttribution !== null, 'Active risk attribution is computed when benchmarkWeights supplied');
const te = attrActive.activeRiskAttribution.trackingErrorAnnualized;
assert(te > 0, 'Active tracking error is positive');
assert(Math.abs(attrActive.activeRiskAttribution.sumActiveComponentRisk - te) < 1e-6, 'Euler theorem holds for active risk tracking error: sum(Active CRC) == TE');

console.log(`PASSED: ${passed}`);
