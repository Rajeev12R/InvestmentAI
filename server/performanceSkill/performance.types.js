import crypto from 'crypto';

/**
 * Phase 29 — Institutional Performance Measurement & Manager Skill Taxonomy
 */

export const SkillStatus = Object.freeze({
  OBSERVED_PERFORMANCE: 'OBSERVED_PERFORMANCE',
  ATTRIBUTED_PERFORMANCE: 'ATTRIBUTED_PERFORMANCE',
  RISK_ADJUSTED: 'RISK_ADJUSTED',
  FACTOR_ADJUSTED: 'FACTOR_ADJUSTED',
  SKILL_INDICATOR: 'SKILL_INDICATOR',
  SUPPORTED: 'SUPPORTED',
  INSUFFICIENT_EVIDENCE: 'INSUFFICIENT_EVIDENCE',
  CONFLICTED: 'CONFLICTED',
  REJECTED: 'REJECTED',
  UNAVAILABLE: 'UNAVAILABLE'
});

export const SkillConfidenceLevel = Object.freeze({
  SUPPORTED_SKILL_INDICATOR: 'SUPPORTED_SKILL_INDICATOR',
  WEAK_SKILL_EVIDENCE: 'WEAK_SKILL_EVIDENCE',
  INSUFFICIENT_EVIDENCE: 'INSUFFICIENT_EVIDENCE',
  PERFORMANCE_LIKELY_SYSTEMATIC: 'PERFORMANCE_LIKELY_SYSTEMATIC',
  PERFORMANCE_HIGHLY_UNCERTAIN: 'PERFORMANCE_HIGHLY_UNCERTAIN'
});

export const PersistenceClassification = Object.freeze({
  PERSISTENT: 'PERSISTENT',
  INCONSISTENT: 'INCONSISTENT',
  DECAYING: 'DECAYING',
  IMPROVING: 'IMPROVING',
  REGIME_DEPENDENT: 'REGIME_DEPENDENT',
  INSUFFICIENT_SAMPLE: 'INSUFFICIENT_SAMPLE'
});

export const FactorType = Object.freeze({
  MARKET_BETA: 'MARKET_BETA',
  SIZE_SMB: 'SIZE_SMB',
  VALUE_HML: 'VALUE_HML',
  MOMENTUM_WML: 'MOMENTUM_WML',
  QUALITY_QMJ: 'QUALITY_QMJ',
  VOLATILITY_BAB: 'VOLATILITY_BAB',
  PROFITABILITY_RMW: 'PROFITABILITY_RMW',
  INVESTMENT_CMA: 'INVESTMENT_CMA',
  RATES_DURATION: 'RATES_DURATION',
  CREDIT_SPREAD: 'CREDIT_SPREAD',
  FX_CARRY: 'FX_CARRY',
  SECTOR_COUNTRY: 'SECTOR_COUNTRY'
});

export const TimingDimension = Object.freeze({
  MARKET_TIMING: 'MARKET_TIMING',
  SECTOR_TIMING: 'SECTOR_TIMING',
  FACTOR_TIMING: 'FACTOR_TIMING',
  DURATION_TIMING: 'DURATION_TIMING',
  FX_TIMING: 'FX_TIMING',
  LIQUIDITY_TIMING: 'LIQUIDITY_TIMING'
});

export const ProcessDisciplineLevel = Object.freeze({
  DISCIPLINED: 'DISCIPLINED',
  MODERATE_DISCIPLINE: 'MODERATE_DISCIPLINE',
  UNDISCIPLINED: 'UNDISCIPLINED',
  UNAVAILABLE: 'UNAVAILABLE'
});

export const CapacityRiskLevel = Object.freeze({
  LOW_CAPACITY_RISK: 'LOW_CAPACITY_RISK',
  MODERATE_UTILIZATION: 'MODERATE_UTILIZATION',
  CAPACITY_CONSTRAINED: 'CAPACITY_CONSTRAINED',
  CRITICAL_DRAG: 'CRITICAL_DRAG'
});

export const SurvivorshipRisk = Object.freeze({
  LOW: 'LOW',
  MODERATE: 'MODERATE',
  HIGH: 'HIGH',
  UNCONTROLLED: 'UNCONTROLLED'
});

export const EvaluationPeriodType = Object.freeze({
  IN_SAMPLE: 'IN_SAMPLE',
  OUT_OF_SAMPLE: 'OUT_OF_SAMPLE',
  WALK_FORWARD: 'WALK_FORWARD',
  LIVE_PAPER: 'LIVE_PAPER',
  LIVE_REALIZED: 'LIVE_REALIZED'
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
export function computePerformanceHash(obj) {
  const normalize = (val) => {
    if (val === null || val === undefined) return null;
    if (typeof val !== 'object') return val;
    if (Array.isArray(val)) return val.map(normalize);
    const sorted = {};
    const excludedKeys = new Set(['verifiedAt', 'sealedAt', 'storedAt', 'calculatedAt', 'evaluatedAt', 'assessedAt', 'bridgedAt']);
    Object.keys(val).sort().forEach(k => {
      if (excludedKeys.has(k)) return;
      sorted[k] = normalize(val[k]);
    });
    return sorted;
  };
  const json = JSON.stringify(normalize(obj));
  return crypto.createHash('sha256').update(json).digest('hex');
}
