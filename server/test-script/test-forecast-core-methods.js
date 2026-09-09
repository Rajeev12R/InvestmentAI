/**
 * server/test-script/test-forecast-core-methods.js
 * 
 * Phase 20: Core Forecasting Mathematical Methods & Fundamental Financial Statements
 * Validates CAGR, OLS Linear Trend with exact Student-t prediction intervals,
 * rolling margin forecasting, and integrated financial statements.
 */

import assert from 'assert';
import { forecastCAGR, forecastLinearTrend, forecastRollingAverage, getStudentTCriticalValue } from '../forecasting/forecast.trend.engine.js';
import { forecastFundamentalStatements } from '../forecasting/forecast.fundamental.engine.js';
import { ForecastClassification, ForecastMethod } from '../forecasting/forecast.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- RUNNING PHASE 20 CORE FORECASTING METHOD TESTS ---');

// =========================================================================
// SECTION 1: CAGR FORECASTING & VALIDATION
// =========================================================================
console.log('Testing Section 1: CAGR Forecasting...');
const series1 = [100, 110, 121];
const cagrRes = forecastCAGR(series1, 1);
testAssert(Math.abs(cagrRes.cagrRate - 0.10) < 1e-6, `CAGR rate is 10%, got ${cagrRes.cagrRate}`);
testAssert(Math.abs(cagrRes.forecastValue - 133.1) < 1e-6, `1Y forecast value is 133.1, got ${cagrRes.forecastValue}`);
testAssert(cagrRes.classification === ForecastClassification.FORECAST, 'CAGR is classified as FORECAST');

const cagrRes2Y = forecastCAGR(series1, 2);
testAssert(Math.abs(cagrRes2Y.forecastValue - 146.41) < 1e-6, `2Y forecast value is 146.41, got ${cagrRes2Y.forecastValue}`);

// CAGR horizon bounds check
let invalidHorizonCaught = false;
try { forecastCAGR(series1, 15); } catch (e) { invalidHorizonCaught = true; }
testAssert(invalidHorizonCaught, 'CAGR rejects horizon > 10 years');

// =========================================================================
// SECTION 2: EXACT STUDENT-T CRITICAL VALUES & OLS PREDICTION INTERVALS
// =========================================================================
console.log('Testing Section 2: Exact Student-t Critical Values...');
testAssert(Math.abs(getStudentTCriticalValue(1) - 12.706) < 1e-4, 'df=1 critical value is 12.706');
testAssert(Math.abs(getStudentTCriticalValue(2) - 4.303) < 1e-4, 'df=2 critical value is 4.303');
testAssert(Math.abs(getStudentTCriticalValue(3) - 3.182) < 1e-4, 'df=3 critical value is 3.182');
testAssert(Math.abs(getStudentTCriticalValue(10) - 2.228) < 1e-4, 'df=10 critical value is 2.228');
testAssert(Math.abs(getStudentTCriticalValue(60) - 2.000) < 1e-4, 'df=60 critical value is 2.000');
testAssert(getStudentTCriticalValue(200) < 1.98, 'df=200 approaches normal z=1.96');

// 2a. OLS for N=3 (df=1, t_crit=12.706)
const noisyN3 = [10, 16, 19];
const linN3 = forecastLinearTrend(noisyN3, 1);
testAssert(linN3.degreesOfFreedom === 1, 'df is 1 for N=3');
testAssert(linN3.uncertainty.criticalValue_t === 12.706, 'Exact critical value for N=3 is 12.706');
testAssert(linN3.uncertainty.methodology === 'EXACT_FINITE_SAMPLE_STUDENT_T', 'Methodology is EXACT_FINITE_SAMPLE_STUDENT_T');
testAssert(linN3.normalApproximation.methodology === 'NORMAL_APPROX_95_PREDICTION_INTERVAL', 'Normal approximation explicitly labeled');

// 2b. Perfect Line with Zero Residual Variance (s_e = 0)
const perfectSeries = [10, 20, 30, 40];
const linPerfect = forecastLinearTrend(perfectSeries, 1);
testAssert(linPerfect.standardError === 0, 'Standard error is 0 for collinear series');
testAssert(linPerfect.uncertainty.marginOfError95 === 0, 'Margin of error is 0 for perfect line');
testAssert(linPerfect.forecastValue === 50.0, 'Forecast point estimate is 50.0');
testAssert(linPerfect.uncertainty.lowerBound95 === 50.0, 'Lower bound equals point estimate');
testAssert(linPerfect.uncertainty.upperBound95 === 50.0, 'Upper bound equals point estimate');

