/**
 * server/portfolioOptimization/portfolioOptimization.engine.js
 * 
 * Phase 33: Canonical Institutional Portfolio Optimization Engine
 */

import { OptimizationObjective, SolverStatus, ConstraintStatus, FeasibilityStatus, DecisionAction, deepFreeze } from './portfolioOptimization.types.js';
import { OPTIMIZATION_CONFIG } from './portfolioOptimization.config.js';
import { PortfolioOptimizationValidation } from './portfolioOptimization.validation.js';
import { PortfolioOptimizationConstraints } from './portfolioOptimization.constraints.js';
import { PortfolioOptimizationObjectives } from './portfolioOptimization.objectives.js';
import { PortfolioOptimizationSolvers } from './portfolioOptimization.solvers.js';
import { RiskAttributionEngine } from '../riskAttribution/riskAttribution.engine.js';

export class PortfolioOptimizationEngine {
  /**
   * Main execution method for institutional portfolio optimization.
   */
  static runOptimization({
    objectiveType = OptimizationObjective.MINIMUM_VARIANCE,
    symbols,
    expectedReturns = null,
    covarianceMatrix,
    constraints = {},
    initialWeights = null,
    benchmarkWeights = null,
    riskTarget = null,
    riskFreeRate = 0.04,
    lambda = 1.0,
    riskBudgets = null,
    sectors = null,
    geographies = null,
    sleeves = null,
    factorExposures = null,
    periodsPerYear = 252,
    confidence = 0.95,
    solverPreference = 'AUTO',
    asOf = '2026-09-07T00:00:00.000Z'
  }) {
    const startTime = Date.now();

    // 1. Basic validation
    if (!Array.isArray(symbols) || symbols.length === 0) {
      throw new Error('Symbols array must be non-empty');
    }
    const n = symbols.length;

    PortfolioOptimizationValidation.validateCovarianceMatrix(covarianceMatrix, symbols);

    if (expectedReturns && (!Array.isArray(expectedReturns) || expectedReturns.length !== n)) {
      throw new Error(`Expected returns length (${expectedReturns?.length}) must match symbols count (${n})`);
    }

    if (initialWeights && (!Array.isArray(initialWeights) || initialWeights.length !== n)) {
      throw new Error(`Initial weights length (${initialWeights?.length}) must match symbols count (${n})`);
    }

    if (benchmarkWeights && (!Array.isArray(benchmarkWeights) || benchmarkWeights.length !== n)) {
      throw new Error(`Benchmark weights length (${benchmarkWeights?.length}) must match symbols count (${n})`);
    }

    // 2. Regularization check
    let workingCovariance = covarianceMatrix;
    let regularizationMetadata = { wasRegularized: false };
    const cholesky = PortfolioOptimizationValidation.choleskyDecomposition(covarianceMatrix);
    if (!cholesky) {
      const reg = PortfolioOptimizationValidation.regularizeCovariance(covarianceMatrix);
      workingCovariance = reg.regularizedMatrix;
      regularizationMetadata = reg;
    }

    // 3. Feasibility check
    const feasibility = PortfolioOptimizationConstraints.checkFeasibility({
      symbols,
      constraints,
      initialWeights,
      sectors,
      geographies,
      sleeves,
      factorExposures
    });

    if (!feasibility.isFeasible) {
      const failResult = {
        status: SolverStatus.INFEASIBLE,
        objectiveType,
        symbols,
        optimizedWeights: null,
        feasibility,
        message: `Optimization rejected: Constraints are infeasible (${feasibility.issues.join('; ')})`,
        asOf,
        runtimeMs: Date.now() - startTime
      };
      return deepFreeze(failResult);
    }

    // 4. Solver selection & execution
    const isAnalyticalEligible = (
      (objectiveType === OptimizationObjective.MINIMUM_VARIANCE || objectiveType === OptimizationObjective.MEAN_VARIANCE) &&
      !constraints.longOnly &&
      !constraints.minWeights &&
      !constraints.maxWeights &&
      !constraints.sectorBounds &&
      !constraints.geographyBounds &&
      !constraints.maxTurnover &&
      !constraints.maxVolatility &&
      !constraints.maxHHI &&
      !constraints.maxTrackingError &&
      solverPreference !== 'NUMERICAL_ONLY'
    );

    let solverResult;
    if (isAnalyticalEligible) {
      solverResult = PortfolioOptimizationSolvers.solveAnalyticalKKT({
        objectiveType,
        symbols,
        expectedReturns,
        covarianceMatrix: workingCovariance,
        lambda,
        periodsPerYear
      });
    } else {
      solverResult = PortfolioOptimizationSolvers.solveProjectedGradient({
        objectiveType,
        symbols,
        expectedReturns,
        covarianceMatrix: workingCovariance,
        constraints,
        initialWeights,
        benchmarkWeights,
        riskTarget,
        riskFreeRate,
        lambda,
        riskBudgets,
        sectors,
        geographies,
        sleeves,
        factorExposures,
        periodsPerYear,
        confidence
      });
    }

    if (solverResult.status !== SolverStatus.OPTIMAL) {
      return deepFreeze({
        status: solverResult.status,
        objectiveType,
        symbols,
        optimizedWeights: null,
        solverResult,
        message: solverResult.message || 'Solver failed to reach optimal convergence',
        asOf,
        runtimeMs: Date.now() - startTime
      });
    }

    const optWeights = solverResult.weights;

    // 5. Independent Post-Optimization Recomputation
    const postConstraints = PortfolioOptimizationConstraints.evaluateConstraints({
      weights: optWeights,
      symbols,
      constraints,
      covarianceMatrix: workingCovariance,
      expectedReturns,
      initialWeights,
      benchmarkWeights,
      sectors,
      geographies,
      sleeves,
      factorExposures,
      periodsPerYear,
      confidence
    });

    const postMetrics = PortfolioOptimizationObjectives.evaluateObjective({
      objectiveType,
      weights: optWeights,
      expectedReturns,
      covarianceMatrix: workingCovariance,
      benchmarkWeights,
      riskTarget,
      riskFreeRate,
      lambda,
      riskBudgets,
      periodsPerYear
    });

    const hhi = optWeights.reduce((s, w) => s + (w * w), 0);
    const enc = hhi > 0 ? 1.0 / hhi : n;

    // 6. Before / After Decision Delta Analysis
    const currentWeights = initialWeights || new Array(n).fill(1.0 / n);
    let totalTurnover = 0;
    const positionDecisions = [];

    for (let i = 0; i < n; i++) {
      const initW = currentWeights[i];
      const newW = optWeights[i];
      const deltaW = newW - initW;
      totalTurnover += Math.abs(deltaW);

      let action = DecisionAction.HOLD;
      if (Math.abs(deltaW) > 1e-4) {
        if (initW <= 1e-6 && newW > 1e-6) action = DecisionAction.ENTER;
        else if (initW > 1e-6 && newW <= 1e-6) action = DecisionAction.EXIT;
        else if (deltaW > 0) action = DecisionAction.INCREASE;
        else action = DecisionAction.DECREASE;
      }

      positionDecisions.push({
        symbol: symbols[i],
        initialWeight: initW,
        optimizedWeight: newW,
        weightDelta: deltaW,
        action
      });
    }

    // 7. Phase 32 Risk Attribution Integration (Current vs Optimized Risk Shift)
    let currentRiskAttribution = null;
    let optimizedRiskAttribution = null;
    let riskAttributionDelta = null;

    try {
      currentRiskAttribution = RiskAttributionEngine.runComprehensiveAttribution({
        symbols,
        weights: currentWeights,
        covarianceMatrix: workingCovariance,
        sectors: sectors || {},
        geographies: geographies || {},
        sleeves: sleeves || {},
        factorExposures: factorExposures || {},
        confidence,
        asOf,
        periodsPerYear
      });

      optimizedRiskAttribution = RiskAttributionEngine.runComprehensiveAttribution({
        symbols,
        weights: optWeights,
        covarianceMatrix: workingCovariance,
        sectors: sectors || {},
        geographies: geographies || {},
        sleeves: sleeves || {},
        factorExposures: factorExposures || {},
        confidence,
        asOf,
        periodsPerYear
      });

      riskAttributionDelta = {
        volatilityDelta: optimizedRiskAttribution.portfolioMetrics.portfolioVolatility - currentRiskAttribution.portfolioMetrics.portfolioVolatility,
        varianceDelta: optimizedRiskAttribution.portfolioMetrics.portfolioVariance - currentRiskAttribution.portfolioMetrics.portfolioVariance,
        hhiDelta: optimizedRiskAttribution.concentrationAttribution.weightHHI - currentRiskAttribution.concentrationAttribution.weightHHI,
        encDelta: optimizedRiskAttribution.concentrationAttribution.effectiveNumberOfConstituents - currentRiskAttribution.concentrationAttribution.effectiveNumberOfConstituents,
        vaRDelta: (optimizedRiskAttribution.tailRiskAttribution?.portfolioVaR || 0) - (currentRiskAttribution.tailRiskAttribution?.portfolioVaR || 0),
        esDelta: (optimizedRiskAttribution.tailRiskAttribution?.portfolioExpectedShortfall || 0) - (currentRiskAttribution.tailRiskAttribution?.portfolioExpectedShortfall || 0)
      };
    } catch (err) {
      // Gracefully record if Phase 32 attribution optional parameters omitted
    }

    // 8. Overall Certification Status
    const isCertifiedValid = postConstraints.allHardPassed;

    const result = {
      certificationStatus: isCertifiedValid ? 'CERTIFIED_OPTIMAL' : 'REJECTED_CONSTRAINT_VIOLATION',
      status: isCertifiedValid ? SolverStatus.OPTIMAL : SolverStatus.INFEASIBLE,
      objectiveType,
      symbols,
      optimizedWeights: optWeights,
      initialWeights: currentWeights,
      totalTurnover,
      positionDecisions,
      portfolioMetrics: {
        expectedReturn: postMetrics.expectedReturn,
        portfolioVariance: postMetrics.portfolioVariance,
        portfolioVolatility: postMetrics.portfolioVolatility,
        sharpeRatio: postMetrics.sharpeRatio || (postMetrics.portfolioVolatility > 0 ? (postMetrics.expectedReturn - riskFreeRate) / postMetrics.portfolioVolatility : 0),
        herfindahlIndex: hhi,
        effectiveConstituents: enc
      },
      postOptimizationVerification: {
        isHardConstraintsSatisfied: postConstraints.allHardPassed,
        constraintRecords: postConstraints.records,
        totalSoftPenalty: postConstraints.totalPenalty,
        hasSoftRelaxations: postConstraints.hasSoftRelaxations
      },
      solverMetadata: {
        solverName: solverResult.solverName,
        iterations: solverResult.iterations,
        runtimeMs: solverResult.runtimeMs,
        regularization: regularizationMetadata
      },
      phase32Attribution: {
        current: currentRiskAttribution,
        optimized: optimizedRiskAttribution,
        delta: riskAttributionDelta
      },
      asOf,
      totalExecutionMs: Date.now() - startTime
    };

    return deepFreeze(result);
  }
}
