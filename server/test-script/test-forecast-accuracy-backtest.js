/**
 * server/test-script/test-forecast-accuracy-backtest.js
 * 
 * Phase 20: Deterministic Historical Forecast Backtest & Error Calibration Tests
 * Validates MAE, RMSE, MAPE, signed bias, directional hit rate, and edge cases
 * (zero actual, negative EPS, zero transition, near-zero actual, temporal anomaly).
 */

import assert from 'assert';
import { evaluateForecastAccuracy, computeAggregateModelAccuracy } from '../forecasting/forecast.accuracy.engine.js';
import { ForecastClassification } from '../forecasting/forecast.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- RUNNING PHASE 20 HISTORICAL BACKTEST & ACCURACY TESTS ---');

// =========================================================================
// SECTION 1: SINGLE FORECAST VS REALIZED OUTCOME
// =========================================================================
console.log('Testing Section 1: Single Forecast Evaluation...');
// Cutoff: 2024-12-31 (T). Forecast FY2025 EPS = $6.50
const forecastT = {
  ticker: 'NVDA',
  metric: 'EPS',
  period: 'FY2025',
  value: 6.50,
  createdAt: '2024-12-31T23:59:59Z',
  classification: ForecastClassification.FORECAST
};

// Realization Date: 2026-01-15 (T+1). Observed Truth Layer EPS = $6.80
const realizedFactT1 = {
  ticker: 'NVDA',
  metric: 'EPS',
  period: 'FY2025',
  value: 6.80,
  realizationDate: '2026-01-15T00:00:00Z',
  classification: ForecastClassification.REAL_DATA
};

const accSingle = evaluateForecastAccuracy(forecastT, realizedFactT1);
testAssert(Math.abs(accSingle.signedError - 0.30) < 1e-6, `Signed error is +$0.30, got ${accSingle.signedError}`);
testAssert(Math.abs(accSingle.absoluteError - 0.30) < 1e-6, 'Absolute error is $0.30');
testAssert(Math.abs(accSingle.percentageError - (0.30 / 6.80)) < 1e-6, 'Percentage error matches');
testAssert(accSingle.isAccurateWithin5Pct === true, 'Forecast was accurate within 5%');
testAssert(accSingle.directionalAccuracy === true, 'Directional accuracy is true');

// =========================================================================
// SECTION 2: AGGREGATE MODEL BACKTEST ACROSS 4 QUARTERS
// =========================================================================
console.log('Testing Section 2: Aggregate Backtest Metrics...');
const historicalQuarterlyPairs = [
  {
    forecast: { value: 100, createdAt: '2024-03-31T00:00:00Z' },
    realizedFact: { value: 102, realizationDate: '2024-06-30T00:00:00Z', classification: 'REAL_DATA' } // err: +2, abs: 2
  },
  {
    forecast: { value: 105, createdAt: '2024-06-30T00:00:00Z' },
    realizedFact: { value: 104, realizationDate: '2024-09-30T00:00:00Z', classification: 'REAL_DATA' } // err: -1, abs: 1
  },
  {
    forecast: { value: 110, createdAt: '2024-09-30T00:00:00Z' },
    realizedFact: { value: 115, realizationDate: '2024-12-31T00:00:00Z', classification: 'REAL_DATA' } // err: +5, abs: 5
  },
  {
    forecast: { value: 120, createdAt: '2024-12-31T00:00:00Z' },
    realizedFact: { value: 118, realizationDate: '2025-03-31T00:00:00Z', classification: 'REAL_DATA' } // err: -2, abs: 2
  }
];

const aggAcc = computeAggregateModelAccuracy(historicalQuarterlyPairs);
testAssert(aggAcc.sampleSize === 4, 'Evaluated 4 historical periods');
testAssert(Math.abs(aggAcc.mae - 2.5) < 1e-6, `MAE is 2.5, got ${aggAcc.mae}`);
testAssert(Math.abs(aggAcc.rmse - Math.sqrt(8.5)) < 1e-5, `RMSE is ~2.915, got ${aggAcc.rmse}`);
testAssert(Math.abs(aggAcc.meanSignedBias - 1.0) < 1e-6, `Mean signed bias is +1.0, got ${aggAcc.meanSignedBias}`);
testAssert(aggAcc.directionalAccuracyPct === 1.0, 'Directional accuracy is 100%');
testAssert(aggAcc.calibrationScore > 90, 'Phase 13 calibration score > 90');

// =========================================================================
// SECTION 3: FORECAST ACCURACY MATHEMATICAL EDGE CASES (15+ TESTS)
// =========================================================================
console.log('Testing Section 3: Accuracy Edge Cases...');

