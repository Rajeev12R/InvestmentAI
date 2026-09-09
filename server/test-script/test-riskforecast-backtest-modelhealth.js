import { RiskForecastBacktestEngine } from '../riskForecast/riskForecast.backtest.engine.js';
import { RiskForecastModelRiskEngine } from '../riskForecast/riskForecast.modelRisk.engine.js';
import { ModelHealthState, DataClassification } from '../riskForecast/riskForecast.types.js';

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  passed++;
}

console.log('--- SUITE 10: Backtesting, Kupiec POF Test & Model Health Governance ---');

// 1. Volatility Forecast Evaluation
const volBacktest = RiskForecastBacktestEngine.evaluateVolatilityForecast({
  forecastVolatility: 0.15,
  realizedVolatility: 0.17,
  sampleSize: 100
});

assert(volBacktest.status === DataClassification.DERIVED, 'Volatility backtest status is DERIVED');
assert(Math.abs(volBacktest.forecastError - 0.02) < 1e-6, 'Forecast error is 0.02');
assert(Math.abs(volBacktest.absoluteError - 0.02) < 1e-6, 'Absolute error is 0.02');
assert(volBacktest.bias === 'UNDERESTIMATED_RISK', 'Bias correctly flagged as UNDERESTIMATED_RISK');
assert(volBacktest.realizedToForecastRatio === 0.17 / 0.15, 'Realized/Forecast ratio correct');

// 2. VaR Exception Backtest & Kupiec POF Test
const realizedReturns = [];
for (let i = 0; i < 100; i++) {
  // Generate 100 returns with 5 exceptions exceeding 2% loss
  if (i === 10 || i === 25 || i === 50 || i === 75 || i === 90) {
    realizedReturns.push(-0.035); // Loss = 3.5% > 2% VaR
  } else {
    realizedReturns.push(0.005);
  }
}

const kupiecRes = RiskForecastBacktestEngine.backtestVaRExceptions({
  realizedReturns,
  varThresholdPercent: 0.02,
  confidence: 0.95
});

assert(kupiecRes.status === DataClassification.DERIVED, 'Kupiec backtest status is DERIVED');
assert(kupiecRes.actualExceptions === 5, 'Exact 5 exceptions detected');
assert(Math.abs(kupiecRes.expectedExceptions - 5.0) < 1e-6, 'Expected exceptions = 5.0 (5% of 100)');
assert(kupiecRes.modelAccepted === true, 'Kupiec test accepts model (LR stat < critical value 3.841)');
assert(kupiecRes.trafficLight === 'GREEN', 'Traffic light is GREEN');

// 3. Model Health Governance
const validHealth = RiskForecastModelRiskEngine.evaluateModelHealth({
  observationCount: 252,
  assetCount: 10,
  covarianceQuality: { positiveSemidefinite: true, isIllConditioned: false, conditionNumber: 50.0 },
  asOfCutoff: '2026-09-07T00:00:00.000Z'
});
assert(validHealth.healthState === ModelHealthState.VALID, 'Healthy model is VALID');
assert(validHealth.isValid === true, 'isValid is true');

const insufficientHealth = RiskForecastModelRiskEngine.evaluateModelHealth({
  observationCount: 5,
  assetCount: 10,
  asOfCutoff: '2026-09-07T00:00:00.000Z'
});
assert(insufficientHealth.healthState === ModelHealthState.INSUFFICIENT_DATA, 'N < min is INSUFFICIENT_DATA');
assert(insufficientHealth.isInsufficientData === true, 'isInsufficientData is true');

const failedHealth = RiskForecastModelRiskEngine.evaluateModelHealth({
  observationCount: 252,
  assetCount: 10,
  covarianceQuality: { positiveSemidefinite: false, minimumEigenvalue: -0.05 },
  asOfCutoff: '2026-09-07T00:00:00.000Z'
});
assert(failedHealth.healthState === ModelHealthState.FAILED, 'Non-PSD matrix results in FAILED model health');
assert(failedHealth.isFailed === true, 'isFailed is true');

const staleHealth = RiskForecastModelRiskEngine.evaluateModelHealth({
  observationCount: 252,
  assetCount: 10,
  isStale: true,
  asOfCutoff: '2026-09-07T00:00:00.000Z'
});
assert(staleHealth.healthState === ModelHealthState.STALE, 'Stale input yields STALE health state');
assert(staleHealth.isStale === true, 'isStale is true');

console.log(`PASSED: ${passed}`);
