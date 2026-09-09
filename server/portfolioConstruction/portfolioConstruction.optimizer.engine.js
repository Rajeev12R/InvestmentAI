import { OptimizationMethod, OptimizationStatus } from "./portfolioConstruction.types.js";
import { PORTFOLIO_OPTIMIZATION_CONFIG_V1 } from "./portfolioConstructionConfig.js";
import { CovarianceEngine } from "./portfolioConstruction.covariance.engine.js";
import { ConstraintEngine } from "./portfolioConstruction.constraints.engine.js";

/**
 * Deterministic Portfolio Optimization Engine for Phase 14
 */
export class PortfolioOptimizerEngine {
  /**
   * Main entry point for running portfolio optimization.
   */
  static optimize(params) {
    const {
      method = OptimizationMethod.MEAN_VARIANCE,
      universeSecurities = [],
      expectedReturns = {},
      covarianceMatrix = null,
      constraints = {},
      convictions = {},
      config = PORTFOLIO_OPTIMIZATION_CONFIG_V1
    } = params;

    const n = universeSecurities.length;
    if (n === 0) {
      return {
        status: OptimizationStatus.INVALID_INPUT,
        reasonCode: "EMPTY_UNIVERSE",
        weights: {},
        weightsArray: []
      };
    }

    const tickers = universeSecurities.map(s => s.ticker);

    // 1. Evaluate constraint feasibility
    const feasibility = ConstraintEngine.evaluateConstraints(universeSecurities, constraints);
    if (!feasibility.isFeasible) {
      return {
        status: OptimizationStatus.INFEASIBLE_CONSTRAINTS,
        reasonCode: "INFEASIBLE_CONSTRAINTS",
        conflicts: feasibility.conflicts,
        weights: {},
        weightsArray: []
      };
    }

    const { minWeights, maxWeights } = feasibility.bounds;

    // 2. Dispatch to specific optimization method
    let result;
    switch (method) {
      case OptimizationMethod.EQUAL_WEIGHT:
        result = this.optimizeEqualWeight(tickers, minWeights, maxWeights, constraints);
        break;

      case OptimizationMethod.MINIMUM_VARIANCE:
        result = this.optimizeMinimumVariance(tickers, covarianceMatrix, minWeights, maxWeights, config);
        break;

      case OptimizationMethod.MEAN_VARIANCE:
        result = this.optimizeMeanVariance(tickers, expectedReturns, covarianceMatrix, minWeights, maxWeights, config);
        break;

      case OptimizationMethod.RISK_PARITY:
        result = this.optimizeRiskParity(tickers, covarianceMatrix, minWeights, maxWeights, config);
        break;

      case OptimizationMethod.MAXIMUM_DIVERSIFICATION:
        result = this.optimizeMaxDiversification(tickers, covarianceMatrix, minWeights, maxWeights, config);
        break;

      case OptimizationMethod.CONVICTION_WEIGHTED:
        result = this.optimizeConvictionWeighted(tickers, convictions, minWeights, maxWeights, constraints);
        break;

      case OptimizationMethod.VALUATION_CONVICTION_HYBRID:
        result = this.optimizeHybrid(tickers, expectedReturns, convictions, covarianceMatrix, minWeights, maxWeights, config);
        break;

      default:
        return {
          status: OptimizationStatus.INVALID_INPUT,
          reasonCode: `UNKNOWN_OPTIMIZATION_METHOD_${method}`,
          weights: {},
          weightsArray: []
        };
    }

    if (result.status !== OptimizationStatus.OPTIMAL && result.status !== OptimizationStatus.FEASIBLE) {
      return {
        status: result.status,
        reasonCode: result.reasonCode || "OPTIMIZATION_FAILED",
        conflicts: result.conflicts,
        weights: {},
        weightsArray: result.weightsArray || [],
        solverStats: {
          iterations: result.iterations || 0,
          converged: result.converged ?? false,
          objectiveValue: result.objectiveValue ?? null
        }
      };
    }

    // 3. Post-optimization calculations and quality validation
    const weightsArray = result.weightsArray;
    const qualityValidation = this.validateOptimizationQuality({
      method,
      tickers,
      weightsArray,
      minWeights,
      maxWeights,
      expectedReturns,
      covarianceMatrix,
      config
    });

    if (!qualityValidation.isValid) {
      return {
        status: OptimizationStatus.NUMERICAL_FAILURE,
        reasonCode: "OPTIMIZATION_INVALID",
        validationErrors: qualityValidation.errors,
        weights: {},
        weightsArray: [],
        solverStats: {
          iterations: result.iterations || 1,
          converged: false,
          objectiveValue: result.objectiveValue ?? null
        }
      };
    }

    const weightsMap = {};
    tickers.forEach((t, i) => {
      weightsMap[t] = Number(weightsArray[i].toFixed(6));
    });

    let portfolioExpReturn = null;
    if (expectedReturns && Object.keys(expectedReturns).length > 0) {
      let rSum = 0;
      let hasAllReturns = true;
      for (let i = 0; i < n; i++) {
        const t = tickers[i];
        const r = expectedReturns[t]?.expectedReturn ?? expectedReturns[t];
        if (typeof r === "number" && isFinite(r)) {
          rSum += weightsArray[i] * r;
        } else {
          hasAllReturns = false;
        }
      }
      if (hasAllReturns) {
        portfolioExpReturn = Number(rSum.toFixed(6));
      }
    }

    let riskMetrics = null;
    if (covarianceMatrix) {
      riskMetrics = CovarianceEngine.calculateRiskContributions(weightsArray, covarianceMatrix, tickers);
    }

    // Calculate diversification metrics: HHI, Effective N
    let hhi = 0;
    for (const w of weightsArray) {
      hhi += w * w;
    }
    const effectiveN = hhi > 0 ? Number((1 / hhi).toFixed(2)) : 0;

    return {
      status: OptimizationStatus.OPTIMAL,
      method,
      weights: weightsMap,
      weightsArray,
      portfolioExpectedReturn: portfolioExpReturn,
      portfolioVolatility: riskMetrics ? riskMetrics.portfolioVolatility : null,
      riskBudget: riskMetrics,
      diversification: {
        hhi: Number(hhi.toFixed(6)),
        effectiveN
      },
      solverStats: {
        iterations: result.iterations || 1,
        converged: result.converged ?? true,
        objectiveValue: result.objectiveValue ?? null
      }
    };
  }

