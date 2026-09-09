/**
 * server/portfolioOptimization/portfolioOptimization.objectives.js
 * 
 * Phase 33: Optimization Objectives & Gradient Evaluators
 */

import { OptimizationObjective } from './portfolioOptimization.types.js';
import { PortfolioOptimizationValidation } from './portfolioOptimization.validation.js';

export class PortfolioOptimizationObjectives {
  /**
   * Evaluates the objective function value for a given weight vector.
   */
  static evaluateObjective({
    objectiveType,
    weights,
    expectedReturns,
    covarianceMatrix,
    benchmarkWeights = null,
    riskTarget = null,
    riskFreeRate = 0.04,
    lambda = 1.0,
    riskBudgets = null,
    periodsPerYear = 252
  }) {
    const portVariancePeriod = PortfolioOptimizationValidation.quadraticForm(weights, covarianceMatrix);
    const portVariance = portVariancePeriod * periodsPerYear;
    const portVol = Math.sqrt(Math.max(0, portVariance));
    const portExpReturn = expectedReturns ? PortfolioOptimizationValidation.dotProduct(weights, expectedReturns) : 0;

    switch (objectiveType) {
      case OptimizationObjective.MINIMUM_VARIANCE:
        return {
          objectiveValue: 0.5 * portVariance,
          expectedReturn: portExpReturn,
          portfolioVariance: portVariance,
          portfolioVolatility: portVol,
          description: 'Minimize portfolio variance: 0.5 * w^T * Sigma * w'
        };

      case OptimizationObjective.MEAN_VARIANCE:
        // Canonical minimization form: 0.5 * lambda * w^T * Sigma * w - mu^T * w
        return {
          objectiveValue: 0.5 * lambda * portVariance - portExpReturn,
          expectedReturn: portExpReturn,
          portfolioVariance: portVariance,
          portfolioVolatility: portVol,
          lambda,
          description: 'Mean-Variance quadratic utility: 0.5 * lambda * Var(w) - E[R(w)]'
        };

      case OptimizationObjective.MAXIMUM_SHARPE: {
        const excessReturn = portExpReturn - riskFreeRate;
        const sharpe = portVol > 0 ? excessReturn / portVol : 0;
        return {
          objectiveValue: -sharpe, // Minimization objective is negative Sharpe
          sharpeRatio: sharpe,
          expectedReturn: portExpReturn,
          portfolioVariance: portVariance,
          portfolioVolatility: portVol,
          excessReturn,
          description: 'Maximize Sharpe Ratio: (E[R] - Rf) / Vol'
        };
      }

      case OptimizationObjective.RISK_TARGET: {
        const target = riskTarget || portVol;
        const volDiff = portVol - target;
        return {
          objectiveValue: 0.5 * volDiff * volDiff,
          riskTarget: target,
          volatilityDifference: volDiff,
          expectedReturn: portExpReturn,
          portfolioVariance: portVariance,
          portfolioVolatility: portVol,
          description: 'Target Volatility matching: 0.5 * (Vol - Target)^2'
        };
      }

      case OptimizationObjective.TRACKING_ERROR: {
        const bWeights = benchmarkWeights || new Array(weights.length).fill(1.0 / weights.length);
        const activeWeights = weights.map((w, i) => w - bWeights[i]);
        const activeVarPeriod = PortfolioOptimizationValidation.quadraticForm(activeWeights, covarianceMatrix);
        const activeVar = activeVarPeriod * periodsPerYear;
        const trackingError = Math.sqrt(Math.max(0, activeVar));
        return {
          objectiveValue: 0.5 * activeVar,
          trackingError,
          activeVariance: activeVar,
          expectedReturn: portExpReturn,
          portfolioVolatility: portVol,
          description: 'Minimize benchmark tracking error variance: 0.5 * (w - b)^T * Sigma * (w - b)'
        };
      }

      case OptimizationObjective.ACTIVE_RETURN_RISK: {
        const bWeights = benchmarkWeights || new Array(weights.length).fill(1.0 / weights.length);
        const activeWeights = weights.map((w, i) => w - bWeights[i]);
        const activeVarPeriod = PortfolioOptimizationValidation.quadraticForm(activeWeights, covarianceMatrix);
        const activeVar = activeVarPeriod * periodsPerYear;
        const activeExpReturn = expectedReturns ? PortfolioOptimizationValidation.dotProduct(activeWeights, expectedReturns) : 0;
        return {
          objectiveValue: 0.5 * lambda * activeVar - activeExpReturn,
          activeReturn: activeExpReturn,
          activeVariance: activeVar,
          trackingError: Math.sqrt(Math.max(0, activeVar)),
          description: 'Active utility: 0.5 * lambda * ActiveVar - ActiveReturn'
        };
      }

      case OptimizationObjective.RISK_BUDGETING: {
        // Evaluate Component Risk Contributions
        const Sw = PortfolioOptimizationValidation.multiplyMatrixVector(covarianceMatrix, weights);
        const annFactor = Math.sqrt(periodsPerYear);
        const crc = weights.map((w, i) => (portVol > 0 ? (w * Sw[i] * periodsPerYear) / portVol : 0));
        const n = weights.length;
        const targetBudgets = riskBudgets || new Array(n).fill(portVol / n);
        
        let sumBudgetGapSq = 0;
        for (let i = 0; i < n; i++) {
          const gap = crc[i] - targetBudgets[i];
          sumBudgetGapSq += gap * gap;
        }

        return {
          objectiveValue: 0.5 * sumBudgetGapSq,
          componentRiskContributions: crc,
          targetBudgets,
          expectedReturn: portExpReturn,
          portfolioVolatility: portVol,
          description: 'Equal Risk Parity / Target Risk Budgeting: 0.5 * sum((CRC_i - Budget_i)^2)'
        };
      }

      case OptimizationObjective.INVESTOR_UTILITY:
      default:
        return {
          objectiveValue: 0.5 * lambda * portVariance - portExpReturn,
          expectedReturn: portExpReturn,
          portfolioVariance: portVariance,
          portfolioVolatility: portVol,
          description: 'Standard quadratic investor utility'
        };
    }
  }

