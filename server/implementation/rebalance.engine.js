/**
 * Phase 15 — Rebalance Candidate Engine
 * 
 * Re-invokes Phase 14 portfolio optimization under current holdings and updated constraints
 * to produce candidate rebalance allocations when triggers fire.
 */

import { PortfolioOptimizerEngine } from '../portfolioConstruction/portfolioConstruction.optimizer.engine.js';
import { OptimizationMethod, OptimizationStatus } from '../portfolioConstruction/portfolioConstruction.types.js';
import { ImplementationStatus, RebalanceStatus, canonicalHash, deepFreeze } from './implementation.types.js';
import { ImplementationPlanEngine } from './implementationPlan.engine.js';
import { IMPLEMENTATION_POLICY_V1 } from './implementation.config.js';

export class RebalanceEngine {
  /**
   * Produce a candidate rebalance package and implementation plan.
   */
  static generateRebalanceCandidate(params) {
    const {
      workspaceId,
      portfolioId,
      asOf = new Date().toISOString(),
      currentHoldingsSnapshot,
      targetPackage,
      securities = null,
      expectedReturns = {},
      covarianceMatrix = null,
      constraints = {},
      method = OptimizationMethod.MEAN_VARIANCE,
      marketPrices = {},
      policy = IMPLEMENTATION_POLICY_V1
    } = params;

    if (!workspaceId || !portfolioId) {
      return { status: ImplementationStatus.INVALID_INPUT, reasonCode: 'MISSING_WORKSPACE_OR_PORTFOLIO_ID', rebalanceCandidate: null };
    }
    if (!currentHoldingsSnapshot || !Array.isArray(currentHoldingsSnapshot.holdings)) {
      return { status: ImplementationStatus.INSUFFICIENT_DATA, reasonCode: 'MISSING_CURRENT_HOLDINGS', rebalanceCandidate: null };
    }
    if (typeof currentHoldingsSnapshot.totalValue !== 'number' || isNaN(currentHoldingsSnapshot.totalValue) || !isFinite(currentHoldingsSnapshot.totalValue) || currentHoldingsSnapshot.totalValue <= 0) {
      return { status: ImplementationStatus.INVALID_INPUT, reasonCode: 'INVALID_PORTFOLIO_CAPITAL', rebalanceCandidate: null };
    }

    const universeSecurities = Array.isArray(securities) && securities.length > 0
      ? securities
      : currentHoldingsSnapshot.holdings
          .filter(h => h.assetClass !== 'CASH' && !h.ticker.endsWith('_CASH') && h.ticker !== 'CASH')
          .map(h => ({
            ticker: h.ticker,
            sector: h.sector || 'Unassigned',
            geography: h.geography || 'US'
          }));

    // Re-solve portfolio optimization using Phase 14 optimizer
    const optResult = PortfolioOptimizerEngine.optimize({
      method,
      universeSecurities,
      expectedReturns,
      covarianceMatrix,
      constraints,
      config: {
        maxIterations: 1000,
        convergenceTolerance: 1e-7
      }
    });

    if (optResult.status !== OptimizationStatus.OPTIMAL && optResult.status !== OptimizationStatus.FEASIBLE) {
      return {
        status: optResult.status === OptimizationStatus.INFEASIBLE_CONSTRAINTS
          ? ImplementationStatus.INFEASIBLE_CONSTRAINTS
          : ImplementationStatus.NUMERICAL_FAILURE,
        reasonCode: optResult.reasonCode || 'OPTIMIZATION_FAILED',
        conflicts: optResult.conflicts,
        rebalanceCandidate: null
      };
    }

    const candidateTargetPackage = {
      packageHash: `CANDIDATE-TARGET-${portfolioId}-${asOf}`,
      targetWeights: optResult.weights,
      portfolioExpectedReturn: optResult.portfolioExpectedReturn,
      portfolioVolatility: optResult.portfolioVolatility,
      riskBudget: optResult.riskBudget
    };

    // Generate trade plan
    const planResult = ImplementationPlanEngine.generatePlan({
      workspaceId,
      portfolioId,
      targetPackage: candidateTargetPackage,
      currentHoldingsSnapshot,
      marketPrices,
      asOf
    });

    if (planResult.status !== ImplementationStatus.PLAN_GENERATED) {
      return {
        status: planResult.status,
        reasonCode: planResult.reasonCode || 'PLAN_GENERATION_FAILED',
        rebalanceCandidate: null
      };
    }

    const payload = {
      candidateId: `REBAL-CAND-${portfolioId}-${asOf.replace(/[:.]/g, '-')}`,
      workspaceId,
      portfolioId,
      asOf,
      method,
      status: RebalanceStatus.REBALANCE_RECOMMENDED,
      targetWeights: optResult.weights,
      plan: planResult.plan,
      portfolioExpectedReturn: optResult.portfolioExpectedReturn,
      portfolioVolatility: optResult.portfolioVolatility,
      createdAt: asOf
    };

    const hash = canonicalHash(payload);
    const sealedCandidate = deepFreeze({
      ...payload,
      candidateHash: hash
    });

    return {
      status: ImplementationStatus.REBALANCE_RECOMMENDED,
      rebalanceCandidate: sealedCandidate,
      candidatePlan: planResult.plan
    };
  }
}
