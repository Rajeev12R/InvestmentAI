/**
 * @file attentionThresholds.js
 * Centralized, configurable thresholds and scoring weights for Phase 7 Attention Intelligence.
 */

export const ATTENTION_THRESHOLDS = Object.freeze({
  PRIORITY: Object.freeze({
    CRITICAL: 85,
    HIGH: 65,
    MEDIUM: 40,
    LOW: 20,
    INFORMATIONAL: 0
  }),

  SCORING_WEIGHTS: Object.freeze({
    // Max contributions for individual components
    DECISION_CHANGE_MAX: 30,
    THESIS_BREAKER_MAX: 25,
    VALUATION_DRIFT_MAX: 20,
    RISK_DRIFT_MAX: 15,
    EVENT_MATERIALITY_MAX: 15,
    PORTFOLIO_EXPOSURE_MAX: 10,
    RECENCY_MAX: 5,
    CONFIDENCE_MAX: 5
  }),

  DECISION_CHANGE_SCORES: Object.freeze({
    'BUY_TO_AVOID': 30,
    'BUY_TO_WATCH': 25,
    'HOLD_TO_AVOID': 25,
    'WATCH_TO_AVOID': 20,
    'AVOID_TO_BUY': 20,
    'WATCH_TO_BUY': 18,
    'BUY_TO_HOLD': 15,
    'HOLD_TO_BUY': 12,
    'HOLD_TO_WATCH': 12,
    'DEFAULT_CHANGE': 10
  }),

  THESIS_BREAKER_SCORES: Object.freeze({
    'TRIGGERED': 25,
    'APPROACHING': 18,
    'STABLE': 0,
    'UNKNOWN': 8 // Missing data warrants investigation attention
  }),

  VALUATION_DRIFT_THRESHOLDS: Object.freeze({
    MATERIAL_PCT: 10.0, // >= 10% DCF/Fair Value drift is material
    SIGNIFICANT_PCT: 5.0 // >= 5% DCF drift
  }),

  RISK_DRIFT_SCORES: Object.freeze({
    'CRITICAL_ELEVATION': 15, // e.g. LOW/MODERATE -> CRITICAL
    'HIGH_ELEVATION': 12,     // e.g. MODERATE -> HIGH
    'MODERATE_ELEVATION': 8,
    'STABLE': 0,
    'IMPROVING': 3            // Positive development still worth noting
  }),

  EVENT_MATERIALITY_SCORES: Object.freeze({
    'HIGH': 15,
    'MEDIUM': 10,
    'LOW': 5,
    'NONE': 0
  }),

  PORTFOLIO_CONCENTRATION_THRESHOLDS: Object.freeze({
    TOP_1_HIGH: 0.35,  // Single position > 35%
    TOP_3_HIGH: 0.65,  // Top 3 positions > 65%
    HHI_HIGH: 2500,    // HHI > 2500 is highly concentrated
    CORRELATION_CLUSTER_MIN_SIZE: 3,
    CORRELATION_HIGH_THRESHOLD: 0.80,
    N_EFF_LOW: 3.0     // Fewer than 3 effective independent bets
  }),

  RECENCY_HALF_LIFE_HOURS: 48 // Decay recency score over 48 hours
});
