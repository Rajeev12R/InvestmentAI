import { OptimizationStatus } from "./portfolioConstruction.types.js";
import { PORTFOLIO_OPTIMIZATION_CONFIG_V1, PORTFOLIO_RISK_CONFIG_V1 } from "./portfolioConstructionConfig.js";

/**
 * Deterministic Covariance & Risk Input Engine for Phase 14
 */
export class CovarianceEngine {
  /**
   * Compute sample covariance matrix from multi-asset return series.
   * Returns matrix and status.
   */
  static computeCovarianceMatrix(returnSeriesMap, config = PORTFOLIO_OPTIMIZATION_CONFIG_V1) {
    const tickers = Object.keys(returnSeriesMap);
    const n = tickers.length;

    if (n === 0) {
      return {
        status: OptimizationStatus.INVALID_INPUT,
        reasonCode: "EMPTY_SECURITIES",
        covarianceMatrix: null,
        tickers: []
      };
    }

    // Verify observation lengths
    const minObs = config.minObservationsForCovariance || 30;
    const obsLengths = tickers.map(t => Array.isArray(returnSeriesMap[t]) ? returnSeriesMap[t].length : 0);
    const minLen = Math.min(...obsLengths);

    if (minLen < minObs) {
      return {
        status: OptimizationStatus.INSUFFICIENT_DATA,
        reasonCode: `INSUFFICIENT_OBSERVATIONS_MIN_${minObs}_REQUIRED`,
        observedCount: minLen,
        requiredCount: minObs,
        covarianceMatrix: null,
        tickers
      };
    }

    // Verify all return lengths match
    const T = obsLengths[0];
    for (let i = 1; i < n; i++) {
      if (obsLengths[i] !== T) {
        return {
          status: OptimizationStatus.INVALID_INPUT,
          reasonCode: "MISMATCHED_RETURN_SERIES_LENGTHS",
          tickers
        };
      }
    }

    // Calculate means
    const means = {};
    for (const t of tickers) {
      const sum = returnSeriesMap[t].reduce((acc, v) => acc + v, 0);
      means[t] = sum / T;
    }

    // Compute NxN covariance matrix annualized by 252
    const matrix = [];
    const annualFactor = PORTFOLIO_RISK_CONFIG_V1.annualizationFactor;

    for (let i = 0; i < n; i++) {
      const row = [];
      const tA = tickers[i];
      const seriesA = returnSeriesMap[tA];
      const meanA = means[tA];

      for (let j = 0; j < n; j++) {
        const tB = tickers[j];
        const seriesB = returnSeriesMap[tB];
        const meanB = means[tB];

        let cov = 0;
        for (let t = 0; t < T; t++) {
          cov += (seriesA[t] - meanA) * (seriesB[t] - meanB);
        }
        const sampleCov = (cov / (T - 1)) * annualFactor;
        row.push(Number(sampleCov.toFixed(8)));
      }
      matrix.push(row);
    }

    // Validate the resulting matrix
    const validation = this.validateCovarianceMatrix(matrix, config);
    if (!validation.isValid) {
      return {
        status: validation.status,
        reasonCode: validation.reasonCode,
        covarianceMatrix: null,
        tickers
      };
    }

    return {
      status: OptimizationStatus.OPTIMAL,
      covarianceMatrix: matrix,
      tickers,
      observationCount: T,
      annualizationFactor: annualFactor
    };
  }

