import { RiskForecastEngine } from '../riskForecast/riskForecast.forecast.engine.js';
import { DataClassification } from '../riskForecast/riskForecast.types.js';

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  passed++;
}

console.log('--- SUITE 9: Regime-Aware, Liquidity-Adjusted & Tax-Aware Risk Integration ---');

const symbols = ['AAPL', 'MSFT'];
const weights = [0.5, 0.5];
const covMatrix = [
  [0.000400, 0.000100],
  [0.000100, 0.000300]
];

// 1. High Volatility Regime
const resCrisis = RiskForecastEngine.runComprehensiveForecast({
  symbols,
  weights,
  covarianceMatrix: covMatrix,
  macroRegime: 'CRISIS',
  liquidityCostBps: 50,
  taxRate: 0.25,
  asOf: '2026-09-07T00:00:00.000Z'
});

assert(resCrisis.regimeAwareRisk.status === DataClassification.MODEL_ESTIMATE, 'Regime-aware risk status is MODEL_ESTIMATE');
assert(resCrisis.regimeAwareRisk.currentRegime === 'CRISIS', 'Current regime recorded');
assert(resCrisis.regimeAwareRisk.regimeAdjustedVolatility > resCrisis.regimeAwareRisk.historicalVolatility, 'Crisis multiplier increases volatility');
assert(resCrisis.regimeAwareRisk.stressVolatility > resCrisis.regimeAwareRisk.regimeAdjustedVolatility, 'Stress vol is highest');

// 2. Liquidity-Adjusted Risk Integration (Hardened Separation)
assert(resCrisis.liquidityAdjustedRisk.status === DataClassification.DERIVED, 'Liquidity friction status is DERIVED when cost provided');
assert(resCrisis.liquidityAdjustedRisk.liquidityCostBps === 50, '50 bps liquidity cost recorded');
assert(resCrisis.liquidityAdjustedRisk.combinedLiquidityRisk === null, 'Generic variance addition is NOT performed');

// Test explicit stochastic liquidity model (Almgren-Chriss shortfall variance)
const resStochasticLiq = RiskForecastEngine.runComprehensiveForecast({
  symbols,
  weights,
  covarianceMatrix: covMatrix,
  stochasticLiquidityModel: true,
  stochasticLiquidityVariance: 0.0001,
  asOf: '2026-09-07T00:00:00.000Z'
});
assert(resStochasticLiq.liquidityAdjustedRisk.status === DataClassification.MODEL_ESTIMATE, 'Stochastic liquidity model status is MODEL_ESTIMATE');
assert(resStochasticLiq.liquidityAdjustedRisk.combinedLiquidityRisk > resStochasticLiq.liquidityAdjustedRisk.marketRisk, 'Stochastic execution shortfall increases risk');

// 3. Tax-Aware Risk Integration (Hardened Separation)
assert(resCrisis.taxAdjustedRisk.status === DataClassification.UNAVAILABLE, 'Generic tax volatility multiplier is removed (returns UNAVAILABLE without realization path)');
assert(resCrisis.taxAdjustedRisk.taxRate === 0.25, '25% tax rate recorded');

// Test Phase 17 after-tax empirical return distribution
const dummyAfterTaxReturns = [0.01, -0.01, 0.015, -0.02, 0.005, 0.01, -0.005, 0.02, -0.015, 0.005, 0.01, -0.005, 0.008, -0.004, 0.012, -0.01, 0.005, 0.002, -0.003, 0.004];
const resTaxEmpirical = RiskForecastEngine.runComprehensiveForecast({
  symbols,
  weights,
  covarianceMatrix: covMatrix,
  taxRate: 0.25,
  afterTaxReturns: dummyAfterTaxReturns,
  asOf: '2026-09-07T00:00:00.000Z'
});
assert(resTaxEmpirical.taxAdjustedRisk.status === DataClassification.DERIVED, 'Tax-adjusted risk is DERIVED from empirical Phase 17 distribution');
assert(typeof resTaxEmpirical.taxAdjustedRisk.afterTaxVolatility === 'number', 'Empirical after-tax volatility computed');

console.log(`PASSED: ${passed}`);

