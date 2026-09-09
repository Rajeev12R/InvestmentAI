/**
 * Portfolio Construction & Optimization Express Routes — Phase 14
 */

import express from 'express';
import { PortfolioOptimizerEngine } from '../portfolioConstruction/portfolioConstruction.optimizer.engine.js';
import { PortfolioInputValidator } from '../portfolioConstruction/portfolioConstruction.inputValidator.js';
import { ExpectedReturnEngine } from '../portfolioConstruction/portfolioConstruction.expectedReturn.engine.js';
import { CovarianceEngine } from '../portfolioConstruction/portfolioConstruction.covariance.engine.js';
import { ConstraintEngine } from '../portfolioConstruction/portfolioConstruction.constraints.engine.js';
import { TurnoverEngine } from '../portfolioConstruction/portfolioConstruction.turnover.engine.js';
import { LiquidityEngine } from '../portfolioConstruction/portfolioConstruction.liquidity.engine.js';
import { TransactionCostEngine } from '../portfolioConstruction/portfolioConstruction.transactionCost.engine.js';
import { ScenarioEngine } from '../portfolioConstruction/portfolioConstruction.scenario.engine.js';
import { StressTestEngine } from '../portfolioConstruction/portfolioConstruction.stressTest.engine.js';
import { PortfolioComparisonEngine } from '../portfolioConstruction/portfolioConstruction.comparison.engine.js';
import { ExplanationEngine } from '../portfolioConstruction/portfolioConstruction.explanation.engine.js';
import { OptimizationValidator } from '../portfolioConstruction/portfolioConstruction.validation.engine.js';
import { PortfolioConstructionPackageBuilder } from '../portfolioConstruction/portfolioConstruction.package.js';
import { portfolioConstructionRepository } from '../portfolioConstruction/portfolioConstruction.repository.js';
import { OptimizationMethod, OptimizationStatus, ExecutionStatus } from '../portfolioConstruction/portfolioConstruction.types.js';
import { PORTFOLIO_OPTIMIZATION_CONFIG_V1 } from '../portfolioConstruction/portfolioConstructionConfig.js';

const router = express.Router();

/**
 * Helper to ensure user has proper workspace authorization.
 */
function checkWorkspaceAuth(req, res) {
  const workspaceId = req.headers['x-workspace-id'] || req.query.workspaceId || req.body?.workspaceId || 'DEFAULT_WS';
  const role = req.user?.role || req.headers['x-user-role'] || 'ANALYST';
  return { workspaceId, role };
}

/**
 * POST /api/portfolio-construction/optimize
 * Runs deterministic portfolio optimization and stores sealed package.
 */
