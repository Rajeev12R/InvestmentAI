/**
 * Phase 31 — Risk Forecasting & Dynamic Risk Budgeting Configuration
 */

export const RiskForecastConfig = Object.freeze({
  VERSION: '1.0.0',
  
  // Numerical tolerances
  TOLERANCES: Object.freeze({
    FLOAT_EPSILON: 1e-12,
    EIGENVALUE_ZERO_TOLERANCE: 1e-8,
    WEIGHT_SUM_TOLERANCE: 1e-4,
    RECONCILIATION_TOLERANCE: 1e-5,
    MAX_CONDITION_NUMBER: 1e6
  }),

  // Minimum sample size thresholds
  MIN_OBSERVATIONS: Object.freeze({
    VOLATILITY: 10,
    COVARIANCE: 15,
    VAR_HISTORICAL: 20,
    ES_HISTORICAL: 25,
    BACKTEST: 15,
    FACTOR_REGRESSION: 20
  }),

  // Annualization parameters
  PERIODS_PER_YEAR: Object.freeze({
    DAILY: 252,
    WEEKLY: 52,
    MONTHLY: 12
  }),

  // Default EWMA parameters
  EWMA: Object.freeze({
    DEFAULT_LAMBDA: 0.94,
    MIN_LAMBDA: 0.50,
    MAX_LAMBDA: 0.99
  }),

  // VaR and Expected Shortfall standard parameters
  VAR_ES: Object.freeze({
    DEFAULT_CONFIDENCE: 0.95,
    ALLOWED_CONFIDENCES: [0.90, 0.95, 0.975, 0.99, 0.995],
    DEFAULT_HORIZON_DAYS: 20
  }),

  // Risk Budget threshold classifications
  BUDGET_THRESHOLDS: Object.freeze({
    AMBER_UTILIZATION: 0.80, // 80% consumed
    RED_UTILIZATION: 1.00     // 100% consumed (Breach)
  }),

  // Covariance repair configurations
  COVARIANCE_REPAIR: Object.freeze({
    DEFAULT_METHOD: 'EIGENVALUE_CLIPPING',
    EIGENVALUE_FLOOR: 1e-6,
    MAX_HIGHAM_ITERATIONS: 100,
    LEDROIT_WOLF_SHRINKAGE_TARGET: 'DIAGONAL_EQUAL_VARIANCE'
  })
});
