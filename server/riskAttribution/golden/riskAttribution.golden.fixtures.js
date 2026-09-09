/**
 * server/riskAttribution/golden/riskAttribution.golden.fixtures.js
 * 
 * Phase 32: 20 Canonical Quantitative Golden Archetypes A–T Fixtures
 * Exact numerical fixtures with deterministic analytical reference values.
 */

export const GOLDEN_ATTRIBUTION_FIXTURES = Object.freeze({
  // Archetype A: Two-Asset Marginal Risk Contribution (MRC)
  GOLDEN_A: {
    archetypeId: 'GOLDEN_A',
    description: 'Two-Asset Uncorrelated Portfolio Marginal Risk Contribution',
    symbols: ['ASSET_1', 'ASSET_2'],
    weights: [0.6, 0.4],
    covarianceMatrix: [
      [0.04, 0.00],
      [0.00, 0.09]
    ],
    periodsPerYear: 252,
    expected: {
      periodVariance: 0.6*0.6*0.04 + 0.4*0.4*0.09, // 0.0144 + 0.0144 = 0.0288
      periodVol: Math.sqrt(0.0288), // 0.169705627
      mrc1Period: (0.04 * 0.6) / Math.sqrt(0.0288), // 0.024 / 0.169705627 = 0.141421356
      mrc2Period: (0.09 * 0.4) / Math.sqrt(0.0288)  // 0.036 / 0.169705627 = 0.212132034
    }
  },

  // Archetype B: Two-Asset Component Risk Contribution (CRC)
  GOLDEN_B: {
    archetypeId: 'GOLDEN_B',
    description: 'Two-Asset Correlated Portfolio Component Risk Contribution',
    symbols: ['STOCK_A', 'STOCK_B'],
    weights: [0.5, 0.5],
    covarianceMatrix: [
      [0.04, 0.01],
      [0.01, 0.09]
    ],
    periodsPerYear: 252,
    expected: {
      // w = [0.5, 0.5]
      // Sw = [0.04*0.5 + 0.01*0.5, 0.01*0.5 + 0.09*0.5] = [0.025, 0.050]
      // Var = 0.5*0.025 + 0.5*0.050 = 0.0125 + 0.0250 = 0.0375
      periodVariance: 0.0375,
      crc1Period: 0.5 * (0.025 / Math.sqrt(0.0375)), // 0.0125 / sqrt(0.0375)
      crc2Period: 0.5 * (0.050 / Math.sqrt(0.0375))  // 0.0250 / sqrt(0.0375)
    }
  },

  // Archetype C: Percentage Risk Contribution (PRC)
  GOLDEN_C: {
    archetypeId: 'GOLDEN_C',
    description: 'Percentage Risk Contribution with Positive & Negative Covariances',
    symbols: ['SEC_X', 'SEC_Y', 'SEC_Z'],
    weights: [0.4, 0.4, 0.2],
    covarianceMatrix: [
      [0.04,  0.01, -0.005],
      [0.01,  0.06,  0.008],
      [-0.005, 0.008, 0.02]
    ],
    periodsPerYear: 252
  },

  // Archetype D: Euler Reconciliation (sum(CRC_i) == sigma_p)
  GOLDEN_D: {
    archetypeId: 'GOLDEN_D',
    description: '5-Asset Institutional Multi-Asset Euler Reconciliation',
    symbols: ['US_EQ', 'INTL_EQ', 'EM_EQ', 'US_CORE_BOND', 'COMMODITY'],
    weights: [0.35, 0.20, 0.10, 0.25, 0.10],
    covarianceMatrix: [
      [0.0324, 0.0210, 0.0270, -0.0030, 0.0120],
      [0.0210, 0.0400, 0.0310, -0.0020, 0.0150],
      [0.0270, 0.0310, 0.0625, -0.0010, 0.0220],
      [-0.0030, -0.0020, -0.0010, 0.0036, -0.0015],
      [0.0120, 0.0150, 0.0220, -0.0015, 0.0484]
    ],
    periodsPerYear: 252
  },

  // Archetype E: Variance Attribution (sum(VarCont_i) == sigma_p^2)
  GOLDEN_E: {
    archetypeId: 'GOLDEN_E',
    description: 'Exact Variance Contribution Decomposition',
    symbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN'],
    weights: [0.25, 0.30, 0.20, 0.25],
    covarianceMatrix: [
      [0.0625, 0.0312, 0.0280, 0.0350],
      [0.0312, 0.0484, 0.0260, 0.0320],
      [0.0280, 0.0260, 0.0529, 0.0290],
      [0.0350, 0.0320, 0.0290, 0.0729]
    ],
    periodsPerYear: 252
  },

  // Archetype F: Covariance Attribution (Standalone vs Cross-Covariance)
  GOLDEN_F: {
    archetypeId: 'GOLDEN_F',
    description: 'Standalone Variance vs Cross-Asset Covariance Allocation',
    symbols: ['ALPHA', 'BETA', 'GAMMA'],
    weights: [0.5, 0.3, 0.2],
    covarianceMatrix: [
      [0.04, 0.02, 0.01],
      [0.02, 0.09, 0.03],
      [0.01, 0.03, 0.16]
    ],
    periodsPerYear: 252
  },

  // Archetype G: Sector Aggregation Hierarchy
  GOLDEN_G: {
    archetypeId: 'GOLDEN_G',
    description: 'Multi-Sector Canonical Bottom-Up Aggregation',
    symbols: ['AAPL', 'MSFT', 'JPM', 'BAC', 'XOM', 'CVX'],
    weights: [0.25, 0.20, 0.15, 0.15, 0.15, 0.10],
    sectors: {
      AAPL: 'Information Technology',
      MSFT: 'Information Technology',
      JPM: 'Financials',
      BAC: 'Financials',
      XOM: 'Energy',
      CVX: 'Energy'
    },
    covarianceMatrix: [
      [0.055, 0.042, 0.018, 0.020, 0.012, 0.011],
      [0.042, 0.048, 0.016, 0.019, 0.010, 0.009],
      [0.018, 0.016, 0.040, 0.035, 0.015, 0.014],
      [0.020, 0.019, 0.035, 0.045, 0.017, 0.016],
      [0.012, 0.010, 0.015, 0.017, 0.060, 0.052],
      [0.011, 0.009, 0.014, 0.016, 0.052, 0.058]
    ],
    periodsPerYear: 252
  },

  // Archetype H: Geography Aggregation Hierarchy
  GOLDEN_H: {
    archetypeId: 'GOLDEN_H',
    description: 'Global Geography Hierarchy Aggregation',
    symbols: ['SPY', 'QQQ', 'EZU', 'EWJ', 'EEM'],
    weights: [0.40, 0.20, 0.15, 0.15, 0.10],
    geographies: {
      SPY: 'North America',
      QQQ: 'North America',
      EZU: 'Europe',
      EWJ: 'Asia Pacific',
      EEM: 'Emerging Markets'
    },
    covarianceMatrix: [
      [0.0225, 0.0240, 0.0180, 0.0140, 0.0190],
      [0.0240, 0.0361, 0.0200, 0.0160, 0.0220],
      [0.0180, 0.0200, 0.0324, 0.0150, 0.0210],
      [0.0140, 0.0160, 0.0150, 0.0256, 0.0180],
      [0.0190, 0.0220, 0.0210, 0.0180, 0.0484]
    ],
    periodsPerYear: 252
  },

  // Archetype I: Linear Factor Attribution
  GOLDEN_I: {
    archetypeId: 'GOLDEN_I',
    description: 'Fama-French 3-Factor Risk Model Decomposition',
    symbols: ['STOCK_1', 'STOCK_2', 'STOCK_3'],
    weights: [0.4, 0.35, 0.25],
    factorExposures: {
      factorNames: ['MARKET', 'SIZE', 'VALUE'],
      exposures: {
        STOCK_1: [1.2, 0.5, -0.2],
        STOCK_2: [0.9, -0.4, 0.6],
        STOCK_3: [1.0, 0.1, 0.3]
      },
      factorCovariance: [
        [0.0324, 0.0050, 0.0020],
        [0.0050, 0.0144, -0.0010],
        [0.0020, -0.0010, 0.0100]
      ],
      idiosyncraticVariances: {
        STOCK_1: 0.0120,
        STOCK_2: 0.0150,
        STOCK_3: 0.0090
      }
    },
    periodsPerYear: 252
  },

  // Archetype J: Factor & Idiosyncratic Variance Reconciliation
  GOLDEN_J: {
    archetypeId: 'GOLDEN_J',
    description: 'Multi-Factor Total Variance = Systematic + Idiosyncratic',
    symbols: ['TECH_1', 'FIN_1'],
    weights: [0.6, 0.4],
    factorExposures: {
      factorNames: ['MARKET', 'MOMENTUM'],
      exposures: {
        TECH_1: [1.3, 0.8],
        FIN_1: [0.8, -0.4]
      },
      factorCovariance: [
        [0.04, 0.01],
        [0.01, 0.02]
      ],
      idiosyncraticVariances: {
        TECH_1: 0.020,
        FIN_1: 0.015
      }
    },
    periodsPerYear: 252
  },

  // Archetype K: Concentration Attribution (HHI & ENC)
  GOLDEN_K: {
    archetypeId: 'GOLDEN_K',
    description: 'Weight vs Risk Concentration Divergence (High Risk Single Name)',
    symbols: ['LOW_VOL_SAFE', 'HIGH_VOL_RISKY'],
    weights: [0.80, 0.20],
    covarianceMatrix: [
      [0.01, 0.00],
      [0.00, 0.25]
    ],
    periodsPerYear: 252
  },

  // Archetype L: Correlation-Driven Risk (Diversification Drag)
  GOLDEN_L: {
    archetypeId: 'GOLDEN_L',
    description: 'High Cross-Correlation Impact on Portfolio Variance',
    symbols: ['CORR_1', 'CORR_2'],
    weights: [0.5, 0.5],
    covarianceMatrix: [
      [0.04, 0.038], // Corr = 0.038 / (0.2 * 0.2) = 0.95
      [0.038, 0.04]
    ],
    periodsPerYear: 252
  },

  // Archetype M: Stress Attribution
  GOLDEN_M: {
    archetypeId: 'GOLDEN_M',
    description: '2008 GFC and 2020 Covid Stress Attribution',
    symbols: ['EQUITY', 'CREDIT', 'TREASURY'],
    weights: [0.5, 0.3, 0.2],
    covarianceMatrix: [
      [0.040, 0.015, -0.005],
      [0.015, 0.025, -0.002],
      [-0.005, -0.002, 0.008]
    ],
    periodsPerYear: 252
  },

  // Archetype N: Regime Attribution
  GOLDEN_N: {
    archetypeId: 'GOLDEN_N',
    description: 'Bull vs Bear vs Crisis Regime Conditioned Risk Shifts',
    symbols: ['GROWTH_STOCK', 'DEFENSIVE_STOCK'],
    weights: [0.6, 0.4],
    covarianceMatrix: [
      [0.0625, 0.0150],
      [0.0150, 0.0225]
    ],
    periodsPerYear: 252
  },

  // Archetype O: Tail-Risk Attribution (Parametric Component VaR & Component Expected Shortfall)
  GOLDEN_O: {
    archetypeId: 'GOLDEN_O',
    description: '95% and 99% Parametric Normal Tail Risk Decomposition (Component VaR & Component ES)',
    model: 'PARAMETRIC_COVARIANCE_NORMAL',
    signConvention: 'POSITIVE_LOSS_CONVENTION',
    symbols: ['ASSET_X', 'ASSET_Y'],
    weights: [0.7, 0.3],
    covarianceMatrix: [
      [0.04, 0.01],
      [0.01, 0.09]
    ],
    confidence: 0.95,
    periodsPerYear: 252,
    expected: {
      portfolioVolatility: 2.8352777641705584,
      marginalRiskContributions: [2.7552856015450566, 3.0219261436300626],
      componentRiskContributions: [1.9286999210815394, 0.9065778430890188],
      percentageRiskContributions: [0.6802507836990595, 0.31974921630094045],
      zScore95: 1.6448536269514722,
      esMultiplier95: 2.0627128075167888,
      portfolioVaR: 4.6636169138108035,
      componentVaR: [3.1724290604919885, 1.4911878533188152],
      portfolioExpectedShortfall: 5.848363756995629,
      componentExpectedShortfall: [3.9783540290534525, 1.8700097279421763],
      vaRReconciliationResidual: 0.0,
      esReconciliationResidual: 0.0
    }
  },

  // Archetype P: Multi-Level Hierarchy Reconciliation
  GOLDEN_P: {
    archetypeId: 'GOLDEN_P',
    description: 'Portfolio -> Sleeve -> Sector -> Position 4-Tier Tree',
    symbols: ['TECH_GROWTH', 'TECH_VALUE', 'HEALTH_CORE', 'HEALTH_SPEC'],
    weights: [0.35, 0.25, 0.20, 0.20],
    sleeves: {
      TECH_GROWTH: 'Tactical Equity',
      TECH_VALUE: 'Core Equity',
      HEALTH_CORE: 'Core Equity',
      HEALTH_SPEC: 'Tactical Equity'
    },
    sectors: {
      TECH_GROWTH: 'Technology',
      TECH_VALUE: 'Technology',
      HEALTH_CORE: 'Healthcare',
      HEALTH_SPEC: 'Healthcare'
    },
    covarianceMatrix: [
      [0.060, 0.035, 0.015, 0.020],
      [0.035, 0.040, 0.012, 0.014],
      [0.015, 0.012, 0.030, 0.022],
      [0.020, 0.014, 0.022, 0.055]
    ],
    periodsPerYear: 252
  },

  // Archetype Q: Explanation DAG Integrity
  GOLDEN_Q: {
    archetypeId: 'GOLDEN_Q',
    description: 'Explanation DAG Lineage and Graph Acyclicity',
    symbols: ['STOCK_A', 'STOCK_B', 'STOCK_C'],
    weights: [0.4, 0.3, 0.3],
    covarianceMatrix: [
      [0.04, 0.01, 0.01],
      [0.01, 0.04, 0.01],
      [0.01, 0.01, 0.04]
    ],
    periodsPerYear: 252
  },

  // Archetype R: Point-in-Time Attribution Snapshot
  GOLDEN_R: {
    archetypeId: 'GOLDEN_R',
    description: 'Historical Snapshot @ T1 Immutability Check',
    symbols: ['T1_ASSET_1', 'T1_ASSET_2'],
    weights: [0.5, 0.5],
    covarianceMatrix: [
      [0.04, 0.01],
      [0.01, 0.04]
    ],
    asOf: '2026-01-15T00:00:00.000Z',
    periodsPerYear: 252
  },

  // Archetype S: Model-Version Immutability
  GOLDEN_S: {
    archetypeId: 'GOLDEN_S',
    description: 'Cryptographic Sealed Package SHA-256 Verification',
    symbols: ['ASSET_1', 'ASSET_2'],
    weights: [0.5, 0.5],
    covarianceMatrix: [
      [0.04, 0.00],
      [0.00, 0.04]
    ],
    periodsPerYear: 252
  },

  // Archetype T: Missing-Data / UNAVAILABLE Behavior
  GOLDEN_T: {
    archetypeId: 'GOLDEN_T',
    description: 'Missing Empirical Return Sample Handling without Hallucination',
    symbols: ['NEW_IPO_A', 'NEW_IPO_B'],
    weights: [0.5, 0.5],
    covarianceMatrix: [
      [0.05, 0.01],
      [0.01, 0.05]
    ],
    historicalReturns: null, // Explicitly missing
    periodsPerYear: 252
  }
});
