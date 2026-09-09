/**
 * server/riskAttribution/riskAttribution.config.js
 * 
 * Phase 32: Institutional Risk Attribution Configuration & Tolerances
 */

export const RiskAttributionConfig = Object.freeze({
  ENGINE_VERSION: 'v32.1.0-euler-attribution',
  SCHEMA_VERSION: '1.0.0',
  PACKAGE_SCHEMA_VERSION: '1.0.0',
  SEAL_PREFIX: 'SEAL-ATTR-',

  PERIODS_PER_YEAR: {
    DAILY: 252,
    WEEKLY: 52,
    MONTHLY: 12,
    QUARTERLY: 4,
    ANNUAL: 1
  },

  TOLERANCES: {
    ABSOLUTE_RECONCILIATION: 1e-6,
    RELATIVE_RECONCILIATION: 1e-5,
    PERCENTAGE_SUM_TOLERANCE: 1e-5,
    VARIANCE_SUM_TOLERANCE: 1e-6,
    ZERO_VOLATILITY_EPSILON: 1e-12,
    WEIGHT_SUM_TOLERANCE: 1e-4,
    EIGENVALUE_FLOOR: 1e-8
  },

  DEFAULT_PARAMS: {
    CONFIDENCE_LEVEL: 0.95,
    STRESS_HORIZON_DAYS: 20,
    DEFAULT_PERIODS_PER_YEAR: 252,
    COVARIANCE_CONVENTION: 'MARGINAL_SPLIT'
  },

  CANONICAL_FACTORS: [
    'MARKET',
    'SIZE',
    'VALUE',
    'MOMENTUM',
    'PROFITABILITY',
    'INVESTMENT',
    'VOLATILITY',
    'LIQUIDITY',
    'CREDIT_SPREAD',
    'TERM_SPREAD'
  ],

  CANONICAL_STRESS_SCENARIOS: {
    GFC_2008: {
      id: 'GFC_2008',
      name: '2008 Global Financial Crisis',
      volMultiplier: 2.8,
      correlationShift: 0.35,
      factorShocks: { MARKET: -0.38, VOLATILITY: 2.5, LIQUIDITY: -0.4 }
    },
    COVID_2020: {
      id: 'COVID_2020',
      name: '2020 Covid Liquidity Shock',
      volMultiplier: 2.5,
      correlationShift: 0.40,
      factorShocks: { MARKET: -0.32, VOLATILITY: 3.0, LIQUIDITY: -0.5 }
    },
    RATES_SHOCK_2022: {
      id: 'RATES_SHOCK_2022',
      name: '2022 Aggressive Monetary Tightening',
      volMultiplier: 1.6,
      correlationShift: 0.20,
      factorShocks: { TERM_SPREAD: -0.02, VALUE: 0.15, GROWTH: -0.28 }
    },
    TECH_SELLOFF: {
      id: 'TECH_SELLOFF',
      name: 'Technology Growth Compression',
      volMultiplier: 2.0,
      correlationShift: 0.25,
      factorShocks: { MARKET: -0.18, MOMENTUM: -0.25, VOLATILITY: 1.8 }
    }
  },

  CANONICAL_REGIMES: {
    BULL_EXPANSION: {
      name: 'Bull Market Expansion',
      volFactor: 0.85,
      factorWeights: { MARKET: 1.1, MOMENTUM: 1.2, VALUE: 0.9 }
    },
    BEAR_CONTRACTION: {
      name: 'Bear Market Contraction',
      volFactor: 1.65,
      factorWeights: { MARKET: 0.7, MOMENTUM: 0.5, VALUE: 1.1, VOLATILITY: 1.8 }
    },
    VOLATILE_TRANSITION: {
      name: 'Volatile Transition & Chop',
      volFactor: 1.30,
      factorWeights: { MARKET: 0.9, VOLATILITY: 1.4, LIQUIDITY: 0.8 }
    },
    STAGFLATION: {
      name: 'Stagflationary Pressure',
      volFactor: 1.45,
      factorWeights: { VALUE: 1.3, TERM_SPREAD: 0.6, MOMENTUM: 0.7 }
    },
    CRISIS_DISLOCATION: {
      name: 'Liquidity Crisis Dislocation',
      volFactor: 2.40,
      factorWeights: { MARKET: 0.5, VOLATILITY: 2.5, LIQUIDITY: 0.4 }
    }
  }
});
