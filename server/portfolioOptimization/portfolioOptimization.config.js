/**
 * server/portfolioOptimization/portfolioOptimization.config.js
 * 
 * Phase 33: Configuration & Institutional Numerical Parameters
 */

export const OPTIMIZATION_CONFIG = Object.freeze({
  VERSION: '33.0.0-institutional-opt',
  
  // Numerical tolerances
  TOLERANCE: {
    ABSOLUTE: 1e-7,
    RELATIVE: 1e-6,
    FEASIBILITY: 1e-4,
    WEIGHT_SUM: 1e-6,
    ZERO_THRESHOLD: 1e-12,
    REGULARIZATION_MIN: 1e-8
  },

  // Solver iteration limits
  SOLVER_LIMITS: {
    MAX_ITERATIONS: 500,
    TIMEOUT_MS: 5000,
    CONVERGENCE_EPSILON: 1e-6,
    LINE_SEARCH_MAX_STEPS: 30
  },

  // Default parameters
  DEFAULTS: {
    RISK_FREE_RATE: 0.04,
    ANNUALIZATION_FACTOR: 252,
    DEFAULT_RISK_AVERSION_LAMBDA: 1.0,
    DEFAULT_CONFIDENCE: 0.95,
    DEFAULT_SOFT_PENALTY_MULTIPLIER: 1000.0
  },

  // Macro Scenarios for robust optimization
  SCENARIO_CONFIGS: Object.freeze({
    BASE_CASE: {
      id: 'BASE_CASE',
      name: 'Base Case Equilibrium',
      returnShift: 0.0,
      volatilityMultiplier: 1.0,
      correlationShift: 0.0
    },
    BULL_EXPANSION: {
      id: 'BULL_EXPANSION',
      name: 'Bull Market & Liquidity Expansion',
      returnShift: 0.05,
      volatilityMultiplier: 0.85,
      correlationShift: -0.05
    },
    BEAR_CONTRACTION: {
      id: 'BEAR_CONTRACTION',
      name: 'Bear Market & Volatility Spike',
      returnShift: -0.08,
      volatilityMultiplier: 1.5,
      correlationShift: 0.15
    },
    STAGFLATION_CRISIS: {
      id: 'STAGFLATION_CRISIS',
      name: 'Stagflationary Dislocation Shock',
      returnShift: -0.12,
      volatilityMultiplier: 2.0,
      correlationShift: 0.25
    }
  })
});
