/**
 * server/test-script/test-forecast-portfolio-aggregation.js
 * 
 * Phase 20: Portfolio Forward-Looking Aggregation Tests
 * Validates aggregate forward expectations and authoritative Portfolio Forward P/E
 * vs analytical Weighted Average Security P/E.
 */

import assert from 'assert';
import { aggregatePortfolioForecast } from '../forecasting/forecast.portfolio.engine.js';
import { ForecastClassification } from '../forecasting/forecast.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- RUNNING PHASE 20 PORTFOLIO AGGREGATION TESTS ---');

// =========================================================================
// SECTION 1: BASE PORTFOLIO AGGREGATION
// =========================================================================
console.log('Testing Section 1: Base Portfolio Aggregation...');
const testPortfolio = {
  id: 'PORT-FORECAST-01',
  cash: 20000,
  positions: [
    {
      ticker: 'AAPL',
      marketValue: 40000,
      shares: 200,
      dividendYield: 0.006,
      forecast: {
        forwardEPS: 10.0, // Earnings = 200 * 10 = 2,000 -> PE = 40,000 / 2,000 = 20.0
        forwardPE: 20.0,
        expectedReturn: 0.12,
        earningsGrowth: 0.10,
        fcfYield: 0.05
      }
    },
    {
      ticker: 'JNJ',
      marketValue: 40000,
      shares: 400,
      dividendYield: 0.030,
      forecast: {
        forwardEPS: 5.0, // Earnings = 400 * 5 = 2,000 -> PE = 40,000 / 2,000 = 20.0
        forwardPE: 20.0,
        expectedReturn: 0.07,
        earningsGrowth: 0.04,
        fcfYield: 0.06
      }
    }
  ]
};

const result = aggregatePortfolioForecast(testPortfolio);

testAssert(result.totalNav === 100000, 'Total NAV is 100,000');
testAssert(result.totalMarketValue === 80000, 'Total Market Value is 80,000');
testAssert(result.positionsCount === 2, '2 position breakdowns');

// Weighted Expected Return: 0.40 * 0.12 + 0.40 * 0.07 = 0.048 + 0.028 = 0.076 (7.6%)
const expRet = result.aggregatedExpectations.weightedExpectedReturn;
testAssert(Math.abs(expRet - 0.076) < 1e-6, `Weighted expected return is 7.6%, got ${(expRet * 100).toFixed(2)}%`);

// Weighted Earnings Growth: 0.40 * 0.10 + 0.40 * 0.04 = 0.04 + 0.016 = 0.056 (5.6%)
const expGrowth = result.aggregatedExpectations.weightedEarningsGrowth;
testAssert(Math.abs(expGrowth - 0.056) < 1e-6, `Weighted earnings growth is 5.6%, got ${(expGrowth * 100).toFixed(2)}%`);

// Weighted Dividend Yield: 0.40 * 0.006 + 0.40 * 0.030 = 0.0024 + 0.0120 = 0.0144 (1.44%)
const expDiv = result.aggregatedExpectations.weightedDividendYield;
testAssert(Math.abs(expDiv - 0.0144) < 1e-6, `Weighted dividend yield is 1.44%, got ${(expDiv * 100).toFixed(2)}%`);

testAssert(result.classification === ForecastClassification.MODEL_ESTIMATE, 'Classification is MODEL_ESTIMATE');

// =========================================================================
// SECTION 2: AUTHORITATIVE PORTFOLIO FORWARD P/E VS WEIGHTED AVERAGE P/E
// =========================================================================
console.log('Testing Section 2: Portfolio Forward P/E Mathematical Rigor...');
// Asymmetric Portfolio:
// Pos A: MarketValue = $100,000, ForwardEarnings = $10,000 (PE = 10)
// Pos B: MarketValue = $100,000, ForwardEarnings = $2,000  (PE = 50)
// Total Market Value = $200,000, Total Forward Earnings = $12,000
// Authoritative Portfolio Forward P/E = 200,000 / 12,000 = 16.6667
// Arithmetic Weighted Average P/E = 0.50 * 10 + 0.50 * 50 = 30.0000
const asymPortfolio = {
  id: 'PORT-ASYM',
  cash: 0,
  positions: [
    {
      ticker: 'VALUE_CO',
      marketValue: 100000,
      shares: 1000,
      forecast: { forwardEPS: 10.0, forwardPE: 10.0 }
    },
    {
      ticker: 'GROWTH_CO',
      marketValue: 100000,
      shares: 1000,
      forecast: { forwardEPS: 2.0, forwardPE: 50.0 }
    }
  ]
};

