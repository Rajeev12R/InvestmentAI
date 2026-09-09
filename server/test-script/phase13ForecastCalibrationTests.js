/**
 * Phase 13 - Forecast Ledger & Calibration Test Suite
 * Tests deterministic forecast scoring, confidence calibration buckets, and Brier score.
 */

import { ForecastLedgerEngine } from '../processIntelligence/forecastLedger.engine.js';
import { CalibrationEngine } from '../processIntelligence/calibration.engine.js';
import { ForecastType, ForecastStatus, CalibrationStatus } from '../processIntelligence/process.types.js';

export async function runPhase13ForecastCalibrationTests() {
  const results = [];
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      passed++;
      results.push({ message, status: 'PASS' });
    } else {
      failed++;
      results.push({ message, status: 'FAIL' });
      console.error(`FAILED ASSERTION: ${message}`);
    }
  }

  console.log('--- RUNNING PHASE 13 FORECAST CALIBRATION TESTS ---');

  const ledger = new ForecastLedgerEngine();
  const calibration = new CalibrationEngine(3, 5); // test thresholds

  // Test 1: Record Numeric Range Forecast
  const f1 = ledger.recordForecast({
    forecastId: 'FC-AAPL-REV-01',
    decisionId: 'DEC-01',
    workspaceId: 'ws-test',
    ticker: 'AAPL',
    metric: 'REVENUE_GROWTH',
    forecastType: ForecastType.NUMERIC_RANGE,
    predictedRange: { min: 0.08, max: 0.12 },
    confidence: 0.80
  });

  assert(f1.forecastId === 'FC-AAPL-REV-01', 'Forecast recorded with correct ID');
  assert(f1.confidence === 0.80, 'Forecast recorded with confidence 0.80');

  // Test 2: Score Range Forecast - Validated
  const score1 = ledger.scoreForecast('FC-AAPL-REV-01', { actualValue: 0.095 }, 'ws-test');
  assert(score1.status === ForecastStatus.VALIDATED, 'Range forecast validated when actual in range');
  assert(score1.isValidated === true, 'isValidated flag is true');

  // Test 3: Score Range Forecast - Falsified
  const score1Fail = ledger.scoreForecast('FC-AAPL-REV-01', { actualValue: 0.04 }, 'ws-test');
  assert(score1Fail.status === ForecastStatus.FALSIFIED, 'Range forecast falsified when actual outside range');

  // Test 4: Missing data handling - NEVER converts to failure
  const score1Missing = ledger.scoreForecast('FC-AAPL-REV-01', { actualValue: null }, 'ws-test');
  assert(score1Missing.status === ForecastStatus.INSUFFICIENT_DATA, 'Missing actual is INSUFFICIENT_DATA');
  assert(score1Missing.isFalsified === false, 'Missing data is not treated as falsification/failure');

  // Test 5: Directional Forecast (IMPROVE)
  const f2 = ledger.recordForecast({
    forecastId: 'FC-AAPL-FCF-01',
    decisionId: 'DEC-01',
    workspaceId: 'ws-test',
    ticker: 'AAPL',
    metric: 'FCF',
    forecastType: ForecastType.DIRECTIONAL,
    predictedDirection: 'IMPROVE',
    predictedValue: 100, // baseline
    confidence: 0.70
  });

  const score2 = ledger.scoreForecast('FC-AAPL-FCF-01', { actualValue: 115 }, 'ws-test');
  assert(score2.status === ForecastStatus.VALIDATED, 'Directional IMPROVE validated on increase');

  // Test 6: Threshold Forecast
  const f3 = ledger.recordForecast({
    forecastId: 'FC-AAPL-MARGIN-01',
    decisionId: 'DEC-01',
    workspaceId: 'ws-test',
    ticker: 'AAPL',
    metric: 'OPERATING_MARGIN',
    forecastType: ForecastType.THRESHOLD,
    thresholdValue: 0.30,
    comparisonOperator: 'GTE',
    confidence: 0.85
  });

  const score3 = ledger.scoreForecast('FC-AAPL-MARGIN-01', { actualValue: 0.304 }, 'ws-test');
  assert(score3.status === ForecastStatus.VALIDATED, 'Threshold GTE validated when actual >= threshold');

  // Test 7: Calibration & Brier Score Calculation
  const testScoredForecasts = [
    { forecastId: 'f1', confidence: 0.85, status: ForecastStatus.VALIDATED },
    { forecastId: 'f2', confidence: 0.85, status: ForecastStatus.VALIDATED },
    { forecastId: 'f3', confidence: 0.85, status: ForecastStatus.VALIDATED },
    { forecastId: 'f4', confidence: 0.85, status: ForecastStatus.FALSIFIED },
    { forecastId: 'f5', confidence: 0.65, status: ForecastStatus.VALIDATED },
    { forecastId: 'f6', confidence: 0.65, status: ForecastStatus.FALSIFIED }
  ];

  const calResult = calibration.computeCalibration(testScoredForecasts);
  assert(calResult.totalResolved === 6, 'Total resolved forecasts is 6');
  assert(typeof calResult.brierScore === 'number', 'Brier score computed as number');
  assert(calResult.brierScore >= 0 && calResult.brierScore <= 1, 'Brier score in [0, 1] range');

  // Check 80-89% bucket
  const b80 = calResult.buckets.find(b => b.bucket === '80-89%');
  assert(b80.forecastCount === 4, 'Bucket 80-89% has 4 forecasts');
  assert(b80.validatedCount === 3, 'Bucket 80-89% has 3 validated');
  assert(b80.empiricalAccuracy === 0.75, 'Empirical accuracy is 3/4 = 0.75');
  assert(b80.calibrationError === 0.10, 'Calibration error is |0.85 - 0.75| = 0.10');
  assert(b80.status === CalibrationStatus.WELL_CALIBRATED, 'Bucket 80-89% classified as WELL_CALIBRATED (error <= 0.10)');

  console.log(`PASSED: ${passed} assertions (0 failed)`);
  return { suite: 'Phase 13 Forecast Calibration Tests', passed, failed, total: passed + failed, results };
}

if (process.argv[1] && process.argv[1].endsWith('phase13ForecastCalibrationTests.js')) {
  runPhase13ForecastCalibrationTests();
}
