import crypto from 'crypto';

/**
 * Phase 28 — Institutional Alpha Attribution & Signal Performance Taxonomy
 */

export const AttributionStatus = Object.freeze({
  OBSERVED: 'OBSERVED',
  DERIVED: 'DERIVED',
  MODELLED: 'MODELLED',
  ATTRIBUTED: 'ATTRIBUTED',
  INSUFFICIENT_EVIDENCE: 'INSUFFICIENT_EVIDENCE',
  CONFLICTED: 'CONFLICTED',
  REJECTED: 'REJECTED',
  UNAVAILABLE: 'UNAVAILABLE'
});

export const SignalEngagementLevel = Object.freeze({
  SIGNAL_AVAILABLE: 'SIGNAL_AVAILABLE',
  SIGNAL_CONSIDERED: 'SIGNAL_CONSIDERED',
  SIGNAL_REFERENCED: 'SIGNAL_REFERENCED',
  SIGNAL_INFLUENTIAL: 'SIGNAL_INFLUENTIAL',
  SIGNAL_ACTIONED: 'SIGNAL_ACTIONED'
});

export const AttributionConfidenceLevel = Object.freeze({
  HIGH_CONFIDENCE: 'HIGH_CONFIDENCE',
  MEDIUM_CONFIDENCE: 'MEDIUM_CONFIDENCE',
  LOW_CONFIDENCE: 'LOW_CONFIDENCE',
  UNAVAILABLE: 'UNAVAILABLE'
});

export const EvaluationPeriodType = Object.freeze({
  IN_SAMPLE: 'IN_SAMPLE',
  OUT_OF_SAMPLE: 'OUT_OF_SAMPLE',
  WALK_FORWARD: 'WALK_FORWARD',
  LIVE_PAPER: 'LIVE_PAPER',
  LIVE_REALIZED: 'LIVE_REALIZED'
});

export const PerformanceTrend = Object.freeze({
  PERFORMANCE_DECAY: 'PERFORMANCE_DECAY',
  PERFORMANCE_STABILITY: 'PERFORMANCE_STABILITY',
  PERFORMANCE_IMPROVEMENT: 'PERFORMANCE_IMPROVEMENT',
  REGIME_DEPENDENCE: 'REGIME_DEPENDENCE'
});

export const EffectType = Object.freeze({
  THESIS_EFFECT: 'THESIS_EFFECT',
  SIGNAL_EFFECT: 'SIGNAL_EFFECT',
  ALLOCATION_EFFECT: 'ALLOCATION_EFFECT',
  SELECTION_EFFECT: 'SELECTION_EFFECT',
  INTERACTION_EFFECT: 'INTERACTION_EFFECT',
  TIMING_EFFECT: 'TIMING_EFFECT',
  SIZING_EFFECT: 'SIZING_EFFECT',
  IMPLEMENTATION_EFFECT: 'IMPLEMENTATION_EFFECT',
  TRANSACTION_COST_EFFECT: 'TRANSACTION_COST_EFFECT',
  LIQUIDITY_EFFECT: 'LIQUIDITY_EFFECT',
  TAX_EFFECT: 'TAX_EFFECT',
  FX_EFFECT: 'FX_EFFECT',
  RESIDUAL_EFFECT: 'RESIDUAL_EFFECT'
});

export const SurvivorshipRisk = Object.freeze({
  LOW: 'LOW',
  MODERATE: 'MODERATE',
  HIGH: 'HIGH',
  UNCONTROLLED: 'UNCONTROLLED'
});

export const CounterfactualType = Object.freeze({
  PORTFOLIO_WITHOUT_SIGNAL: 'PORTFOLIO_WITHOUT_SIGNAL',
  DECISION_WITHOUT_SIGNAL: 'DECISION_WITHOUT_SIGNAL',
  ACTUAL_VS_BENCHMARK_POSITION: 'ACTUAL_VS_BENCHMARK_POSITION',
  ACTUAL_VS_TARGET_IMPLEMENTATION: 'ACTUAL_VS_TARGET_IMPLEMENTATION'
});

export const SampleTier = Object.freeze({
  INSUFFICIENT_SAMPLE: 'INSUFFICIENT_SAMPLE', // N < 10
  LOW_SAMPLE: 'LOW_SAMPLE',                   // 10 <= N < 30
  EVALUABLE: 'EVALUABLE'                      // N >= 30
});

/**
 * Deep Freeze helper
 */
export function deepFreeze(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  Object.freeze(obj);
  Object.getOwnPropertyNames(obj).forEach(prop => {
    if (obj[prop] !== null && (typeof obj[prop] === 'object' || typeof obj[prop] === 'function') && !Object.isFrozen(obj[prop])) {
      deepFreeze(obj[prop]);
    }
  });
  return obj;
}

/**
 * Canonical Deterministic SHA-256 Hashing
 */
export function computeAttributionHash(obj) {
  const normalize = (val) => {
    if (val === null || val === undefined) return null;
    if (typeof val !== 'object') return val;
    if (Array.isArray(val)) return val.map(normalize);
    const sorted = {};
    Object.keys(val).sort().forEach(k => {
      // Exclude volatile timestamps or internal fields from hashing
      if (k === 'verifiedAt') return;
      sorted[k] = normalize(val[k]);
    });
    return sorted;
  };
  const json = JSON.stringify(normalize(obj));
  return crypto.createHash('sha256').update(json).digest('hex');
}
