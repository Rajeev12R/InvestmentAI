/**
 * Phase 14 — Versioned Policy Configurations for Portfolio Construction
 */

export const PORTFOLIO_OPTIMIZATION_CONFIG_V1 = Object.freeze({
  configId: "PORTFOLIO_OPTIMIZATION_CONFIG_V1",
  version: 1,
  defaultRiskAversionLambda: 2.5,
  maxIterations: 1000,
  convergenceTolerance: 1e-7,
  objectiveImprovementTolerance: 1e-9,
  stationarityTolerance: 1e-6,
  feasibilityTolerance: 1e-6,
  weightSumTolerance: 1e-4,
  minEigenvalueTolerance: 1e-8,
  conditionNumberLimit: 1e6,
  minObservationsForCovariance: 30,
  hybridValuationWeight: 0.40,
  hybridConvictionWeight: 0.35,
  hybridRiskWeight: 0.25
});

export const PORTFOLIO_OPTIMIZATION_CONFIG_V2 = Object.freeze({
  configId: "PORTFOLIO_OPTIMIZATION_CONFIG_V2",
  version: 2,
  defaultRiskAversionLambda: 3.0,
  maxIterations: 2000,
  convergenceTolerance: 1e-8,
  objectiveImprovementTolerance: 1e-10,
  stationarityTolerance: 1e-7,
  feasibilityTolerance: 1e-7,
  weightSumTolerance: 1e-5,
  minEigenvalueTolerance: 1e-9,
  conditionNumberLimit: 1e5,
  minObservationsForCovariance: 60,
  hybridValuationWeight: 0.45,
  hybridConvictionWeight: 0.30,
  hybridRiskWeight: 0.25
});

export const PORTFOLIO_CONSTRAINT_CONFIG_V1 = Object.freeze({
  configId: "PORTFOLIO_CONSTRAINT_CONFIG_V1",
  version: 1,
  defaultMinWeight: 0.0,
  defaultMaxWeight: 1.0,
  defaultMinCash: 0.0,
  defaultMaxCash: 0.20,
  defaultMaxSectorWeight: 1.0,
  defaultMaxGeographyWeight: 1.0,
  defaultMaxOneWayTurnover: 0.50,
  defaultMaxADVParticipation: 0.10, // 10% of ADV
  defaultAllowShorting: false,
  defaultAllowLeverage: false,
  maxLeverageGross: 1.0
});

export const PORTFOLIO_RISK_CONFIG_V1 = Object.freeze({
  configId: "PORTFOLIO_RISK_CONFIG_V1",
  version: 1,
  annualizationFactor: 252,
  downsideTargetReturn: 0.0,
  riskContributionTolerance: 1e-4,
  maxHHI: 0.25,
  minEffectiveN: 4.0
});

export const PORTFOLIO_COST_CONFIG_V1 = Object.freeze({
  configId: "PORTFOLIO_COST_CONFIG_V1",
  version: 1,
  linearTransactionCostBps: 10, // 10 bps linear cost
  marketImpactQuadraticBps: 5,  // 5 bps quadratic impact coefficient
  defaultSpreadBps: 5
});