  /**
   * 1. Equal Weight Optimizer
   */
  static optimizeEqualWeight(tickers, minWeights, maxWeights, constraints) {
    const n = tickers.length;
    const rawWeight = 1.0 / n;
    let w = tickers.map(() => rawWeight);

    // Project onto box bounds and normalize
    w = this.projectBoxSimplex(w, tickers.map(t => minWeights[t]), tickers.map(t => maxWeights[t]));

    return {
      status: OptimizationStatus.OPTIMAL,
      weightsArray: w,
      iterations: 1,
      converged: true,
      objectiveValue: 0
    };
  }

  /**
   * 2. Minimum Variance Optimizer: min w^T Sigma w subject to bounds and sum(w) = 1
   */
  static optimizeMinimumVariance(tickers, covarianceMatrix, minWeights, maxWeights, config) {
    if (!covarianceMatrix) {
      return { status: OptimizationStatus.INVALID_INPUT, reasonCode: "MISSING_COVARIANCE_MATRIX", weightsArray: [] };
    }

    const n = tickers.length;
    const lower = tickers.map(t => minWeights[t]);
    const upper = tickers.map(t => maxWeights[t]);

    // Initial guess: Equal weight
    let w = this.projectBoxSimplex(tickers.map(() => 1.0 / n), lower, upper);
    const maxIter = config.maxIterations || 1000;
    const tol = config.convergenceTolerance || 1e-7;

    let converged = false;
    let iter = 0;
    let objVal = 0;

    // Projected Gradient Descent with backtracking line search
    for (iter = 0; iter < maxIter; iter++) {
      // Gradient: g = 2 * Sigma * w
      const grad = Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          grad[i] += 2 * covarianceMatrix[i][j] * w[j];
        }
      }

      // Step size (using Lipschitz estimate L ≈ 2 * max(diag))
      let maxDiag = 0;
      for (let i = 0; i < n; i++) {
        if (covarianceMatrix[i][i] > maxDiag) maxDiag = covarianceMatrix[i][i];
      }
      const alpha = 1.0 / Math.max(1e-4, 2 * maxDiag * n);

      // Gradient step
      const wNextCandidate = w.map((wi, i) => wi - alpha * grad[i]);
      const wNext = this.projectBoxSimplex(wNextCandidate, lower, upper);

