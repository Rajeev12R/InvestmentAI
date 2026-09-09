/**
 * server/portfolioOptimization/golden/portfolioOptimization.golden.reference.js
 * 
 * Phase 33: Completely Independent Reference Implementation
 * ZERO imports from production portfolio optimization engines or risk math.
 * Pure closed-form analytical mathematics for independent golden verification.
 */

export class PortfolioOptimizationGoldenReference {
  /**
   * Pure analytical closed-form 2-asset minimum variance solution.
   * w1 = (sigma2^2 - cov12) / (sigma1^2 + sigma2^2 - 2*cov12)
   */
  static refTwoAssetMinVar(cov11, cov22, cov12 = 0.0) {
    const denom = cov11 + cov22 - 2 * cov12;
    if (Math.abs(denom) < 1e-12) return [0.5, 0.5];
    const w1 = (cov22 - cov12) / denom;
    const w2 = 1.0 - w1;
    return [w1, w2];
  }

  /**
   * Pure analytical 2-asset orthogonal Equal Risk Parity weights:
   * w_i = (1 / sigma_i) / sum(1 / sigma_j)
   */
  static refTwoAssetRiskParity(cov11, cov22) {
    const vol1 = Math.sqrt(cov11);
    const vol2 = Math.sqrt(cov22);
    const inv1 = 1.0 / vol1;
    const inv2 = 1.0 / vol2;
    const sumInv = inv1 + inv2;
    return [inv1 / sumInv, inv2 / sumInv];
  }

  /**
   * Pure reference matrix inversion (Gauss-Jordan elimination)
   */
  static refInvertMatrix(M) {
    const n = M.length;
    const A = M.map(row => [...row]);
    const I = Array.from({ length: n }, (_, i) => {
      const r = new Array(n).fill(0);
      r[i] = 1;
      return r;
    });

    for (let i = 0; i < n; i++) {
      let maxEl = Math.abs(A[i][i]);
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(A[k][i]) > maxEl) {
          maxEl = Math.abs(A[k][i]);
          maxRow = k;
        }
      }
      if (maxEl < 1e-12) return null;

      [A[i], A[maxRow]] = [A[maxRow], A[i]];
      [I[i], I[maxRow]] = [I[maxRow], I[i]];

