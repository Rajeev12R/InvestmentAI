/**
 * Phase 15 — Versioned Policy Configurations for Portfolio Implementation, Monitoring & Rebalancing
 */

export const IMPLEMENTATION_POLICY_V1 = Object.freeze({
  policyId: "IMPLEMENTATION_POLICY_V1",
  version: 1,
  // Drift thresholds (absolute & relative)
  positionAbsoluteDriftWarning: 0.02, // 2 percentage points
  positionAbsoluteDriftBreach: 0.05,  // 5 percentage points
  positionRelativeDriftWarning: 0.20, // 20% relative drift
  positionRelativeDriftBreach: 0.40,  // 40% relative drift
  sectorDriftWarning: 0.04,          // 4 percentage points
  sectorDriftBreach: 0.07,           // 7 percentage points
  geographyDriftWarning: 0.05,
  geographyDriftBreach: 0.08,
  cashDriftWarning: 0.03,
  cashDriftBreach: 0.06,
  riskDriftWarning: 0.03,            // 3% volatility difference
  riskDriftBreach: 0.06,
  concentrationDriftWarning: 0.05,   // HHI drift
  concentrationDriftBreach: 0.10,

  // Rebalance thresholds
  minNetBenefitBpsForRebalance: 10,   // 10 bps minimum expected net benefit
  maxOneWayTurnoverPerRebalance: 0.50, // 50% max turnover
  maxADVParticipationCap: 0.10,      // 10% ADV participation cap
  maxDaysToLiquidateBreach: 5.0,      // >5 days triggers breach

  // Cost & tax assumptions
  linearTransactionCostBps: 10,
  marketImpactQuadraticBps: 5,
  defaultSpreadBps: 5,
  shortTermCapitalGainsRate: 0.35,
  longTermCapitalGainsRate: 0.20,

  // Quality scoring
  maxAcceptableWeightError: 0.03,
  maxAcceptableValueDeltaPct: 0.05,
  maxAllowedUnexpectedPositions: 0,
  stalePriceThresholdDays: 30,
  approvalRequiredRole: "PORTFOLIO_MANAGER"
});

export const IMPLEMENTATION_POLICY_V2 = Object.freeze({
  policyId: "IMPLEMENTATION_POLICY_V2",
  version: 2,
  positionAbsoluteDriftWarning: 0.015,
  positionAbsoluteDriftBreach: 0.035,
  positionRelativeDriftWarning: 0.15,
  positionRelativeDriftBreach: 0.30,
  sectorDriftWarning: 0.03,
  sectorDriftBreach: 0.05,
  geographyDriftWarning: 0.04,
  geographyDriftBreach: 0.06,
  cashDriftWarning: 0.02,
  cashDriftBreach: 0.04,
  riskDriftWarning: 0.02,
  riskDriftBreach: 0.04,
  concentrationDriftWarning: 0.03,
  concentrationDriftBreach: 0.07,

  minNetBenefitBpsForRebalance: 15,
  maxOneWayTurnoverPerRebalance: 0.40,
  maxADVParticipationCap: 0.08,
  maxDaysToLiquidateBreach: 3.0,

  linearTransactionCostBps: 12,
  marketImpactQuadraticBps: 6,
  defaultSpreadBps: 6,
  shortTermCapitalGainsRate: 0.37,
  longTermCapitalGainsRate: 0.20,

  maxAcceptableWeightError: 0.02,
  maxAcceptableValueDeltaPct: 0.03,
  maxAllowedUnexpectedPositions: 0,
  stalePriceThresholdDays: 14,
  approvalRequiredRole: "PORTFOLIO_MANAGER"
});
