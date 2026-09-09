/**
 * server/scenario/scenario.config.js
 * 
 * Phase 19: Scenario Analysis & Stress Intelligence Configuration
 * Deterministic policy constants, limits, solver parameters, and baseline definitions.
 */

export const SCENARIO_CONFIG = Object.freeze({
  ENGINE_VERSION: '1.0.0',
  PACKAGE_SCHEMA_VERSION: '1.0.0',
  SEAL_PREFIX: 'SEAL-SCEN-',
  
  // Solver limits
  SOLVER: {
    DEFAULT_METHOD: 'BISECTION',
    MAX_ITERATIONS: 100,
    DEFAULT_TOLERANCE: 1e-6,
    DEFAULT_MIN_BOUND: -0.9999, // -99.99% shock limit
    DEFAULT_MAX_BOUND: 5.0,     // +500% shock limit
  },

  // Numerical precision tolerances
  NUMERICAL: {
    ROUNDING_DECIMALS_PRICE: 6,
    ROUNDING_DECIMALS_PNL: 4,
    ROUNDING_DECIMALS_WEIGHT: 6,
    EPSILON: 1e-12,
  },

  // Allowed shock limits to prevent nonsensical inputs (e.g. price dropping below 0)
  LIMITS: {
    MIN_PRICE_PERCENT_SHOCK: -1.0, // Can't drop more than -100% for standard long equity
    MAX_PRICE_PERCENT_SHOCK: 100.0, // +10,000% upper sanity bound
    MAX_YIELD_BPS_SHOCK: 5000,     // 5000 bps = 50%
    MIN_YIELD_BPS_SHOCK: -2000,    // -2000 bps
    MAX_FX_PERCENT_SHOCK: 10.0,
    MIN_FX_PERCENT_SHOCK: -0.99,
    MAX_VOLATILITY_MULTIPLIER: 20.0,
    MIN_VOLATILITY_MULTIPLIER: 0.01,
  },

  // Pre-configured Golden Institutional Macro Scenarios
  CANONICAL_SCENARIOS: {
    'CANONICAL_2008_GFC': {
      id: 'CANONICAL_2008_GFC',
      name: '2008 Global Financial Crisis Replication',
      description: 'Severe multi-asset crisis: Equity drawdown, credit spread widening, liquidity dry-up, flight to quality USD rally',
      scenarioType: 'HISTORICAL_REPLAY',
      horizon: 'HORIZON_30D',
      shocks: [
        { targetType: 'INDEX', target: 'SPX', shockUnit: 'PERCENT', shockValue: -0.38, betaAdjusted: true },
        { targetType: 'INDEX', target: 'NDX', shockUnit: 'PERCENT', shockValue: -0.42, betaAdjusted: true },
        { targetType: 'FACTOR', target: 'RATE_US_10Y', shockUnit: 'BPS', shockValue: -150 }, // flight to safety drop in yields
        { targetType: 'FACTOR', target: 'CREDIT_SPREAD', shockUnit: 'BPS', shockValue: +450 },
        { targetType: 'FACTOR', target: 'VOLATILITY_VIX', shockUnit: 'MULTIPLIER', shockValue: 3.5 },
        { targetType: 'LIQUIDITY', target: 'ADV', shockUnit: 'PERCENT', shockValue: -0.40 },
        { targetType: 'LIQUIDITY', target: 'SPREAD_BPS', shockUnit: 'MULTIPLIER', shockValue: 3.0 }
      ]
    },
    'CANONICAL_2020_COVID': {
      id: 'CANONICAL_2020_COVID',
      name: 'March 2020 COVID Liquidity Shock',
      description: 'Rapid liquidity collapse, sharp equity correction, market-wide spread blowout',
      scenarioType: 'HISTORICAL_REPLAY',
      horizon: 'HORIZON_1W',
      shocks: [
        { targetType: 'INDEX', target: 'SPX', shockUnit: 'PERCENT', shockValue: -0.30, betaAdjusted: true },
        { targetType: 'LIQUIDITY', target: 'ADV', shockUnit: 'PERCENT', shockValue: -0.50 },
        { targetType: 'LIQUIDITY', target: 'SPREAD_BPS', shockUnit: 'MULTIPLIER', shockValue: 4.0 },
        { targetType: 'FACTOR', target: 'VOLATILITY_VIX', shockUnit: 'MULTIPLIER', shockValue: 4.0 }
      ]
    },
    'CANONICAL_2022_RATE_SHOCK': {
      id: 'CANONICAL_2022_RATE_SHOCK',
      name: '2022 Stagflation / Aggressive Rate Hike',
      description: 'Simultaneous equity valuation compression (higher discount rates) and bond duration losses',
      scenarioType: 'MACRO_FACTOR',
      horizon: 'HORIZON_90D',
      shocks: [
        { targetType: 'FACTOR', target: 'RATE_US_10Y', shockUnit: 'BPS', shockValue: +250 },
        { targetType: 'INDEX', target: 'SPX', shockUnit: 'PERCENT', shockValue: -0.18, betaAdjusted: true },
        { targetType: 'INDEX', target: 'NDX', shockUnit: 'PERCENT', shockValue: -0.33, betaAdjusted: true }
      ]
    },
    'CANONICAL_TECH_PROPRIETARY_CRASH': {
      id: 'CANONICAL_TECH_PROPRIETARY_CRASH',
      name: 'Tech & Semiconductor Severe Drawdown',
      description: 'Hypothetical sector-specific shock targeting mega-cap tech and semiconductor equities',
      scenarioType: 'HYPOTHETICAL_STRESS',
      horizon: 'HORIZON_1M',
      shocks: [
        { targetType: 'SECTOR', target: 'Information Technology', shockUnit: 'PERCENT', shockValue: -0.25 },
        { targetType: 'SECTOR', target: 'Communication Services', shockUnit: 'PERCENT', shockValue: -0.20 },
        { targetType: 'SECURITY', target: 'AAPL', shockUnit: 'PERCENT', shockValue: -0.22 },
        { targetType: 'SECURITY', target: 'NVDA', shockUnit: 'PERCENT', shockValue: -0.35 }
      ]
    }
  }
});

export default SCENARIO_CONFIG;
