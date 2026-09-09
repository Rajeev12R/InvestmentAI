/**
 * server/riskAttribution/riskAttribution.types.js
 * 
 * Phase 32: Institutional Risk Attribution & Explainability Types & Taxonomy
 * Point-in-time, mathematically reconcilable, auditable risk attribution definitions.
 */

export const AttributionType = Object.freeze({
  MARGINAL: 'MARGINAL',                   // Marginal Risk Contribution (MRC_i = (Sigma*w)_i / sigma_p)
  COMPONENT: 'COMPONENT',                 // Component Risk Contribution (CRC_i = w_i * MRC_i)
  PERCENTAGE: 'PERCENTAGE',               // Percentage Risk Contribution (PRC_i = CRC_i / sigma_p)
  VARIANCE: 'VARIANCE',                   // Variance Contribution (w_i * (Sigma*w)_i)
  FACTOR: 'FACTOR',                       // Systematic Factor vs Idiosyncratic Decomposition
  SECTOR: 'SECTOR',                       // Canonical Sector Aggregation of Position-Level Attribution
  GEOGRAPHY: 'GEOGRAPHY',                 // Canonical Geography Aggregation
  SLEEVE: 'SLEEVE',                       // Portfolio Sleeve / Strategy Sub-portfolio Aggregation
  CONCENTRATION: 'CONCENTRATION',         // Weight Concentration vs Risk Concentration (HHI, ENC)
  CORRELATION: 'CORRELATION',             // Standalone Volatility vs Cross-Asset Covariance Allocation
  TAIL_RISK: 'TAIL_RISK',                 // Parametric CVaR, Component ES, Tail Shortfall Attribution
  STRESS: 'STRESS',                       // Stress Scenario-Conditioned Risk Attribution
  REGIME: 'REGIME',                       // Macro Regime-Conditioned Risk Shifts
  LIQUIDITY: 'LIQUIDITY',                 // Liquidity-Adjusted Risk / Illiquidity Drag Attribution
  ACTIVE: 'ACTIVE'                        // Benchmark-Relative / Tracking Error Attribution
});

export const ConfidenceStatus = Object.freeze({
  CALCULATED: 'CALCULATED',               // Exact analytical calculation from observed data
  DERIVED: 'DERIVED',                     // Deterministic transformation of calculated values
  MODEL_BASED: 'MODEL_BASED',             // Factor model / parametric distribution projection
  SCENARIO: 'SCENARIO',                   // Conditional stress / regime scenario assumption
  UNAVAILABLE: 'UNAVAILABLE'              // Missing input / insufficient data (never fabricated)
});

export const CovarianceAllocationConvention = Object.freeze({
  MARGINAL_SPLIT: 'MARGINAL_SPLIT',       // w_i * sum_{j!=i} w_j * sigma_{ij} allocated to asset i
  EQUAL_SPLIT: 'EQUAL_SPLIT'              // 0.5 * sum_{j!=i} w_i * w_j * sigma_{ij} allocated to each pair member
});

export const ResidualPolicy = Object.freeze({
  RECONCILED_WITHIN_TOLERANCE: 'RECONCILED_WITHIN_TOLERANCE',
  EXPLICIT_RESIDUAL: 'EXPLICIT_RESIDUAL'
});

export const HierarchyLevel = Object.freeze({
  PORTFOLIO: 'PORTFOLIO',
  RISK_TYPE: 'RISK_TYPE',
  SLEEVE: 'SLEEVE',
  SECTOR: 'SECTOR',
  GEOGRAPHY: 'GEOGRAPHY',
  ASSET: 'ASSET',
  POSITION: 'POSITION',
  FACTOR: 'FACTOR'
});

export const DataClassification = Object.freeze({
  RESTRICTED_PORTFOLIO_STATE: 'RESTRICTED_PORTFOLIO_STATE',
  AUDITED_ATTRIBUTION_SEAL: 'AUDITED_ATTRIBUTION_SEAL',
  CALCULATED: 'CALCULATED',
  DERIVED: 'DERIVED',
  MODEL_BASED: 'MODEL_BASED',
  SCENARIO: 'SCENARIO',
  UNAVAILABLE: 'UNAVAILABLE'
});

export function deepFreeze(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  Object.freeze(obj);
  for (const key of Object.getOwnPropertyNames(obj)) {
    const val = obj[key];
    if (val !== null && typeof val === 'object' && !Object.isFrozen(val)) {
      deepFreeze(val);
    }
  }
  return obj;
}
