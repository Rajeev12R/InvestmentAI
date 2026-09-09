/**
 * @file attention.scoring.js
 * Deterministic scoring engine for Phase 7 Attention Intelligence.
 * Produces an additive, fully transparent attention score with exact component breakdown.
 */

import { ATTENTION_THRESHOLDS } from './attentionThresholds.js';
import { AttentionPriority } from './attention.types.js';

/**
 * Calculates deterministic attention score and component breakdown.
 * @param {Object} params
 * @param {string} [params.previousDecision]
 * @param {string} [params.currentDecision]
 * @param {string} [params.thesisBreakerStatus] 'TRIGGERED' | 'APPROACHING' | 'STABLE' | 'UNKNOWN'
 * @param {number} [params.valuationDriftPct] Absolute or signed drift %
 * @param {string} [params.riskDriftSeverity] 'CRITICAL' | 'HIGH' | 'MODERATE' | 'STABLE' | 'IMPROVED'
 * @param {string} [params.eventMateriality] 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'
 * @param {number} [params.portfolioWeight] Decimal portfolio weight (e.g. 0.35)
 * @param {string|Date} [params.detectedAt] ISO string or Date
 * @param {number} [params.confidence] 0.0 to 1.0 confidence
 * @returns {{ totalScore: number, priority: string, components: Object }}
 */
