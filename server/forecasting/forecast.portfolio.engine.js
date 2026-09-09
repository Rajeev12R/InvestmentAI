/**
 * server/forecasting/forecast.portfolio.engine.js
 * 
 * Phase 20: Portfolio Forward-Looking Aggregation Engine
 * Aggregates security forecasts to compute mathematically sound portfolio-level expected return,
 * earnings growth, dividend yield, and authoritative aggregate Portfolio Forward P/E.
 */

import { ForecastClassification } from './forecast.types.js';

/**
 * Aggregates security-level forecasts into portfolio forward-looking metrics.
 * 
 * Aggregation Definitions:
 * 1. Portfolio Forward P/E (Authoritative):
 *    Numerator: Total Portfolio Market Value = \sum MarketValue_i
 *    Denominator: Total Forward Earnings = \sum (ForwardEPS_i * Shares_i)
 *    Classification: MODEL_ESTIMATE
 *    Negative/Zero Handling: If denominator <= 0, returns UNAVAILABLE with explicit reason.
 * 
 * 2. Weighted Average Security P/E (Analytical Comparison Only):
 *    Calculation: \sum (w_i * ForwardPE_i)
 *    Note: Retained strictly for analytical comparison; NOT the authoritative portfolio P/E.
 * 
 * 3. Portfolio Forward Revenue / Earnings Growth:
 *    Calculation: \sum (w_i * Growth_i)
 * 
 * 4. Portfolio Forward Dividend Yield:
 *    Calculation: \sum (w_i * ForwardDivYield_i)
 * 
 * @param {Object} portfolio - { id, positions: Array<{ ticker, marketValue, weight, shares, forecast }>, cash }
 * @returns {Object} Aggregated portfolio forward expectations
 */
export function aggregatePortfolioForecast(portfolio) {
  if (!portfolio || !Array.isArray(portfolio.positions) || portfolio.positions.length === 0) {
    throw new Error('portfolio must contain non-empty positions array');
  }

  const totalMarketValue = portfolio.positions.reduce((sum, p) => sum + (p.marketValue || 0), 0);
  const totalNav = totalMarketValue + (portfolio.cash || 0);

  if (totalNav <= 0) {
    throw new Error('Portfolio total NAV must be strictly positive');
  }

  let weightedExpectedReturn = 0.0;
  let weightedEarningsGrowth = 0.0;
  let weightedDividendYield = 0.0;
  let weightedFCFYield = 0.0;

  let totalForwardEarnings = 0.0;
  let weightedSecurityPE = 0.0;
  let validSecurityPECount = 0;
  let hasMissingEarnings = false;

  const positionBreakdown = [];

  for (const pos of portfolio.positions) {
    const marketValue = pos.marketValue || 0;
    const weight = marketValue / totalNav;
    const fc = pos.forecast || {};

    const expReturn = typeof fc.expectedReturn === 'number' ? fc.expectedReturn : 0.08;
    const expEarningsGrowth = typeof fc.earningsGrowth === 'number' ? fc.earningsGrowth : (fc.summary?.revenueCumulativeCAGR || 0.06);
    const expDivYield = typeof fc.dividendYield === 'number' ? fc.dividendYield : (pos.dividendYield || 0.0);
    const expFCFYield = typeof fc.fcfYield === 'number' ? fc.fcfYield : 0.04;

    weightedExpectedReturn += weight * expReturn;
    weightedEarningsGrowth += weight * expEarningsGrowth;
    weightedDividendYield += weight * expDivYield;
    weightedFCFYield += weight * expFCFYield;

    // Determine security forward earnings for aggregate P/E:
    // Priority: 1) explicit forwardNetIncome, 2) forwardEPS * shares, 3) marketValue / forwardPE
    let forwardEarnings = null;
    let forwardPE = typeof fc.forwardPE === 'number' ? fc.forwardPE : null;

    if (typeof fc.forwardNetIncome === 'number') {
      forwardEarnings = fc.forwardNetIncome;
    } else if (typeof fc.forwardEPS === 'number' && typeof pos.shares === 'number') {
      forwardEarnings = fc.forwardEPS * pos.shares;
    } else if (forwardPE !== null && forwardPE > 0 && marketValue > 0) {
      forwardEarnings = marketValue / forwardPE;
    }

    if (forwardEarnings !== null) {
      totalForwardEarnings += forwardEarnings;
    } else {
      hasMissingEarnings = true;
    }

    if (forwardPE !== null && forwardPE > 0) {
      weightedSecurityPE += weight * forwardPE;
      validSecurityPECount++;
    }

    positionBreakdown.push({
      ticker: pos.ticker,
      marketValue,
      weight,
      shares: pos.shares || null,
      forwardEarnings,
      forwardPE,
      expectedReturn: expReturn,
      earningsGrowth: expEarningsGrowth,
      dividendYield: expDivYield,
      fcfYield: expFCFYield,
      classification: ForecastClassification.FORECAST
    });
  }

  // Authoritative Portfolio Forward P/E:
  // Portfolio Forward P/E = Total Market Value / Total Forward Earnings
  let portfolioForwardPE = null;
  let forwardPEReason = null;

  if (hasMissingEarnings) {
    portfolioForwardPE = null;
    forwardPEReason = 'UNAVAILABLE_MISSING_POSITION_EARNINGS';
  } else if (totalForwardEarnings === 0) {
    portfolioForwardPE = null;
    forwardPEReason = 'UNAVAILABLE_ZERO_AGGREGATE_FORWARD_EARNINGS';
  } else if (totalForwardEarnings < 0) {
    portfolioForwardPE = null;
    forwardPEReason = 'UNAVAILABLE_NEGATIVE_AGGREGATE_FORWARD_EARNINGS';
  } else {
    portfolioForwardPE = totalMarketValue / totalForwardEarnings;
    forwardPEReason = 'COMPUTED_AGGREGATE_EARNINGS_WEIGHTED';
  }

  return {
    portfolioId: portfolio.id || 'PORTFOLIO_AGGREGATE',
    totalNav,
    totalMarketValue,
    totalForwardEarnings,
    positionsCount: portfolio.positions.length,
    aggregatedExpectations: {
      weightedExpectedReturn,
      weightedEarningsGrowth,
      weightedDividendYield,
      weightedFCFYield,
      // Authoritative aggregate P/E
      portfolioForwardPE: portfolioForwardPE !== null ? portfolioForwardPE : 'UNAVAILABLE',
      portfolioForwardPE_status: forwardPEReason,
      // Analytical comparison metric (explicitly not authoritative portfolio P/E)
      WEIGHTED_AVERAGE_SECURITY_PE: validSecurityPECount > 0 ? weightedSecurityPE : 'UNAVAILABLE',
      aggregationMethodology: {
        portfolioForwardPE: 'AGGREGATE_SUM_MARKET_VALUE_DIVIDED_BY_SUM_FORWARD_EARNINGS',
        WEIGHTED_AVERAGE_SECURITY_PE: 'SUM_WEIGHT_TIMES_SECURITY_PE_ANALYTICAL_ONLY'
      }
    },
    positions: positionBreakdown,
    classification: ForecastClassification.MODEL_ESTIMATE
  };
}
