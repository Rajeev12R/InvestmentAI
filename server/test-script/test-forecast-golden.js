/**
 * server/test-script/test-forecast-golden.js
 * 
 * Phase 20: 8 Required Golden Institutional Forecast Traces (Golden A through Golden H)
 * Deterministic end-to-end audit trails covering revenue, EPS, FCF, DCF valuation,
 * realization backtest, multi-case scenarios, versioned revision attribution, and portfolio aggregation.
 */

import assert from 'assert';
import { defaultForecastEngine } from '../forecasting/forecast.engine.js';
import { evaluateForecastAccuracy } from '../forecasting/forecast.accuracy.engine.js';
import { aggregatePortfolioForecast } from '../forecasting/forecast.portfolio.engine.js';
import { defaultRevisionEngine } from '../forecasting/forecast.revisions.engine.js';
import { sealForecastPackage, verifyForecastPackage } from '../forecasting/forecast.package.js';
import { ForecastClassification, ForecastMethod, ForecastHorizon, ForecastCase } from '../forecasting/forecast.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- RUNNING PHASE 20 GOLDEN INSTITUTIONAL TRACES (GOLDEN A TO H) ---');

// =========================================================================
// GOLDEN A: REVENUE TREND & CAGR FORECAST WITH CANONICAL HASH
// =========================================================================
console.log('Evaluating Golden A: Revenue Trend & Canonical Hash Trace...');
const truthRevenueHistory = [300000, 330000, 363000]; // 10% CAGR
const reqA = {
  ticker: 'AAPL',
  metric: 'REVENUE',
  method: ForecastMethod.HISTORICAL_CAGR,
  horizon: ForecastHorizon.HORIZON_1Y,
  historicalSeries: truthRevenueHistory,
  baselineEvidenceIds: ['SEC-10K-2023', 'SEC-10K-2024', 'SEC-10K-2025']
};
const fcstA = defaultForecastEngine.generateForecast(reqA);
testAssert(Math.abs(fcstA.value - 399300) < 1e-6, `Golden A: 1Y Revenue is $399,300, got ${fcstA.value}`);
testAssert(fcstA.classification === ForecastClassification.FORECAST, 'Golden A classification is FORECAST');
testAssert(typeof fcstA.canonicalHash === 'string' && fcstA.canonicalHash.length === 64, 'Golden A has 64-char SHA-256 canonical hash');

// =========================================================================
// GOLDEN B: FUNDAMENTAL STATEMENT EPS FORECAST
// =========================================================================
console.log('Evaluating Golden B: Multi-Period EPS Forecast Trace...');
const baseFinAAPL = {
  ticker: 'AAPL',
  baseRevenue: 400000,
  baseShares: 15000, // 15B shares
  baseOperatingMargin: 0.30
};
const driversAAPL = {
  revenueGrowthRates: [0.08, 0.07, 0.06],
  operatingMargins: [0.31, 0.315, 0.32],
  effectiveTaxRate: 0.20,
  daFractionOfRevenue: 0.03,
  capexFractionOfRevenue: 0.04,
  nwcChangeFractionOfRevenue: 0.01
};
const reqB = {
  ticker: 'AAPL',
  metric: 'EPS',
  method: ForecastMethod.FUNDAMENTAL_INTEGRATED,
  horizon: ForecastHorizon.HORIZON_3Y,
  baseFinancials: baseFinAAPL,
  drivers: driversAAPL
};
const fcstB = defaultForecastEngine.generateForecast(reqB);
testAssert(fcstB.output.periods.length === 3, 'Golden B: 3 periods generated');
// Y1: Rev = 400k * 1.08 = 432,000. EBIT = 432k * 0.31 = 133,920. Tax = 26,784. Net Income = 107,136. EPS = 107,136 / 15k = $7.1424
const y1_eps = fcstB.output.periods[0].eps;
testAssert(Math.abs(y1_eps - 7.1424) < 1e-4, `Golden B: Y1 EPS is $7.1424, got ${y1_eps}`);
testAssert(fcstB.output.periods[2].eps > y1_eps, 'Golden B: EPS expands over 3-year horizon');
testAssert(fcstB.classification === ForecastClassification.FORECAST, 'Golden B classification is FORECAST');

// =========================================================================
// GOLDEN C: MULTI-PERIOD FREE CASH FLOW (FCF) FORECAST
// =========================================================================
console.log('Evaluating Golden C: Integrated FCF Forecast Trace...');
// Y1 FCF = NOPAT (107,136) + D&A (432k*0.03=12,960) - CapEx (432k*0.04=17,280) - NWC (432k*0.01=4,320) = 98,496
const y1_fcf = fcstB.output.periods[0].fcf;
testAssert(Math.abs(y1_fcf - 98496) < 1e-4, `Golden C: Y1 FCF is $98,496, got ${y1_fcf}`);
testAssert(fcstB.output.periods[2].fcf > y1_fcf, 'Golden C: FCF expands over 3-year horizon');

// =========================================================================
// GOLDEN D: FORECAST -> DCF VALUATION MODEL ESTIMATE
// =========================================================================
console.log('Evaluating Golden D: Forecast -> DCF Valuation Link Trace...');
const valParams = {
  wacc: 0.09,
  terminalGrowthRate: 0.025,
  netDebt: -50000, // $50B net cash
  shares: 15000
};
const valResult = defaultForecastEngine.evaluateForecastValuation(fcstB.output, valParams);
testAssert(valResult.dcf.impliedSharePrice > 0, 'Golden D: DCF generates positive implied share price');
testAssert(valResult.classification === ForecastClassification.MODEL_ESTIMATE, 'Golden D output classification is MODEL_ESTIMATE');
testAssert(valResult.inputClassification === ForecastClassification.FORECAST, 'Golden D input classification is FORECAST');