// 2c. Moderate N=12 (df=10, t_crit=2.228)
const seriesN12 = [10, 12, 14, 17, 19, 21, 25, 27, 29, 32, 35, 38];
const linN12 = forecastLinearTrend(seriesN12, 1);
testAssert(linN12.degreesOfFreedom === 10, 'df is 10 for N=12');
testAssert(Math.abs(linN12.uncertainty.criticalValue_t - 2.228) < 1e-3, 't_crit is 2.228 for N=12');
testAssert(linN12.uncertainty.upperBound95 > linN12.forecastValue, 'Upper bound > point estimate');
testAssert(linN12.uncertainty.lowerBound95 < linN12.forecastValue, 'Lower bound < point estimate');

// 2d. Insufficient observations (<3)
let errN2 = false;
try { forecastLinearTrend([10, 20], 1); } catch (e) { errN2 = true; }
testAssert(errN2, 'Linear trend rejects series with N < 3');

// 2e. Unsupported horizon steps
let errHorizon = false;
try { forecastLinearTrend(seriesN12, 12); } catch (e) { errHorizon = true; }
testAssert(errHorizon, 'Linear trend rejects horizon > 10 steps');

// =========================================================================
// SECTION 3: ROLLING AVERAGE & MARGIN FORECASTING
// =========================================================================
console.log('Testing Section 3: Rolling Margins...');
const marginSeries = [0.25, 0.26, 0.24, 0.25];
const rollRes = forecastRollingAverage(marginSeries, 1);
testAssert(Math.abs(rollRes.meanValue - 0.25) < 1e-6, `Rolling mean margin is 25%, got ${rollRes.meanValue}`);
testAssert(rollRes.uncertainty.lowerBound95 < rollRes.meanValue, 'Lower bound is below mean');
testAssert(rollRes.uncertainty.upperBound95 > rollRes.meanValue, 'Upper bound is above mean');

// =========================================================================
// SECTION 4: INTEGRATED FUNDAMENTAL FINANCIAL STATEMENTS
// =========================================================================
console.log('Testing Section 4: Fundamental Statements...');
const baseFin = {
  baseRevenue: 100000,
  baseShares: 1000
};
const drivers = {
  revenueGrowthRate: 0.10,
  operatingMargin: 0.30,
  effectiveTaxRate: 0.20,
  daFractionOfRevenue: 0.04,
  capexFractionOfRevenue: 0.05,
  nwcChangeFractionOfRevenue: 0.01
};

const fundRes = forecastFundamentalStatements(baseFin, drivers, 3);
testAssert(fundRes.periods.length === 3, '3 forward years generated');

const y1 = fundRes.periods[0];
testAssert(Math.abs(y1.revenue - 110000) < 1e-6, `Y1 Revenue is 110,000, got ${y1.revenue}`);
testAssert(Math.abs(y1.ebit - 33000) < 1e-6, `Y1 EBIT is 33,000, got ${y1.ebit}`);
testAssert(Math.abs(y1.da - 4400) < 1e-6, `Y1 D&A is 4,400, got ${y1.da}`);
testAssert(Math.abs(y1.ebitda - 37400) < 1e-6, `Y1 EBITDA is 37,400, got ${y1.ebitda}`);
testAssert(Math.abs(y1.tax - 6600) < 1e-6, `Y1 Tax is 6,600, got ${y1.tax}`);
testAssert(Math.abs(y1.netIncome - 26400) < 1e-6, `Y1 Net Income is 26,400, got ${y1.netIncome}`);
testAssert(Math.abs(y1.eps - 26.40) < 1e-6, `Y1 EPS is 26.40, got ${y1.eps}`);
testAssert(Math.abs(y1.capex - 5500) < 1e-6, `Y1 CapEx is 5,500, got ${y1.capex}`);
testAssert(Math.abs(y1.nwcChange - 1100) < 1e-6, `Y1 NWC Change is 1,100, got ${y1.nwcChange}`);
testAssert(Math.abs(y1.fcf - 24200) < 1e-6, `Y1 FCF is 24,200, got ${y1.fcf}`);
testAssert(y1.classification === ForecastClassification.FORECAST, 'Y1 classification is FORECAST');

const y3 = fundRes.periods[2];
testAssert(Math.abs(y3.revenue - 133100) < 1e-6, `Y3 Revenue is 133,100, got ${y3.revenue}`);
testAssert(Math.abs(fundRes.summary.finalYearRevenue - 133100) < 1e-6, 'Summary final year revenue matches');
testAssert(Math.abs(fundRes.summary.revenueCumulativeCAGR - 0.10) < 1e-6, 'Cumulative CAGR is 10%');

console.log(`[PASS] Phase 20 Core Methods tests passed: ${assertionCount} assertions`);

export default { assertionCount };
