/**
 * server/earnings/earnings.valuation.bridge.js
 * 
 * Phase 21: Earnings-to-Valuation Bridge Integration
 * Evaluates valuation shifts (DCF and Multiple-based) driven by earnings surprises and forecast revisions.
 * Preserves strict classification hierarchy: REAL_DATA -> FORECAST -> MODEL_ESTIMATE.
 */

import { EventClassification } from './earnings.types.js';
import { computeDCFFromForecast, computeMultipleValuationFromForecast } from '../forecasting/forecast.valuation.bridge.js';

export function evaluateEarningsValuationImpact(revisedForecastResult, valuationParams = {}) {
  if (!revisedForecastResult || !revisedForecastResult.revisedOutput) {
    throw new Error('Valid revisedForecastResult with revisedOutput required');
  }

  const periods = revisedForecastResult.revisedOutput.periods || [];
  const finalPeriod = periods.length > 0 ? periods[periods.length - 1] : {};

  // DCF Valuation
  const dcfValuation = computeDCFFromForecast(periods, valuationParams);

  // Multiples Valuation
  const multiplesValuation = computeMultipleValuationFromForecast({
    forecastEPS: finalPeriod.eps,
    forecastEBITDA: finalPeriod.ebitda,
    forecastRevenue: finalPeriod.revenue,
    forecastFCF: finalPeriod.fcf
  }, valuationParams);

  return {
    ticker: revisedForecastResult.ticker,
    previousForecastValue: revisedForecastResult.previousValue,
    revisedForecastValue: revisedForecastResult.revisedValue,
    dcf: dcfValuation,
    multiples: multiplesValuation,
    valuationChain: {
      inputClassification: EventClassification.FORECAST,
      outputClassification: EventClassification.MODEL_ESTIMATE,
      rule: 'OBSERVED_EARNINGS_NEVER_COLLAPSE_INTO_VALUATION_FACTS'
    },
    classification: EventClassification.MODEL_ESTIMATE
  };
}
