import { RiskForecastVaREngine } from '../riskForecast/riskForecast.var.engine.js';
import { RiskForecastExpectedShortfallEngine } from '../riskForecast/riskForecast.expectedShortfall.engine.js';
import { RiskForecastDistributionEngine } from '../riskForecast/riskForecast.distribution.engine.js';
import { DataClassification, VaRMethod } from '../riskForecast/riskForecast.types.js';

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  passed++;
}

console.log('--- SUITE 4: Value at Risk (VaR), Expected Shortfall & Distribution Analysis ---');

// 1. Normal Distribution Utilities
const z95 = RiskForecastDistributionEngine.standardNormalQuantile(0.95);
assert(Math.abs(z95 - 1.644853) < 1e-4, `z_0.95 quantile is ~1.645 (got ${z95})`);

const z99 = RiskForecastDistributionEngine.standardNormalQuantile(0.99);
assert(Math.abs(z99 - 2.326348) < 1e-4, `z_0.99 quantile is ~2.326 (got ${z99})`);

const phi0 = RiskForecastDistributionEngine.standardNormalCDF(0.0);
assert(Math.abs(phi0 - 0.5) < 1e-6, 'Phi(0) is exactly 0.5');

const phi196 = RiskForecastDistributionEngine.standardNormalCDF(1.96);
assert(Math.abs(phi196 - 0.975) < 1e-3, 'Phi(1.96) is ~0.975');

// 2. Empirical Distribution Analysis
const normalLikeReturns = [];
for (let i = 0; i < 100; i++) {
  // Simple symmetric pseudo-normal numbers
  normalLikeReturns.push((Math.sin(i) + Math.cos(i * 2)) * 0.01);
}
const distAnalysis = RiskForecastDistributionEngine.analyzeDistribution(normalLikeReturns);
assert(distAnalysis.status === DataClassification.DERIVED, 'Distribution analysis status DERIVED');
assert(typeof distAnalysis.skewness === 'number', 'Skewness is computed');
assert(typeof distAnalysis.excessKurtosis === 'number', 'Excess kurtosis is computed');
assert(typeof distAnalysis.jarqueBera.statistic === 'number', 'Jarque-Bera statistic computed');

// 3. Parametric VaR
const paramVaR = RiskForecastVaREngine.calculateParametricVaR({
  portfolioVolatility: 0.16, // 16% annualized
  confidence: 0.95,
  horizonDays: 1,
  portfolioValue: 1000000.0,
  periodsPerYear: 252
});

assert(paramVaR.status === DataClassification.MODEL_ESTIMATE, 'Parametric VaR is strictly MODEL_ESTIMATE');
assert(paramVaR.method === VaRMethod.PARAMETRIC, 'Method is PARAMETRIC');
assert(paramVaR.confidence === 0.95, 'Confidence is 0.95');
assert(paramVaR.varPercent > 0 && paramVaR.varPercent < 0.10, 'Daily VaR is reasonable percentage');
assert(paramVaR.varAmount === paramVaR.varPercent * 1000000.0, 'VaR amount matches portfolio value scaling');

// 4. Historical VaR
const returnsN30 = [
  -0.045, -0.038, -0.025, -0.020, -0.015, -0.012, -0.010, -0.008, -0.005, -0.002,
  0.000, 0.002, 0.003, 0.005, 0.006, 0.007, 0.008, 0.010, 0.011, 0.012,
  0.014, 0.015, 0.016, 0.018, 0.020, 0.022, 0.025, 0.028, 0.032, 0.040
]; // 30 observations, sorted min to max

const histVaR = RiskForecastVaREngine.calculateHistoricalVaR(returnsN30, {
  confidence: 0.95,
  horizonDays: 1,
  portfolioValue: 1000000.0,
  minObservations: 20
});

assert(histVaR.status === DataClassification.DERIVED, 'Historical VaR status is DERIVED');
assert(histVaR.method === VaRMethod.HISTORICAL, 'Method is HISTORICAL');
assert(histVaR.sampleSize === 30, 'Sample size is 30');
assert(histVaR.varPercent > 0, 'VaR percentage is positive loss threshold');

// 5. Expected Shortfall (CVaR)
const histES = RiskForecastExpectedShortfallEngine.calculateHistoricalExpectedShortfall(returnsN30, {
  confidence: 0.95,
  horizonDays: 1,
  portfolioValue: 1000000.0,
  minObservations: 20
});

assert(histES.status === DataClassification.DERIVED, 'Expected Shortfall status is DERIVED');
assert(histES.tailObservationCount >= 1, 'Tail observations count >= 1');
assert(histES.expectedShortfallPercent >= histVaR.varPercent, 'Expected Shortfall ES >= VaR (mathematical law)');
assert(histES.expectedShortfallAmount === histES.expectedShortfallPercent * 1000000.0, 'ES amount is consistent');

// 6. Insufficient Data Failures
const shortVaR = RiskForecastVaREngine.calculateHistoricalVaR([0.01, 0.02], { minObservations: 20 });
assert(shortVaR.status === DataClassification.UNAVAILABLE, 'Historical VaR returns UNAVAILABLE when N < minimum');

const shortES = RiskForecastExpectedShortfallEngine.calculateHistoricalExpectedShortfall([0.01, 0.02], { minObservations: 25 });
assert(shortES.status === DataClassification.UNAVAILABLE, 'Expected Shortfall returns UNAVAILABLE when N < minimum');

console.log(`PASSED: ${passed}`);
