/**
 * server/portfolioOptimization/portfolioOptimization.solvers.js
 * 
 * Phase 33: Multi-Solver Abstraction & Institutional Solvers
 */

import { SolverStatus, OptimizationObjective } from './portfolioOptimization.types.js';
import { OPTIMIZATION_CONFIG } from './portfolioOptimization.config.js';
import { PortfolioOptimizationValidation } from './portfolioOptimization.validation.js';
import { PortfolioOptimizationObjectives } from './portfolioOptimization.objectives.js';
import { PortfolioOptimizationConstraints } from './portfolioOptimization.constraints.js';

export class PortfolioOptimizationSolvers {
  /**
   * Inverts a square matrix using Gauss-Jordan elimination with partial pivoting.
   */
  static invertMatrix(matrix) {
    const n = matrix.length;
    const A = matrix.map(row => [...row]);
    const I = Array.from({ length: n }, (_, i) => {
      const row = new Array(n).fill(0);
      row[i] = 1;
      return row;
    });

    for (let i = 0; i < n; i++) {
      // Pivot selection
      let maxEl = Math.abs(A[i][i]);
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(A[k][i]) > maxEl) {
          maxEl = Math.abs(A[k][i]);
          maxRow = k;
        }
      }

      if (maxEl < OPTIMIZATION_CONFIG.TOLERANCE.ZERO_THRESHOLD) {
        return null; // Singular matrix
      }

      // Swap rows
      [A[i], A[maxRow]] = [A[maxRow], A[i]];
      [I[i], I[maxRow]] = [I[maxRow], I[i]];

      // Scale pivot row
      const pivot = A[i][i];
      for (let j = 0; j < n; j++) {
        A[i][j] /= pivot;
        I[i][j] /= pivot;
      }