// 3a. Realized Actual = 0 (Division by zero defense)
const zeroActualRes = evaluateForecastAccuracy(
  { value: 5.0, createdAt: '2025-01-01T00:00:00Z' },
  { value: 0.0, realizationDate: '2025-06-01T00:00:00Z', classification: 'REAL_DATA' }
);
testAssert(zeroActualRes.signedError === -5.0, 'Signed error calculated for zero actual (-5.0)');
testAssert(zeroActualRes.absoluteError === 5.0, 'Absolute error is 5.0');
testAssert(zeroActualRes.percentageError === 'UNAVAILABLE', 'Percentage error is UNAVAILABLE for zero actual');
testAssert(zeroActualRes.percentageErrorStatus === 'UNAVAILABLE_ZERO_REALIZED_DENOMINATOR', 'Explicit zero denominator status');
testAssert(zeroActualRes.directionalAccuracy === 'UNAVAILABLE', 'Directional accuracy is UNAVAILABLE for zero actual');

// 3b. Forecast = 0 (Zero transition)
const zeroForecastRes = evaluateForecastAccuracy(
  { value: 0.0, createdAt: '2025-01-01T00:00:00Z' },
  { value: 10.0, realizationDate: '2025-06-01T00:00:00Z', classification: 'REAL_DATA' }
);
testAssert(zeroForecastRes.signedError === 10.0, 'Signed error is +10.0 for zero forecast');
testAssert(zeroForecastRes.directionalAccuracy === 'UNAVAILABLE', 'Directional accuracy is UNAVAILABLE for zero forecast');

// 3c. Realized Actual < 0 (Negative EPS)
const negEpsRes = evaluateForecastAccuracy(
  { value: -1.50, createdAt: '2025-01-01T00:00:00Z' },
  { value: -2.00, realizationDate: '2025-06-01T00:00:00Z', classification: 'REAL_DATA' }
);
testAssert(negEpsRes.signedError === -0.50, 'Signed error is -0.50 for negative EPS');
testAssert(negEpsRes.absoluteError === 0.50, 'Absolute error is 0.50');
testAssert(negEpsRes.percentageError === 'UNAVAILABLE', 'MAPE is UNAVAILABLE for negative actual');
testAssert(negEpsRes.percentageErrorStatus === 'UNAVAILABLE_NEGATIVE_REALIZED_DENOMINATOR', 'Explicit negative denominator status');
testAssert(negEpsRes.directionalAccuracy === true, 'Directional accuracy is true (both negative)');

// 3d. Near-Zero Actual (< 1e-6)
const nearZeroRes = evaluateForecastAccuracy(
  { value: 1.0, createdAt: '2025-01-01T00:00:00Z' },
  { value: 1e-8, realizationDate: '2025-06-01T00:00:00Z', classification: 'REAL_DATA' }
);
testAssert(nearZeroRes.percentageError === 'UNAVAILABLE', 'Near-zero actual returns UNAVAILABLE for MAPE');

// 3e. Direction flip (Forecast positive, Realized negative)
const flipRes = evaluateForecastAccuracy(
  { value: 2.0, createdAt: '2025-01-01T00:00:00Z' },
  { value: -1.0, realizationDate: '2025-06-01T00:00:00Z', classification: 'REAL_DATA' }
);
testAssert(flipRes.directionalAccuracy === false, 'Directional accuracy is false on sign mismatch');

// 3f. Missing inputs rejection
let errMissingF = false;
try { evaluateForecastAccuracy(null, { value: 10, classification: 'REAL_DATA' }); } catch { errMissingF = true; }
testAssert(errMissingF, 'Rejects missing forecast input');

let errMissingR = false;
try { evaluateForecastAccuracy({ value: 10 }, null); } catch { errMissingR = true; }
testAssert(errMissingR, 'Rejects missing realized fact input');

// 3g. Non-REAL_DATA rejection
let errNonReal = false;
try { evaluateForecastAccuracy({ value: 10 }, { value: 12, classification: 'MODEL_ESTIMATE' }); } catch { errNonReal = true; }
testAssert(errNonReal, 'Rejects non-REAL_DATA for accuracy scoring');

// 3h. Temporal Anomaly Rejection
let tempAnomalyCaught = false;
try {
  evaluateForecastAccuracy(
    { value: 100, createdAt: '2026-06-01T00:00:00Z' }, // future forecast
    { value: 105, realizationDate: '2026-01-01T00:00:00Z', classification: 'REAL_DATA' } // past realization
  );
} catch (e) {
  tempAnomalyCaught = true;
  testAssert(e.message.includes('Temporal anomaly'), 'Catches temporal anomaly where forecast is created after realization');
}
testAssert(tempAnomalyCaught, 'Temporal anomaly rejected');

console.log(`[PASS] Phase 20 Accuracy & Backtest tests passed: ${assertionCount} assertions`);

export default { assertionCount };