      const pivot = A[i][i];
      for (let j = 0; j < n; j++) {
        A[i][j] /= pivot;
        I[i][j] /= pivot;
      }

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
   * Pure analytical KKT minimum variance solver for N unconstrained assets:
   * w = (Sigma^-1 * 1) / (1^T * Sigma^-1 * 1)
   */
  static refAnalyticalMinVar(covMatrix) {
    const n = covMatrix.length;
    const invCov = this.refInvertMatrix(covMatrix);
    if (!invCov) return null;

    const ones = new Array(n).fill(1.0);
    const invOnes = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) sum += invCov[i][j] * ones[j];
      invOnes[i] = sum;
    }

    let denom = 0;
    for (let i = 0; i < n; i++) denom += ones[i] * invOnes[i];

    return invOnes.map(v => v / denom);
  }

  /**
   * Pure analytical KKT Mean-Variance portfolio solution:
   * w_mv = (1/(lambda*ppy)) * Sigma^-1 * mu + [1 - (1^T Sigma^-1 mu)/(lambda*ppy)] * w_min
   */
  static refMeanVarianceKKT(covMatrix, mu, lambda = 1.0, ppy = 1) {
    const n = covMatrix.length;
    const invCov = this.refInvertMatrix(covMatrix);
    if (!invCov) return null;

    const effLambda = lambda * ppy;
    const ones = new Array(n).fill(1.0);
    const invOnes = new Array(n).fill(0);
    const invMu = new Array(n).fill(0);

    for (let i = 0; i < n; i++) {
      let sumO = 0;
      let sumM = 0;
      for (let j = 0; j < n; j++) {
        sumO += invCov[i][j] * ones[j];
        sumM += invCov[i][j] * mu[j];
      }
      invOnes[i] = sumO;
      invMu[i] = sumM;
    }

    let onesInvOnes = 0;
    let onesInvMu = 0;
    for (let i = 0; i < n; i++) {
      onesInvOnes += ones[i] * invOnes[i];
      onesInvMu += ones[i] * invMu[i];
    }

    const w_min = invOnes.map(v => v / onesInvOnes);
    const term1 = invMu.map(v => v / effLambda);
    const scalar = (1.0 - onesInvMu / effLambda) / onesInvOnes;
    return term1.map((t1, i) => t1 + scalar * invOnes[i]);
  }

  /**
   * Pure reference quadratic form: w^T * Sigma * w
   */
  static refQuadraticForm(w, M) {
    const n = w.length;
    let total = 0;
    for (let i = 0; i < n; i++) {
      let rowSum = 0;
      for (let j = 0; j < n; j++) {
        rowSum += M[i][j] * w[j];
      }
      total += w[i] * rowSum;
    }
    return total;
  }

  /**
   * Pure reference portfolio expected return: mu^T * w
   */
  static refExpectedReturn(w, mu) {
    return w.reduce((sum, val, i) => sum + val * (mu ? mu[i] : 0), 0);
  }

  /**
   * Pure reference portfolio volatility
   */
  static refPortfolioVolatility(w, covMatrix, ppy = 252) {
    const rawVar = Math.max(0, this.refQuadraticForm(w, covMatrix));
    return Math.sqrt(rawVar * ppy);
  }

  /**
   * Pure reference Sharpe Ratio: (w^T mu - rf) / sigma_p
   */
  static refSharpeRatio(w, mu, covMatrix, rf = 0.04, ppy = 252) {
    const ret = this.refExpectedReturn(w, mu);
    const vol = this.refPortfolioVolatility(w, covMatrix, ppy);
    return vol > 0 ? (ret - rf) / vol : 0;
  }

  /**
   * Pure reference Tracking Error: sqrt((w - wb)^T Sigma (w - wb) * ppy)
   */
  static refTrackingError(w, wb, covMatrix, ppy = 252) {
    const active = w.map((val, i) => val - wb[i]);
    const rawVar = Math.max(0, this.refQuadraticForm(active, covMatrix));
    return Math.sqrt(rawVar * ppy);
  }

  /**
   * Pure reference Risk Parity / Component Risk Contributions:
   * SigmaW_i = (Sigma * w)_i
   * MRC_i = (Sigma * w)_i  (Marginal Variance Contribution)
   * CRC_i = w_i * MRC_i = w_i * (Sigma * w)_i (Component Variance Contribution)
   * sum(CRC_i) = w^T * Sigma * w
   * RCVol_i = CRC_i / sigma_p (Component Volatility Contribution)
   * sum(RCVol_i) = sigma_p
   */
  static refRiskContributions(w, covMatrix, ppy = 1) {
    const n = w.length;
    const Sw = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) Sw[i] += covMatrix[i][j] * w[j];
    }
    const periodVar = Math.max(1e-12, this.refQuadraticForm(w, covMatrix));
    const periodVol = Math.sqrt(periodVar);
    const annVar = periodVar * ppy;
    const annVol = Math.sqrt(annVar);

    // Marginal Variance Contribution
    const mrc = [...Sw];
    // Component Variance Contribution
    const crc = w.map((val, i) => val * mrc[i]);
    const crcVarianceSum = crc.reduce((s, v) => s + v, 0);

    // Component Volatility Contribution
    const rcVol = crc.map(val => (periodVol > 0 ? val / periodVol : 0));
    const rcVolSum = rcVol.reduce((s, v) => s + v, 0);

    // Percentage Risk Contribution
    const rcPercent = crc.map(val => (periodVar > 0 ? (val / periodVar) * 100 : 0));

    return {
      SigmaW: Sw,
      mrc,
      crc,
      crcVarianceSum,
      portfolioVariance: periodVar,
      portfolioVolatility: periodVol,
      rcVol,
      rcVolSum,
      rcPercent
    };
  }

  /**
   * Pure reference Parametric VaR and Expected Shortfall:
   * VaR(0.95) = z_0.95 * sigma_p (z_0.95 = 1.6448536269514722)
   * ES(0.95) = (phi(z_0.95) / (1 - 0.95)) * sigma_p (ES mult = 2.062712807517)
   */
  static refParametricVaRAndES(w, covMatrix, alpha = 0.95, ppy = 252) {
    const vol = this.refPortfolioVolatility(w, covMatrix, ppy);
    // Standard normal quantiles (Acklam / standard analytical)
    const z = alpha === 0.99 ? 2.3263478740408408 : 1.6448536269514722;
    const pdf = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
    const esMult = pdf / (1.0 - alpha);

    const varValue = z * vol;
    const esValue = esMult * vol;

    return {
      confidenceLevel: alpha,
      horizon: ppy === 252 ? 'ANNUAL' : 'PERIOD',
      lossConvention: 'POSITIVE_LOSS',
      portfolioVolatility: vol,
      VaRMultiplier: z,
      ESMultiplier: esMult,
      referenceVaR: varValue,
      referenceES: esValue
    };
  }

  /**
   * Pure reference Herfindahl-Hirschman Index: HHI = sum(w_i^2)
   */
  static refHHI(w) {
    return w.reduce((sum, val) => sum + val * val, 0);
  }

  /**
   * Pure reference Turnover: sum(|w_i - w0_i|)
   */
  static refTurnover(w, w0) {
    return w.reduce((sum, val, i) => sum + Math.abs(val - (w0 ? w0[i] : 0)), 0);
  }

  /**
   * Pure reference Factor Exposure: F^T * w
   */
  static refFactorExposure(exposuresByAsset, w, factorIdx = 0) {
    let exp = 0;
    const symbols = Object.keys(exposuresByAsset);
    for (let i = 0; i < symbols.length; i++) {
      const sym = symbols[i];
      const factorList = exposuresByAsset[sym];
      exp += w[i] * factorList[factorIdx];
    }
    return exp;
  }

  /**
   * Pure reference KKT & Stationarity System Evaluator:
   * Rigorously calculates:
   * 1. rawGradientNorm = ||grad||_2
   * 2. kktStationarityResidual = ||grad + lambda_0 * 1 - mu_min + mu_max||_inf
   * 3. primalFeasibilityResidual = max constraint violation
   * 4. dualFeasibilityResidual = min(mu_min, mu_max) >= 0 violation
   * 5. complementarySlacknessResidual = sum(mu_min * (w - l) + mu_max * (u - w))
   */
  static refKKTMetrics({
    weights,
    grad,
    minWeights = null,
    maxWeights = null,
    groupBounds = null,
    groupWeights = null
  }) {
    const n = weights.length;
    const minW = minWeights || new Array(n).fill(0);
    const maxW = maxWeights || new Array(n).fill(1.0);

    // 1. Raw gradient norm
    const rawGradientNorm = Math.sqrt(grad.reduce((s, g) => s + g * g, 0));

    // 2. Identify active and free sets
    const freeIndices = [];
    for (let i = 0; i < n; i++) {
      if (weights[i] > minW[i] + 1e-4 && weights[i] < maxW[i] - 1e-4) {
        freeIndices.push(i);
      }
    }

    // Solve for simplex Lagrange multiplier lambda0
    let lambda0 = 0;
    if (freeIndices.length > 0) {
      lambda0 = -freeIndices.reduce((s, idx) => s + grad[idx], 0) / freeIndices.length;
    } else {
      lambda0 = -grad.reduce((s, g) => s + g, 0) / n;
    }

    // Calculate dual multipliers mu_min >= 0, mu_max >= 0
    const muMin = new Array(n).fill(0);
    const muMax = new Array(n).fill(0);
    const stationarityErrors = new Array(n).fill(0);

    for (let i = 0; i < n; i++) {
      const unconstrainedGrad = grad[i] + lambda0;
      if (weights[i] <= minW[i] + 1e-4) {
        muMin[i] = Math.max(0, unconstrainedGrad);
      } else if (weights[i] >= maxW[i] - 1e-4) {
        muMax[i] = Math.max(0, -unconstrainedGrad);
      }
      stationarityErrors[i] = Math.abs(unconstrainedGrad - muMin[i] + muMax[i]);
    }

    const kktStationarityResidual = Math.max(...stationarityErrors);

    // 3. Primal Feasibility Residual
    let primalFeasibilityResidual = Math.abs(weights.reduce((s, w) => s + w, 0) - 1.0);
    for (let i = 0; i < n; i++) {
      if (weights[i] < minW[i]) primalFeasibilityResidual = Math.max(primalFeasibilityResidual, minW[i] - weights[i]);
      if (weights[i] > maxW[i]) primalFeasibilityResidual = Math.max(primalFeasibilityResidual, weights[i] - maxW[i]);
    }

    // 4. Complementary Slackness
    let complementarySlacknessResidual = 0;
    for (let i = 0; i < n; i++) {
      complementarySlacknessResidual += muMin[i] * Math.abs(weights[i] - minW[i]);
      complementarySlacknessResidual += muMax[i] * Math.abs(maxW[i] - weights[i]);
    }

    return {
      rawGradientNorm,
      kktStationarityResidual,
      primalFeasibilityResidual,
      dualFeasibilityResidual: 0.0,
      complementarySlacknessResidual
    };
  }

  /**
   * Pure reference feasibility check for box bounds
   */
  static refCheckFeasibility(minWeights, maxWeights) {
    let sumMin = 0;
    let sumMax = 0;
    for (let i = 0; i < minWeights.length; i++) {
      if (minWeights[i] > maxWeights[i]) return false;
      sumMin += minWeights[i];
      sumMax += maxWeights[i];
    }
    if (sumMin > 1.0 + 1e-6) return false;
    if (sumMax < 1.0 - 1e-6) return false;
    return true;
  }
}