      // Eliminate column
      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const factor = A[k][i];
          for (let j = 0; j < n; j++) {
            A[k][j] -= factor * A[i][j];
            I[k][j] -= factor * I[i][j];
          }
        }
      }
    }

    return I;
  }

  /**
   * Analytical KKT Closed-Form Solver for unconstrained/equality-only Mean-Variance and Minimum Variance.
   */
  static solveAnalyticalKKT({
    objectiveType,
    symbols,
    expectedReturns,
    covarianceMatrix,
    lambda = 1.0,
    periodsPerYear = 252
  }) {
    const startTime = Date.now();
    const n = symbols.length;

    // Scale covariance to annual
    const annCov = covarianceMatrix.map(row => row.map(val => val * periodsPerYear));
    const invCov = this.invertMatrix(annCov);

    if (!invCov) {
      return {
        solverName: 'ANALYTICAL_KKT_SOLVER',
        status: SolverStatus.NUMERICAL_FAILURE,
        weights: null,
        objectiveValue: null,
        iterations: 1,
        runtimeMs: Date.now() - startTime,
        message: 'Covariance matrix is singular and cannot be analytically inverted'
      };
    }

    const ones = new Array(n).fill(1.0);
    const inv_ones = PortfolioOptimizationValidation.multiplyMatrixVector(invCov, ones);
    const ones_inv_ones = PortfolioOptimizationValidation.dotProduct(ones, inv_ones);

    let optimalWeights;

    if (objectiveType === OptimizationObjective.MINIMUM_VARIANCE) {
      // w_min = (Sigma^-1 * 1) / (1^T * Sigma^-1 * 1)
      optimalWeights = inv_ones.map(v => v / ones_inv_ones);
    } else {
      // Mean-Variance: w_mv = (1/lambda) * Sigma^-1 * mu + [1 - (1^T Sigma^-1 mu)/lambda] * w_min
      const mu = expectedReturns || new Array(n).fill(0.05);
      const inv_mu = PortfolioOptimizationValidation.multiplyMatrixVector(invCov, mu);
      const ones_inv_mu = PortfolioOptimizationValidation.dotProduct(ones, inv_mu);

      const term1 = inv_mu.map(v => v / lambda);
      const scalar = (1.0 - ones_inv_mu / lambda) / ones_inv_ones;
      optimalWeights = term1.map((t1, i) => t1 + scalar * inv_ones[i]);
    }

    const objRes = PortfolioOptimizationObjectives.evaluateObjective({
      objectiveType,
      weights: optimalWeights,
      expectedReturns,
      covarianceMatrix,
      lambda,
      periodsPerYear
    });

    return {
      solverName: 'ANALYTICAL_KKT_SOLVER',
      status: SolverStatus.OPTIMAL,
      weights: optimalWeights,
      objectiveValue: objRes.objectiveValue,
      iterations: 1,
      runtimeMs: Date.now() - startTime,
      metrics: objRes
    };
  }

  /**
   * Projected Gradient Descent / Active-Set Sequential Quadratic Programming Solver.
   * Handles inequality bounds, box bounds, turnover limits, group constraints, and non-linear objectives.
   */
  static solveProjectedGradient({
    objectiveType,
    symbols,
    expectedReturns,
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
    confidence = 0.95
  }) {
    const startTime = Date.now();
    const n = symbols.length;

    // Check pre-optimization feasibility
    const feas = PortfolioOptimizationConstraints.checkFeasibility({
      symbols,
      constraints,
      initialWeights,
      sectors,
      geographies,
      sleeves,
      factorExposures
    });

    if (!feas.isFeasible) {
      return {
        solverName: 'PROJECTED_GRADIENT_SQP_SOLVER',
        status: SolverStatus.INFEASIBLE,
        weights: null,
        objectiveValue: null,
        iterations: 0,
        runtimeMs: Date.now() - startTime,
        feasibilityIssues: feas.issues,
        message: `Optimization rejected: Infeasible constraints (${feas.issues.join('; ')})`
      };
    }

    // Initialize starting weights
    let w = initialWeights ? [...initialWeights] : new Array(n).fill(1.0 / n);
    const minW = constraints.minWeights || (constraints.longOnly !== false ? new Array(n).fill(0) : new Array(n).fill(-1.0));
    const maxW = constraints.maxWeights || new Array(n).fill(1.0);
    const fullyInvested = constraints.fullyInvested !== false;

    // Project initial point
    w = PortfolioOptimizationConstraints.projectOntoConstraints(w, minW, maxW, fullyInvested);

    let bestWeights = [...w];
    let bestObj = Infinity;
    let converged = false;
    let iter = 0;

    const maxIters = OPTIMIZATION_CONFIG.SOLVER_LIMITS.MAX_ITERATIONS;
    const timeoutMs = OPTIMIZATION_CONFIG.SOLVER_LIMITS.TIMEOUT_MS;
    const eps = OPTIMIZATION_CONFIG.SOLVER_LIMITS.CONVERGENCE_EPSILON;

    for (iter = 0; iter < maxIters; iter++) {
      if (Date.now() - startTime > timeoutMs) {
        break;
      }

      // 1. Evaluate objective & penalty
      const objEval = PortfolioOptimizationObjectives.evaluateObjective({
        objectiveType, weights: w, expectedReturns, covarianceMatrix, benchmarkWeights, riskTarget, riskFreeRate, lambda, riskBudgets, periodsPerYear
      });

      const constrEval = PortfolioOptimizationConstraints.evaluateConstraints({
        weights: w, symbols, constraints, covarianceMatrix, expectedReturns, initialWeights, benchmarkWeights, sectors, geographies, sleeves, factorExposures, periodsPerYear, confidence
      });

      const totalLoss = objEval.objectiveValue + constrEval.totalPenalty;

      if (totalLoss < bestObj) {
        bestObj = totalLoss;
        bestWeights = [...w];
      }

      // 2. Compute gradient of objective
      const grad = PortfolioOptimizationObjectives.computeGradient({
        objectiveType, weights: w, expectedReturns, covarianceMatrix, benchmarkWeights, riskTarget, riskFreeRate, lambda, riskBudgets, periodsPerYear
      });

      // 2b. Add penalty gradients for all active constraint violations
      const basePenalty = constraints.penaltyMultiplier || 100000.0;
      const penaltyMult = basePenalty * (1.0 + iter * 0.5);

      // Group bounds helper
      const addGroupPenaltyGrad = (mapping, bounds) => {
        if (!mapping || !bounds) return;
        for (const [groupName, b] of Object.entries(bounds)) {
          let groupSum = 0;
          const memberIndices = [];
          for (let i = 0; i < n; i++) {
            if (mapping[symbols[i]] === groupName) {
              groupSum += w[i];
              memberIndices.push(i);
            }
          }
          if (b.min !== undefined && groupSum < b.min) {
            const viol = b.min - groupSum;
            for (const idx of memberIndices) grad[idx] -= 2 * penaltyMult * viol;
          }
          if (b.max !== undefined && groupSum > b.max) {
            const viol = groupSum - b.max;
            for (const idx of memberIndices) grad[idx] += 2 * penaltyMult * viol;
          }
        }
      };

      addGroupPenaltyGrad(sectors, constraints.sectorBounds);
      addGroupPenaltyGrad(geographies, constraints.geographyBounds);
      addGroupPenaltyGrad(sleeves, constraints.sleeveBounds);

      // Turnover penalty gradient
      if (constraints.maxTurnover !== undefined && initialWeights) {
        let turn = 0;
        for (let i = 0; i < n; i++) turn += Math.abs(w[i] - initialWeights[i]);
        if (turn > constraints.maxTurnover) {
          const diff = turn - constraints.maxTurnover;
          for (let i = 0; i < n; i++) {
            const sign = w[i] >= initialWeights[i] ? 1 : -1;
            grad[i] += 2 * penaltyMult * diff * sign;
          }
        }
      }

      // Volatility cap penalty gradient
      const sigma_p = PortfolioOptimizationValidation.calculatePortfolioVolatility(covarianceMatrix, w, periodsPerYear);
      const sigma_w = PortfolioOptimizationValidation.multiplyMatrixVector(covarianceMatrix, w);
      if (constraints.maxVolatility !== undefined && sigma_p > constraints.maxVolatility) {
        const viol = sigma_p - constraints.maxVolatility;
        const scale = periodsPerYear / Math.max(sigma_p, 1e-12);
        for (let i = 0; i < n; i++) grad[i] += 2 * penaltyMult * viol * (sigma_w[i] * scale);
      }

      // VaR cap penalty gradient
      if (constraints.maxVaR !== undefined) {
        const z = PortfolioOptimizationValidation.inverseNormalCdf(confidence);
        const pvar = z * sigma_p;
        if (pvar > constraints.maxVaR) {
          const viol = pvar - constraints.maxVaR;
          const scale = z * periodsPerYear / Math.max(sigma_p, 1e-12);
          for (let i = 0; i < n; i++) grad[i] += 2 * penaltyMult * viol * (sigma_w[i] * scale);
        }
      }

      // Concentration (HHI) penalty gradient: d(sum w_i^2)/dw_i = 2 * w_i
      if (constraints.maxHHI !== undefined) {
        const currentHhi = w.reduce((s, val) => s + (val * val), 0);
        if (currentHhi > constraints.maxHHI) {
          const viol = currentHhi - constraints.maxHHI;
          for (let i = 0; i < n; i++) grad[i] += 2 * penaltyMult * viol * (2 * w[i]);
        }
      }

      // 3. Armijo Backtracking Line Search with Projection
      let stepSize = 1.0;
      let stepSuccess = false;

      for (let stepIter = 0; stepIter < 30; stepIter++) {
        const wCandidateRaw = w.map((val, i) => val - stepSize * grad[i]);
        const wCandidate = PortfolioOptimizationConstraints.projectOntoConstraints(wCandidateRaw, minW, maxW, fullyInvested);

        const candObj = PortfolioOptimizationObjectives.evaluateObjective({
          objectiveType, weights: wCandidate, expectedReturns, covarianceMatrix, benchmarkWeights, riskTarget, riskFreeRate, lambda, riskBudgets, periodsPerYear
        }).objectiveValue;

        const candConstr = PortfolioOptimizationConstraints.evaluateConstraints({
          weights: wCandidate, symbols, constraints, covarianceMatrix, expectedReturns, initialWeights, benchmarkWeights, sectors, geographies, sleeves, factorExposures, periodsPerYear, confidence
        });

        const candLoss = candObj + candConstr.totalPenalty;

        if (candLoss < totalLoss) {
          // Check step displacement for convergence
          let disp = 0;
          for (let i = 0; i < n; i++) disp += Math.abs(wCandidate[i] - w[i]);
          w = wCandidate;
          stepSuccess = true;

          if (disp < eps && candConstr.allHardPassed && iter > 10) {
            converged = true;
          }
          break;
        }

        stepSize *= 0.5;
      }

      if (converged) break;
    }

    const finalWeights = bestWeights;
    const finalMetrics = PortfolioOptimizationObjectives.evaluateObjective({
      objectiveType, weights: finalWeights, expectedReturns, covarianceMatrix, benchmarkWeights, riskTarget, riskFreeRate, lambda, riskBudgets, periodsPerYear
    });

    return {
      solverName: 'PROJECTED_GRADIENT_SQP_SOLVER',
      status: SolverStatus.OPTIMAL,
      weights: finalWeights,
      objectiveValue: finalMetrics.objectiveValue,
      iterations: iter + 1,
      runtimeMs: Date.now() - startTime,
      metrics: finalMetrics
    };
  }
}
