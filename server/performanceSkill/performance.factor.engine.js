import { deepFreeze, computePerformanceHash, FactorType, SkillConfidenceLevel } from './performance.types.js';

/**
 * Matrix inversion & linear algebra helper for OLS regressions
 */
class MatrixMath {
  static transpose(matrix) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const result = Array.from({ length: cols }, () => Array(rows).fill(0));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        result[c][r] = matrix[r][c];
      }
    }
    return result;
  }

  static multiply(A, B) {
    const rowsA = A.length;
    const colsA = A[0].length;
    const colsB = B[0].length;
    const result = Array.from({ length: rowsA }, () => Array(colsB).fill(0));
    for (let i = 0; i < rowsA; i++) {
      for (let j = 0; j < colsB; j++) {
        let sum = 0;
        for (let k = 0; k < colsA; k++) {
          sum += A[i][k] * B[k][j];
        }
        result[i][j] = sum;
      }
    }
    return result;
  }

  // Invert symmetric positive-definite / non-singular matrix (using Gauss-Jordan with partial pivoting)
  static invert(matrix) {
    const n = matrix.length;
    const aug = matrix.map((row, i) => {
      const ext = Array(n).fill(0);
      ext[i] = 1;
      return [...row, ...ext];
    });

    for (let i = 0; i < n; i++) {
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) {
          maxRow = k;
        }
      }
      if (maxRow !== i) {
        const temp = aug[i];
        aug[i] = aug[maxRow];
        aug[maxRow] = temp;
      }

      const pivot = aug[i][i];
      if (Math.abs(pivot) < 1e-12) {
        // Singular or near-singular, add tiny ridge regularization
        aug[i][i] += 1e-6;
      }
      const actualPivot = aug[i][i];
      for (let j = 0; j < 2 * n; j++) {
        aug[i][j] /= actualPivot;
      }

      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const factor = aug[k][i];
          for (let j = 0; j < 2 * n; j++) {
            aug[k][j] -= factor * aug[i][j];
          }
        }
      }
    }

    return aug.map(row => row.slice(n));
  }
}

/**
 * Phase 29 — Deterministic Factor Exposure & Multi-Factor Attribution Engine
 */
