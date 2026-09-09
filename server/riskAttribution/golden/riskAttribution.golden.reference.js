/**
 * server/riskAttribution/golden/riskAttribution.golden.reference.js
 * 
 * Phase 32: Completely Independent Reference Mathematical Implementation
 * ZERO imports from production risk attribution engines.
 * Pure closed-form analytical mathematics for golden verification.
 */

export class RiskAttributionGoldenReference {
  /**
   * Pure reference matrix-vector multiply
   */
  static refMatVec(M, v) {
    const n = M.length;
    const res = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) {
        sum += M[i][j] * v[j];
      }
      res[i] = sum;
    }
    return res;
  }

  /**
   * Pure reference quadratic form: w^T * Sigma * w
   */
  static refQuadForm(w, M) {
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
   * Pure analytical Marginal Risk Contribution (MRC): (Sigma * w)_i / sigma_p
   */
  static refMRC(w, M, ppy = 252) {
    const n = w.length;
    let periodVar = 0;
    for (let i = 0; i < n; i++) {
      let rowSum = 0;
      for (let j = 0; j < n; j++) {
        rowSum += M[i][j] * w[j];
      }
      periodVar += w[i] * rowSum;
    }
    const periodVol = Math.sqrt(Math.max(0, periodVar));
    const annFactor = Math.sqrt(ppy);
    const Sw = this.refMatVec(M, w);

    return Sw.map(val => (periodVol > 0 ? (val / periodVol) * annFactor : 0));
  }

  /**
   * Pure analytical Component Risk Contribution (CRC): w_i * MRC_i
   */
  static refCRC(w, M, ppy = 252) {
    const mrc = this.refMRC(w, M, ppy);
    return w.map((weight, i) => weight * mrc[i]);
  }

  /**
   * Pure analytical Percentage Risk Contribution (PRC): CRC_i / sigma_p
   */
  static refPRC(w, M) {
    const n = w.length;
    let periodVar = 0;
    for (let i = 0; i < n; i++) {
      let rowSum = 0;
      for (let j = 0; j < n; j++) {
        rowSum += M[i][j] * w[j];
      }
      periodVar += w[i] * rowSum;
    }
    const Sw = this.refMatVec(M, w);

    return w.map((weight, i) => (periodVar > 0 ? (weight * Sw[i]) / periodVar : 1.0 / n));
  }

  /**
   * Pure analytical Variance Contribution: w_i * (Sigma * w)_i * ppy
   */
  static refVarianceContribution(w, M, ppy = 252) {
    const Sw = this.refMatVec(M, w);
    return w.map((weight, i) => weight * Sw[i] * ppy);
  }

  /**
   * Pure analytical Standalone Variance: w_i^2 * Sigma_ii * ppy
   */
  static refStandaloneVariance(w, M, ppy = 252) {
    return w.map((weight, i) => weight * weight * M[i][i] * ppy);
  }

  /**
   * Pure analytical Cross-Covariance: VarCont_i - StandaloneVar_i
   */
  static refCrossCovariance(w, M, ppy = 252) {
    const varCont = this.refVarianceContribution(w, M, ppy);
    const standVar = this.refStandaloneVariance(w, M, ppy);
    return varCont.map((vc, i) => vc - standVar[i]);
  }

  /**
   * Pure analytical Factor Variance Decomposition:
   * Systematic Var = w_F^T * F * w_F * ppy
   * Idiosyncratic Var = sum(w_i^2 * D_ii) * ppy
   */
  static refFactorDecomposition(w, symbols, factorExposures, ppy = 252) {
    const { factorNames, exposures, factorCovariance, idiosyncraticVariances } = factorExposures;
    const k = factorNames.length;
    const n = symbols.length;

    const w_F = new Array(k).fill(0);
    for (let f = 0; f < k; f++) {
      let b = 0;
      for (let i = 0; i < n; i++) {
        b += w[i] * exposures[symbols[i]][f];
      }
      w_F[f] = b;
    }

    const F_w_F = this.refMatVec(factorCovariance, w_F);
    let systematicVar = 0;
    const factorContribs = [];

    for (let f = 0; f < k; f++) {
      const fc = w_F[f] * F_w_F[f] * ppy;
      systematicVar += fc;
      factorContribs.push({ factor: factorNames[f], exposure: w_F[f], varianceContrib: fc });
    }

    let idiosyncraticVar = 0;
    for (let i = 0; i < n; i++) {
      const sym = symbols[i];
      const specVar = (idiosyncraticVariances[sym] || 0) * (w[i] * w[i]) * ppy;
      idiosyncraticVar += specVar;
    }

    return {
      portfolioFactorExposures: w_F,
      systematicVariance: systematicVar,
      idiosyncraticVariance: idiosyncraticVar,
      totalVariance: systematicVar + idiosyncraticVar,
      factorContributions: factorContribs
    };
  }

  /**
   * Standard Normal Quantile z_alpha and PDF phi(z_alpha)
   */
  static refNormalQuantileAndPDF(confidence = 0.95) {
    let z = 1.6448536269514722;
    if (confidence === 0.99) z = 2.3263478740408408;
    else if (confidence === 0.90) z = 1.2815515655446004;
    
    const pdf_z = (1.0 / Math.sqrt(2.0 * Math.PI)) * Math.exp(-0.5 * z * z);
    const es_multiplier = pdf_z / (1.0 - confidence);

    return { z, pdf_z, es_multiplier };
  }

  /**
   * Pure analytical Parametric Portfolio VaR: z_alpha * sigma_p (Positive Loss Convention)
   */
  static refPortfolioVaR(w, M, confidence = 0.95, ppy = 252) {
    const crc = this.refCRC(w, M, ppy);
    const portVol = crc.reduce((s, c) => s + c, 0);
    const { z } = this.refNormalQuantileAndPDF(confidence);
    return z * portVol;
  }

  /**
   * Pure analytical Parametric Component VaR: z_alpha * CRC_i
   * Verified identity: sum(Component VaR) == Portfolio VaR
   */
  static refComponentVaR(w, M, confidence = 0.95, ppy = 252) {
    const crc = this.refCRC(w, M, ppy);
    const { z } = this.refNormalQuantileAndPDF(confidence);
    return crc.map(c => z * c);
  }

  /**
   * Pure analytical Parametric Portfolio Expected Shortfall (ES)
   */
  static refPortfolioExpectedShortfall(w, M, confidence = 0.95, ppy = 252) {
    const crc = this.refCRC(w, M, ppy);
    const portVol = crc.reduce((s, c) => s + c, 0);
    const { es_multiplier } = this.refNormalQuantileAndPDF(confidence);
    return es_multiplier * portVol;
  }

  /**
   * Pure analytical Parametric Component Expected Shortfall: ES_multiplier * CRC_i
   * Verified identity: sum(Component ES) == Portfolio ES
   */
  static refComponentExpectedShortfall(w, M, confidence = 0.95, ppy = 252) {
    const crc = this.refCRC(w, M, ppy);
    const { es_multiplier } = this.refNormalQuantileAndPDF(confidence);
    return crc.map(c => es_multiplier * c);
  }

  /**
   * Pure analytical Herfindahl-Hirschman Index (HHI)
   */
  static refHHI(array) {
    return array.reduce((acc, val) => acc + (val * val), 0);
  }
}
