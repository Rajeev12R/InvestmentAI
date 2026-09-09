import crypto from 'crypto';

/**
 * Phase 27 — Signal Taxonomy (20 Explicit Signal Types)
 */
export const SignalType = Object.freeze({
  VALUATION_SIGNAL: 'VALUATION_SIGNAL',
  FUNDAMENTAL_SIGNAL: 'FUNDAMENTAL_SIGNAL',
  EARNINGS_SIGNAL: 'EARNINGS_SIGNAL',
  GROWTH_SIGNAL: 'GROWTH_SIGNAL',
  QUALITY_SIGNAL: 'QUALITY_SIGNAL',
  MOMENTUM_SIGNAL: 'MOMENTUM_SIGNAL',
  MACRO_SIGNAL: 'MACRO_SIGNAL',
  RATE_SIGNAL: 'RATE_SIGNAL',
  FX_SIGNAL: 'FX_SIGNAL',
  LIQUIDITY_SIGNAL: 'LIQUIDITY_SIGNAL',
  RISK_SIGNAL: 'RISK_SIGNAL',
  EVENT_SIGNAL: 'EVENT_SIGNAL',
  COMPETITIVE_SIGNAL: 'COMPETITIVE_SIGNAL',
  SUPPLY_CHAIN_SIGNAL: 'SUPPLY_CHAIN_SIGNAL',
  MANAGEMENT_SIGNAL: 'MANAGEMENT_SIGNAL',
  REGULATORY_SIGNAL: 'REGULATORY_SIGNAL',
  ALTERNATIVE_DATA_SIGNAL: 'ALTERNATIVE_DATA_SIGNAL',
  SENTIMENT_SIGNAL: 'SENTIMENT_SIGNAL',
  PORTFOLIO_SIGNAL: 'PORTFOLIO_SIGNAL',
  PROCESS_SIGNAL: 'PROCESS_SIGNAL'
});

/**
 * Signal Statuses (11 Explicit States)
 */
export const SignalStatus = Object.freeze({
  RAW: 'RAW',
  DERIVED: 'DERIVED',
  VALIDATED: 'VALIDATED',
  MODEL_ESTIMATE: 'MODEL_ESTIMATE',
  HISTORICALLY_SUPPORTED: 'HISTORICALLY_SUPPORTED',
  INSUFFICIENT_SAMPLE: 'INSUFFICIENT_SAMPLE',
  CONFLICTED: 'CONFLICTED',
  STALE: 'STALE',
  INVALIDATED: 'INVALIDATED',
  UNAVAILABLE: 'UNAVAILABLE',
  AI_HYPOTHESIS: 'AI_HYPOTHESIS'
});

/**
 * Normalized Signal Directions (7 Explicit States)
 */
export const SignalDirection = Object.freeze({
  STRONGLY_POSITIVE: 'STRONGLY_POSITIVE',
  POSITIVE: 'POSITIVE',
  NEUTRAL: 'NEUTRAL',
  NEGATIVE: 'NEGATIVE',
  STRONGLY_NEGATIVE: 'STRONGLY_NEGATIVE',
  UNKNOWN: 'UNKNOWN',
  CONFLICTED: 'CONFLICTED'
});

/**
 * Composite Signal Regimes (6 Explicit Regimes)
 */
export const SignalRegime = Object.freeze({
  STRONG_POSITIVE: 'STRONG_POSITIVE',
  POSITIVE: 'POSITIVE',
  MIXED: 'MIXED',
  NEGATIVE: 'NEGATIVE',
  STRONG_NEGATIVE: 'STRONG_NEGATIVE',
  UNAVAILABLE: 'UNAVAILABLE'
});

/**
 * Signal Dependency Types (6 Explicit Types)
 */
export const SignalDependencyType = Object.freeze({
  DIRECT_DUPLICATE: 'DIRECT_DUPLICATE',
  DERIVED_FROM_SAME_SOURCE: 'DERIVED_FROM_SAME_SOURCE',
  SHARED_UNDERLYING_FACT: 'SHARED_UNDERLYING_FACT',
  CORRELATED: 'CORRELATED',
  POTENTIALLY_INDEPENDENT: 'POTENTIALLY_INDEPENDENT',
  UNKNOWN_DEPENDENCY: 'UNKNOWN_DEPENDENCY'
});

/**
 * Signal Persistence States (6 Explicit States)
 */
export const SignalPersistence = Object.freeze({
  NEW: 'NEW',
  PERSISTENT: 'PERSISTENT',
  STRENGTHENING: 'STRENGTHENING',
  WEAKENING: 'WEAKENING',
  REVERSING: 'REVERSING',
  EXPIRED: 'EXPIRED'
});

/**
 * Sample Quality Evaluation Statuses
 */
export const SampleStatus = Object.freeze({
  INSUFFICIENT_SAMPLE: 'INSUFFICIENT_SAMPLE', // N < 10
  LOW_SAMPLE: 'LOW_SAMPLE',                   // 10 <= N < 30
  EVALUABLE: 'EVALUABLE'                      // N >= 30
});

/**
 * Historical Validation Periods
 */
export const ValidationPeriod = Object.freeze({
  IN_SAMPLE: 'IN_SAMPLE',
  VALIDATION: 'VALIDATION',
  OUT_OF_SAMPLE: 'OUT_OF_SAMPLE'
});

/**
 * Divergence Types (First-Class Divergences)
 */
export const DivergenceType = Object.freeze({
  VALUATION_VS_FUNDAMENTALS: 'VALUATION_VS_FUNDAMENTALS',
  FORECAST_VS_MARKET: 'FORECAST_VS_MARKET',
  EARNINGS_VS_ALTERNATIVE_DATA: 'EARNINGS_VS_ALTERNATIVE_DATA',
  MACRO_VS_COMPANY: 'MACRO_VS_COMPANY',
  PRICE_VS_REVENUE_GROWTH: 'PRICE_VS_REVENUE_GROWTH'
});

/**
 * Deterministic Canonical Hashing (SHA-256)
 */
export function computeSignalHash(obj) {
  const normalize = (val) => {
    if (val === null || val === undefined) return null;
    if (typeof val !== 'object') return val;
    if (Array.isArray(val)) return val.map(normalize);
    const sorted = {};
    Object.keys(val).sort().forEach(k => {
      sorted[k] = normalize(val[k]);
    });
    return sorted;
  };
  const json = JSON.stringify(normalize(obj));
  return crypto.createHash('sha256').update(json).digest('hex');
}

/**
 * Deterministic Deep Freeze
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
