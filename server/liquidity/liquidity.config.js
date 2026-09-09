/**
 * Phase 18 — Institutional Liquidity Configuration & Policies
 */

import { deepFreeze, LiquidityTier, ImpactModelType, LiquidityDataStatus } from './liquidity.types.js';

export const LIQUIDITY_POLICY_V1 = deepFreeze({
  policyVersion: 'LIQUIDITY_POLICY_V1.0',
  policyId: 'POL-LIQ-INST-V1',
  effectiveFrom: '2024-01-01T00:00:00.000Z',
  effectiveTo: '2026-12-31T23:59:59.999Z',
  sourceAuthority: 'Institutional Trading Standards / MiFID II RTS 27 / SEC Rule 605',
  sourceDocument: 'Institutional Best Execution & Liquidity Risk Framework',
  sourceSection: 'Articles 4, 15, 27 (Execution Quality & Market Impact)',
  sourceURI: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32017R0575',
  evidenceId: 'EVID-SRC-LIQ-INST-2024',
  evidenceHash: 'a71e860959086f6d5423f0545f44e1837494f6c4ff98444a161bb774fcfbaae9',
  dataStatus: LiquidityDataStatus.CONFIGURED,

  // ADV Windows supported
  supportedAdvWindows: ['5D', '20D', '30D', '60D', '90D'],
  defaultAdvWindow: '20D',

  // Trading participation limits
  maxParticipationRateNormal: 0.10, // 10% of ADV
  maxParticipationRateAggressive: 0.20, // 20% of ADV
  maxParticipationRatePassive: 0.05, // 5% of ADV
  defaultMaxParticipationRate: 0.10,

  // Maximum allowed liquidation horizon (trading days)
  maxLiquidationDaysNormal: 5,
  maxLiquidationDaysIlliquid: 10,
  defaultMaxLiquidationDays: 5,

  // Spread thresholds (bps)
  maxAcceptableSpreadBps: 50.0, // 50 bps
  staleDataMaxAgeMinutes: 60, // 1 hour for live quotes
  historicalStaleMaxAgeDays: 5, // 5 days for historical volume

  // Liquidity Tier thresholds (Dollar ADV in USD)
  tierThresholds: {
    [LiquidityTier.TIER_1_HIGH_LIQUIDITY]: { minDollarAdv: 50000000, maxSpreadBps: 15.0 }, // > $50M Dollar ADV, <= 15 bps
    [LiquidityTier.TIER_2_MODERATE_LIQUIDITY]: { minDollarAdv: 10000000, maxSpreadBps: 40.0 }, // > $10M Dollar ADV, <= 40 bps
    [LiquidityTier.TIER_3_LOW_LIQUIDITY]: { minDollarAdv: 1000000, maxSpreadBps: 100.0 }, // > $1M Dollar ADV, <= 100 bps
    [LiquidityTier.TIER_4_ILLIQUID]: { minDollarAdv: 0, maxSpreadBps: Infinity }
  },

  // Market Impact Model configuration & structured provenance
  impactModel: {
    modelId: 'SQUARE_ROOT_IMPACT_MODEL_V1',
    modelName: 'Square Root Market Impact Approximation',
    modelFamily: ImpactModelType.SQUARE_ROOT,
    modelVersion: '1.0',
    modelType: ImpactModelType.SQUARE_ROOT,
    formula: 'ImpactBps = coefficient * 10000 * sqrt(OrderNotional / DollarADV)',
    coefficient: 0.10, // 10 bps base scale for sqrt(notional / dollarAdv)
    defaultCoefficient: 0.10,
    coefficientUnits: 'dimensionless_scaling_factor',
    calibrationMethod: 'CONFIGURED_ASSUMPTION',
    calibrationUniverse: 'UNAVAILABLE',
    calibrationPeriod: 'UNAVAILABLE',
    status: LiquidityDataStatus.CONFIGURED,
    effectiveFrom: '2024-01-01T00:00:00.000Z',
    effectiveTo: '2026-12-31T23:59:59.999Z',
    sourceAuthority: 'Institutional Quantitative Trading Literature',
    sourceDocument: 'Optimal Execution of Portfolio Transactions (Square-Root Impact Formulation)',
    sourceSection: 'Section 2.1 (Non-linear Temporary Market Impact)',
    sourceURI: 'https://doi.org/10.21314/JOR.2000.030',
    evidenceId: 'EVID-MODEL-SQRT-IMPACT-V1',
    evidenceHash: 'c9f83a48e9167b5f102e3b889345e61d8a39b2e04369a834e062c3e414cbb159',
    
    // Provenance Category Separation
    academicLineage: 'Square-root market impact functional form (Barra / Almgren-Chriss literature lineage)',
    regulatoryEvidence: {
      sourceAuthority: 'ESMA / SEC',
      sourceDocument: 'MiFID II RTS 27 / SEC Rule 605',
      sourceURI: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32017R0575',
      evidenceId: 'EVID-REG-MIFID-SEC-605',
      role: 'Regulatory execution-quality transparency context (does NOT constitute empirical mathematical calibration)'
    },
    empiricalCalibrationEvidence: {
      status: 'UNAVAILABLE',
      description: 'Model uses configured baseline assumptions rather than empirical trading dataset calibration'
    },
    configurationEvidence: {
      status: LiquidityDataStatus.CONFIGURED,
      evidenceId: 'EVID-CFG-IMPACT-SQRT-010'
    },

    largeCapCoefficient: 0.08,
    midCapCoefficient: 0.12,
    smallCapCoefficient: 0.20,
    source: 'Optimal Execution of Portfolio Transactions (Square-Root Impact Approximation)'
  },

  // Liquidity Score Methodology Specification
  liquidityScoreMethodology: {
    scoreVersion: 'LIQUIDITY_SCORE_V1',
    components: {
      advComponent: { maxPoints: 50, weight: 0.50, formula: 'min(50, log10(max(1, DollarADV / 100000)) * 12.5)' },
      spreadComponent: { maxPoints: 35, weight: 0.35, formula: 'max(0, min(35, 35 - (SpreadBps * 0.35)))' },
      mktCapComponent: { maxPoints: 15, weight: 0.15, formula: 'cap >= $10B ? 15 : (cap >= $2B ? 10 : 5)' }
    },
    normalization: 'Bounded additive score clamped strictly to [0, 100]',
    missingDataPolicy: 'REJECT_MISSING_ADV'
  },

  // Commission & Fee Schedules (Configured defaults)
  explicitCosts: {
    usEquityCommissionBps: 1.0, // 1 bp
    inEquityCommissionBps: 2.5, // 2.5 bps
    usExchangeFeeBps: 0.5,
    inSttBps: 10.0 // 0.10% STT in India
  },

  // Stress Scenario Multipliers
  stressMultipliers: {
    ADV_CONTRACTION_25: { advMultiplier: 0.75, spreadMultiplier: 1.0, impactMultiplier: 1.0 },
    ADV_CONTRACTION_50: { advMultiplier: 0.50, spreadMultiplier: 1.0, impactMultiplier: 1.0 },
    ADV_CONTRACTION_75: { advMultiplier: 0.25, spreadMultiplier: 1.0, impactMultiplier: 1.0 },
    SPREAD_EXPANSION_1_5X: { advMultiplier: 1.0, spreadMultiplier: 1.5, impactMultiplier: 1.0 },
    SPREAD_EXPANSION_2X: { advMultiplier: 1.0, spreadMultiplier: 2.0, impactMultiplier: 1.0 },
    SPREAD_EXPANSION_3X: { advMultiplier: 1.0, spreadMultiplier: 3.0, impactMultiplier: 1.0 },
    IMPACT_COEFFICIENT_1_5X: { advMultiplier: 1.0, spreadMultiplier: 1.0, impactMultiplier: 1.5 },
    IMPACT_COEFFICIENT_2X: { advMultiplier: 1.0, spreadMultiplier: 1.0, impactMultiplier: 2.0 },
    JOINT_STRESS_SEVERE: { advMultiplier: 0.50, spreadMultiplier: 2.0, impactMultiplier: 2.0 }
  }
});

export const LIQUIDITY_POLICY_V2 = deepFreeze({
  ...LIQUIDITY_POLICY_V1,
  policyVersion: 'LIQUIDITY_POLICY_V2.0',
  policyId: 'POL-LIQ-INST-V2',
  effectiveFrom: '2025-01-01T00:00:00.000Z',
  effectiveTo: '2027-12-31T23:59:59.999Z',
  maxParticipationRateNormal: 0.08, // 8% tighter institutional mandate
  defaultMaxParticipationRate: 0.08,
  defaultMaxLiquidationDays: 3 // tighter 3-day mandate
});
