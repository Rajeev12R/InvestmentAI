import { RiskForecastEngine } from '../riskForecast/riskForecast.forecast.engine.js';
import { RiskHorizon, HORIZON_DAYS, DataClassification } from '../riskForecast/riskForecast.types.js';

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  passed++;
}

console.log('--- SUITE 8: Comprehensive Multi-Horizon Forecasting Engine ---');

const symbols = ['AAPL', 'MSFT'];
const weights = [0.6, 0.4];
const covMatrix = [
  [0.000400, 0.000150],
  [0.000150, 0.000300]
];

const mockReturns = [];
for (let i = 0; i < 50; i++) {
  mockReturns.push((Math.sin(i) * 0.015) - 0.002);
}

const result = RiskForecastEngine.runComprehensiveForecast({
  symbols,
  weights,
  covarianceMatrix: covMatrix,
  portfolioReturns: mockReturns,
  asOf: '2026-09-07T00:00:00.000Z',
  portfolioValue: 500000.0,
  confidence: 0.95
});

assert(result.status === DataClassification.FORECAST, 'Engine status is FORECAST');
assert(result.portfolioVolatility > 0, 'Portfolio annualized volatility > 0');
assert(result.dailyVolatility > 0, 'Daily volatility > 0');

// Validate all 5 standard institutional horizons
const expectedHorizons = ['1D', '5D', '20D', '60D', '252D'];
expectedHorizons.forEach(h => {
  const hForecast = result.horizons[h];
  assert(hForecast !== undefined, `Horizon ${h} exists`);
  assert(hForecast.horizon === h, `Horizon identifier ${h}`);
  assert(hForecast.horizonDays === HORIZON_DAYS[h], `Horizon days = ${HORIZON_DAYS[h]}`);
  assert(hForecast.scalingFactor === Math.sqrt(HORIZON_DAYS[h]), `Scaling factor = sqrt(${HORIZON_DAYS[h]})`);
  assert(hForecast.parametricVaR !== null, `Parametric VaR calculated for ${h}`);
  assert(hForecast.historicalVaR !== null, `Historical VaR calculated for ${h}`);
  assert(hForecast.expectedShortfall !== null, `Expected Shortfall calculated for ${h}`);
  assert(hForecast.expectedMaxDrawdown !== null, `Expected Drawdown calculated for ${h}`);
});

// Check monotonic horizon scaling of volatility
assert(result.horizons['1D'].volatilityForecast < result.horizons['5D'].volatilityForecast, '1D vol < 5D vol');
assert(result.horizons['5D'].volatilityForecast < result.horizons['20D'].volatilityForecast, '5D vol < 20D vol');
assert(result.horizons['20D'].volatilityForecast < result.horizons['60D'].volatilityForecast, '20D vol < 60D vol');
assert(result.horizons['60D'].volatilityForecast < result.horizons['252D'].volatilityForecast, '60D vol < 252D vol');

console.log(`PASSED: ${passed}`);
