/**
 * server/portfolioOptimization/golden/portfolioOptimization.golden.fixtures.js
 * 
 * Phase 33: 20 Canonical Quantitative Golden Archetypes A–T Fixtures
 * Exact numerical fixtures with deterministic analytical and verified reference values.
 */

export const GOLDEN_OPTIMIZATION_FIXTURES = Object.freeze({
  // Golden A: Two-Asset Minimum Variance (Analytical KKT closed-form)
  GOLDEN_A: {
    archetypeId: 'GOLDEN_A',
    description: 'Two-Asset Unconstrained Minimum Variance (Analytical KKT)',
    symbols: ['ASSET_1', 'ASSET_2'],
    covarianceMatrix: [
      [0.04, 0.00],
      [0.00, 0.09]
    ],
    expectedReturns: [0.08, 0.12],
    objectiveType: 'MINIMUM_VARIANCE',
    periodsPerYear: 252,
    expected: {
      // Analytical KKT: w1 = (1/0.04) / (1/0.04 + 1/0.09) = 25 / (25 + 11.1111) = 25 / 36.1111 = 0.6923076923
      // w2 = (1/0.09) / (1/0.04 + 1/0.09) = 11.1111 / 36.1111 = 0.3076923077
      weights: [0.6923076923076923, 0.3076923076923077],
      periodVariance: 0.027692307692307694
    }
  },

  // Golden B: Two-Asset Mean-Variance (Analytical KKT)
  GOLDEN_B: {
    archetypeId: 'GOLDEN_B',
    description: 'Two-Asset Mean-Variance Quadratic Utility (Analytical KKT)',
    symbols: ['STOCK_A', 'STOCK_B'],
    covarianceMatrix: [
      [0.04, 0.01],
      [0.01, 0.09]
    ],
    expectedReturns: [0.10, 0.15],
    objectiveType: 'MEAN_VARIANCE',
    lambda: 2.0,
    periodsPerYear: 252
  },

  // Golden C: Long-Only Constrained Portfolio
  GOLDEN_C: {
    archetypeId: 'GOLDEN_C',
    description: 'Three-Asset Long-Only Minimum Variance',
    symbols: ['SEC_X', 'SEC_Y', 'SEC_Z'],
    covarianceMatrix: [
      [0.04,  0.01, -0.005],
      [0.01,  0.06,  0.008],
      [-0.005, 0.008, 0.02]
    ],
    constraints: { longOnly: true },
    objectiveType: 'MINIMUM_VARIANCE',
    periodsPerYear: 252
  },

  // Golden D: Long-Short Portfolio
  GOLDEN_D: {
    archetypeId: 'GOLDEN_D',
    description: 'Long-Short Mean-Variance Portfolio with Negative Weights Permitted',
    symbols: ['LONG_ASSET', 'SHORT_ASSET', 'NEUTRAL_ASSET'],
    covarianceMatrix: [
      [0.04, 0.02, 0.01],
      [0.02, 0.09, 0.02],
      [0.01, 0.02, 0.05]
    ],
    expectedReturns: [0.15, -0.05, 0.06],
    constraints: { longOnly: false },
    objectiveType: 'MEAN_VARIANCE',
    lambda: 1.0,
    periodsPerYear: 1
  },

  // Golden E: Position Upper Bounds
  GOLDEN_E: {
    archetypeId: 'GOLDEN_E',
    description: 'Position Max Weights Capped at 30%',
    symbols: ['A', 'B', 'C', 'D'],
    covarianceMatrix: [
      [0.02, 0.01, 0.01, 0.01],
      [0.01, 0.06, 0.02, 0.02],
      [0.01, 0.02, 0.08, 0.02],
      [0.01, 0.02, 0.02, 0.10]
    ],
    constraints: {
      longOnly: true,
      maxWeights: [0.30, 0.30, 0.30, 0.30]
    },
    objectiveType: 'MINIMUM_VARIANCE',
    periodsPerYear: 252
  },

  // Golden F: Position Lower Bounds
  GOLDEN_F: {
    archetypeId: 'GOLDEN_F',
    description: 'Position Minimum Weights Floor at 15%',
    symbols: ['EQ_1', 'EQ_2', 'EQ_3'],
    covarianceMatrix: [
      [0.04, 0.01, 0.01],
      [0.01, 0.05, 0.01],
      [0.01, 0.01, 0.09]
    ],
    constraints: {
      minWeights: [0.15, 0.15, 0.15],
      maxWeights: [0.70, 0.70, 0.70]
    },
    objectiveType: 'MINIMUM_VARIANCE',
    periodsPerYear: 252
  },

  // Golden G: Sector Constraint
  GOLDEN_G: {
    archetypeId: 'GOLDEN_G',
    description: 'Sector Bounds: Technology <= 35%, Financials >= 20%',
    symbols: ['AAPL', 'MSFT', 'JPM', 'BAC'],
    sectors: {
      AAPL: 'Tech',
      MSFT: 'Tech',
      JPM: 'Fin',
      BAC: 'Fin'
    },
    covarianceMatrix: [
      [0.06, 0.04, 0.01, 0.01],
      [0.04, 0.05, 0.01, 0.01],
      [0.01, 0.01, 0.04, 0.03],
      [0.01, 0.01, 0.03, 0.05]
    ],
    constraints: {
      longOnly: true,
      sectorBounds: {
        Tech: { max: 0.35 },
        Fin: { min: 0.20 }
      }
    },
    objectiveType: 'MINIMUM_VARIANCE',
    periodsPerYear: 252
  },

  // Golden H: Geography Hierarchy Constraint
  GOLDEN_H: {
    archetypeId: 'GOLDEN_H',
    description: 'Geography Bounds: North America >= 50%, Europe <= 25%',
    symbols: ['SPY', 'QQQ', 'EZU', 'EWJ'],
    geographies: {
      SPY: 'North America',
      QQQ: 'North America',
      EZU: 'Europe',
      EWJ: 'Asia Pacific'
    },
    covarianceMatrix: [
      [0.03, 0.025, 0.015, 0.012],
      [0.025, 0.04, 0.018, 0.014],
      [0.015, 0.018, 0.035, 0.015],
      [0.012, 0.014, 0.015, 0.032]
    ],
    constraints: {
      longOnly: true,
      geographyBounds: {
        'North America': { min: 0.50 },
        'Europe': { max: 0.25 }
      }
    },
    objectiveType: 'MINIMUM_VARIANCE',
    periodsPerYear: 252
  },

  // Golden I: Multi-Group Constraints
  GOLDEN_I: {
    archetypeId: 'GOLDEN_I',
    description: 'Combined Sector and Geography Hierarchy Constraints',
    symbols: ['US_TECH', 'US_FIN', 'EU_TECH', 'EU_FIN'],
    sectors: {
      US_TECH: 'Tech',
      US_FIN: 'Fin',
      EU_TECH: 'Tech',
      EU_FIN: 'Fin'
    },
    geographies: {
      US_TECH: 'US',
      US_FIN: 'US',
      EU_TECH: 'EU',
      EU_FIN: 'EU'
    },
    covarianceMatrix: [
      [0.06, 0.02, 0.03, 0.01],
      [0.02, 0.04, 0.01, 0.02],
      [0.03, 0.01, 0.05, 0.02],
      [0.01, 0.02, 0.02, 0.04]
    ],
    constraints: {
      longOnly: true,
      sectorBounds: { Tech: { max: 0.40 } },
      geographyBounds: { US: { min: 0.50 } }
    },
    objectiveType: 'MINIMUM_VARIANCE',
    periodsPerYear: 252
  },

  // Golden J: Benchmark Tracking Error Minimization
  GOLDEN_J: {
    archetypeId: 'GOLDEN_J',
    description: 'Tracking Error Minimization against 4-Asset Benchmark',
    symbols: ['B1', 'B2', 'B3', 'B4'],
    benchmarkWeights: [0.40, 0.30, 0.20, 0.10],
    covarianceMatrix: [
      [0.04, 0.01, 0.01, 0.01],
      [0.01, 0.05, 0.01, 0.01],
      [0.01, 0.01, 0.06, 0.01],
      [0.01, 0.01, 0.01, 0.08]
    ],
    constraints: { longOnly: true },
    objectiveType: 'TRACKING_ERROR',
    periodsPerYear: 252
  },

  // Golden K: Maximum Sharpe Ratio
  GOLDEN_K: {
    archetypeId: 'GOLDEN_K',
    description: 'Tangency Maximum Sharpe Ratio Portfolio',
    symbols: ['GROWTH', 'VALUE', 'DEFENSIVE'],
    expectedReturns: [0.18, 0.12, 0.07],
    riskFreeRate: 0.03,
    covarianceMatrix: [
      [0.09, 0.03, 0.01],
      [0.03, 0.04, 0.01],
      [0.01, 0.01, 0.01]
    ],
    constraints: { longOnly: true },
    objectiveType: 'MAXIMUM_SHARPE',
    periodsPerYear: 252
  },

  // Golden L: Target Volatility Optimization
  GOLDEN_L: {
    archetypeId: 'GOLDEN_L',
    description: 'Matching an Institutional Risk Target of 15% Volatility',
    symbols: ['HIGH_VOL', 'LOW_VOL'],
    covarianceMatrix: [
      [0.09 / 252, 0.01 / 252],
      [0.01 / 252, 0.01 / 252]
    ],
    riskTarget: 0.15,
    constraints: { longOnly: true },
    objectiveType: 'RISK_TARGET',
    periodsPerYear: 252
  },

  // Golden M: Risk-Budget / Equal Risk Parity Optimization
  GOLDEN_M: {
    archetypeId: 'GOLDEN_M',
    description: 'Equal Component Risk Contributions (Risk Parity)',
    symbols: ['VOL_20', 'VOL_40'],
    covarianceMatrix: [
      [0.04, 0.00],
      [0.00, 0.16]
    ],
    constraints: { longOnly: true },
    objectiveType: 'RISK_BUDGETING',
    periodsPerYear: 252
  },

  // Golden N: Turnover-Constrained Rebalancing
  GOLDEN_N: {
    archetypeId: 'GOLDEN_N',
    description: 'Turnover Capped at 15% from Initial Weights',
    symbols: ['ASSET_1', 'ASSET_2', 'ASSET_3'],
    initialWeights: [0.60, 0.30, 0.10],
    covarianceMatrix: [
      [0.08, 0.01, 0.01],
      [0.01, 0.03, 0.01],
      [0.01, 0.01, 0.02]
    ],
    constraints: {
      longOnly: true,
      maxTurnover: 0.15
    },
    objectiveType: 'MINIMUM_VARIANCE',
    periodsPerYear: 252
  },

  // Golden O: Concentration-Constrained Optimization
  GOLDEN_O: {
    archetypeId: 'GOLDEN_O',
    description: 'Concentration Limit: Max HHI <= 0.25',
    symbols: ['SAFE_DOMINANT', 'RISKY_1', 'RISKY_2', 'RISKY_3', 'RISKY_4'],
    covarianceMatrix: [
      [0.005, 0.001, 0.001, 0.001, 0.001],
      [0.001, 0.080, 0.010, 0.010, 0.010],
      [0.001, 0.010, 0.090, 0.010, 0.010],
      [0.001, 0.010, 0.010, 0.070, 0.010],
      [0.001, 0.010, 0.010, 0.010, 0.100]
    ],
    constraints: {
      longOnly: true,
      maxHHI: 0.25
    },
    objectiveType: 'MINIMUM_VARIANCE',
    periodsPerYear: 252
  },

  // Golden P: Factor Exposure Constrained Optimization
  GOLDEN_P: {
    archetypeId: 'GOLDEN_P',
    description: 'Factor Sensitivity Constraint Evaluation',
    symbols: ['STK_A', 'STK_B'],
    covarianceMatrix: [
      [0.04, 0.01],
      [0.01, 0.04]
    ],
    factorExposures: {
      factorNames: ['MARKET'],
      exposures: { STK_A: [1.2], STK_B: [0.8] }
    },
    constraints: { longOnly: true },
    objectiveType: 'MINIMUM_VARIANCE',
    periodsPerYear: 252
  },

  // Golden Q: VaR/ES Constrained Optimization
  GOLDEN_Q: {
    archetypeId: 'GOLDEN_Q',
    description: 'Parametric VaR Cap Constraint',
    symbols: ['EQUITY', 'BOND'],
    covarianceMatrix: [
      [0.06, 0.00],
      [0.00, 0.01]
    ],
    constraints: {
      longOnly: true,
      maxVaR: 3.0
    },
    objectiveType: 'MINIMUM_VARIANCE',
    periodsPerYear: 252
  },

  // Golden R: Infeasible Constraint Set Detection
  GOLDEN_R: {
    archetypeId: 'GOLDEN_R',
    description: 'Contradictory Box Bounds (sum(minWeights) > 1.0) Rejection',
    symbols: ['FAIL_1', 'FAIL_2'],
    covarianceMatrix: [
      [0.04, 0.00],
      [0.00, 0.04]
    ],
    constraints: {
      minWeights: [0.60, 0.60] // Sum = 1.2 > 1.0
    },
    objectiveType: 'MINIMUM_VARIANCE',
    periodsPerYear: 252
  },

  // Golden S: Near-Singular Covariance Matrix with Regularization
  GOLDEN_S: {
    archetypeId: 'GOLDEN_S',
    description: 'Near-Singular Matrix (corr = 0.9999) with Automatic Regularization',
    symbols: ['SINGULAR_1', 'SINGULAR_2'],
    covarianceMatrix: [
      [0.04000, 0.03999],
      [0.03999, 0.04000]
    ],
    constraints: { longOnly: true },
    objectiveType: 'MINIMUM_VARIANCE',
    periodsPerYear: 252
  },

  // Golden T: 50+ Asset Institutional Optimization
  GOLDEN_T: {
    archetypeId: 'GOLDEN_T',
    description: '50-Asset Institutional Minimum Variance with Box Bounds',
    symbols: Array.from({ length: 50 }, (_, i) => `ASSET_${i + 1}`),
    covarianceMatrix: Array.from({ length: 50 }, (_, r) => 
      Array.from({ length: 50 }, (_, c) => (r === c ? 0.04 + (r % 5) * 0.01 : 0.005))
    ),
    constraints: {
      longOnly: true,
      maxWeights: new Array(50).fill(0.08)
    },
    objectiveType: 'MINIMUM_VARIANCE',
    periodsPerYear: 252
  }
});
