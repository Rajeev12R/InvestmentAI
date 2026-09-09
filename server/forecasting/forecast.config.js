/**
 * server/forecasting/forecast.config.js
 * 
 * Phase 20: Institutional Forecasting Engine Configuration
 * Policy constants, bounds, staleness rules, and defaults.
 */

export const FORECAST_CONFIG = Object.freeze({
  ENGINE_VERSION: '1.0.0',
  PACKAGE_SCHEMA_VERSION: '1.0.0',
  SEAL_PREFIX: 'SEAL-FCST-',

  // Staleness thresholds in days
  STALENESS: {
    CURRENT_MAX_DAYS: 30,
    AGING_MAX_DAYS: 90,
    STALE_MAX_DAYS: 180,
    EXPIRED_AFTER_DAYS: 365
  },

  // Numerical sanity bounds
  LIMITS: {
    MIN_GROWTH_RATE: -0.99,      // -99% max contraction
    MAX_GROWTH_RATE: 10.0,       // +1,000% max annual growth
    MIN_OPERATING_MARGIN: -1.0,  // -100% margin floor
    MAX_OPERATING_MARGIN: 0.95,  // 95% margin ceiling
    MIN_TAX_RATE: 0.0,
    MAX_TAX_RATE: 0.60,
    MIN_TERMINAL_GROWTH: 0.0,
    MAX_TERMINAL_GROWTH: 0.06    // 6% terminal growth ceiling
  },

  // Supported horizon offsets in years
  HORIZONS: {
    '1Y': 1,
    '2Y': 2,
    '3Y': 3,
    '5Y': 5,
    '10Y': 10
  }
});

export default FORECAST_CONFIG;
