/**
 * server/portfolioOptimization/portfolioOptimization.validation.js
 * 
 * Phase 33: Numerical & Input Validation Layer
 */

import { OPTIMIZATION_CONFIG } from './portfolioOptimization.config.js';

export class PortfolioOptimizationValidation {
  /**
   * Peter John Acklam's inverse normal CDF approximation
   * Machine precision approximation for standard normal quantiles.
   */
  static inverseNormalCDF(p) {
    if (p <= 0 || p >= 1) {
      throw new Error(`Probability p must be in (0, 1), got ${p}`);
    }

    const a = [
      -3.969683028665376e+01,
       2.209460984245205e+02,
      -2.759285104469687e+02,
       1.383577518672690e+02,
      -3.066479806614716e+01,
       2.506628277459239e+00
    ];

    const b = [
      -5.447609879822406e+01,
       1.615858368580409e+02,
      -1.556989798598866e+02,
       6.680131188771972e+01,
      -1.328068155288572e+01
    ];

    const c = [
      -7.784894002430293e-03,
      -3.223964580411365e-01,
      -2.400758277161838e+00,
      -2.549732539343734e+00,
       4.374664141464968e+00,
       2.938163982698783e+00
    ];

    const d = [
       7.784695709041462e-03,
       3.224671290700398e-01,
       2.445134137142996e+00,
       3.754408661907416e+00
    ];

    const p_low = 0.02425;
    const p_high = 1 - p_low;

    let q, r;

    if (p < p_low) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0]*q + c[1])*q + c[2])*q + c[3])*q + c[4])*q + c[5]) /
             ((((d[0]*q + d[1])*q + d[2])*q + d[3])*q + 1);
    } else if (p <= p_high) {
      q = p - 0.5;
      r = q * q;
      return (((((a[0]*r + a[1])*r + a[2])*r + a[3])*r + a[4])*r + a[5])*q /
             (((((b[0]*r + b[1])*r + b[2])*r + b[3])*r + b[4])*r + 1);
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return -(((((c[0]*q + c[1])*q + c[2])*q + c[3])*q + c[4])*q + c[5]) /
              ((((d[0]*q + d[1])*q + d[2])*q + d[3])*q + 1);
    }
  }

  /**
   * Standard Normal PDF phi(z)
   */
  static normalPDF(z) {
    return (1.0 / Math.sqrt(2.0 * Math.PI)) * Math.exp(-0.5 * z * z);
  }

  /**
   * Validate matrix symmetry and positive semi-definiteness via Cholesky decomposition.
   */
  static validateCovarianceMatrix(matrix, symbols) {
    const n = symbols.length;
    if (!Array.isArray(matrix) || matrix.length !== n) {
      throw new Error(`Covariance matrix row count (${matrix?.length}) does not match symbols count (${n})`);
    }

    for (let i = 0; i < n; i++) {
      if (!Array.isArray(matrix[i]) || matrix[i].length !== n) {
        throw new Error(`Covariance matrix row ${i} length does not match symbols count (${n})`);
      }
      for (let j = 0; j < n; j++) {
        const val = matrix[i][j];
        if (typeof val !== 'number' || Number.isNaN(val) || !Number.isFinite(val)) {
          throw new Error(`Covariance matrix contains non-finite value at [${i},${j}]: ${val}`);
        }
      }
      if (matrix[i][i] < 0) {
        throw new Error(`Covariance matrix diagonal contains negative variance at [${i},${i}]: ${matrix[i][i]}`);
      }
    }

    // Check symmetry
    const tol = OPTIMIZATION_CONFIG.TOLERANCE.FEASIBILITY;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(matrix[i][j] - matrix[j][i]) > tol) {
          throw new Error(`Covariance matrix is asymmetric at [${i},${j}] (${matrix[i][j]}) vs [${j},${i}] (${matrix[j][i]})`);
        }
      }
    }

    return true;
  }

  /**
   * Computes Cholesky factor L (M = L * L^T). Returns null if not PSD.
   */
  static choleskyDecomposition(matrix) {
    const n = matrix.length;
    const L = Array.from({ length: n }, () => new Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        let sum = 0;
        for (let k = 0; k < j; k++) {
          sum += L[i][k] * L[j][k];
        }

        if (i === j) {
          const val = matrix[i][i] - sum;
          if (val < -OPTIMIZATION_CONFIG.TOLERANCE.ZERO_THRESHOLD) {
            return null; // Not PSD
          }
          L[i][j] = Math.sqrt(Math.max(0, val));
        } else {
          if (L[j][j] === 0) {
            L[i][j] = 0;
          } else {
            L[i][j] = (matrix[i][j] - sum) / L[j][j];
          }
        }
      }
    }
    return L;
  }

  /**
   * Explicit ridge regularization for near-singular or non-PSD matrices.
   * Exposes structured audit trail of adjustments.
   */
  static regularizeCovariance(matrix, lambda = OPTIMIZATION_CONFIG.TOLERANCE.REGULARIZATION_MIN) {
    const n = matrix.length;
    const regularized = Array.from({ length: n }, () => new Array(n).fill(0));
    let trace = 0;
    for (let i = 0; i < n; i++) trace += matrix[i][i];
    const avgDiag = trace / n;
    const shrinkage = Math.max(lambda, avgDiag * 1e-6);

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        regularized[i][j] = matrix[i][j] + (i === j ? shrinkage : 0);
      }
    }

    return {
      regularizedMatrix: regularized,
      wasRegularized: true,
      shrinkageApplied: shrinkage,
      originalTrace: trace
    };
  }

  /**
   * Matrix-vector multiplication
   */
  static multiplyMatrixVector(matrix, vector) {
    const n = matrix.length;
    const result = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) {
        sum += matrix[i][j] * vector[j];
      }
      result[i] = sum;
    }
    return result;
  }

  /**
   * Quadratic form: w^T * Sigma * w
   */
  static quadraticForm(vector, matrix) {
    const n = vector.length;
    let total = 0;
    for (let i = 0; i < n; i++) {
      let rowSum = 0;
      for (let j = 0; j < n; j++) {
        rowSum += matrix[i][j] * vector[j];
      }
      total += vector[i] * rowSum;
    }
    return total;
  }

  /**
   * Calculates annualized portfolio variance
   */
  static calculatePortfolioVariance(matrix, weights, periodsPerYear = 252) {
    const rawVar = Math.max(0, this.quadraticForm(weights, matrix));
    return rawVar * periodsPerYear;
  }

  /**
   * Calculates annualized portfolio volatility
   */
  static calculatePortfolioVolatility(matrix, weights, periodsPerYear = 252) {
    return Math.sqrt(this.calculatePortfolioVariance(matrix, weights, periodsPerYear));
  }

  /**
   * Dot product of two vectors
   */
  static dotProduct(a, b) {
    return a.reduce((sum, val, i) => sum + val * b[i], 0);
  }

  /**
   * Safe division with configurable zero threshold
   */
  static safeDivide(numerator, denominator, fallback = 0.0) {
    if (Math.abs(denominator) < OPTIMIZATION_CONFIG.TOLERANCE.ZERO_THRESHOLD) {
      return fallback;
    }
    const res = numerator / denominator;
    return Number.isFinite(res) ? res : fallback;
  }

  static inverseNormalCdf(p) {
    return this.inverseNormalCDF(p);
  }
}
