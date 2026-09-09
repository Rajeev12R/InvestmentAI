/**
 * server/forecasting/forecast.engine.js
 * 
 * Phase 20: Master Institutional Forecasting Engine
 * Orchestrator for trend, fundamental, consensus, valuation, and multi-case (Base/Bull/Bear) forward models.
 */

import { ForecastClassification, ForecastMethod, ForecastHorizon, ForecastCase, canonicalHash, deepFreeze } from './forecast.types.js';
import { validateForecastRequest } from './forecast.schema.js';
import { forecastCAGR, forecastLinearTrend, forecastRollingAverage } from './forecast.trend.engine.js';
import { forecastFundamentalStatements } from './forecast.fundamental.engine.js';
import { defaultConsensusEngine } from './forecast.consensus.engine.js';
import { computeDCFFromForecast, computeMultipleValuationFromForecast } from './forecast.valuation.bridge.js';
import { aggregatePortfolioForecast } from './forecast.portfolio.engine.js';
import { defaultRevisionEngine } from './forecast.revisions.engine.js';
import { computeForecastQualityScore } from './forecast.quality.engine.js';
import { FORECAST_CONFIG } from './forecast.config.js';

export class ForecastEngine {
  constructor(config = {}) {
    this.config = { ...FORECAST_CONFIG, ...config };
    this.consensusEngine = defaultConsensusEngine;
    this.revisionEngine = defaultRevisionEngine;
  }

  /**
   * Generates a single-security forecast
   */
  generateForecast(request, options = {}) {
    validateForecastRequest(request);

    const {
      ticker,
      metric,
      method,
      horizon = ForecastHorizon.HORIZON_1Y,
      historicalSeries,
      baseFinancials,
      drivers = {},
      baselineEvidenceIds = [],
      forecastCase = ForecastCase.BASE
    } = request;

    const horizonYears = parseInt(horizon.replace('Y', ''), 10) || 1;
    let result;

    switch (method) {
      case ForecastMethod.HISTORICAL_CAGR:
        result = forecastCAGR(historicalSeries, horizonYears);
        break;

      case ForecastMethod.LINEAR_TREND:
        result = forecastLinearTrend(historicalSeries, horizonYears);
        break;

      case ForecastMethod.ROLLING_MARGIN:
        result = forecastRollingAverage(historicalSeries, horizonYears);
        break;

      case ForecastMethod.FUNDAMENTAL_INTEGRATED:
        result = forecastFundamentalStatements(baseFinancials, drivers, horizonYears);
        break;

      default:
        throw new Error(`Unsupported forecasting method: ${method}`);
    }

    const now = new Date().toISOString();
    const forecastId = `FCST-${ticker}-${metric}-${now.slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const forecastRecord = {
      forecastId,
      ticker,
      metric: metric.toUpperCase(),
      method,
      horizon,
      forecastCase,
      createdAt: now,
      baselineEvidenceIds,
      assumptions: drivers,
      output: result,
      value: result.forecastValue !== undefined ? result.forecastValue : (result.summary?.finalYearRevenue || null),
      uncertainty: result.uncertainty || null,
      classification: ForecastClassification.FORECAST,
      engineVersion: this.config.ENGINE_VERSION
    };

    // Quality scoring
    forecastRecord.quality = computeForecastQualityScore(forecastRecord);

    // Canonical hash
    forecastRecord.canonicalHash = canonicalHash({
      ticker: forecastRecord.ticker,
      metric: forecastRecord.metric,
      method: forecastRecord.method,
      horizon: forecastRecord.horizon,
      value: forecastRecord.value,
      assumptions: forecastRecord.assumptions,
      createdAt: forecastRecord.createdAt
    });

    return deepFreeze(forecastRecord);
  }

  /**
   * Generates Multi-Case (Base, Bull, Bear) fundamental forecasts
   */
  generateMultiCaseForecast(baseFinancials, caseDrivers, horizonYears = 3) {
    const baseResult = forecastFundamentalStatements(baseFinancials, caseDrivers.base || {}, horizonYears);
    const bullResult = forecastFundamentalStatements(baseFinancials, caseDrivers.bull || { revenueGrowthRate: 0.15, operatingMargin: 0.32 }, horizonYears);
    const bearResult = forecastFundamentalStatements(baseFinancials, caseDrivers.bear || { revenueGrowthRate: 0.02, operatingMargin: 0.18 }, horizonYears);

    return {
      ticker: baseFinancials.ticker || 'UNKNOWN',
      horizonYears,
      cases: {
        BASE: { ...baseResult, forecastCase: ForecastCase.BASE },
        BULL: { ...bullResult, forecastCase: ForecastCase.BULL },
        BEAR: { ...bearResult, forecastCase: ForecastCase.BEAR }
      },
      comparison: {
        revenueSpreadDollar: bullResult.summary.finalYearRevenue - bearResult.summary.finalYearRevenue,
        epsSpreadDollar: bullResult.summary.finalYearEPS - bearResult.summary.finalYearEPS,
        fcfSpreadDollar: bullResult.summary.finalYearFCF - bearResult.summary.finalYearFCF
      },
      classification: ForecastClassification.FORECAST
    };
  }

  /**
   * Valuation-linked forecast valuation
   */
  evaluateForecastValuation(fundamentalForecastResult, valuationParams = {}) {
    const periods = fundamentalForecastResult.periods || [];
    const dcf = computeDCFFromForecast(periods, valuationParams);
    
    const finalPeriod = periods.length > 0 ? periods[periods.length - 1] : {};
    const forecastEPS = fundamentalForecastResult.summary?.finalYearEPS !== undefined 
      ? fundamentalForecastResult.summary.finalYearEPS 
      : finalPeriod.eps;
    const forecastEBITDA = finalPeriod.ebitda;
    const forecastRevenue = fundamentalForecastResult.summary?.finalYearRevenue !== undefined 
      ? fundamentalForecastResult.summary.finalYearRevenue 
      : finalPeriod.revenue;
    const forecastFCF = finalPeriod.fcf;

    const multiples = computeMultipleValuationFromForecast({
      forecastEPS,
      forecastEBITDA,
      forecastRevenue,
      forecastFCF
    }, valuationParams);

    return {
      dcf,
      multiples,
      classification: ForecastClassification.MODEL_ESTIMATE,
      inputClassification: ForecastClassification.FORECAST
    };
  }

  /**
   * Portfolio-level forward expectations aggregation
   */
  evaluatePortfolioForecast(portfolio) {
    return aggregatePortfolioForecast(portfolio);
  }
}

export const defaultForecastEngine = new ForecastEngine();
