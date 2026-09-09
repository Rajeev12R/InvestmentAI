/**
 * Phase 16 — Institutional Compliance Configuration & Threshold Specifications
 */

import { PolicyPrecedence, SeverityLevel, deepFreeze } from './compliance.types.js';

export const COMPLIANCE_POLICY_CONFIG_V1 = deepFreeze({
  configVersion: '1.0.0',
  description: 'Institutional Compliance Engine Baseline Configuration V1',
  numericalTolerances: {
    weightEpsilon: 0.0001,         // 1 bps numerical rounding slack for equality
    sumWeightTolerance: 0.001,     // 10 bps tolerance for portfolio weight summation to 1.0
    turnoverTolerance: 0.0005,
    cashTolerance: 0.0001
  },
  thresholds: {
    warningThresholdPercentage: 0.90, // Warning triggered at 90% of limit
    criticalMultiplier: 1.20          // Critical breach if 20% over limit
  },
  stalenessPolicy: {
    maxPriceAgeHours: 24,
    maxHoldingsAgeHours: 48,
    maxFXAgeHours: 24
  },
  exceptionRules: {
    maxDurationDays: 30,
    requiresDualApprovalAboveSeverity: SeverityLevel.HIGH,
    allowSelfApproval: false
  },
  precedenceHierarchy: [
    { level: PolicyPrecedence.REGULATORY_HARD, name: 'REGULATORY_HARD' },
    { level: PolicyPrecedence.FIRM_MANDATE, name: 'FIRM_MANDATE' },
    { level: PolicyPrecedence.PORTFOLIO_MANDATE, name: 'PORTFOLIO_MANDATE' },
    { level: PolicyPrecedence.STRATEGY_POLICY, name: 'STRATEGY_POLICY' },
    { level: PolicyPrecedence.SOFT_PREFERENCE, name: 'SOFT_PREFERENCE' }
  ]
});

export const COMPLIANCE_POLICY_CONFIG_V2 = deepFreeze({
  ...COMPLIANCE_POLICY_CONFIG_V1,
  configVersion: '2.0.0',
  description: 'Institutional Compliance Engine Hardened Configuration V2',
  stalenessPolicy: {
    maxPriceAgeHours: 12,
    maxHoldingsAgeHours: 24,
    maxFXAgeHours: 12
  },
  exceptionRules: {
    maxDurationDays: 14,
    requiresDualApprovalAboveSeverity: SeverityLevel.MEDIUM,
    allowSelfApproval: false
  }
});

export const COMPLIANCE_THRESHOLDS_V1 = deepFreeze({
  maxPositionWeight: 0.10,        // 10%
  maxSectorWeight: 0.35,          // 35%
  maxIndustryWeight: 0.20,        // 20%
  maxGeographyWeight: 0.40,       // 40%
  minCashWeight: 0.05,            // 5%
  maxCashWeight: 0.25,            // 25%
  maxGrossLeverage: 1.00,         // 100% (No leverage by default)
  maxNetLeverage: 1.00,
  maxTurnover: 0.20,              // 20%
  maxADVParticipation: 0.10,      // 10%
  shortingAllowed: false
});
