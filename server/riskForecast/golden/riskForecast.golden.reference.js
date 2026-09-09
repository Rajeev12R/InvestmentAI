/**
 * Phase 31 — Pure Independent Golden Reference Implementation
 * 
 * STRICT CONSTRAINT: Zero imports from production engines (riskForecast.*.engine.js).
 * Pure mathematical reference calculations used to certify all 40 golden archetypes.
 */

export class RiskForecastGoldenReference {
  /**
   * Sample Mean: 1/N * sum(x_i)
   */
  static refMean(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    return arr.reduce((s, x) => s + x, 0) / arr.length;
  }

  /**
   * Sample Variance (Unbiased with N - 1 denominator): 1/(N - 1) * sum((x_i - mean)^2)
   */
  static refSampleVariance(arr) {
    if (!Array.isArray(arr) || arr.length < 2) return 0;
    const m = this.refMean(arr);
    return arr.reduce((s, x) => s + Math.pow(x - m, 2), 0) / (arr.length - 1);
  }

  /**
   * Sample Covariance (Unbiased with N - 1 denominator): 1/(N - 1) * sum((x_i - mean_x)(y_i - mean_y))
   */
  static refSampleCovariance(arr1, arr2) {
    if (!Array.isArray(arr1) || !Array.isArray(arr2) || arr1.length !== arr2.length || arr1.length < 2) return 0;
    const m1 = this.refMean(arr1);
    const m2 = this.refMean(arr2);
    let sum = 0;
    for (let i = 0; i < arr1.length; i++) {
      sum += (arr1[i] - m1) * (arr2[i] - m2);
    }
    return sum / (arr1.length - 1);
  }

  /**
   * Pearson Sample Correlation: Cov(x, y) / (Std(x) * Std(y))
   */
  static refCorrelation(arr1, arr2) {
    const cov = this.refSampleCovariance(arr1, arr2);
    const var1 = this.refSampleVariance(arr1);
    const var2 = this.refSampleVariance(arr2);
    const denom = Math.sqrt(var1 * var2);
    return denom > 0 ? cov / denom : 0;
  }

  /**
   * Quadratic Form: w^T * Matrix * w
   */
  static refQuadraticForm(w, matrix) {
    let sum = 0;
    for (let i = 0; i < w.length; i++) {
      for (let j = 0; j < w.length; j++) {
        sum += w[i] * matrix[i][j] * w[j];
      }
    }
    return sum;
  }

  /**
   * Matrix-Vector Multiplication: Matrix * w
   */
  static refMatrixVector(matrix, w) {
    return matrix.map(row => row.reduce((sum, val, j) => sum + val * w[j], 0));
  }

