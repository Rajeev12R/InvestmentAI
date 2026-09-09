/**
 * Phase 17 — Tax Configuration & Versioned Policies
 */

import { canonicalHash, CostBasisMethod, deepFreeze } from './tax.types.js';

export const TAX_THRESHOLDS_V1 = deepFreeze({
  epsilon: 0.00001,
  minHarvestLossAmount: 100.0,
  minHarvestLossPercent: 0.02, // 2% loss hurdle
  washSaleLookbackDays: 30,
  washSaleLookforwardDays: 30,
  maxTurnoverTolerance: 1.0,
  minHoldingPeriodDaysUS: 365,
  minHoldingPeriodDaysIN: 365,
  defaultBasisMethod: CostBasisMethod.FIFO
});

const RAW_POLICY_V1 = {
  policyId: 'TAX_POLICY_V1',
  version: '1.0.0',
  name: 'Institutional Global Tax Optimization Policy V1',
  effectiveFrom: '2024-01-01T00:00:00.000Z',
  effectiveTo: '2025-12-31T23:59:59.999Z',
  defaultBasisMethod: CostBasisMethod.FIFO,
  objectiveWeights: {
    lambda1Risk: 1.0,           // Risk penalty
    lambda2TransactionCost: 1.0, // Transaction cost penalty
    lambda3TaxCost: 1.5,         // Realized tax cost penalty
    lambda4TurnoverPenalty: 0.5  // Turnover penalty
  },
  supportedJurisdictions: ['US', 'IN'],
  harvesting: {
    minLossDollars: 100.0,
    minLossPercent: 0.02,
    hurdleMultiple: 1.5 // estimated tax benefit must exceed transaction cost * 1.5
  },
  washSale: {
    lookbackDays: 30,
    lookforwardDays: 30,
    strictReplacementCheck: true
  }
};

const POLICY_V1_HASH = canonicalHash(RAW_POLICY_V1);

export const TAX_POLICY_V1 = deepFreeze({
  ...RAW_POLICY_V1,
  policyHash: POLICY_V1_HASH
});

const RAW_POLICY_V2 = {
  policyId: 'TAX_POLICY_V2',
  version: '2.0.0',
  name: 'Institutional Global Tax Optimization Policy V2 (Enhanced Alpha & STCG Mitigation)',
  effectiveFrom: '2026-01-01T00:00:00.000Z',
  effectiveTo: null,
  supersedes: 'TAX_POLICY_V1',
  supersedesHash: POLICY_V1_HASH,
  defaultBasisMethod: CostBasisMethod.FIFO,
  objectiveWeights: {
    lambda1Risk: 1.0,
    lambda2TransactionCost: 1.0,
    lambda3TaxCost: 2.0,         // Increased penalty on realized tax
    lambda4TurnoverPenalty: 0.75
  },
  supportedJurisdictions: ['US', 'IN'],
  harvesting: {
    minLossDollars: 50.0,
    minLossPercent: 0.015,
    hurdleMultiple: 1.2
  },
  washSale: {
    lookbackDays: 30,
    lookforwardDays: 30
  }
};

const POLICY_V2_HASH = canonicalHash(RAW_POLICY_V2);

export const TAX_POLICY_V2 = deepFreeze({
  ...RAW_POLICY_V2,
  policyHash: POLICY_V2_HASH
});

export const TAX_OPTIMIZATION_OBJECTIVE_V1 = deepFreeze({
  objectiveId: 'TAX_OPTIMIZATION_OBJECTIVE_V1',
  version: '1.0.0',
  description: 'Normalized institutional tax-aware utility objective function',
  formula: 'Utility = ExpectedReturnRate - lambda1*Risk - lambda2*TransactionCostRate - lambda3*TaxCostRate - lambda4*TurnoverRate',
  weights: {
    lambda1Risk: 1.0,
    lambda2TransactionCost: 1.0,
    lambda3TaxCost: 1.5,
    lambda4TurnoverPenalty: 0.5
  },
  units: {
    expectedReturn: 'ANNUALIZED_PERCENT_DECIMAL',
    risk: 'ANNUALIZED_VARIANCE_DECIMAL',
    transactionCostRate: 'TOTAL_COST_DIVIDED_BY_PORTFOLIO_VALUE',
    taxCostRate: 'REALIZED_TAX_DIVIDED_BY_PORTFOLIO_VALUE',
    turnoverRate: 'ONE_WAY_TURNOVER_DECIMAL'
  },
  scaleInvariance: true,
  objectiveHash: canonicalHash({
    id: 'TAX_OPTIMIZATION_OBJECTIVE_V1',
    weights: { lambda1Risk: 1.0, lambda2TransactionCost: 1.0, lambda3TaxCost: 1.5, lambda4TurnoverPenalty: 0.5 }
  })
});

export const TAX_OPTIMIZATION_OBJECTIVE_V2 = deepFreeze({
  objectiveId: 'TAX_OPTIMIZATION_OBJECTIVE_V2',
  version: '2.0.0',
  description: 'Normalized institutional tax-aware utility objective function with high STCG penalty',
  formula: 'Utility = ExpectedReturnRate - lambda1*Risk - lambda2*TransactionCostRate - lambda3*TaxCostRate - lambda4*TurnoverRate',
  weights: {
    lambda1Risk: 1.0,
    lambda2TransactionCost: 1.0,
    lambda3TaxCost: 2.0,
    lambda4TurnoverPenalty: 0.75
  },
  units: {
    expectedReturn: 'ANNUALIZED_PERCENT_DECIMAL',
    risk: 'ANNUALIZED_VARIANCE_DECIMAL',
    transactionCostRate: 'TOTAL_COST_DIVIDED_BY_PORTFOLIO_VALUE',
    taxCostRate: 'REALIZED_TAX_DIVIDED_BY_PORTFOLIO_VALUE',
    turnoverRate: 'ONE_WAY_TURNOVER_DECIMAL'
  },
  scaleInvariance: true,
  objectiveHash: canonicalHash({
    id: 'TAX_OPTIMIZATION_OBJECTIVE_V2',
    weights: { lambda1Risk: 1.0, lambda2TransactionCost: 1.0, lambda3TaxCost: 2.0, lambda4TurnoverPenalty: 0.75 }
  })
});