  /**
   * Validate matrix symmetry, non-negativity of diagonals, finiteness, and positive semi-definiteness.
   */
  static validateCovarianceMatrix(matrix, config = PORTFOLIO_OPTIMIZATION_CONFIG_V1) {
    if (!Array.isArray(matrix) || matrix.length === 0) {
      return { isValid: false, status: OptimizationStatus.INVALID_INPUT, reasonCode: "EMPTY_MATRIX" };
    }

    const n = matrix.length;
    for (let i = 0; i < n; i++) {
      if (!Array.isArray(matrix[i]) || matrix[i].length !== n) {
        return { isValid: false, status: OptimizationStatus.INVALID_INPUT, reasonCode: "NON_SQUARE_MATRIX" };
      }
    }

    // Check symmetry, diagonals, finite values
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const val = matrix[i][j];
        if (typeof val !== "number" || isNaN(val) || !isFinite(val)) {
          return { isValid: false, status: OptimizationStatus.NUMERICAL_FAILURE, matrixClass: "NON_FINITE", reasonCode: "NON_FINITE_COVARIANCE_VALUE" };
        }
        if (i === j && val < 0) {
          return { isValid: false, status: OptimizationStatus.NUMERICAL_FAILURE, matrixClass: "NEGATIVE_VARIANCE", reasonCode: `NEGATIVE_VARIANCE_ON_DIAGONAL_AT_${i}` };
        }
        if (Math.abs(matrix[i][j] - matrix[j][i]) > 1e-6) {
          return { isValid: false, status: OptimizationStatus.NUMERICAL_FAILURE, matrixClass: "ASYMMETRIC", reasonCode: `ASYMMETRIC_MATRIX_AT_${i}_${j}` };
        }
      }
    }

    // Check Positive Semi-Definiteness via modified Cholesky attempt with small tolerance
    const psdCheck = this.checkPositiveSemiDefinite(matrix);
    if (!psdCheck.isPSD) {
      return { isValid: false, status: OptimizationStatus.NUMERICAL_FAILURE, matrixClass: "NON_PSD", reasonCode: "MATRIX_NOT_POSITIVE_SEMI_DEFINITE" };
    }

    // Check condition number & trace singularity
    const trace = matrix.reduce((sum, row, idx) => sum + row[idx], 0);
    if (trace <= 1e-12) {
      return { isValid: false, status: OptimizationStatus.NUMERICAL_FAILURE, matrixClass: "ZERO_TRACE_SINGULAR", reasonCode: "SINGULAR_ZERO_VARIANCE_MATRIX" };
    }

    // Determinant / condition check for PD vs PSD vs ILL_CONDITIONED
    let minDiagL = Infinity;
    let maxDiagL = 0;
    if (psdCheck.L) {
      for (let i = 0; i < n; i++) {
        const d = psdCheck.L[i][i];
        if (d < minDiagL) minDiagL = d;
        if (d > maxDiagL) maxDiagL = d;
      }
    }

    const minEigEst = minDiagL * minDiagL;
    const maxEigEst = maxDiagL * maxDiagL;
    const conditionNumberEst = minEigEst > 1e-12 ? (maxEigEst / minEigEst) : Infinity;
    const condLimit = config.conditionNumberLimit || 1e6;

    if (minDiagL < 1e-6) {
      // Near-singular or PSD singular matrix
      return {
        isValid: false,
        status: OptimizationStatus.NUMERICAL_FAILURE,
        matrixClass: "PSD_SINGULAR",
        reasonCode: "PSD is mathematically valid, but the current optimization implementation requires PD for numerical stability.",
        minEigenvalueEstimate: Number(minEigEst.toFixed(8)),
        conditionNumberEstimate: conditionNumberEst
      };
    }

    if (conditionNumberEst > condLimit) {
      return {
        isValid: false,
        status: OptimizationStatus.NUMERICAL_FAILURE,
        matrixClass: "ILL_CONDITIONED",
        reasonCode: `ILL_CONDITIONED_COVARIANCE_MATRIX_COND_${conditionNumberEst.toFixed(1)}_EXCEEDS_${condLimit}`,
        minEigenvalueEstimate: Number(minEigEst.toFixed(8)),
        conditionNumberEstimate: conditionNumberEst
      };
    }

    return {
      isValid: true,
      status: OptimizationStatus.OPTIMAL,
      matrixClass: "POSITIVE_DEFINITE",
      minEigenvalueEstimate: Number(minEigEst.toFixed(8)),
      conditionNumberEstimate: Number(conditionNumberEst.toFixed(2))
    };
  }

  /**
   * Positive Semi-Definiteness check using Cholesky-Banachiewicz with jitter tolerance.
   */
  static checkPositiveSemiDefinite(matrix) {
    const n = matrix.length;
    const L = Array.from({ length: n }, () => Array(n).fill(0));
    const eps = 1e-8;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        let sum = 0;
        for (let k = 0; k < j; k++) {
          sum += L[i][k] * L[j][k];
        }

        if (i === j) {
          const val = matrix[i][i] - sum;
          if (val < -eps) {
            return { isPSD: false, failedIndex: i, diagonalValue: val };
          }
          L[i][j] = Math.sqrt(Math.max(0, val));
        } else {
          if (Math.abs(L[j][j]) < eps) {
            L[i][j] = 0;
          } else {
            L[i][j] = (matrix[i][j] - sum) / L[j][j];
          }
        }
      }
    }

    return { isPSD: true, L };
  }

  /**
   * Calculate portfolio variance: w^T * Sigma * w
   */
  static calculatePortfolioVariance(weights, covarianceMatrix) {
    const n = weights.length;
    let variance = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        variance += weights[i] * covarianceMatrix[i][j] * weights[j];
      }
    }
    return Math.max(0, variance);
  }

  /**
   * Calculate portfolio volatility: sqrt(w^T * Sigma * w)
   */
  static calculatePortfolioVolatility(weights, covarianceMatrix) {
    const variance = this.calculatePortfolioVariance(weights, covarianceMatrix);
    return Math.sqrt(variance);
  }

  /**
   * Calculate Marginal Risk Contribution (MRC) & Component Risk Contribution (RC).
   * MRC_i = (Sigma * w)_i / sigma_p
   * RC_i = w_i * MRC_i
   * PRC_i = RC_i / sigma_p
   */
  static calculateRiskContributions(weights, covarianceMatrix, tickers) {
    const n = weights.length;
    const sigmaP = this.calculatePortfolioVolatility(weights, covarianceMatrix);

    if (sigmaP <= 1e-9) {
      return {
        portfolioVolatility: 0,
        marginalRiskContributions: weights.map(() => 0),
        componentRiskContributions: weights.map(() => 0),
        percentageRiskContributions: weights.map(() => 0),
        reconciliationDiff: 0,
        isReconciled: true,
        byTicker: (tickers || []).map(t => ({ ticker: t, rc: 0, prc: 0, mrc: 0 }))
      };
    }

    const sigmaW = [];
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) {
        sum += covarianceMatrix[i][j] * weights[j];
      }
      sigmaW.push(sum);
    }

    const mrc = sigmaW.map(val => val / sigmaP);
    const rc = weights.map((w, i) => w * mrc[i]);
    const prc = rc.map(val => val / sigmaP);

    const sumRC = rc.reduce((a, b) => a + b, 0);
    const reconciliationDiff = Math.abs(sumRC - sigmaP);
    const isReconciled = reconciliationDiff < (PORTFOLIO_RISK_CONFIG_V1.riskContributionTolerance || 1e-4);

    const byTicker = (tickers || []).map((ticker, i) => ({
      ticker,
      weight: weights[i],
      marginalRiskContribution: Number(mrc[i].toFixed(6)),
      riskContribution: Number(rc[i].toFixed(6)),
      percentageRiskContribution: Number(prc[i].toFixed(6))
    }));

    return {
      portfolioVolatility: Number(sigmaP.toFixed(6)),
      marginalRiskContributions: mrc.map(v => Number(v.toFixed(6))),
      componentRiskContributions: rc.map(v => Number(v.toFixed(6))),
      percentageRiskContributions: prc.map(v => Number(v.toFixed(6))),
      sumRiskContribution: Number(sumRC.toFixed(6)),
      reconciliationDiff: Number(reconciliationDiff.toFixed(8)),
      isReconciled,
      byTicker
    };
  }
}
