import { RiskForecastConfig } from './riskForecast.config.js';

/**
 * Phase 31 — Mathematical and Matrix Validation Utilities
 */
export class RiskForecastValidation {
  /**
   * Check if array contains any NaN or non-finite values
   */
  static isFiniteArray(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return false;
    for (let i = 0; i < arr.length; i++) {
      const v = arr[i];
      if (typeof v !== 'number' || isNaN(v) || !isFinite(v)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Validate covariance matrix structure (square, symmetric, finite)
   */
  static validateCovarianceMatrix(matrix, expectedDim = null) {
    if (!Array.isArray(matrix) || matrix.length === 0) {
      throw new Error('Covariance matrix must be a non-empty 2D array');
    }
    const n = matrix.length;
    if (expectedDim !== null && n !== expectedDim) {
      throw new Error(`Covariance matrix dimension mismatch: expected ${expectedDim}x${expectedDim}, got ${n}x${n}`);
    }

    for (let i = 0; i < n; i++) {
      if (!Array.isArray(matrix[i]) || matrix[i].length !== n) {
        throw new Error(`Covariance matrix row ${i} has invalid length ${matrix[i]?.length}, expected ${n}`);
      }
      for (let j = 0; j < n; j++) {
        const val = matrix[i][j];
        if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) {
          throw new Error(`Covariance matrix contains non-finite element at [${i}, ${j}]: ${val}`);
        }
      }
    }

    // Check symmetry: C[i][j] == C[j][i]
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(matrix[i][j] - matrix[j][i]) > 1e-6) {
          throw new Error(`Covariance matrix is asymmetric at [${i}, ${j}] (${matrix[i][j]} vs ${matrix[j][i]})`);
        }
      }
    }

    return true;
  }

  /**
   * Jacobi Eigenvalue Algorithm for real symmetric matrices
   * Returns { eigenvalues: number[], eigenvectors: number[][] }
   */
  static jacobiEigenvalues(matrix, maxIter = 100, tolerance = 1e-10) {
    const n = matrix.length;
    // Clone matrix
    const A = matrix.map(row => [...row]);
    // Initialize V as identity
    const V = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => (i === j ? 1.0 : 0.0))
    );

    let iter = 0;
    while (iter < maxIter) {
      // Find maximum off-diagonal element
      let maxOffDiag = 0;
      let p = 0;
      let q = 1;
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const absVal = Math.abs(A[i][j]);
          if (absVal > maxOffDiag) {
            maxOffDiag = absVal;
            p = i;
            q = j;
          }
        }
      }

      if (maxOffDiag < tolerance) {
        break;
      }

      const App = A[p][p];
      const Aqq = A[q][q];
      const Apq = A[p][q];

      const phi = 0.5 * Math.atan2(2 * Apq, Aqq - App);
      const c = Math.cos(phi);
      const s = Math.sin(phi);

      // Perform Jacobi rotation
      for (let k = 0; k < n; k++) {
        if (k !== p && k !== q) {
          const Akp = A[k][p];
          const Akq = A[k][q];
          A[k][p] = c * Akp - s * Akq;
          A[p][k] = A[k][p];
          A[k][q] = s * Akp + c * Akq;
          A[q][k] = A[k][q];
        }
      }

      A[p][p] = c * c * App - 2 * s * c * Apq + s * s * Aqq;
      A[q][q] = s * s * App + 2 * s * c * Apq + c * c * Aqq;
      A[p][q] = 0;
      A[q][p] = 0;

      // Update eigenvectors
      for (let k = 0; k < n; k++) {
        const Vkp = V[k][p];
        const Vkq = V[k][q];
        V[k][p] = c * Vkp - s * Vkq;
        V[k][q] = s * Vkp + c * Vkq;
      }

      iter++;
    }

    const eigenvalues = [];
    for (let i = 0; i < n; i++) {
      eigenvalues.push(A[i][i]);
    }

    return { eigenvalues, eigenvectors: V };
  }

  /**
   * Assess covariance quality metrics
   */
  static assessCovarianceQuality(matrix, observationCount = null) {
    RiskForecastValidation.validateCovarianceMatrix(matrix);
    const n = matrix.length;
    const { eigenvalues } = RiskForecastValidation.jacobiEigenvalues(matrix);

    const sortedEigs = [...eigenvalues].sort((a, b) => a - b);
    const minEigenvalue = sortedEigs[0];
    const maxEigenvalue = sortedEigs[sortedEigs.length - 1];

    const eps = RiskForecastConfig.TOLERANCES.EIGENVALUE_ZERO_TOLERANCE;
    const isPsd = minEigenvalue >= -eps;
    const isPd = minEigenvalue > eps;

    let conditionNumber = Infinity;
    if (minEigenvalue > 0) {
      conditionNumber = maxEigenvalue / minEigenvalue;
    }

    return {
      assetCount: n,
      observationCount: observationCount || null,
      minimumEigenvalue: minEigenvalue,
      maximumEigenvalue: maxEigenvalue,
      positiveSemidefinite: isPsd,
      positiveDefinite: isPd,
      conditionNumber: isFinite(conditionNumber) ? conditionNumber : 1e12,
      isIllConditioned: !isPd || conditionNumber > RiskForecastConfig.TOLERANCES.MAX_CONDITION_NUMBER
    };
  }

  /**
   * Matrix-vector product: result = M * v
   */
  static matrixVectorMultiply(M, v) {
    const n = M.length;
    const result = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) {
        sum += M[i][j] * v[j];
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
    if (covarianceMatrix.length !== n) {
      throw new Error(`Dimension mismatch: weights length ${n} vs covariance matrix dim ${covarianceMatrix.length}`);
    }
    const Sw = RiskForecastValidation.matrixVectorMultiply(covarianceMatrix, weights);
    let variance = 0;
    for (let i = 0; i < n; i++) {
      variance += weights[i] * Sw[i];
    }
    return variance;
  }
}