  /**
   * Standard Normal Cumulative Distribution Function Phi(z)
   * High-precision rational approximation (Abramowitz & Stegun 7.1.26)
   */
  static refNormalCDF(z) {
    if (isNaN(z)) return NaN;
    if (z < -8.0) return 0.0;
    if (z > 8.0) return 1.0;

    const p = 0.3275911;
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
    const sign = z < 0 ? -1 : 1;
    const absZ = Math.abs(z) / Math.sqrt(2.0);
    const t = 1.0 / (1.0 + p * absZ);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absZ * absZ);
    return 0.5 * (1.0 + sign * y);
  }

  /**
   * Historical Simulation Linear Quantile Interpolation VaR
   */
  static refHistoricalVaR(returns, confidence = 0.95, horizonDays = 1) {
    const sorted = [...returns].sort((a, b) => a - b);
    const n = sorted.length;
    const alpha = 1.0 - confidence;
    const rank = alpha * (n - 1);
    const lower = Math.floor(rank);
    const upper = Math.ceil(rank);
    const weight = rank - lower;
    const returnAtVaR = (1 - weight) * sorted[lower] + weight * sorted[upper];
    const lossVaR = Math.max(0, -returnAtVaR) * Math.sqrt(horizonDays);
    return { rank, returnAtVaR, lossVaR };
  }

  /**
   * Discrete Expected Shortfall (CVaR)
   */
  static refDiscreteExpectedShortfall(returns, confidence = 0.95, horizonDays = 1) {
    const sorted = [...returns].sort((a, b) => a - b);
    const n = sorted.length;
    const alpha = 1.0 - confidence;
    const tailCount = Math.max(1, Math.floor(alpha * n));
    const tailReturns = sorted.slice(0, tailCount);
    const tailLosses = tailReturns.map(r => -r);
    const averageTailLoss = tailLosses.reduce((s, l) => s + l, 0) / tailCount;
    return { tailCount, tailLosses, expectedShortfall: averageTailLoss * Math.sqrt(horizonDays) };
  }

  /**
   * Analytical 2x2 Symmetric Matrix Eigendecomposition with Deterministic Sign Convention
   */
  static ref2x2Eigendecomposition(matrix) {
    const a = matrix[0][0];
    const b = matrix[0][1];
    const d = matrix[1][1];

    const trace = a + d;
    const det = a * d - b * b;
    const disc = Math.sqrt(Math.max(0, trace * trace - 4 * det));

    const lambda1 = (trace + disc) / 2.0; // larger eigenvalue
    const lambda2 = (trace - disc) / 2.0; // smaller eigenvalue

    // Eigenvectors
    let v1, v2;
    if (Math.abs(b) > 1e-12) {
      const v1_raw = [b, lambda1 - a];
      const norm1 = Math.sqrt(v1_raw[0] * v1_raw[0] + v1_raw[1] * v1_raw[1]);
      let v1_norm = [v1_raw[0] / norm1, v1_raw[1] / norm1];
      if (v1_norm[0] < 0 || (Math.abs(v1_norm[0]) < 1e-15 && v1_norm[1] < 0)) {
        v1_norm = [-v1_norm[0], -v1_norm[1]];
      }
      v1 = v1_norm;

      const v2_raw = [b, lambda2 - a];
      const norm2 = Math.sqrt(v2_raw[0] * v2_raw[0] + v2_raw[1] * v2_raw[1]);
      let v2_norm = [v2_raw[0] / norm2, v2_raw[1] / norm2];
      if (v2_norm[0] < 0 || (Math.abs(v2_norm[0]) < 1e-15 && v2_norm[1] < 0)) {
        v2_norm = [-v2_norm[0], -v2_norm[1]];
      }
      v2 = v2_norm;
    } else {
      v1 = [1, 0];
      v2 = [0, 1];
    }

    return {
      eigenvalues: [lambda2, lambda1], // sorted ascending
      eigenvectors: [v2, v1],
      trace,
      det
    };
  }

  /**
   * Analytical 2x2 Eigenvalue Clipping Repair
   */
  static ref2x2EigenvalueClippingRepair(matrix, floor = 1e-5) {
    const { eigenvalues, eigenvectors } = this.ref2x2Eigendecomposition(matrix);
    const clipped = eigenvalues.map(l => Math.max(floor, l));

    // Reconstruct M = sum(lambda_k * v_k * v_k^T)
    const repaired = [
      [0, 0],
      [0, 0]
    ];

    for (let k = 0; k < 2; k++) {
      const l = clipped[k];
      const v = eigenvectors[k];
      repaired[0][0] += l * v[0] * v[0];
      repaired[0][1] += l * v[0] * v[1];
      repaired[1][0] += l * v[1] * v[0];
      repaired[1][1] += l * v[1] * v[1];
    }

    // Exact symmetrization
    const avgOffDiag = (repaired[0][1] + repaired[1][0]) / 2.0;
    repaired[0][1] = avgOffDiag;
    repaired[1][0] = avgOffDiag;

    const originalConditionNumber = Math.abs(eigenvalues[1] / (eigenvalues[0] || 1e-12));
    const repairedConditionNumber = clipped[1] / clipped[0];

    return {
      originalEigenvalues: eigenvalues,
      repairedEigenvalues: clipped,
      repairedMatrix: repaired,
      originalConditionNumber,
      repairedConditionNumber,
      repairApplied: eigenvalues.some(l => l < floor)
    };
  }

  /**
   * Canonical Golden X Mathematical Trace Generator
   * Generates the entire unbroken dependency chain from canonical fixture inputs:
   * originalMatrix -> eigenvalues/eigenvectors -> eigenvalue floor clipping -> reconstructed repairedMatrix -> quadraticForm -> portfolioRisk
   */
  static generateGoldenXTrace(fixture) {
    const originalMatrix = fixture.rawNonPsdMatrix;
    const weights = fixture.weights;
    const eigenvalueFloor = fixture.eigenvalueFloor;

    // 1. Eigendecompose original matrix
    const { eigenvalues, eigenvectors, trace, det } = this.ref2x2Eigendecomposition(originalMatrix);

    // 2. Apply eigenvalue floor clipping
    const clippedEigenvalues = eigenvalues.map(l => Math.max(eigenvalueFloor, l));

    // 3. Reconstruct repaired covariance matrix directly from eigenvectors and clipped eigenvalues
    const repairedMatrix = [
      [0, 0],
      [0, 0]
    ];
    for (let k = 0; k < 2; k++) {
      const l = clippedEigenvalues[k];
      const v = eigenvectors[k];
      repairedMatrix[0][0] += l * v[0] * v[0];
      repairedMatrix[0][1] += l * v[0] * v[1];
      repairedMatrix[1][0] += l * v[1] * v[0];
      repairedMatrix[1][1] += l * v[1] * v[1];
    }
    const avgOff = (repairedMatrix[0][1] + repairedMatrix[1][0]) / 2.0;
    repairedMatrix[0][1] = avgOff;
    repairedMatrix[1][0] = avgOff;

    // 4. Calculate quadratic form directly from THAT reconstructed matrix
    const quadraticForm = this.refQuadraticForm(weights, repairedMatrix);

    // 5. Calculate portfolio risk directly from THAT quadratic form
    const portfolioRisk = Math.sqrt(quadraticForm);

    // Raw (unrepaired) quadratic form and risk for reference
    const rawQuadraticForm = this.refQuadraticForm(weights, originalMatrix);
    const rawRisk = Math.sqrt(Math.max(0, rawQuadraticForm));

    return {
      originalMatrix,
      eigenvalues,
      eigenvectors,
      eigenvalueFloor,
      clippedEigenvalues,
      repairedMatrix,
      weights,
      quadraticForm,
      portfolioRisk,
      rawQuadraticForm,
      rawRisk,
      trace,
      det,
      hasNegativeEigenvalue: eigenvalues.some(l => l < 0),
      isRepairedPsd: clippedEigenvalues.every(l => l >= eigenvalueFloor)
    };
  }
}

