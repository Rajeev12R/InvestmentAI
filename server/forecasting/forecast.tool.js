/**
 * server/forecasting/forecast.tool.js
 * 
 * Phase 20: Forecasting Intelligence Copilot Tool
 * Read-only tool bridge for AI Copilot to query forecasts, consensus, and explanations.
 * Strictly prevents truth injection, unauthorized mutations, or autonomous trade executions.
 */

import { defaultForecastEngine } from './forecast.engine.js';
import { generateForecastExplanation } from './forecast.explanation.js';
import { sealForecastPackage } from './forecast.package.js';
import { defaultAssumptionRegistry } from './forecast.assumptions.js';
import { defaultRevisionEngine } from './forecast.revisions.engine.js';
import { defaultForecastRepository } from './forecast.repository.js';

/**
 * Copilot tool execution function for forward-looking forecasting
 */
export async function executeForecastingTool(params) {
  const {
    tenantId = 'TENANT_DEFAULT',
    action = 'GENERATE_FORECAST',
    forecastId,
    forecastRequest,
    multiCaseRequest,
    consensusQuery,
    revisionQuery,
    options = {}
  } = params;

  // Reject unauthorized / hostile actions immediately
  if (action === 'INJECT_TRUTH_FACT' || action === 'MUTATE_TRUTH_LAYER') {
    throw new Error('Copilot tool cannot inject or mutate Truth Layer facts');
  }
  if (action === 'EXECUTE_TRADE' || action === 'EXECUTE_ORDER') {
    throw new Error('Copilot tool cannot execute trades or broker orders');
  }

  try {
    // 1. Get existing forecast
    if (action === 'GET_FORECAST') {
      const rec = defaultForecastRepository.getForecast(tenantId, forecastId);
      if (!rec) {
        return { success: false, error: `Forecast not found: ${forecastId}` };
      }
      return {
        success: true,
        type: 'GET_FORECAST',
        data: rec,
        disclaimer: 'Retrieved immutable forecast record.'
      };
    }

    // 2. Consensus comparison query
    if (action === 'QUERY_CONSENSUS' && consensusQuery) {
      const res = defaultForecastEngine.consensusEngine.compareInternalVsConsensus(
        consensusQuery.internalForecast || consensusQuery.internalValue,
        consensusQuery.ticker,
        consensusQuery.metric,
        consensusQuery.period
      );
      return {
        success: true,
        type: 'CONSENSUS_COMPARISON',
        data: res,
        disclaimer: 'External consensus estimates are DERIVED third-party data.'
      };
    }

    // 3. Revision history and attribution query
    if (action === 'QUERY_REVISIONS' && revisionQuery) {
      const history = defaultRevisionEngine.getVersionHistory(
        tenantId,
        revisionQuery.ticker,
        revisionQuery.metric,
        revisionQuery.period
      );
      let attribution = null;
      if (history.length >= 2) {
        attribution = defaultRevisionEngine.attributeRevision(history[history.length - 2], history[history.length - 1]);
      }
      return {
        success: true,
        type: 'REVISION_HISTORY',
        historyCount: history.length,
        history,
        latestRevisionAttribution: attribution
      };
    }

    // 4. Multi-Case (Base/Bull/Bear) Forecast
    if (action === 'GENERATE_MULTI_CASE' && multiCaseRequest) {
      const multiRes = defaultForecastEngine.generateMultiCaseForecast(
        multiCaseRequest.baseFinancials,
        multiCaseRequest.caseDrivers,
        multiCaseRequest.horizonYears || 3
      );
      return {
        success: true,
        type: 'MULTI_CASE_FORECAST',
        data: multiRes,
        disclaimer: 'FORWARD-LOOKING ESTIMATE — FORECAST. Not observed Truth facts.'
      };
    }

    // 5. Standard Forecast Generation
    if (!forecastRequest) {
      return {
        success: false,
        error: 'forecastRequest is required for forecast generation'
      };
    }

    const forecastRecord = defaultForecastEngine.generateForecast(forecastRequest, options);
    const explanation = generateForecastExplanation(forecastRecord);

    let sealedPkg = null;
    if (options.sealPackage) {
      sealedPkg = sealForecastPackage({
        tenantId,
        forecastRecord,
        assumptions: forecastRequest.drivers || forecastRequest.assumptions
      });
    }

    return {
      success: true,
      type: 'SECURITY_FORECAST',
      data: forecastRecord,
      explanation,
      sealedPackage: sealedPkg ? { sealId: sealedPkg.sealId, canonicalHash: sealedPkg.canonicalHash } : null,
      classification: 'FORECAST',
      disclaimer: 'FORWARD-LOOKING ESTIMATE — FORECAST. Not observed Truth Layer facts.'
    };
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
}

export const forecast_tool = executeForecastingTool;
