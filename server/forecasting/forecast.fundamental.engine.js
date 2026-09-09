/**
 * server/forecasting/forecast.fundamental.engine.js
 * 
 * Phase 20: Fundamental Statement Integrated Forecasting Engine
 * Multi-period statement driver modeling (Revenue -> EBITDA -> EBIT -> Net Income -> EPS -> FCF).
 */

import { ForecastClassification, ForecastMethod } from './forecast.types.js';
import { FORECAST_CONFIG } from './forecast.config.js';

/**
 * Generates an integrated multi-period fundamental financial forecast.
 * 
 * @param {Object} baseFinancials - Baseline Truth Layer financial snapshot
 *   - baseRevenue: number
 *   - baseShares: number
 *   - baseOperatingMargin: number (optional)
 *   - baseTaxRate: number (optional)
 * @param {Object} drivers - Forward-looking assumption drivers
 *   - revenueGrowthRates: Array<number> or number (annual growth, e.g. [0.12, 0.10, 0.08])
 *   - operatingMargins: Array<number> or number (e.g. 0.28)
 *   - effectiveTaxRates: Array<number> or number (e.g. 0.21)
 *   - daFractionOfRevenue: number (e.g. 0.04)
 *   - capexFractionOfRevenue: number (e.g. 0.05)
 *   - nwcChangeFractionOfRevenue: number (e.g. 0.01)
 *   - shareCountGrowth: number (e.g. 0.0 for constant shares)
 * @param {number} horizonYears - Number of forward years (e.g. 1 to 5)
 * @returns {Object} Multi-period forecast table with all line items
 */
export function forecastFundamentalStatements(baseFinancials, drivers, horizonYears = 3) {
  if (!baseFinancials || typeof baseFinancials !== 'object') {
    throw new TypeError('baseFinancials must be a valid object');
  }
  if (!drivers || typeof drivers !== 'object') {
    throw new TypeError('drivers must be a valid object');
  }

  const baseRevenue = baseFinancials.baseRevenue;
  const baseShares = baseFinancials.baseShares !== undefined ? baseFinancials.baseShares : 1;

  if (typeof baseRevenue !== 'number' || !Number.isFinite(baseRevenue) || baseRevenue <= 0) {
    throw new Error(`Invalid baseRevenue: ${baseRevenue}. Must be a strictly positive number.`);
  }
  if (typeof baseShares !== 'number' || !Number.isFinite(baseShares) || baseShares <= 0) {
    throw new Error(`Invalid baseShares: ${baseShares}. Must be a strictly positive number.`);
  }

  const periods = [];
  let prevRevenue = baseRevenue;
  let currentShares = baseShares;

  for (let y = 1; y <= horizonYears; y++) {
    // 1. Resolve driver assumptions for year y
    const growth = Array.isArray(drivers.revenueGrowthRates) 
      ? (drivers.revenueGrowthRates[y - 1] !== undefined ? drivers.revenueGrowthRates[y - 1] : drivers.revenueGrowthRates[drivers.revenueGrowthRates.length - 1])
      : (typeof drivers.revenueGrowthRate === 'number' ? drivers.revenueGrowthRate : 0.08);

    const margin = Array.isArray(drivers.operatingMargins)
      ? (drivers.operatingMargins[y - 1] !== undefined ? drivers.operatingMargins[y - 1] : drivers.operatingMargins[drivers.operatingMargins.length - 1])
      : (typeof drivers.operatingMargin === 'number' ? drivers.operatingMargin : (baseFinancials.baseOperatingMargin || 0.20));

    const taxRate = Array.isArray(drivers.effectiveTaxRates)
      ? (drivers.effectiveTaxRates[y - 1] !== undefined ? drivers.effectiveTaxRates[y - 1] : drivers.effectiveTaxRates[drivers.effectiveTaxRates.length - 1])
      : (typeof drivers.effectiveTaxRate === 'number' ? drivers.effectiveTaxRate : 0.21);

    const daFrac = typeof drivers.daFractionOfRevenue === 'number' ? drivers.daFractionOfRevenue : 0.04;
    const capexFrac = typeof drivers.capexFractionOfRevenue === 'number' ? drivers.capexFractionOfRevenue : 0.05;
    const nwcFrac = typeof drivers.nwcChangeFractionOfRevenue === 'number' ? drivers.nwcChangeFractionOfRevenue : 0.01;
    const shareGrowth = typeof drivers.shareCountGrowth === 'number' ? drivers.shareCountGrowth : 0.0;

    // 2. Compute statement lines
    const revenue = prevRevenue * (1 + growth);
    const ebit = revenue * margin;
    const da = revenue * daFrac;
    const ebitda = ebit + da;
    const tax = Math.max(0, ebit * taxRate);
    const nopat = ebit - tax;
    const netIncome = nopat; // clean operating earnings assumption
    
    currentShares = currentShares * (1 + shareGrowth);
    const eps = netIncome / currentShares;

    const capex = revenue * capexFrac;
    const nwcChange = revenue * nwcFrac;
    const fcf = nopat + da - capex - nwcChange;

    periods.push({
      year: y,
      periodLabel: `FY+${y}`,
      revenue,
      ebitda,
      ebit,
      da,
      capex,
      nwcChange,
      tax,
      netIncome,
      eps,
      fcf,
      assumptionsApplied: {
        revenueGrowthRate: growth,
        operatingMargin: margin,
        effectiveTaxRate: taxRate,
        daFraction: daFrac,
        capexFraction: capexFrac,
        nwcFraction: nwcFrac,
        shares: currentShares
      },
      classification: ForecastClassification.FORECAST
    });

    prevRevenue = revenue;
  }

  return {
    method: ForecastMethod.FUNDAMENTAL_INTEGRATED,
    horizonYears,
    baseRevenue,
    baseShares,
    periods,
    summary: {
      finalYearRevenue: periods[periods.length - 1].revenue,
      finalYearEPS: periods[periods.length - 1].eps,
      finalYearFCF: periods[periods.length - 1].fcf,
      revenueCumulativeCAGR: Math.pow(periods[periods.length - 1].revenue / baseRevenue, 1 / horizonYears) - 1
    },
    classification: ForecastClassification.FORECAST
  };
}
