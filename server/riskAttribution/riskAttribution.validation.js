/**
 * server/riskAttribution/riskAttribution.validation.js
 * 
 * Phase 32: Mathematical Validation, Matrix Algebra & Numerical Safety
 */

import { RiskAttributionConfig } from './riskAttribution.config.js';

export class RiskAttributionValidation {
  /**
   * Validate matrix symmetry, dimension, and numerical safety
   */
  static validateCovarianceMatrix(matrix, expectedDim) {
    if (!Array.isArray(matrix) || matrix.length !== expectedDim) {
      throw new Error(`Covariance matrix must be an array of length ${expectedDim}`);
    }
    for (let i = 0; i < expectedDim; i++) {
      if (!Array.isArray(matrix[i]) || matrix[i].length !== expectedDim) {
        throw new Error(`Covariance matrix row ${i} must have length ${expectedDim}`);
      }
      for (let j = 0; j < expectedDim; j++) {
        const val = matrix[i][j];
        if (typeof val !== 'number' || Number.isNaN(val) || !Number.isFinite(val)) {
          throw new Error(`Invalid covariance entry at [${i},${j}]: must be a finite number`);
        }
        // Symmetry check
        if (Math.abs(matrix[i][j] - matrix[j][i]) > 1e-6) {
          throw new Error(`Covariance matrix is asymmetric at [${i},${j}] vs [${j},${i}]`);
        }
      }
      // Diagonal must be non-negative
      if (matrix[i][i] < 0) {
        throw new Error(`Negative variance at diagonal [${i},${i}]: ${matrix[i][i]}`);
      }
    }
    return true;
  }

  /**
   * Matrix-vector multiplication: (M * v)
   */
  static matrixVectorMultiply(matrix, vector) {
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
  static quadraticForm(weights, covarianceMatrix) {
    const n = weights.length;
    let total = 0;
    for (let i = 0; i < n; i++) {
      let rowSum = 0;
      for (let j = 0; j < n; j++) {
        rowSum += covarianceMatrix[i][j] * weights[j];
      }
      total += weights[i] * rowSum;
    }
    return total;
  }

  /**
   * Validate portfolio inputs (symbols and weights)
   */
  static validatePortfolioInputs(symbols, weights) {
    if (!Array.isArray(symbols) || symbols.length === 0) {
      throw new Error('symbols must be a non-empty array of strings');
    }
    if (!Array.isArray(weights) || weights.length !== symbols.length) {
      throw new Error('weights must be an array matching symbols length');
    }
    for (let i = 0; i < symbols.length; i++) {
      if (typeof symbols[i] !== 'string' || !symbols[i].trim()) {
        throw new Error(`Invalid symbol at index ${i}: must be non-empty string`);
      }
      if (typeof weights[i] !== 'number' || Number.isNaN(weights[i]) || !Number.isFinite(weights[i])) {
        throw new Error(`Invalid weight at index ${i}: must be a finite number`);
      }
    }
    return true;
  }

  /**
   * High-precision Inverse Standard Normal Quantile (z-score for given probability p)
   * Using Beasley-Springer-Moro / Acklam approximation
   */
  static standardNormalQuantile(p) {
    if (p <= 0 || p >= 1) {
      throw new Error(`Probability p must be strictly in (0, 1), received ${p}`);
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

    if (p < p_low) {
      // Lower tail
      const q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
             ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    } else if (p <= p_high) {
      // Central region
      const q = p - 0.5;
      const r = q * q;
      return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
             (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    } else {
      // Upper tail
      const q = Math.sqrt(-2 * Math.log(1 - p));
      return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
              ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
  }

  /**
   * Safe division handling zero denominator
   */
  static safeDiv(numerator, denominator, fallback = 0) {
    if (Math.abs(denominator) < RiskAttributionConfig.TOLERANCES.ZERO_VOLATILITY_EPSILON) {
      return fallback;
    }
    return numerator / denominator;
  }
}
