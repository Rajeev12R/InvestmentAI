/**
 * server/earnings/earnings.quality.engine.js
 * 
 * Phase 21: Earnings Quality & Accruals Intelligence Engine
 * Evaluates accrual ratios, cash flow vs net income conversion, and working capital drift.
 */

import { EventClassification } from './earnings.types.js';
import { EARNINGS_CONFIG } from './earnings.config.js';

/**
 * Analyzes financial statement quality metrics
 * 
 * Formulas:
 * 1. Cash Flow Accruals = Net Income - CFO
 * 2. Accrual Ratio = (Net Income - CFO) / Total Assets (or Net Income if Assets missing)
 * 3. Cash Conversion Rate = CFO / EBITDA
 * 4. FCF Conversion Rate = FCF / Net Income
 * 
 * @param {Object} financials - { netIncome, cfo, ebitda, fcf, totalAssets, revenue, receivablesDelta, inventoryDelta }
 * @returns {Object} Earnings quality assessment
 */
export function evaluateEarningsQuality(financials) {
  if (!financials || typeof financials !== 'object') {
    throw new Error('financials object is required for quality evaluation');
  }

  const {
    netIncome,
    cfo,
    ebitda,
    fcf,
    totalAssets,
    previousTotalAssets,
    revenue,
    previousRevenue,
    currentReceivables,
    previousReceivables,
    receivablesGrowth: inputReceivablesGrowth,
    revenueGrowth: inputRevenueGrowth
  } = financials;

  let cashAccruals = null;
  let accrualRatio = null;
  let cashConversionRate = null;
  let fcfConversionRate = null;
  let cfoToNi = null;
  let fcfToNi = null;
  let workingCapitalWarning = false;
  let avgAssets = null;
  let computedRevenueGrowth = null;
  let computedReceivablesGrowth = null;
  let receivablesGrowthGap = null;

  // 1. Cash Flow Accrual: Net Income - CFO
  if (typeof netIncome === 'number' && Number.isFinite(netIncome) && typeof cfo === 'number' && Number.isFinite(cfo)) {
    cashAccruals = netIncome - cfo;
  }

  // 2. Average Total Assets & Accrual Ratio: (Net Income - CFO) / Average Total Assets
  if (typeof totalAssets === 'number' && Number.isFinite(totalAssets) && totalAssets > 0) {
    if (typeof previousTotalAssets === 'number' && Number.isFinite(previousTotalAssets) && previousTotalAssets > 0) {
      avgAssets = (totalAssets + previousTotalAssets) / 2.0;
    } else {
      avgAssets = totalAssets;
    }
    if (cashAccruals !== null && avgAssets > 0) {
      accrualRatio = cashAccruals / avgAssets;
    }
  }

  // 3. CFO Conversion: CFO / Net Income (Valid only when Net Income > 0)
  if (typeof cfo === 'number' && Number.isFinite(cfo) && typeof netIncome === 'number' && Number.isFinite(netIncome)) {
    if (netIncome > 0) {
      cfoToNi = cfo / netIncome;
    }
  }

  // 4. FCF Conversion: FCF / Net Income (Valid only when Net Income > 0)
  if (typeof fcf === 'number' && Number.isFinite(fcf) && typeof netIncome === 'number' && Number.isFinite(netIncome)) {
    if (netIncome > 0) {
      fcfToNi = fcf / netIncome;
    }
  }

  // 5. Cash Conversion vs EBITDA
  if (typeof cfo === 'number' && Number.isFinite(cfo) && typeof ebitda === 'number' && Number.isFinite(ebitda) && ebitda > 0) {
    cashConversionRate = cfo / ebitda;
  }

  // 6. Dimensionally Valid Growth-Rate Gap:
  // RevenueGrowth = (Revenue_t - Revenue_{t-1}) / |Revenue_{t-1}|
  // ReceivablesGrowth = (Receivables_t - Receivables_{t-1}) / |Receivables_{t-1}|
  if (typeof revenue === 'number' && typeof previousRevenue === 'number' && Number.isFinite(revenue) && Number.isFinite(previousRevenue) && previousRevenue !== 0) {
    computedRevenueGrowth = (revenue - previousRevenue) / Math.abs(previousRevenue);
  } else if (typeof inputRevenueGrowth === 'number' && Number.isFinite(inputRevenueGrowth)) {
    computedRevenueGrowth = inputRevenueGrowth;
  }

  if (typeof currentReceivables === 'number' && typeof previousReceivables === 'number' && Number.isFinite(currentReceivables) && Number.isFinite(previousReceivables) && previousReceivables !== 0) {
    computedReceivablesGrowth = (currentReceivables - previousReceivables) / Math.abs(previousReceivables);
  } else if (typeof inputReceivablesGrowth === 'number' && Number.isFinite(inputReceivablesGrowth)) {
    computedReceivablesGrowth = inputReceivablesGrowth;
  }

  if (computedRevenueGrowth !== null && computedReceivablesGrowth !== null) {
    receivablesGrowthGap = computedReceivablesGrowth - computedRevenueGrowth;
    if (receivablesGrowthGap > (EARNINGS_CONFIG.RECEIVABLES_GAP_BENIGN_THRESHOLD || 0.05)) {
      workingCapitalWarning = true;
    }
  }

  let qualityGrade = 'HIGH';
  const flags = [];

  if (accrualRatio !== null && accrualRatio > EARNINGS_CONFIG.ACCRUAL_RATIO_WARNING_THRESHOLD) {
    flags.push('HIGH_ACCRUALS_RELATIVE_TO_EARNINGS');
    qualityGrade = 'MEDIUM';
  }

  if (cfoToNi !== null && cfoToNi < EARNINGS_CONFIG.CFO_TO_NET_INCOME_MIN_HEALTHY) {
    flags.push('LOW_CASH_CONVERSION_VS_NET_INCOME');
    qualityGrade = 'LOW';
  }

  if (cashConversionRate !== null && cashConversionRate < EARNINGS_CONFIG.CFO_TO_NET_INCOME_MIN_HEALTHY) {
    flags.push('LOW_CASH_CONVERSION_VS_EBITDA');
    qualityGrade = 'LOW';
  }

  if (receivablesGrowthGap !== null) {
    if (receivablesGrowthGap > (EARNINGS_CONFIG.RECEIVABLES_GAP_SEVERE_THRESHOLD || 0.25)) {
      flags.push('RECEIVABLES_SEVERE_DIVERGENCE');
      if (!flags.includes('RECEIVABLES_OUTPACING_REVENUE_GROWTH')) {
        flags.push('RECEIVABLES_OUTPACING_REVENUE_GROWTH');
      }
      qualityGrade = 'LOW';
    } else if (receivablesGrowthGap > (EARNINGS_CONFIG.RECEIVABLES_GAP_BENIGN_THRESHOLD || 0.05)) {
      if (!flags.includes('RECEIVABLES_OUTPACING_REVENUE_GROWTH')) {
        flags.push('RECEIVABLES_OUTPACING_REVENUE_GROWTH');
      }
      if (qualityGrade === 'HIGH') qualityGrade = 'MEDIUM';
    }
  }

  let qualityScore = 85;
  if (qualityGrade === 'MEDIUM') qualityScore = 65;
  if (qualityGrade === 'LOW') qualityScore = 40;

  return Object.freeze({
    cashAccruals: cashAccruals !== null ? cashAccruals : 'UNAVAILABLE',
    accrualRatio: accrualRatio !== null ? accrualRatio : 'UNAVAILABLE',
    averageTotalAssets: avgAssets !== null ? avgAssets : 'UNAVAILABLE',
    cashConversionRate: cashConversionRate !== null ? cashConversionRate : 'UNAVAILABLE',
    fcfConversionRate: fcfToNi !== null ? fcfToNi : 'UNAVAILABLE',
    cfoToNiRatio: cfoToNi !== null ? cfoToNi : null,
    fcfToNiRatio: fcfToNi !== null ? fcfToNi : null,
    revenueGrowth: computedRevenueGrowth !== null ? computedRevenueGrowth : 'UNAVAILABLE',
    receivablesGrowth: computedReceivablesGrowth !== null ? computedReceivablesGrowth : 'UNAVAILABLE',
    receivablesGrowthGap: receivablesGrowthGap !== null ? receivablesGrowthGap : 'UNAVAILABLE',
    cfoToNiStatus: (typeof netIncome === 'number' && netIncome <= 0) ? 'UNAVAILABLE_NON_POSITIVE_NET_INCOME' : (cfoToNi !== null ? 'VALID' : 'UNAVAILABLE_MISSING_DATA'),
    fcfToNiStatus: (typeof netIncome === 'number' && netIncome <= 0) ? 'UNAVAILABLE_NON_POSITIVE_NET_INCOME' : (fcfToNi !== null ? 'VALID' : 'UNAVAILABLE_MISSING_DATA'),
    qualityGrade,
    qualityScore,
    qualityTier: qualityGrade,
    flags,
    redFlags: flags,
    isHighQuality: qualityGrade === 'HIGH',
    totalAccruals: cashAccruals,
    accrualAnomaly: flags.length > 0,
    methodology: 'Cash Accrual & Earnings Quality Analysis',
    classification: EventClassification.DERIVED
  });
}

export class EarningsQualityEngine {
  assessEarningsQuality(financials) {
    const norm = {
      netIncome: financials.netIncome,
      cfo: financials.operatingCashFlow !== undefined ? financials.operatingCashFlow : financials.cfo,
      ebitda: financials.ebitda !== undefined ? financials.ebitda : financials.operatingCashFlow,
      fcf: (financials.operatingCashFlow !== undefined && financials.capex !== undefined) ? (financials.operatingCashFlow - financials.capex) : financials.fcf,
      totalAssets: financials.totalAssets,
      previousTotalAssets: financials.previousTotalAssets,
      revenue: financials.revenue,
      receivablesGrowth: financials.receivablesGrowth,
      revenueGrowth: financials.revenueGrowth
    };
    return evaluateEarningsQuality(norm);
  }
}