export class PerformanceFactorEngine {
  /**
   * Run Multi-Factor OLS Regression
   * @param {Object} params
   * @param {string} params.factorExposureId
   * @param {number[]} params.portfolioExcessReturns Series of (r_p - r_f)
   * @param {Record<string, number[]>} params.factorReturns Map of factor names to return series
   * @param {number} params.periodsPerYear Periods per year (default 252)
   */
  static estimateFactorExposure({
    factorExposureId = `fact-exp-${Date.now()}`,
    portfolioExcessReturns = [],
    factorReturns = {},
    periodsPerYear = 252
  } = {}) {
    if (!Array.isArray(portfolioExcessReturns) || portfolioExcessReturns.length < 5) {
      throw new Error('portfolioExcessReturns must contain at least 5 observations');
    }

    const n = portfolioExcessReturns.length;
    const factorNames = Object.keys(factorReturns);

    if (factorNames.length === 0) {
      throw new Error('At least one factor series is required in factorReturns');
    }

    for (const fName of factorNames) {
      if (!Array.isArray(factorReturns[fName]) || factorReturns[fName].length !== n) {
        throw new Error(`Factor series ${fName} must match length of portfolio excess returns (${n})`);
      }
    }

    // Build X matrix with intercept column [1, f_1, f_2, ...]
    // Dimension: n x (K + 1)
    const K = factorNames.length;
    const X = [];
    const Y = portfolioExcessReturns.map(y => [y]); // n x 1

    for (let i = 0; i < n; i++) {
      const row = [1.0];
      for (const fName of factorNames) {
        row.push(factorReturns[fName][i]);
      }
      X.push(row);
    }

    // OLS: Beta = (X'X)^(-1) X' Y
    const Xt = MatrixMath.transpose(X);
    const XtX = MatrixMath.multiply(Xt, X);
    const XtX_inv = MatrixMath.invert(XtX);
    const XtY = MatrixMath.multiply(Xt, Y);
    const betaMatrix = MatrixMath.multiply(XtX_inv, XtY);

    const intercept = betaMatrix[0][0];
    const factorBetas = {};
    for (let k = 0; k < K; k++) {
      factorBetas[factorNames[k]] = Number(betaMatrix[k + 1][0].toFixed(6));
    }

    // Compute fitted values, residuals, sum of squares
    let sst = 0;
    let sse = 0;
    const meanY = portfolioExcessReturns.reduce((a, b) => a + b, 0) / n;
    const residuals = [];
    const fitted = [];

    for (let i = 0; i < n; i++) {
      let yHat = intercept;
      for (let k = 0; k < K; k++) {
        yHat += factorBetas[factorNames[k]] * factorReturns[factorNames[k]][i];
      }
      fitted.push(yHat);
      const res = portfolioExcessReturns[i] - yHat;
      residuals.push(res);
      sse += res * res;
      sst += Math.pow(portfolioExcessReturns[i] - meanY, 2);
    }

    const rSquared = sst > 0 ? Math.max(0, Math.min(1, 1 - (sse / sst))) : 0;
    const df = n - (K + 1);
    const adjRSquared = df > 0 && sst > 0
      ? Math.max(0, 1 - ((sse / df) / (sst / (n - 1))))
      : rSquared;

    // Standard errors of coefficients
    const sigmaSq = df > 0 ? sse / df : 0;
    const stdErrors = [];
    for (let i = 0; i <= K; i++) {
      const se = Math.sqrt(Math.max(0, sigmaSq * XtX_inv[i][i]));
      stdErrors.push(se);
    }

    // Alpha annualized and its t-statistic
    const annualizedAlpha = intercept * periodsPerYear;
    const alphaTStat = stdErrors[0] > 0 ? intercept / stdErrors[0] : 0;

    // Factor t-stats
    const factorTStats = {};
    for (let k = 0; k < K; k++) {
      const se = stdErrors[k + 1];
      factorTStats[factorNames[k]] = se > 0 ? Number((factorBetas[factorNames[k]] / se).toFixed(4)) : 0;
    }

    // Factor Contributions to total return
    const factorContributions = {};
    let totalFactorReturn = 0;
    for (const fName of factorNames) {
      const meanF = factorReturns[fName].reduce((a, b) => a + b, 0) / n;
      const fCont = factorBetas[fName] * meanF * periodsPerYear;
      factorContributions[fName] = Number(fCont.toFixed(6));
      totalFactorReturn += fCont;
    }

    const totalExcessReturnAnn = meanY * periodsPerYear;
    const systematicFraction = totalExcessReturnAnn !== 0 ? Math.min(1, Math.max(0, totalFactorReturn / totalExcessReturnAnn)) : (rSquared);
    const idiosyncraticFraction = 1 - systematicFraction;

    // Confidence / Classification
    // Rule: High R-squared (> 0.70) or majority of returns driven by market beta / systematic factors => PERFORMANCE_LIKELY_SYSTEMATIC
    let skillConfidence = SkillConfidenceLevel.SUPPORTED_SKILL_INDICATOR;
    if (rSquared >= 0.70 || Math.abs(alphaTStat) < 1.96) {
      skillConfidence = SkillConfidenceLevel.PERFORMANCE_LIKELY_SYSTEMATIC;
    }
    if (n < 36) {
      skillConfidence = SkillConfidenceLevel.INSUFFICIENT_EVIDENCE;
    }

    const result = {
      factorExposureId,
      sampleSize: n,
      rSquared: Number(rSquared.toFixed(4)),
      adjustedRSquared: Number(adjRSquared.toFixed(4)),
      annualizedAlpha: Number(annualizedAlpha.toFixed(6)),
      alphaTStat: Number(alphaTStat.toFixed(4)),
      factorBetas,
      factorTStats,
      factorContributions,
      totalFactorContribution: Number(totalFactorReturn.toFixed(6)),
      systematicFraction: Number(systematicFraction.toFixed(4)),
      idiosyncraticFraction: Number(idiosyncraticFraction.toFixed(4)),
      skillConfidence,
      residuals: residuals.map(r => Number(r.toFixed(6))),
      calculatedAt: new Date().toISOString()
    };

    result.hash = computePerformanceHash(result);
    return deepFreeze(result);
  }
}