// =========================================================================
// GOLDEN E: FORECAST REALIZATION & ACCURACY EVALUATION (BACKTEST TRACE)
// =========================================================================
console.log('Evaluating Golden E: Forecast Accuracy Realization Trace...');
const forecastCutoffT = {
  ticker: 'MSFT',
  metric: 'EPS',
  period: 'FY2025',
  value: 12.00,
  createdAt: '2024-12-31T23:59:59Z',
  classification: ForecastClassification.FORECAST
};
const realizedTruthT1 = {
  ticker: 'MSFT',
  metric: 'EPS',
  period: 'FY2025',
  value: 12.50,
  realizationDate: '2026-01-15T00:00:00Z',
  classification: ForecastClassification.REAL_DATA
};
const accResultE = evaluateForecastAccuracy(forecastCutoffT, realizedTruthT1);
testAssert(Math.abs(accResultE.signedError - 0.50) < 1e-6, `Golden E: Signed error is +$0.50, got ${accResultE.signedError}`);
testAssert(accResultE.isAccurateWithin5Pct === true, 'Golden E: Accurate within 5%');
testAssert(accResultE.classification === ForecastClassification.DERIVED, 'Golden E accuracy result is DERIVED');

// =========================================================================
// GOLDEN F: MULTI-CASE SCENARIO FORECAST (BULL / BASE / BEAR)
// =========================================================================
console.log('Evaluating Golden F: Multi-Case Scenario Forecast Trace...');
const caseDrivers = {
  base: { revenueGrowthRate: 0.08, operatingMargin: 0.30 },
  bull: { revenueGrowthRate: 0.15, operatingMargin: 0.35 },
  bear: { revenueGrowthRate: 0.00, operatingMargin: 0.22 }
};
const multiCaseRes = defaultForecastEngine.generateMultiCaseForecast(baseFinAAPL, caseDrivers, 3);
testAssert(multiCaseRes.cases.BULL.summary.finalYearRevenue > multiCaseRes.cases.BASE.summary.finalYearRevenue, 'Golden F: Bull > Base revenue');
testAssert(multiCaseRes.cases.BASE.summary.finalYearRevenue > multiCaseRes.cases.BEAR.summary.finalYearRevenue, 'Golden F: Base > Bear revenue');
testAssert(multiCaseRes.comparison.revenueSpreadDollar > 0, 'Golden F: Positive revenue spread calculated');

// =========================================================================
// GOLDEN G: VERSIONED REVISION TRACKING & DRIVER ATTRIBUTION
// =========================================================================
console.log('Evaluating Golden G: Versioned Revision Tracking Trace...');
const revV1 = defaultRevisionEngine.recordRevision({
  forecastId: 'FCST-REV-AAPL-001',
  ticker: 'AAPL',
  metric: 'REVENUE',
  value: 432000,
  drivers: { growth: 0.08, margin: 0.30 },
  author: 'ANALYST_1'
});
const revV2 = defaultRevisionEngine.recordRevision({
  forecastId: 'FCST-REV-AAPL-001',
  ticker: 'AAPL',
  metric: 'REVENUE',
  value: 440000,
  drivers: { growth: 0.10, margin: 0.30 },
  author: 'ANALYST_2',
  reason: 'Upgraded iPhone cycle expectation'
});
testAssert(revV1.version === 1, 'Golden G: First version is V1');
testAssert(revV2.version === 2, 'Golden G: Second version is V2');
const diffG = defaultRevisionEngine.compareVersions('FCST-REV-AAPL-001', 1, 2);
testAssert(diffG.deltaValue === 8000, 'Golden G: Revision delta is +8,000');

// =========================================================================
// GOLDEN H: PORTFOLIO FORWARD AGGREGATION & AUTHORITATIVE P/E
// =========================================================================
console.log('Evaluating Golden H: Portfolio Forward Aggregation Trace...');
const portH = {
  id: 'PORT-GOLDEN-H',
  cash: 0,
  positions: [
    { ticker: 'A', marketValue: 60000, shares: 1000, forecast: { forwardEPS: 3.0 } }, // $3k earnings -> PE=20
    { ticker: 'B', marketValue: 40000, shares: 1000, forecast: { forwardEPS: 1.0 } }  // $1k earnings -> PE=40
  ]
};
const portHRes = aggregatePortfolioForecast(portH);
// Total MV = 100k. Total Earnings = 4k. Authoritative P/E = 100k / 4k = 25.0.
testAssert(portHRes.aggregatedExpectations.portfolioForwardPE === 25.0, 'Golden H: Authoritative Portfolio P/E is 25.0');
testAssert(portHRes.classification === ForecastClassification.MODEL_ESTIMATE, 'Golden H classification is MODEL_ESTIMATE');

// Package Sealing Verification
const sealedPkg = sealForecastPackage({
  tenantId: 'TENANT-INSTITUTIONAL-GOLDEN',
  forecastRecord: fcstB,
  assumptions: driversAAPL,
  sealedBy: 'USR-CHIEF-RISK-OFFICER'
});
testAssert(verifyForecastPackage(sealedPkg).valid === true, 'Golden Sealed package verified authentic');

console.log(`[PASS] Phase 20 Golden Forecast Traces (Golden A to H) passed: ${assertionCount} assertions`);

export default { assertionCount };
