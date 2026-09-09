import { CovarianceModel, CovarianceRepairMethod, DataClassification } from './riskForecast.types.js';
import { RiskForecastConfig } from './riskForecast.config.js';
import { RiskForecastValidation } from './riskForecast.validation.js';

/**
 * Phase 31 — Deterministic Covariance Forecasting & Repair Engine
 */
export class RiskForecastCovarianceEngine {
  /**
   * Calculate Historical Sample Covariance Matrix
   */
  static calculateHistoricalCovariance(alignedReturnsMatrix, symbols, options = {}) {
    if (!Array.isArray(alignedReturnsMatrix) || alignedReturnsMatrix.length === 0) {
      return {
        status: DataClassification.UNAVAILABLE,
        error: 'Empty returns matrix',
        covarianceMatrix: null
      };
    }

    const nAssets = alignedReturnsMatrix.length;
    const nObs = alignedReturnsMatrix[0]?.length || 0;
    const minObs = options.minObservations || RiskForecastConfig.MIN_OBSERVATIONS.COVARIANCE;

    if (nObs < minObs) {
      return {
        status: DataClassification.UNAVAILABLE,
        error: `Insufficient observations for covariance: ${nObs} < minimum ${minObs}`,
        observationCount: nObs,
        assetCount: nAssets,
        covarianceMatrix: null
      };
    }

    // Compute means for each asset
    const means = new Array(nAssets).fill(0);
    for (let i = 0; i < nAssets; i++) {
      const row = alignedReturnsMatrix[i];
      if (!RiskForecastValidation.isFiniteArray(row)) {
        return {
          status: DataClassification.UNAVAILABLE,
          error: `Non-finite returns detected for asset ${symbols ? symbols[i] : i}`,
          covarianceMatrix: null
        };
      }
      means[i] = row.reduce((s, v) => s + v, 0) / nObs;
    }

    // Compute N x N sample covariance matrix
    const cov = Array.from({ length: nAssets }, () => new Array(nAssets).fill(0));
    for (let i = 0; i < nAssets; i++) {
      for (let j = i; j < nAssets; j++) {
        let sumProd = 0;
        for (let t = 0; t < nObs; t++) {
          sumProd += (alignedReturnsMatrix[i][t] - means[i]) * (alignedReturnsMatrix[j][t] - means[j]);
        }
        const val = sumProd / (nObs - 1);
        cov[i][j] = val;
        cov[j][i] = val;
      }
    }

    // Assess quality & repair if necessary
    return RiskForecastCovarianceEngine.processCovarianceQualityAndRepair(cov, symbols, nObs, options);
  }

  /**
   * Calculate EWMA Covariance Matrix
   */
  static calculateEWMACovariance(alignedReturnsMatrix, symbols, options = {}) {
    if (!Array.isArray(alignedReturnsMatrix) || alignedReturnsMatrix.length === 0) {
      return {
        status: DataClassification.UNAVAILABLE,
        error: 'Empty returns matrix',
        covarianceMatrix: null
      };
    }

    const nAssets = alignedReturnsMatrix.length;
    const nObs = alignedReturnsMatrix[0]?.length || 0;
    const minObs = options.minObservations || RiskForecastConfig.MIN_OBSERVATIONS.COVARIANCE;

    if (nObs < minObs) {
      return {
        status: DataClassification.UNAVAILABLE,
        error: `Insufficient observations for EWMA covariance: ${nObs} < minimum ${minObs}`,
        observationCount: nObs,
        assetCount: nAssets,
        covarianceMatrix: null
      };
    }

    const lambda = typeof options.lambda === 'number' && options.lambda >= RiskForecastConfig.EWMA.MIN_LAMBDA && options.lambda <= RiskForecastConfig.EWMA.MAX_LAMBDA
      ? options.lambda
      : RiskForecastConfig.EWMA.DEFAULT_LAMBDA;

    // Initial covariance from first min(10, nObs) observations
    const initWindow = Math.min(10, nObs);
    const initialReturns = alignedReturnsMatrix.map(row => row.slice(0, initWindow));
    const initHist = RiskForecastCovarianceEngine.calculateHistoricalCovariance(initialReturns, symbols, { minObservations: 2 });
    
    let currentCov = initHist.covarianceMatrix || Array.from({ length: nAssets }, (_, i) =>
      Array.from({ length: nAssets }, (_, j) => (i === j ? 1e-4 : 0))
    );

    // Compute means over full series
    const means = alignedReturnsMatrix.map(row => row.reduce((s, v) => s + v, 0) / nObs);

    for (let t = initWindow; t < nObs; t++) {
      const nextCov = Array.from({ length: nAssets }, () => new Array(nAssets).fill(0));
      for (let i = 0; i < nAssets; i++) {
        const dev_i = alignedReturnsMatrix[i][t] - means[i];
        for (let j = i; j < nAssets; j++) {
          const dev_j = alignedReturnsMatrix[j][t] - means[j];
          const cross = dev_i * dev_j;
          const val = lambda * currentCov[i][j] + (1 - lambda) * cross;
          nextCov[i][j] = val;
          nextCov[j][i] = val;
        }
      }
      currentCov = nextCov;
    }

    return RiskForecastCovarianceEngine.processCovarianceQualityAndRepair(currentCov, symbols, nObs, {
      ...options,
      model: CovarianceModel.EWMA,
      lambda
    });
  }

