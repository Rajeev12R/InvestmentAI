/**
 * server/test-script/test-forecast-valuation-scenarios.js
 * 
 * Phase 20: Forecast Valuation Linking & Multi-Case (Bull/Base/Bear) Tests
 */

import assert from 'assert';
import { computeDCFFromForecast, computeMultipleValuationFromForecast } from '../forecasting/forecast.valuation.bridge.js';
import { forecastFundamentalStatements } from '../forecasting/forecast.fundamental.engine.js';
import { defaultForecastEngine } from '../forecasting/forecast.engine.js';
import { ForecastClassification } from '../forecasting/forecast.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- RUNNING PHASE 20 FORECAST VALUATION & MULTI-CASE TESTS ---');

// 1. Forecast-Linked DCF
// Forecasted FCF: Y1 = 100, Y2 = 110, Y3 = 121
const fcfPeriods = [
  { year: 1, fcf: 100 },
  { year: 2, fcf: 110 },
  { year: 3, fcf: 121 }
];
const valParams = {
  wacc: 0.10, // 10%
  terminalGrowthRate: 0.02, // 2%
  netDebt: 200,
  shares: 10
};

const dcfResult = computeDCFFromForecast(fcfPeriods, valParams);

// PV of explicit cash flows:
// Y1: 100 / 1.10 = 90.909
// Y2: 110 / (1.10^2) = 110 / 1.21 = 90.909
// Y3: 121 / (1.10^3) = 121 / 1.331 = 90.909
// Sum PV = 272.727
testAssert(Math.abs(dcfResult.pvExplicitFCF - 272.727) < 1e-2, `PV explicit cash flows is ~272.73, got ${dcfResult.pvExplicitFCF}`);

// Terminal Value:
// Terminal FCF = 121 * 1.02 = 123.42
// TV = 123.42 / (0.10 - 0.02) = 123.42 / 0.08 = 1542.75
// PV TV = 1542.75 / (1.10^3) = 1542.75 / 1.331 = 1159.09
testAssert(Math.abs(dcfResult.terminalValue - 1542.75) < 1e-2, `Terminal value is ~1542.75, got ${dcfResult.terminalValue}`);
testAssert(Math.abs(dcfResult.pvTerminalValue - 1159.09) < 1e-2, `PV Terminal value is ~1159.09, got ${dcfResult.pvTerminalValue}`);

// Enterprise Value = 272.73 + 1159.09 = 1431.82
// Equity Value = 1431.82 - 200 = 1231.82
// Implied Share Price = 1231.82 / 10 = $123.18
testAssert(Math.abs(dcfResult.enterpriseValue - 1431.82) < 1e-1, `Enterprise value is ~1431.82, got ${dcfResult.enterpriseValue}`);
testAssert(Math.abs(dcfResult.impliedSharePrice - 123.18) < 1e-1, `Implied share price is ~$123.18, got ${dcfResult.impliedSharePrice}`);
testAssert(dcfResult.classification === ForecastClassification.MODEL_ESTIMATE, 'DCF classification is MODEL_ESTIMATE');

// 2. Multiple-Linked Valuation
const multResult = computeMultipleValuationFromForecast({
  forecastEPS: 8.50,
  forecastEBITDA: 25000
}, {
  targetPE: 20.0,
  targetEVToEBITDA: 12.0,
  netDebt: 50000,
  shares: 1000
});

testAssert(multResult.valuations.peValuation.impliedPrice === 170.0, 'P/E implied price is 8.50 * 20 = $170.00');
// EV/EBITDA: 25,000 * 12 = 300,000 EV -> 300,000 - 50,000 = 250,000 Equity -> 250,000 / 1000 = $250.00
testAssert(multResult.valuations.evEbitdaValuation.impliedPrice === 250.0, 'EV/EBITDA implied price is $250.00');
testAssert(multResult.classification === ForecastClassification.MODEL_ESTIMATE, 'Multiples classification is MODEL_ESTIMATE');

// 3. Multi-Case (Base, Bull, Bear) Forecast Generation
const baseFin = { baseRevenue: 50000, baseShares: 1000 };
const caseDrivers = {
  base: { revenueGrowthRate: 0.10, operatingMargin: 0.25 },
  bull: { revenueGrowthRate: 0.18, operatingMargin: 0.30 },
  bear: { revenueGrowthRate: 0.02, operatingMargin: 0.18 }
};

const multiCaseRes = defaultForecastEngine.generateMultiCaseForecast(baseFin, caseDrivers, 3);
testAssert(multiCaseRes.cases.BASE !== undefined, 'Base case generated');
testAssert(multiCaseRes.cases.BULL !== undefined, 'Bull case generated');
testAssert(multiCaseRes.cases.BEAR !== undefined, 'Bear case generated');

testAssert(multiCaseRes.cases.BULL.summary.finalYearRevenue > multiCaseRes.cases.BASE.summary.finalYearRevenue, 'Bull revenue exceeds Base revenue');
testAssert(multiCaseRes.cases.BASE.summary.finalYearRevenue > multiCaseRes.cases.BEAR.summary.finalYearRevenue, 'Base revenue exceeds Bear revenue');
testAssert(multiCaseRes.comparison.revenueSpreadDollar > 0, 'Revenue spread computed');
testAssert(multiCaseRes.comparison.epsSpreadDollar > 0, 'EPS spread computed');

console.log(`[PASS] Phase 20 Forecast Valuation & Multi-Case tests passed: ${assertionCount} assertions`);

export default { assertionCount };