const asymRes = aggregatePortfolioForecast(asymPortfolio);
const authPE = asymRes.aggregatedExpectations.portfolioForwardPE;
const weightedAvgPE = asymRes.aggregatedExpectations.WEIGHTED_AVERAGE_SECURITY_PE;

testAssert(Math.abs(authPE - (200000 / 12000)) < 1e-6, `Authoritative Portfolio P/E is 16.6667, got ${authPE}`);
testAssert(Math.abs(weightedAvgPE - 30.0) < 1e-6, `Weighted Average Security P/E is 30.0, got ${weightedAvgPE}`);
testAssert(Math.abs(authPE - weightedAvgPE) > 5.0, 'Proves Authoritative Portfolio P/E strictly differs from arithmetic average P/E');

// =========================================================================
// SECTION 3: PORTFOLIO P/E EDGE CASES (ZERO, NEGATIVE & MISSING EARNINGS)
// =========================================================================
console.log('Testing Section 3: Portfolio P/E Edge Cases...');

// 3a. Zero forward earnings
const zeroEarnPortfolio = {
  id: 'PORT-ZERO',
  cash: 0,
  positions: [
    {
      ticker: 'ZERO_CO',
      marketValue: 50000,
      shares: 100,
      forecast: { forwardEPS: 0.0 }
    }
  ]
};
const zeroRes = aggregatePortfolioForecast(zeroEarnPortfolio);
testAssert(zeroRes.aggregatedExpectations.portfolioForwardPE === 'UNAVAILABLE', 'Zero forward earnings returns UNAVAILABLE');
testAssert(zeroRes.aggregatedExpectations.portfolioForwardPE_status === 'UNAVAILABLE_ZERO_AGGREGATE_FORWARD_EARNINGS', 'Status is zero earnings');

// 3b. Negative forward earnings (Net Loss)
const lossPortfolio = {
  id: 'PORT-LOSS',
  cash: 0,
  positions: [
    {
      ticker: 'LOSS_CO_A',
      marketValue: 50000,
      shares: 1000,
      forecast: { forwardEPS: -5.0 } // -$5,000
    },
    {
      ticker: 'PROFIT_CO_B',
      marketValue: 50000,
      shares: 1000,
      forecast: { forwardEPS: 1.0 } // +$1,000 -> Total = -$4,000
    }
  ]
};
const lossRes = aggregatePortfolioForecast(lossPortfolio);
testAssert(lossRes.aggregatedExpectations.portfolioForwardPE === 'UNAVAILABLE', 'Negative aggregate earnings returns UNAVAILABLE');
testAssert(lossRes.aggregatedExpectations.portfolioForwardPE_status === 'UNAVAILABLE_NEGATIVE_AGGREGATE_FORWARD_EARNINGS', 'Status is negative earnings');

// 3c. Missing forward earnings in one position
const missingPortfolio = {
  id: 'PORT-MISSING',
  cash: 0,
  positions: [
    {
      ticker: 'VALID_CO',
      marketValue: 50000,
      shares: 1000,
      forecast: { forwardEPS: 5.0 }
    },
    {
      ticker: 'UNCOVERED_CO',
      marketValue: 50000,
      shares: 1000,
      forecast: {} // No forward earnings provided
    }
  ]
};
const missingRes = aggregatePortfolioForecast(missingPortfolio);
testAssert(missingRes.aggregatedExpectations.portfolioForwardPE === 'UNAVAILABLE', 'Missing earnings in position returns UNAVAILABLE');
testAssert(missingRes.aggregatedExpectations.portfolioForwardPE_status === 'UNAVAILABLE_MISSING_POSITION_EARNINGS', 'Status is missing position earnings');

console.log(`[PASS] Phase 20 Portfolio Aggregation tests passed: ${assertionCount} assertions`);

export default { assertionCount };