  /**
   * Computes the analytical gradient of the objective function with respect to weights w.
   */
  static computeGradient({
    objectiveType,
    weights,
    expectedReturns,
    covarianceMatrix,
    benchmarkWeights = null,
    riskTarget = null,
    riskFreeRate = 0.04,
    lambda = 1.0,
    riskBudgets = null,
    periodsPerYear = 252
  }) {
    const n = weights.length;
    const Sw = PortfolioOptimizationValidation.multiplyMatrixVector(covarianceMatrix, weights);
    const annSw = Sw.map(v => v * periodsPerYear);
    const portVariancePeriod = PortfolioOptimizationValidation.quadraticForm(weights, covarianceMatrix);
    const portVariance = portVariancePeriod * periodsPerYear;
    const portVol = Math.sqrt(Math.max(1e-12, portVariance));

    switch (objectiveType) {
      case OptimizationObjective.MINIMUM_VARIANCE:
        // grad = Sigma * w
        return annSw;

      case OptimizationObjective.MEAN_VARIANCE:
      case OptimizationObjective.INVESTOR_UTILITY:
        // grad = lambda * Sigma * w - mu
        return annSw.map((val, i) => lambda * val - (expectedReturns ? expectedReturns[i] : 0));

      case OptimizationObjective.TRACKING_ERROR: {
        const b = benchmarkWeights || new Array(n).fill(1.0 / n);
        const diff = weights.map((w, i) => w - b[i]);
        const S_diff = PortfolioOptimizationValidation.multiplyMatrixVector(covarianceMatrix, diff);
        return S_diff.map(v => v * periodsPerYear);
      }

      case OptimizationObjective.ACTIVE_RETURN_RISK: {
        const b = benchmarkWeights || new Array(n).fill(1.0 / n);
        const diff = weights.map((w, i) => w - b[i]);
        const S_diff = PortfolioOptimizationValidation.multiplyMatrixVector(covarianceMatrix, diff);
        return S_diff.map((v, i) => lambda * v * periodsPerYear - (expectedReturns ? expectedReturns[i] : 0));
      }

      case OptimizationObjective.RISK_TARGET: {
        const target = riskTarget || portVol;
        // grad = (portVol - target) * (Sigma * w / portVol)
        const factor = (portVol - target) / portVol;
        return annSw.map(v => factor * v);
      }

      case OptimizationObjective.MAXIMUM_SHARPE: {
        const mu = expectedReturns || new Array(n).fill(0.05);
        const expRet = PortfolioOptimizationValidation.dotProduct(weights, mu);
        const excessRet = expRet - riskFreeRate;
        // d/dw [- (mu^T w - Rf) / sigma] = - [ sigma * mu - (mu^T w - Rf) * (Sigma w / sigma) ] / sigma^2
        const grad = new Array(n).fill(0);
        for (let i = 0; i < n; i++) {
          grad[i] = -(portVol * mu[i] - excessRet * (annSw[i] / portVol)) / (portVol * portVol);
        }
        return grad;
      }

      case OptimizationObjective.RISK_BUDGETING: {
        // Numerical finite difference gradient for non-linear risk budgeting objective
        const eps = 1e-6;
        const grad = new Array(n).fill(0);
        const baseObj = this.evaluateObjective({
          objectiveType, weights, expectedReturns, covarianceMatrix, benchmarkWeights, riskTarget, riskFreeRate, lambda, riskBudgets, periodsPerYear
        }).objectiveValue;

        for (let i = 0; i < n; i++) {
          const wPerturbed = [...weights];
          wPerturbed[i] += eps;
          const pertObj = this.evaluateObjective({
            objectiveType, weights: wPerturbed, expectedReturns, covarianceMatrix, benchmarkWeights, riskTarget, riskFreeRate, lambda, riskBudgets, periodsPerYear
          }).objectiveValue;
          grad[i] = (pertObj - baseObj) / eps;
        }
        return grad;
      }

      default:
        return annSw.map((val, i) => lambda * val - (expectedReturns ? expectedReturns[i] : 0));
    }
  }
}