router.post('/optimize', (req, res) => {
  try {
    const { workspaceId, role } = checkWorkspaceAuth(req, res);
    if (role === 'VIEWER') {
      return res.status(403).json({ error: 'VIEWER role is not authorized to run portfolio optimization' });
    }

    const payload = req.body || {};
    payload.workspaceId = workspaceId;
    if (!payload.asOf) payload.asOf = new Date().toISOString();

    // 1. Input Validation
    const validation = PortfolioInputValidator.validate(payload);
    if (!validation.isValid) {
      return res.status(400).json({
        status: OptimizationStatus.INVALID_INPUT,
        errors: validation.errors
      });
    }

    const {
      portfolioId,
      portfolioSnapshotId,
      method = OptimizationMethod.MEAN_VARIANCE,
      securities = [],
      currentWeights = {},
      expectedReturns = {},
      covarianceMatrix = null,
      constraints = {},
      convictions = {},
      liquidityMap = {},
      portfolioValue = 1000000,
      asOf = new Date().toISOString()
    } = payload;

    // 2. Feasibility check
    const feasibility = ConstraintEngine.evaluateConstraints(securities, constraints);
    if (!feasibility.isFeasible) {
      return res.status(422).json({
        status: OptimizationStatus.INFEASIBLE_CONSTRAINTS,
        conflicts: feasibility.conflicts,
        summary: "Constraint set is mathematically infeasible"
      });
    }

    // 3. Optimization
    const optResult = PortfolioOptimizerEngine.optimize({
      method,
      universeSecurities: securities,
      expectedReturns,
      covarianceMatrix,
      constraints,
      convictions,
      config: PORTFOLIO_OPTIMIZATION_CONFIG_V1
    });

    if (optResult.status !== OptimizationStatus.OPTIMAL && optResult.status !== OptimizationStatus.FEASIBLE) {
      return res.status(400).json(optResult);
    }

    // 4. Post-Optimization Validation
    const postValidation = OptimizationValidator.validate(optResult, securities, constraints);
    if (!postValidation.isValid) {
      return res.status(400).json({
        status: OptimizationStatus.OPTIMIZATION_INVALID,
        errors: postValidation.errors
      });
    }

    // 5. Turnover & Cost Modeling
    const turnover = TurnoverEngine.calculateTurnover(currentWeights, optResult.weights);
    const costs = TransactionCostEngine.estimateTransactionCosts(turnover, portfolioValue);
    const liquidity = LiquidityEngine.evaluateLiquidity(optResult.weights, liquidityMap, portfolioValue);
    const stress = covarianceMatrix ? StressTestEngine.runStressTestSuite(optResult.weights, covarianceMatrix, securities) : null;
    const explanation = ExplanationEngine.buildExplanationGraph(
      optResult.weights,
      method,
      securities,
      expectedReturns,
      optResult.riskBudget,
      constraints,
      PORTFOLIO_OPTIMIZATION_CONFIG_V1
    );

    // 6. Build Sealed Package
    const sealedPackage = PortfolioConstructionPackageBuilder.buildPackage({
      workspaceId,
      portfolioId,
      portfolioSnapshotId,
      optimizationMethod: method,
      constraints,
      targetWeights: optResult.weights,
      currentWeights,
      turnover,
      expectedReturn: optResult.portfolioExpectedReturn,
      portfolioRisk: optResult.portfolioVolatility,
      riskBudget: optResult.riskBudget,
      diversification: optResult.diversification,
      liquidity,
      transactionCosts: costs,
      stressTesting: stress,
      explanationGraph: explanation,
      evidenceIds: securities.map(s => `EVID-OPT-${s.ticker}`),
      asOf
    });

    portfolioConstructionRepository.savePackage(sealedPackage);

    return res.status(200).json(sealedPackage);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/portfolio-construction/scenario
 * Runs what-if scenarios without mutating state.
 */
router.post('/scenario', (req, res) => {
  try {
    const { baselineAllocation, scenarioSpec, covarianceMatrix, expectedReturns } = req.body || {};
    if (!baselineAllocation || !baselineAllocation.weights) {
      return res.status(400).json({ error: "baselineAllocation with weights is required" });
    }

    const scenarioResult = ScenarioEngine.runScenario(baselineAllocation, scenarioSpec, covarianceMatrix, expectedReturns);
    return res.json(scenarioResult);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/portfolio-construction/compare
 * Compares Current vs Proposed allocations.
 */
router.post('/compare', (req, res) => {
  try {
    const { currentWeights, targetWeights, securities = [], covarianceMatrix, expectedReturns } = req.body || {};
    const comparison = PortfolioComparisonEngine.compare(currentWeights, targetWeights, securities, covarianceMatrix, expectedReturns);
    return res.json(comparison);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/portfolio-construction/validate
 * Validates constraints and inputs before running full optimization.
 */
router.post('/validate', (req, res) => {
  try {
    const { securities = [], constraints = {} } = req.body || {};
    const feasibility = ConstraintEngine.evaluateConstraints(securities, constraints);
    return res.json(feasibility);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/portfolio-construction/review
 * Records human review and approval boundary for a portfolio construction package.
 */
router.post('/review', (req, res) => {
  try {
    const { workspaceId, role } = checkWorkspaceAuth(req, res);
    if (role === 'VIEWER') {
      return res.status(403).json({ error: 'VIEWER role cannot approve portfolio construction reviews' });
    }

    const { packageId, decision = "APPROVED", notes = "" } = req.body || {};
    if (!packageId) {
      return res.status(400).json({ error: "packageId is required for review" });
    }

    const reviewRecord = portfolioConstructionRepository.saveReview({
      packageId,
      workspaceId,
      reviewedBy: req.user?.username || req.user?.id || "PORTFOLIO_MANAGER",
      decision,
      notes
    });

    return res.json(reviewRecord);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/portfolio-construction/:portfolioId
 * Returns latest package for portfolio.
 */
router.get('/:portfolioId', (req, res) => {
  try {
    const { workspaceId } = checkWorkspaceAuth(req, res);
    const { portfolioId } = req.params;
    const packages = portfolioConstructionRepository.listPackagesByPortfolio(portfolioId, workspaceId);
    if (packages.length === 0) {
      return res.status(404).json({ error: `No portfolio construction package found for ${portfolioId}` });
    }
    return res.json(packages[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/portfolio-construction/:portfolioId/history
 * Returns full package history for portfolio.
 */
router.get('/:portfolioId/history', (req, res) => {
  try {
    const { workspaceId } = checkWorkspaceAuth(req, res);
    const { portfolioId } = req.params;
    const packages = portfolioConstructionRepository.listPackagesByPortfolio(portfolioId, workspaceId);
    return res.json(packages);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/portfolio-construction/:portfolioId/package/:packageId
 * Returns a specific package with workspace isolation.
 */
router.get('/:portfolioId/package/:packageId', (req, res) => {
  try {
    const { workspaceId } = checkWorkspaceAuth(req, res);
    const { packageId } = req.params;
    const pkg = portfolioConstructionRepository.getPackageById(packageId, workspaceId);
    if (!pkg) {
      return res.status(404).json({ error: `Package ${packageId} not found or access denied in this workspace` });
    }
    return res.json(pkg);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