export function calculateAttentionScore({
  previousDecision,
  currentDecision,
  thesisBreakerStatus,
  valuationDriftPct,
  riskDriftSeverity,
  eventMateriality,
  portfolioWeight,
  detectedAt,
  confidence
}) {
  const components = {
    decisionChange: 0,
    thesisBreaker: 0,
    valuationDrift: 0,
    riskDrift: 0,
    eventMateriality: 0,
    portfolioExposure: 0,
    recency: 0,
    confidence: 0
  };

  // 1. Decision Change Contribution
  if (previousDecision && currentDecision && previousDecision !== currentDecision) {
    const key = `${previousDecision.toUpperCase()}_TO_${currentDecision.toUpperCase()}`;
    const score = ATTENTION_THRESHOLDS.DECISION_CHANGE_SCORES[key] !== undefined
      ? ATTENTION_THRESHOLDS.DECISION_CHANGE_SCORES[key]
      : ATTENTION_THRESHOLDS.DECISION_CHANGE_SCORES.DEFAULT_CHANGE;
    components.decisionChange = Math.min(score, ATTENTION_THRESHOLDS.SCORING_WEIGHTS.DECISION_CHANGE_MAX);
  }

  // 2. Thesis Breaker Contribution
  if (thesisBreakerStatus) {
    const statusKey = String(thesisBreakerStatus).toUpperCase();
    const score = ATTENTION_THRESHOLDS.THESIS_BREAKER_SCORES[statusKey] || 0;
    components.thesisBreaker = Math.min(score, ATTENTION_THRESHOLDS.SCORING_WEIGHTS.THESIS_BREAKER_MAX);
  }

  // 3. Valuation Drift Contribution
  if (typeof valuationDriftPct === 'number' && !isNaN(valuationDriftPct)) {
    const absDrift = Math.abs(valuationDriftPct);
    let vScore = 0;
    if (absDrift >= ATTENTION_THRESHOLDS.VALUATION_DRIFT_THRESHOLDS.MATERIAL_PCT) {
      vScore = 20;
    } else if (absDrift >= ATTENTION_THRESHOLDS.VALUATION_DRIFT_THRESHOLDS.SIGNIFICANT_PCT) {
      vScore = 12;
    } else if (absDrift > 0) {
      vScore = Math.round((absDrift / ATTENTION_THRESHOLDS.VALUATION_DRIFT_THRESHOLDS.SIGNIFICANT_PCT) * 8);
    }
    components.valuationDrift = Math.min(vScore, ATTENTION_THRESHOLDS.SCORING_WEIGHTS.VALUATION_DRIFT_MAX);
  }

  // 4. Risk Drift Contribution
  if (riskDriftSeverity) {
    const rKey = String(riskDriftSeverity).toUpperCase();
    let rScore = 0;
    if (rKey.includes('CRITICAL')) rScore = ATTENTION_THRESHOLDS.RISK_DRIFT_SCORES.CRITICAL_ELEVATION;
    else if (rKey.includes('HIGH')) rScore = ATTENTION_THRESHOLDS.RISK_DRIFT_SCORES.HIGH_ELEVATION;
    else if (rKey.includes('MODERATE') || rKey.includes('DETERIORAT')) rScore = ATTENTION_THRESHOLDS.RISK_DRIFT_SCORES.MODERATE_ELEVATION;
    else if (rKey.includes('IMPROV')) rScore = ATTENTION_THRESHOLDS.RISK_DRIFT_SCORES.IMPROVING;
    components.riskDrift = Math.min(rScore, ATTENTION_THRESHOLDS.SCORING_WEIGHTS.RISK_DRIFT_MAX);
  }

  // 5. Event Materiality Contribution
  if (eventMateriality) {
    const eKey = String(eventMateriality).toUpperCase();
    const eScore = ATTENTION_THRESHOLDS.EVENT_MATERIALITY_SCORES[eKey] || 0;
    components.eventMateriality = Math.min(eScore, ATTENTION_THRESHOLDS.SCORING_WEIGHTS.EVENT_MATERIALITY_MAX);
  }

  // 6. Portfolio Exposure Contribution
  if (typeof portfolioWeight === 'number' && !isNaN(portfolioWeight) && portfolioWeight > 0) {
    // Scaling up to 10 points for large exposures (e.g. 30%+ weight = 10 pts)
    const weightScore = Math.min(10, Math.round(portfolioWeight * 30));
    components.portfolioExposure = Math.min(weightScore, ATTENTION_THRESHOLDS.SCORING_WEIGHTS.PORTFOLIO_EXPOSURE_MAX);
  }

  // 7. Recency Contribution
  if (detectedAt) {
    const eventTime = new Date(detectedAt).getTime();
    const now = Date.now();
    if (!isNaN(eventTime) && eventTime <= now) {
      const hoursAgo = Math.max(0, (now - eventTime) / (1000 * 60 * 60));
      const decay = Math.max(0, 1 - (hoursAgo / ATTENTION_THRESHOLDS.RECENCY_HALF_LIFE_HOURS));
      components.recency = Math.round(decay * ATTENTION_THRESHOLDS.SCORING_WEIGHTS.RECENCY_MAX);
    }
  }

  // 8. Confidence Contribution
  if (typeof confidence === 'number' && !isNaN(confidence)) {
    const boundedConfidence = Math.max(0, Math.min(1, confidence));
    components.confidence = Math.round(boundedConfidence * ATTENTION_THRESHOLDS.SCORING_WEIGHTS.CONFIDENCE_MAX);
  }

  // Compute Total Additive Score
  const totalScore = Object.values(components).reduce((sum, val) => sum + val, 0);

  // Map to Canonical Priority Level
  let priority = AttentionPriority.INFORMATIONAL;
  if (totalScore >= ATTENTION_THRESHOLDS.PRIORITY.CRITICAL) {
    priority = AttentionPriority.CRITICAL;
  } else if (totalScore >= ATTENTION_THRESHOLDS.PRIORITY.HIGH) {
    priority = AttentionPriority.HIGH;
  } else if (totalScore >= ATTENTION_THRESHOLDS.PRIORITY.MEDIUM) {
    priority = AttentionPriority.MEDIUM;
  } else if (totalScore >= ATTENTION_THRESHOLDS.PRIORITY.LOW) {
    priority = AttentionPriority.LOW;
  }

  return {
    totalScore,
    priority,
    components
  };
}
