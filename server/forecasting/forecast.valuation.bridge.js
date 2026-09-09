/**
 * server/forecasting/forecast.valuation.bridge.js
 * 
 * Phase 20: Valuation Bridge Integration
 * Connects forward fundamental forecasts to DCF and multiple valuation models (P/E, EV/EBITDA, EV/Sales, P/FCF).
 * Preserves strict classification boundaries (inputClassification = FORECAST -> outputClassification = MODEL_ESTIMATE).
 */

import { ForecastClassification } from './forecast.types.js';

/**
 * Computes DCF valuation from forecasted multi-period Free Cash Flows.
 * 
 * @param {Array<Object>} fcfPeriods - Array of { year, fcf } from fundamental forecast
 * @param {Object} valuationParams - { wacc, terminalGrowthRate, netDebt, shares }
 * @returns {Object} DCF valuation outputs and implied price target
 */
export function computeDCFFromForecast(fcfPeriods, valuationParams = {}) {
  if (!Array.isArray(fcfPeriods) || fcfPeriods.length === 0) {
    throw new Error('fcfPeriods must be a non-empty array of forecasted cash flows');
  }

  const {
    wacc = 0.09, // 9% WACC
    terminalGrowthRate = 0.025, // 2.5% terminal growth
    netDebt = 0,
    shares = 1
  } = valuationParams;

  if (typeof wacc !== 'number' || !Number.isFinite(wacc) || wacc <= 0) {
    throw new Error(`Invalid WACC: ${wacc}. Must be a strictly positive number.`);
  }
  if (typeof terminalGrowthRate !== 'number' || !Number.isFinite(terminalGrowthRate)) {
    throw new Error(`Invalid terminalGrowthRate: ${terminalGrowthRate}.`);
  }
  if (wacc <= terminalGrowthRate) {
    throw new Error(`WACC (${wacc}) must be strictly greater than terminal growth rate (${terminalGrowthRate})`);
  }
  if (typeof shares !== 'number' || !Number.isFinite(shares) || shares <= 0) {
    throw new Error(`Invalid share count: ${shares}. Must be strictly positive.`);
  }

  let pvExplicitFCF = 0.0;
  const discountedCashFlows = [];

  for (const period of fcfPeriods) {
    const t = period.year;
    const fcf = period.fcf;
    const discountFactor = Math.pow(1 + wacc, t);
    const pv = fcf / discountFactor;

    pvExplicitFCF += pv;
    discountedCashFlows.push({
      year: t,
      fcf,
      discountFactor,
      presentValue: pv,
      classification: ForecastClassification.FORECAST
    });
  }

  const finalPeriod = fcfPeriods[fcfPeriods.length - 1];
  const finalFCF = finalPeriod.fcf;
  const N = finalPeriod.year;

  // Terminal value calculation via Gordon Growth Model
  const terminalFCF = finalFCF * (1 + terminalGrowthRate);
  const terminalValue = terminalFCF / (wacc - terminalGrowthRate);
  const pvTerminalValue = terminalValue / Math.pow(1 + wacc, N);

  const enterpriseValue = pvExplicitFCF + pvTerminalValue;
  const equityValue = enterpriseValue - netDebt;
  const impliedSharePrice = Math.max(0, equityValue / shares);

  return {
    model: 'FORECAST_LINKED_DCF',
    wacc,
    terminalGrowthRate,
    netDebt,
    shares,
    pvExplicitFCF,
    terminalValue,
    pvTerminalValue,
    enterpriseValue,
    equityValue,
    impliedSharePrice,
    discountedCashFlows,
    classification: ForecastClassification.MODEL_ESTIMATE,
    inputClassification: ForecastClassification.FORECAST
  };
}

/**
 * Computes Multiple-Linked target prices (Forward P/E, EV/EBITDA, EV/Sales, P/FCF).
 * Explicit EV to Equity Value Bridge:
 * - Enterprise Value Multiples (EV/EBITDA, EV/Sales): Equity Value = EV - Net Debt
 * - Equity Multiples (P/E, P/FCF): Direct Equity Value
 * - Implied Price = Equity Value / Shares
 */
export function computeMultipleValuationFromForecast(forecastMetrics, multipleParams = {}) {
  if (!forecastMetrics || typeof forecastMetrics !== 'object') {
    throw new Error('forecastMetrics object is required');
  }

  const {
    targetPE,
    targetEVToEBITDA,
    targetEVToSales,
    targetPToFCF,
    netDebt = 0,
    shares = 1
  } = multipleParams;

  if (typeof shares !== 'number' || !Number.isFinite(shares) || shares <= 0) {
    throw new Error(`Invalid share count: ${shares}. Must be strictly positive.`);
  }

  const results = {};

  // 1. Forward P/E Valuation
  if (typeof targetPE === 'number' && typeof forecastMetrics.forecastEPS === 'number') {
    const impliedPrice = forecastMetrics.forecastEPS * targetPE;
    const impliedEquity = impliedPrice * shares;
    results.peValuation = {
      metric: 'FORWARD_PE',
      forecastEPS: forecastMetrics.forecastEPS,
      targetPE,
      impliedEquityValue: impliedEquity,
      impliedPrice,
      classification: ForecastClassification.MODEL_ESTIMATE
    };
  }

  // 2. Forward EV/EBITDA Valuation
  if (typeof targetEVToEBITDA === 'number' && typeof forecastMetrics.forecastEBITDA === 'number') {
    const impliedEV = forecastMetrics.forecastEBITDA * targetEVToEBITDA;
    const impliedEquity = impliedEV - netDebt;
    results.evEbitdaValuation = {
      metric: 'FORWARD_EV_EBITDA',
      forecastEBITDA: forecastMetrics.forecastEBITDA,
      targetEVToEBITDA,
      netDebt,
      impliedEV,
      impliedEquityValue: impliedEquity,
      impliedPrice: Math.max(0, impliedEquity / shares),
      classification: ForecastClassification.MODEL_ESTIMATE
    };
  }

  // 3. Forward EV/Sales Valuation
  if (typeof targetEVToSales === 'number' && typeof forecastMetrics.forecastRevenue === 'number') {
    const impliedEV = forecastMetrics.forecastRevenue * targetEVToSales;
    const impliedEquity = impliedEV - netDebt;
    results.evSalesValuation = {
      metric: 'FORWARD_EV_SALES',
      forecastRevenue: forecastMetrics.forecastRevenue,
      targetEVToSales,
      netDebt,
      impliedEV,
      impliedEquityValue: impliedEquity,
      impliedPrice: Math.max(0, impliedEquity / shares),
      classification: ForecastClassification.MODEL_ESTIMATE
    };
  }

  // 4. Forward P/FCF Valuation
  if (typeof targetPToFCF === 'number' && typeof forecastMetrics.forecastFCF === 'number') {
    const impliedEquity = forecastMetrics.forecastFCF * targetPToFCF;
    results.pfcfValuation = {
      metric: 'FORWARD_P_FCF',
      forecastFCF: forecastMetrics.forecastFCF,
      targetPToFCF,
      impliedEquityValue: impliedEquity,
      impliedPrice: Math.max(0, impliedEquity / shares),
      classification: ForecastClassification.MODEL_ESTIMATE
    };
  }

  return {
    model: 'FORECAST_LINKED_MULTIPLES',
    shares,
    netDebt,
    valuations: results,
    classification: ForecastClassification.MODEL_ESTIMATE,
    inputClassification: ForecastClassification.FORECAST
  };
}
