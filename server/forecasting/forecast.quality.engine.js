/**
 * server/forecasting/forecast.quality.engine.js
 * 
 * Phase 20: Forecast Quality & Staleness Engine
 * Evaluates forecast quality, evidence coverage, and freshness lifecycle states.
 */

import { ForecastFreshnessStatus, ForecastClassification } from './forecast.types.js';
import { FORECAST_CONFIG } from './forecast.config.js';

/**
 * Computes the freshness lifecycle status of a forecast.
 * 
 * @param {string} createdAtIso - Creation timestamp
 * @param {string} asOfIso - Current reference date
 * @returns {Object} Freshness status and age in days
 */
export function evaluateForecastFreshness(createdAtIso, asOfIso = new Date().toISOString()) {
  if (!createdAtIso) {
    return { freshnessStatus: ForecastFreshnessStatus.EXPIRED, ageDays: null };
  }

  const createdTime = new Date(createdAtIso).getTime();
  const asOfTime = new Date(asOfIso).getTime();
  const diffDays = Math.max(0, Math.floor((asOfTime - createdTime) / (1000 * 60 * 60 * 24)));

  let status = ForecastFreshnessStatus.CURRENT;
  if (diffDays > FORECAST_CONFIG.STALENESS.STALE_MAX_DAYS) {
    status = ForecastFreshnessStatus.EXPIRED;
  } else if (diffDays > FORECAST_CONFIG.STALENESS.AGING_MAX_DAYS) {
    status = ForecastFreshnessStatus.STALE;
  } else if (diffDays > FORECAST_CONFIG.STALENESS.CURRENT_MAX_DAYS) {
    status = ForecastFreshnessStatus.AGING;
  }

  return {
    freshnessStatus: status,
    ageDays: diffDays,
    createdAt: createdAtIso,
    asOf: asOfIso
  };
}

/**
 * Computes deterministic Forecast Quality Score (0 - 100).
 * 
 * @param {Object} forecastRecord
 * @returns {Object} Total score and component breakdown
 */
export function computeForecastQualityScore(forecastRecord) {
  if (!forecastRecord || typeof forecastRecord !== 'object') {
    throw new Error('forecastRecord must be a valid object');
  }

  // 1. Evidence Coverage Component (0 to 30 pts)
  const evidenceCount = Array.isArray(forecastRecord.baselineEvidenceIds) ? forecastRecord.baselineEvidenceIds.length : 1;
  const evidenceComponent = Math.min(30, evidenceCount * 10);

  // 2. Assumption Explicitness Component (0 to 25 pts)
  const assumptionsCount = Array.isArray(forecastRecord.assumptions) ? forecastRecord.assumptions.length : (forecastRecord.assumptions ? Object.keys(forecastRecord.assumptions).length : 0);
  const assumptionComponent = Math.min(25, assumptionsCount * 5);

  // 3. Uncertainty / Confidence Component (0 to 20 pts)
  const hasUncertainty = forecastRecord.uncertainty && typeof forecastRecord.uncertainty.lowerBound95 === 'number';
  const uncertaintyComponent = hasUncertainty ? 20 : 5;

  // 4. Freshness Component (0 to 25 pts)
  const freshness = evaluateForecastFreshness(forecastRecord.createdAt);
  let freshnessComponent = 0;
  if (freshness.freshnessStatus === ForecastFreshnessStatus.CURRENT) freshnessComponent = 25;
  else if (freshness.freshnessStatus === ForecastFreshnessStatus.AGING) freshnessComponent = 18;
  else if (freshness.freshnessStatus === ForecastFreshnessStatus.STALE) freshnessComponent = 8;
  else freshnessComponent = 0;

  const totalScore = evidenceComponent + assumptionComponent + uncertaintyComponent + freshnessComponent;

  return {
    totalQualityScore: totalScore,
    qualityRating: totalScore >= 80 ? 'HIGH' : (totalScore >= 60 ? 'MODERATE' : 'LOW'),
    components: {
      evidenceCoverage: { score: evidenceComponent, max: 30 },
      assumptionExplicitness: { score: assumptionComponent, max: 25 },
      uncertaintyRigor: { score: uncertaintyComponent, max: 20 },
      freshness: { score: freshnessComponent, max: 25, ageDays: freshness.ageDays, status: freshness.freshnessStatus }
    },
    classification: ForecastClassification.DERIVED
  };
}
