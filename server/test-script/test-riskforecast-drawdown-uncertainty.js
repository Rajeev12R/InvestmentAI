import { RiskForecastDrawdownEngine } from '../riskForecast/riskForecast.drawdown.engine.js';
import { RiskForecastUncertaintyEngine } from '../riskForecast/riskForecast.uncertainty.engine.js';
import { DataClassification } from '../riskForecast/riskForecast.types.js';

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  passed++;
}

console.log('--- SUITE 6: Drawdown Analysis & Forecast Uncertainty Bands ---');

// 1. Historical Drawdown Analysis
const returnsPath = [0.05, 0.02, -0.04, -0.06, 0.01, -0.03, 0.08, 0.02];
const ddRes = RiskForecastDrawdownEngine.calculateHistoricalDrawdown(returnsPath, 100.0);

assert(ddRes.status === DataClassification.DERIVED, 'Drawdown status is DERIVED');
assert(ddRes.maxDrawdown > 0, 'Max drawdown is strictly positive');
assert(ddRes.maxDrawdownPercent > 0, 'Max drawdown percent > 0');
assert(ddRes.underwaterCurve.length === returnsPath.length + 1, 'Underwater curve length matches path');
assert(ddRes.peakIndex <= ddRes.troughIndex, 'Peak precedes or is at trough');

// 2. Forward Drawdown Estimate
const forwardDD = RiskForecastDrawdownEngine.estimateForwardDrawdown({
  annualizedVolatility: 0.16,
  horizonDays: 20,
  periodsPerYear: 252
});

assert(forwardDD.status === DataClassification.MODEL_ESTIMATE, 'Forward drawdown is MODEL_ESTIMATE');
assert(forwardDD.horizonDays === 20, 'Horizon days recorded');
assert(forwardDD.expectedMaxDrawdown > 0, 'Expected MDD > 0');
assert(forwardDD.expectedMaxDrawdownPercent > 0, 'Expected MDD percent > 0');

// 3. Volatility Forecast Uncertainty Bands
const uncert = RiskForecastUncertaintyEngine.calculateVolatilityUncertainty({
  forecastVolatility: 0.16,
  sampleSize: 100,
  confidence: 0.95
});

assert(uncert.status === DataClassification.MODEL_ESTIMATE, 'Uncertainty status is MODEL_ESTIMATE');
assert(uncert.confidence === 0.95, 'Confidence is 0.95');
assert(uncert.standardError > 0, 'Standard error is positive');
assert(uncert.lowerBound < uncert.forecastVolatility, 'Lower bound < point estimate');
assert(uncert.upperBound > uncert.forecastVolatility, 'Upper bound > point estimate');
assert(uncert.bandWidth === uncert.upperBound - uncert.lowerBound, 'Band width is exact difference');

// 4. Insufficient Data for Uncertainty Bands
const shortUncert = RiskForecastUncertaintyEngine.calculateVolatilityUncertainty({
  forecastVolatility: 0.16,
  sampleSize: 5
});
assert(shortUncert.status === DataClassification.UNAVAILABLE, 'Fails closed (UNAVAILABLE) on insufficient sample size');

console.log(`PASSED: ${passed}`);
