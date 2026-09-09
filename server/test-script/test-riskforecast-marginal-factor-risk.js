import { RiskForecastMarginalEngine } from '../riskForecast/riskForecast.marginal.engine.js';
import { RiskForecastEngine } from '../riskForecast/riskForecast.forecast.engine.js';
import { DataClassification } from '../riskForecast/riskForecast.types.js';

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  passed++;
}

console.log('--- SUITE 5: Marginal Risk (MRC/CRC), Active Risk & Factor Decomposition ---');

const symbols = ['AAPL', 'MSFT', 'GOOGL'];
const weights = [0.5, 0.3, 0.2];

// Diagonal covariance for simple exact verification (daily variances)
// Daily variances: AAPL = 0.0004 (2% daily vol), MSFT = 0.000225 (1.5% daily vol), GOOGL = 0.0001 (1% daily vol)
const covMatrix = [
  [0.000400, 0.000100, 0.000050],
  [0.000100, 0.000225, 0.000040],
  [0.000050, 0.000040, 0.000100]
];

// 1. Marginal Risk Decomposition
const decomp = RiskForecastMarginalEngine.decomposeMarginalRisk({
  symbols,
  weights,
  covarianceMatrix: covMatrix,
  periodsPerYear: 252
});

assert(decomp.status === DataClassification.DERIVED, 'Marginal decomposition status is DERIVED');
assert(decomp.portfolioVolatilityAnnualized > 0, 'Portfolio annualized volatility > 0');
assert(decomp.assetContributions.length === 3, '3 asset contributions returned');

// 2. Mathematical Reconciliation Validation (Euler Theorem)
// sum(CRC_i) must equal portfolioVolatilityAnnualized
assert(decomp.isValidReconciliation === true, 'Euler reconciliation valid');
assert(decomp.reconciliationError < 1e-5, `Reconciliation error < 1e-5 (got ${decomp.reconciliationError})`);
assert(Math.abs(decomp.sumPercentageRisk - 1.0) < 1e-4, 'Sum of percentage contributions == 1.0');

// 3. Active Risk / Tracking Error Decomposition
const benchmarkWeights = [0.4, 0.4, 0.2];
const activeDecomp = RiskForecastMarginalEngine.decomposeActiveRisk({
  symbols,
  weights,
  benchmarkWeights,
  covarianceMatrix: covMatrix,
  periodsPerYear: 252
});

assert(activeDecomp.status === DataClassification.DERIVED, 'Active risk status is DERIVED');
assert(activeDecomp.trackingErrorAnnualized >= 0, 'Tracking error >= 0');
assert(activeDecomp.activeContributions.length === 3, '3 active asset contributions');
assert(Math.abs(activeDecomp.activeContributions[0].activeWeight - 0.1) < 1e-6, 'AAPL active weight = 0.5 - 0.4 = 0.1');
assert(Math.abs(activeDecomp.activeContributions[1].activeWeight - (-0.1)) < 1e-6, 'MSFT active weight = 0.3 - 0.4 = -0.1');
assert(Math.abs(activeDecomp.activeContributions[2].activeWeight - 0.0) < 1e-6, 'GOOGL active weight = 0.2 - 0.2 = 0.0');

// 4. Factor Risk Decomposition (Systematic vs Residual)
const factorExposures = {
  MARKET: 1.10,
  VALUE: -0.25,
  MOMENTUM: 0.40
};
const factorCov = [
  [0.000300, 0.000010, 0.000020],
  [0.000010, 0.000150, -0.000010],
  [0.000020, -0.000010, 0.000200]
];

const fullForecast = RiskForecastEngine.runComprehensiveForecast({
  symbols,
  weights,
  covarianceMatrix: covMatrix,
  factorExposures,
  factorCovarianceMatrix: factorCov,
  asOf: '2026-09-07T00:00:00.000Z'
});

assert(fullForecast.factorRiskContribution.status === DataClassification.DERIVED, 'Factor risk contribution status DERIVED');
assert(fullForecast.factorRiskContribution.factorVolatility > 0, 'Factor volatility > 0');
assert(fullForecast.factorRiskContribution.residualVolatility >= 0, 'Residual volatility >= 0');
assert(fullForecast.factorRiskContribution.systematicRiskRatio + fullForecast.factorRiskContribution.residualRiskRatio > 0.99, 'Systematic + Residual ratios reconcile');
assert(fullForecast.factorRiskContribution.factorContributions.length === 3, 'All 3 factors evaluated');

console.log(`PASSED: ${passed}`);