  /**
   * Assess matrix quality and apply mathematical repairs if requested / required
   */
  static processCovarianceQualityAndRepair(matrix, symbols, observationCount, options = {}) {
    const rawEigResult = RiskForecastValidation.jacobiEigenvalues(matrix);
    const originalEigenvalues = [...rawEigResult.eigenvalues].sort((a, b) => a - b);
    const quality = RiskForecastValidation.assessCovarianceQuality(matrix, observationCount);
    let finalMatrix = matrix;
    let repairApplied = false;
    let repairMethod = CovarianceRepairMethod.NONE;
    let repairParameters = null;
    let originalMatrix = null;
    let repairedEigenvalues = originalEigenvalues;

    if (!quality.positiveSemidefinite || quality.isIllConditioned) {
      const requestedMethod = options.repairMethod || RiskForecastConfig.COVARIANCE_REPAIR.DEFAULT_METHOD;
      originalMatrix = matrix.map(r => [...r]);

      if (requestedMethod === CovarianceRepairMethod.EIGENVALUE_CLIPPING) {
        const floor = options.eigenvalueFloor || RiskForecastConfig.COVARIANCE_REPAIR.EIGENVALUE_FLOOR;
        finalMatrix = RiskForecastCovarianceEngine.repairEigenvalueClipping(matrix, floor);
        repairApplied = true;
        repairMethod = CovarianceRepairMethod.EIGENVALUE_CLIPPING;
        repairParameters = { eigenvalueFloor: floor };
        const repEigResult = RiskForecastValidation.jacobiEigenvalues(finalMatrix);
        repairedEigenvalues = [...repEigResult.eigenvalues].sort((a, b) => a - b);
      } else if (requestedMethod === CovarianceRepairMethod.SHRINKAGE_LEDROIT_WOLF) {
        const shrinkageAlpha = options.shrinkageAlpha || 0.10;
        finalMatrix = RiskForecastCovarianceEngine.repairLedroitWolfShrinkage(matrix, shrinkageAlpha);
        repairApplied = true;
        repairMethod = CovarianceRepairMethod.SHRINKAGE_LEDROIT_WOLF;
        repairParameters = { shrinkageAlpha };
        const repEigResult = RiskForecastValidation.jacobiEigenvalues(finalMatrix);
        repairedEigenvalues = [...repEigResult.eigenvalues].sort((a, b) => a - b);
      }
    }

    const finalQuality = repairApplied ? RiskForecastValidation.assessCovarianceQuality(finalMatrix, observationCount) : quality;

    return {
      status: finalQuality.positiveSemidefinite ? DataClassification.DERIVED : DataClassification.UNAVAILABLE,
      model: options.model || CovarianceModel.HISTORICAL,
      symbols: symbols || null,
      assetCount: matrix.length,
      observationCount,
      covarianceMatrix: finalMatrix,
      originalMatrix: originalMatrix || matrix.map(r => [...r]),
      originalEigenvalues,
      repairApplied,
      repairMethod,
      repairParameters,
      repairedEigenvalues,
      repairedMatrix: repairApplied ? finalMatrix : null,
      originalConditionNumber: quality.conditionNumber,
      repairedConditionNumber: finalQuality.conditionNumber,
      quality: finalQuality
    };
  }

  /**
   * Eigenvalue clipping repair: decompose, floor eigenvalues at epsilon, reconstruct V * Lambda_clipped * V^T
   */
  static repairEigenvalueClipping(matrix, floor = 1e-6) {
    const n = matrix.length;
    const { eigenvalues, eigenvectors } = RiskForecastValidation.jacobiEigenvalues(matrix);
    
    // Clipped eigenvalues
    const clipped = eigenvalues.map(val => Math.max(floor, val));

    // Reconstruct M = V * diag(clipped) * V^T
    const repaired = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        let sum = 0;
        for (let k = 0; k < n; k++) {
          sum += eigenvectors[i][k] * clipped[k] * eigenvectors[j][k];
        }
        repaired[i][j] = sum;
      }
    }

    // Ensure exact symmetry
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const avg = (repaired[i][j] + repaired[j][i]) / 2;
        repaired[i][j] = avg;
        repaired[j][i] = avg;
      }
    }

    return repaired;
  }

  /**
   * Linear Shrinkage repair towards structured diagonal target
   */
  static repairLedroitWolfShrinkage(matrix, alpha = 0.10) {
    const n = matrix.length;
    // Compute mean variance (average diagonal)
    let sumDiag = 0;
    for (let i = 0; i < n; i++) sumDiag += matrix[i][i];
    const meanVar = sumDiag / n;

    const repaired = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const target = (i === j) ? meanVar : 0;
        repaired[i][j] = (1 - alpha) * matrix[i][j] + alpha * target;
      }
    }
    return repaired;
  }
}