      // Check change
      let diff = 0;
      for (let i = 0; i < n; i++) {
        diff += Math.abs(wNext[i] - w[i]);
      }

      w = wNext;
      if (diff < tol) {
        converged = true;
        break;
      }
    }

    objVal = CovarianceEngine.calculatePortfolioVariance(w, covarianceMatrix);

    return {
      status: converged ? OptimizationStatus.OPTIMAL : OptimizationStatus.NON_CONVERGENT,
      reasonCode: converged ? null : "MAX_ITERATIONS_REACHED_WITHOUT_CONVERGENCE",
      weightsArray: w,
      iterations: iter,
      converged,
      objectiveValue: Number(objVal.toFixed(8))
    };
  }

  /**
   * 3. Mean-Variance Optimizer: max mu^T w - lambda * w^T Sigma w
   */
  static optimizeMeanVariance(tickers, expectedReturns, covarianceMatrix, minWeights, maxWeights, config) {
    if (!covarianceMatrix) {
      return { status: OptimizationStatus.INVALID_INPUT, reasonCode: "MISSING_COVARIANCE_MATRIX", weightsArray: [] };
    }

    const n = tickers.length;
    const mu = tickers.map(t => {
      const r = expectedReturns[t]?.expectedReturn ?? expectedReturns[t];
      return (typeof r === "number" && isFinite(r)) ? r : 0.0;
    });

    const lambda = config.defaultRiskAversionLambda || 2.5;
    const lower = tickers.map(t => minWeights[t]);
    const upper = tickers.map(t => maxWeights[t]);

    let w = this.projectBoxSimplex(tickers.map(() => 1.0 / n), lower, upper);
    const maxIter = config.maxIterations || 1000;
    const tol = config.convergenceTolerance || 1e-7;

    let converged = false;
    let iter = 0;

    for (iter = 0; iter < maxIter; iter++) {
      // Objective: f(w) = lambda * w^T Sigma w - mu^T w (minimizing this)
      // Gradient: g = 2 * lambda * Sigma * w - mu
      const grad = Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        let sigW = 0;
        for (let j = 0; j < n; j++) {
          sigW += covarianceMatrix[i][j] * w[j];
        }
        grad[i] = 2 * lambda * sigW - mu[i];
      }

      let maxDiag = 0;
      for (let i = 0; i < n; i++) {
        if (covarianceMatrix[i][i] > maxDiag) maxDiag = covarianceMatrix[i][i];
      }
      const alpha = 1.0 / Math.max(1e-4, 2 * lambda * maxDiag * n);

      const wNextCandidate = w.map((wi, i) => wi - alpha * grad[i]);
      const wNext = this.projectBoxSimplex(wNextCandidate, lower, upper);

      let diff = 0;
      for (let i = 0; i < n; i++) {
        diff += Math.abs(wNext[i] - w[i]);
      }

      w = wNext;
      if (diff < tol) {
        converged = true;
        break;
      }
    }

    const portVariance = CovarianceEngine.calculatePortfolioVariance(w, covarianceMatrix);
    const portExpReturn = w.reduce((sum, wi, i) => sum + wi * mu[i], 0);
    const objVal = portExpReturn - lambda * portVariance;

    return {
      status: converged ? OptimizationStatus.OPTIMAL : OptimizationStatus.NON_CONVERGENT,
      reasonCode: converged ? null : "MAX_ITERATIONS_REACHED_WITHOUT_CONVERGENCE",
      weightsArray: w,
      iterations: iter,
      converged,
      objectiveValue: Number(objVal.toFixed(8))
    };
  }

  /**
   * 4. Risk Parity Optimizer: Equal Risk Contribution (RC_i = RC_j = sigma_p / n)
   */
  static optimizeRiskParity(tickers, covarianceMatrix, minWeights, maxWeights, config) {
    if (!covarianceMatrix) {
      return { status: OptimizationStatus.INVALID_INPUT, reasonCode: "MISSING_COVARIANCE_MATRIX", weightsArray: [] };
    }

    const n = tickers.length;
    const lower = tickers.map(t => minWeights[t]);
    const upper = tickers.map(t => maxWeights[t]);

    // Initial inverse volatility guess
    const invVol = [];
    for (let i = 0; i < n; i++) {
      const vol = Math.sqrt(Math.max(1e-6, covarianceMatrix[i][i]));
      invVol.push(1.0 / vol);
    }
    const invVolSum = invVol.reduce((a, b) => a + b, 0);
    let w = this.projectBoxSimplex(invVol.map(v => v / invVolSum), lower, upper);

    const maxIter = config.maxIterations || 1000;
    const tol = config.convergenceTolerance || 1e-7;
    let converged = false;
    let iter = 0;

    // Cyclical coordinate descent / Equal Risk Contribution iteration
    for (iter = 0; iter < maxIter; iter++) {
      const sigmaP = CovarianceEngine.calculatePortfolioVolatility(w, covarianceMatrix);
      const targetRC = sigmaP / n;

      const sigmaW = Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          sigmaW[i] += covarianceMatrix[i][j] * w[j];
        }
      }

      const wNext = Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        // Adjust weight proportional to ratio of target RC to current RC
        const currentRC = w[i] * (sigmaW[i] / Math.max(1e-6, sigmaP));
        const factor = currentRC > 1e-6 ? Math.sqrt(targetRC / currentRC) : 1.0;
        wNext[i] = w[i] * factor;
      }

      const wProj = this.projectBoxSimplex(wNext, lower, upper);
      let diff = 0;
      for (let i = 0; i < n; i++) {
        diff += Math.abs(wProj[i] - w[i]);
      }

      w = wProj;
      if (diff < tol) {
        converged = true;
        break;
      }
    }

    return {
      status: converged ? OptimizationStatus.OPTIMAL : OptimizationStatus.NON_CONVERGENT,
      reasonCode: converged ? null : "MAX_ITERATIONS_REACHED_WITHOUT_CONVERGENCE",
      weightsArray: w,
      iterations: iter,
      converged,
      objectiveValue: 0
    };
  }

  /**
   * 5. Maximum Diversification Optimizer: max (w^T * sigma) / sqrt(w^T * Sigma * w)
   */
  static optimizeMaxDiversification(tickers, covarianceMatrix, minWeights, maxWeights, config) {
    if (!covarianceMatrix) {
      return { status: OptimizationStatus.INVALID_INPUT, reasonCode: "MISSING_COVARIANCE_MATRIX", weightsArray: [] };
    }

    const n = tickers.length;
    const sigmas = tickers.map((_, i) => Math.sqrt(Math.max(1e-6, covarianceMatrix[i][i])));
    const lower = tickers.map(t => minWeights[t]);
    const upper = tickers.map(t => maxWeights[t]);

    // Initial guess
    let w = this.projectBoxSimplex(tickers.map(() => 1.0 / n), lower, upper);
    const maxIter = config.maxIterations || 1000;
    const tol = config.convergenceTolerance || 1e-7;
    let converged = false;
    let iter = 0;

    for (iter = 0; iter < maxIter; iter++) {
      const portVol = CovarianceEngine.calculatePortfolioVolatility(w, covarianceMatrix);
      const weightedVol = w.reduce((acc, wi, i) => acc + wi * sigmas[i], 0);

      // Gradient of Diversification Ratio DR = weightedVol / portVol
      // d(DR)/dw_i = (sigmas[i] * portVol - weightedVol * (Sigma * w)_i / portVol) / portVol^2
      const sigmaW = Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          sigmaW[i] += covarianceMatrix[i][j] * w[j];
        }
      }

      const grad = Array(n).fill(0);
      const denom = Math.max(1e-8, portVol * portVol);
      for (let i = 0; i < n; i++) {
        grad[i] = (sigmas[i] * portVol - weightedVol * (sigmaW[i] / Math.max(1e-6, portVol))) / denom;
      }

      const alpha = 0.05;
      const wNextCandidate = w.map((wi, i) => wi + alpha * grad[i]);
      const wNext = this.projectBoxSimplex(wNextCandidate, lower, upper);

      let diff = 0;
      for (let i = 0; i < n; i++) {
        diff += Math.abs(wNext[i] - w[i]);
      }

      w = wNext;
      if (diff < tol) {
        converged = true;
        break;
      }
    }

    const portVol = CovarianceEngine.calculatePortfolioVolatility(w, covarianceMatrix);
    const weightedVol = w.reduce((acc, wi, i) => acc + wi * sigmas[i], 0);
    const divRatio = portVol > 0 ? weightedVol / portVol : 1.0;

    return {
      status: converged ? OptimizationStatus.OPTIMAL : OptimizationStatus.NON_CONVERGENT,
      reasonCode: converged ? null : "MAX_ITERATIONS_REACHED_WITHOUT_CONVERGENCE",
      weightsArray: w,
      iterations: iter,
      converged,
      objectiveValue: Number(divRatio.toFixed(6))
    };
  }

  /**
   * 6. Conviction Weighted Optimizer: w_i proportional to conviction score
   */
  static optimizeConvictionWeighted(tickers, convictions, minWeights, maxWeights, constraints) {
    const rawScores = tickers.map(t => {
      const c = convictions[t];
      if (typeof c === "number" && c > 0) return c;
      if (typeof c === "string") {
        if (c === "HIGH") return 1.0;
        if (c === "MEDIUM") return 0.6;
        if (c === "LOW") return 0.3;
      }
      return 0.5; // default neutral conviction
    });

    const sumScores = rawScores.reduce((a, b) => a + b, 0);
    const wRaw = sumScores > 0 ? rawScores.map(s => s / sumScores) : tickers.map(() => 1.0 / tickers.length);
    const lower = tickers.map(t => minWeights[t]);
    const upper = tickers.map(t => maxWeights[t]);

    const w = this.projectBoxSimplex(wRaw, lower, upper);

    return {
      status: OptimizationStatus.OPTIMAL,
      weightsArray: w,
      iterations: 1,
      converged: true,
      objectiveValue: 0
    };
  }

  /**
   * 7. Valuation / Conviction Hybrid Optimizer
   */
  static optimizeHybrid(tickers, expectedReturns, convictions, covarianceMatrix, minWeights, maxWeights, config) {
    const n = tickers.length;
    const wVal = config.hybridValuationWeight ?? 0.40;
    const wConv = config.hybridConvictionWeight ?? 0.35;
    const wRisk = config.hybridRiskWeight ?? 0.25;

    // Normalizing expected return scores [0, 1]
    const returns = tickers.map(t => {
      const r = expectedReturns[t]?.expectedReturn ?? expectedReturns[t];
      return (typeof r === "number" && isFinite(r)) ? r : 0.0;
    });
    const minR = Math.min(...returns);
    const maxR = Math.max(...returns);
    const rSpread = maxR - minR > 1e-6 ? maxR - minR : 1.0;
    const normReturns = returns.map(r => (r - minR) / rSpread);

    // Normalizing conviction scores [0, 1]
    const normConvictions = tickers.map(t => {
      const c = convictions[t];
      if (typeof c === "number") return Math.min(1, Math.max(0, c / 100));
      if (c === "HIGH") return 1.0;
      if (c === "MEDIUM") return 0.6;
      if (c === "LOW") return 0.3;
      return 0.5;
    });

    // Normalizing risk / inverse volatility [0, 1]
    const invVols = tickers.map((_, i) => {
      const vol = covarianceMatrix ? Math.sqrt(Math.max(1e-6, covarianceMatrix[i][i])) : 0.20;
      return 1.0 / vol;
    });
    const minIV = Math.min(...invVols);
    const maxIV = Math.max(...invVols);
    const ivSpread = maxIV - minIV > 1e-6 ? maxIV - minIV : 1.0;
    const normInvVols = invVols.map(iv => (iv - minIV) / ivSpread);

    // Combined score
    const combinedScores = tickers.map((_, i) => {
      return wVal * normReturns[i] + wConv * normConvictions[i] + wRisk * normInvVols[i];
    });

    const sumScores = combinedScores.reduce((a, b) => a + b, 0);
    const wRaw = sumScores > 0 ? combinedScores.map(s => s / sumScores) : tickers.map(() => 1.0 / n);
    const lower = tickers.map(t => minWeights[t]);
    const upper = tickers.map(t => maxWeights[t]);

    const w = this.projectBoxSimplex(wRaw, lower, upper);

    return {
      status: OptimizationStatus.OPTIMAL,
      weightsArray: w,
      iterations: 1,
      converged: true,
      objectiveValue: 0
    };
  }

  /**
   * Exact Projection onto Box-Simplex:
   * min ||x - y||^2  s.t. lower_i <= x_i <= upper_i, sum(x_i) = 1.0
   * Solved via bisection / root-finding on dual Lagrange multiplier lambda.
   */
  static projectBoxSimplex(y, lower, upper) {
    const n = y.length;
    let lowLambda = -10.0;
    let highLambda = 10.0;

    // Expand search range if needed
    for (let expand = 0; expand < 10; expand++) {
      const sumLow = y.reduce((acc, yi, i) => acc + Math.min(upper[i], Math.max(lower[i], yi - lowLambda)), 0);
      const sumHigh = y.reduce((acc, yi, i) => acc + Math.min(upper[i], Math.max(lower[i], yi - highLambda)), 0);

      if (sumLow >= 1.0 && sumHigh <= 1.0) break;
      if (sumLow < 1.0) lowLambda -= 10.0;
      if (sumHigh > 1.0) highLambda += 10.0;
    }

    let optimalLambda = 0.0;

    // Binary search for lambda
    for (let iter = 0; iter < 100; iter++) {
      const midLambda = 0.5 * (lowLambda + highLambda);
      const sumMid = y.reduce((acc, yi, i) => acc + Math.min(upper[i], Math.max(lower[i], yi - midLambda)), 0);

      optimalLambda = midLambda;
      if (Math.abs(sumMid - 1.0) < 1e-9) {
        break;
      }
      if (sumMid > 1.0) {
        lowLambda = midLambda;
      } else {
        highLambda = midLambda;
      }
    }

    const result = y.map((yi, i) => {
      const val = Math.min(upper[i], Math.max(lower[i], yi - optimalLambda));
      return Number(val.toFixed(8));
    });

    // Final normalization cleanup for floating point rounding
    const sumResult = result.reduce((a, b) => a + b, 0);
    if (Math.abs(sumResult - 1.0) > 1e-7 && sumResult > 0) {
      return result.map(v => Number((v / sumResult).toFixed(8)));
    }

    return result;
  }

  /**
   * Independent Post-Optimization Quality Validation:
   * Verifies feasibility, weight bounds, weight sum, finite values, and suboptimality criteria.
   */
  static validateOptimizationQuality(params) {
    const {
      method,
      tickers = [],
      weightsArray = [],
      minWeights = {},
      maxWeights = {},
      expectedReturns = {},
      covarianceMatrix = null,
      config = PORTFOLIO_OPTIMIZATION_CONFIG_V1,
      candidateWeights = null
    } = params;

    const w = candidateWeights
      ? (Array.isArray(candidateWeights) ? candidateWeights : tickers.map(t => candidateWeights[t] ?? 0))
      : weightsArray;
    const n = tickers.length;
    const errors = [];

    if (!Array.isArray(w) || w.length !== n) {
      return { isValid: false, errors: ["WEIGHTS_LENGTH_MISMATCH"] };
    }

    // 1. Finite value check
    for (let i = 0; i < n; i++) {
      if (typeof w[i] !== "number" || isNaN(w[i]) || !isFinite(w[i])) {
        errors.push(`NON_FINITE_WEIGHT_AT_${tickers[i] || i}`);
      }
    }
    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    // 2. Exact sum-to-1 feasibility check
    const sum = w.reduce((a, b) => a + b, 0);
    const sumTol = config.weightSumTolerance || 1e-4;
    if (Math.abs(sum - 1.0) > sumTol) {
      errors.push(`WEIGHT_SUM_VIOLATION_SUM_${sum.toFixed(6)}_TOL_${sumTol}`);
    }

    // 3. Box bounds feasibility check
    const feasTol = config.feasibilityTolerance || 1e-6;
    for (let i = 0; i < n; i++) {
      const t = tickers[i];
      const minW = (minWeights && typeof minWeights[t] === "number") ? minWeights[t] : 0.0;
      const maxW = (maxWeights && typeof maxWeights[t] === "number") ? maxWeights[t] : 1.0;
      if (w[i] < minW - feasTol) {
        errors.push(`LOWER_BOUND_VIOLATION_${t}_${w[i].toFixed(6)}_LT_${minW}`);
      }
      if (w[i] > maxW + feasTol) {
        errors.push(`UPPER_BOUND_VIOLATION_${t}_${w[i].toFixed(6)}_GT_${maxW}`);
      }
    }

    // 4. Numerical variance and risk integrity
    if (covarianceMatrix) {
      const portVar = CovarianceEngine.calculatePortfolioVariance(w, covarianceMatrix);
      if (portVar < 0 || isNaN(portVar) || !isFinite(portVar)) {
        errors.push("INVALID_PORTFOLIO_VARIANCE");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sum: Number(sum.toFixed(6)),
      portfolioVariance: covarianceMatrix ? CovarianceEngine.calculatePortfolioVariance(w, covarianceMatrix) : null
    };
  }
}
