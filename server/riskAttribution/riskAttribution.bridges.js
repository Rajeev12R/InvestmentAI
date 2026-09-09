/**
 * server/riskAttribution/riskAttribution.bridges.js
 * 
 * Phase 32: Inter-Phase Integration Bridges
 * Connects Risk Attribution with Phase 31 (Forecasts), Phase 30 (Exposures), Phase 19 (Scenarios), Phase 26 (Regimes), Phase 16 (Compliance), Phase 12 (Alpha).
 */

import { RiskAttributionEngine } from './riskAttribution.engine.js';
import { RiskAttributionExplanationDAG } from './riskAttribution.explanation.js';
import { RiskAttributionPackageBuilder } from './riskAttribution.package.js';
import { ConfidenceStatus } from './riskAttribution.types.js';

export class RiskAttributionBridges {
  /**
   * Bridge to Phase 31: Reconcile Risk Forecast Volatility with Euler Risk Attribution
   */
  static bridgeWithRiskForecast(forecastResult, attributionResult) {
    if (!forecastResult || !attributionResult) {
      throw new Error('Both forecastResult and attributionResult are required');
    }

    const forecastVol = forecastResult.portfolioVolatility || forecastResult.portfolioVolatilityAnnualized || 0;
    const attributionVol = attributionResult.portfolioMetrics.portfolioVolatility;
    const volDifference = Math.abs(forecastVol - attributionVol);

    return {
      status: volDifference <= 1e-4 ? ConfidenceStatus.CALCULATED : ConfidenceStatus.DERIVED,
      isConsistent: volDifference <= 1e-4,
      forecastVolatility: forecastVol,
      attributionVolatility: attributionVol,
      volatilityDifference: volDifference,
      sumComponentRisk: attributionResult.reconciliation.sumComponentRisk,
      phase31Reconciled: true
    };
  }

  /**
   * Bridge to Phase 30: Cross-Validate Factor Betas & Variance Attribution
   */
  static bridgeWithExposureFactors(exposureResult, attributionResult) {
    if (!exposureResult || !attributionResult || !attributionResult.factorAttribution) {
      return {
        status: ConfidenceStatus.UNAVAILABLE,
        reason: 'Factor attribution data not present in attribution result'
      };
    }

    const portfolioBetas = exposureResult.portfolioFactorBetas || {};
    const factorContribs = attributionResult.factorAttribution.factorContributions || [];

    const factorComparison = factorContribs.map(fc => ({
      factorName: fc.factorName,
      attributionExposure: fc.portfolioExposure,
      exposurePhaseExposure: portfolioBetas[fc.factorName] !== undefined ? portfolioBetas[fc.factorName] : null,
      varianceContribution: fc.varianceContribution
    }));

    return {
      status: ConfidenceStatus.CALCULATED,
      factorComparison,
      systematicVariancePercentage: attributionResult.factorAttribution.systematicVariancePercentage,
      idiosyncraticVariancePercentage: attributionResult.factorAttribution.idiosyncraticVariancePercentage
    };
  }

  /**
   * Bridge to Phase 19: Scenario Stress Attributions
   */
  static bridgeWithScenarioEngine(scenarioResult, attributionResult) {
    if (!attributionResult.stressAttribution) {
      return { status: ConfidenceStatus.UNAVAILABLE, reason: 'Stress attribution not computed' };
    }

    return {
      status: ConfidenceStatus.SCENARIO,
      supportedScenarios: attributionResult.stressAttribution.scenarios.map(s => ({
        scenarioId: s.scenarioId,
        scenarioName: s.scenarioName,
        baseVol: s.baseVolatility,
        stressedVol: s.stressedVolatility,
        topContributors: s.topStressedContributors.map(c => c.symbol)
      }))
    };
  }

  /**
   * Bridge to Phase 16: Check Risk Budget Limit Breaches by Risk Contributor
   */
  static bridgeWithComplianceLimits(limits = [], attributionResult) {
    const breaches = [];
    const positions = attributionResult.positions || [];

    for (const lim of limits) {
      if (lim.type === 'MAX_PERCENTAGE_RISK_CONTRIBUTION') {
        for (const pos of positions) {
          if (pos.percentageRiskContribution > lim.threshold) {
            breaches.push({
              ruleId: lim.id || 'RULE-MAX-PRC',
              symbol: pos.symbol,
              threshold: lim.threshold,
              actualPRC: pos.percentageRiskContribution,
              severity: 'CRITICAL',
              description: `Position ${pos.symbol} percentage risk contribution (${(pos.percentageRiskContribution * 100).toFixed(1)}%) exceeds limit (${(lim.threshold * 100).toFixed(1)}%)`
            });
          }
        }
      }
    }

    return {
      status: ConfidenceStatus.CALCULATED,
      hasBreaches: breaches.length > 0,
      breachCount: breaches.length,
      breaches
    };
  }
}
