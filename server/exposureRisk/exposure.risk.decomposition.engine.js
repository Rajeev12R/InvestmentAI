import { deepFreeze, computeExposureHash, RiskMethodology } from './exposure.types.js';

/**
 * Phase 30 — Deterministic Risk Decomposition & Marginal Contribution Engine
 */
export class ExposureRiskDecompositionEngine {
  /**
   * Decompose Portfolio Risk via Covariance Matrix (Marginal & Component Risk Contributions)
   * @param {Object} params
   * @param {string} params.riskDecompId
   * @param {string[]} params.symbols Array of N security symbols
   * @param {number[]} params.weights Array of N portfolio weights
   * @param {number[][]} params.covarianceMatrix N x N asset covariance matrix
   * @param {number} params.periodsPerYear (default 252 for daily, 12 for monthly)
   */
  static decomposeCovarianceRisk({
    riskDecompId = `risk-decomp-${Date.now()}`,
    symbols = [],
    weights = [],
    covarianceMatrix = [[]],
    periodsPerYear = 252
  } = {}) {
    if (!Array.isArray(symbols) || symbols.length === 0) {
      throw new Error('symbols array is required');
    }
    const N = symbols.length;
    if (!Array.isArray(weights) || weights.length !== N) {
      throw new Error(`weights array must match symbols length (${N})`);
    }
    if (!Array.isArray(covarianceMatrix) || covarianceMatrix.length !== N) {
      throw new Error(`covarianceMatrix must be ${N}x${N}`);
    }

    // 1. Calculate Sigma * w vector
    const sigmaW = Array(N).fill(0);
    for (let i = 0; i < N; i++) {
      let rowSum = 0;
      for (let j = 0; j < N; j++) {
        rowSum += covarianceMatrix[i][j] * weights[j];
      }
      sigmaW[i] = rowSum;
    }

    // 2. Portfolio variance: w^T * (Sigma * w)
    let portfolioVariance = 0;
    for (let i = 0; i < N; i++) {
      portfolioVariance += weights[i] * sigmaW[i];
    }
    portfolioVariance = Math.max(0, portfolioVariance);

    const periodicVol = Math.sqrt(portfolioVariance);
    const annualizedVol = periodicVol * Math.sqrt(periodsPerYear);

    // 3. Marginal Risk Contribution (MRC) & Component Risk Contribution (CRC)
    const marginalRiskContributions = {};
    const componentRiskContributions = {};
    const percentageRiskContributions = {};
    const exposureVsRiskDivergences = [];

    let sumCRCAnnualized = 0;

    for (let i = 0; i < N; i++) {
      const sym = symbols[i];
      const w = weights[i];

      // MRC_periodic = (Sigma * w)_i / periodicVol
      const mrcPeriodic = periodicVol > 0 ? sigmaW[i] / periodicVol : 0;
      const mrcAnnualized = mrcPeriodic * Math.sqrt(periodsPerYear);

      // CRC_periodic = w_i * MRC_periodic
      const crcPeriodic = w * mrcPeriodic;
      const crcAnnualized = crcPeriodic * Math.sqrt(periodsPerYear);

      // PRC = CRC / totalVol
      const prc = annualizedVol > 0 ? (crcAnnualized / annualizedVol) : 0;

      marginalRiskContributions[sym] = Number(mrcAnnualized.toFixed(6));
      componentRiskContributions[sym] = Number(crcAnnualized.toFixed(6));
      percentageRiskContributions[sym] = Number(prc.toFixed(4));
      sumCRCAnnualized += crcAnnualized;

      // Detect exposure vs risk divergence (e.g. weight is 5% but risk contribution is > 15%)
      const absWeight = Math.abs(w);
      if (prc > (absWeight * 2.0) && prc > 0.05) {
        exposureVsRiskDivergences.push({
          symbol: sym,
          weight: Number(w.toFixed(4)),
          percentageRiskContribution: Number(prc.toFixed(4)),
          divergenceRatio: Number((prc / (absWeight > 0 ? absWeight : 0.01)).toFixed(2)),
          description: 'High marginal risk relative to nominal weight'
        });
      }
    }

    // Exact reconciliation check: sum(CRC) must equal total volatility
    const reconciliationGap = Math.abs(sumCRCAnnualized - annualizedVol);
    const isReconciled = reconciliationGap < 1e-4;

    const result = {
      riskDecompId,
      methodology: RiskMethodology.PARAMETRIC_COVARIANCE,
      sampleSize: N,
      annualizedPortfolioVariance: Number((portfolioVariance * periodsPerYear).toFixed(6)),
      totalVolatility: Number(annualizedVol.toFixed(6)),
      sumComponentRisk: Number(sumCRCAnnualized.toFixed(6)),
      reconciliationGap: Number(reconciliationGap.toFixed(8)),
      isReconciled,
      marginalRiskContributions,
      componentRiskContributions,
      percentageRiskContributions,
      exposureVsRiskDivergences,
      decomposedAt: new Date().toISOString()
    };

    result.hash = computeExposureHash(result);
    return deepFreeze(result);
  }

  /**
   * Systematic vs Idiosyncratic Risk Breakdown
   * @param {Object} params
   * @param {number} params.totalPortfolioVariance
   * @param {number} params.factorExplainedVariance
   */
  static decomposeSystematicVsIdiosyncraticRisk({
    totalPortfolioVariance = 0.04, // 20% vol squared
    factorExplainedVariance = 0.028 // 70% factor explained
  } = {}) {
    const systematicVar = Math.min(totalPortfolioVariance, Math.max(0, factorExplainedVariance));
    const idiosyncraticVar = Math.max(0, totalPortfolioVariance - systematicVar);

    const systematicVol = Math.sqrt(systematicVar);
    const idiosyncraticVol = Math.sqrt(idiosyncraticVar);
    const totalVol = Math.sqrt(totalPortfolioVariance);

    const systematicFraction = totalPortfolioVariance > 0 ? systematicVar / totalPortfolioVariance : 1.0;
    const idiosyncraticFraction = 1.0 - systematicFraction;

    return deepFreeze({
      totalVolatility: Number(totalVol.toFixed(6)),
      systematicVolatility: Number(systematicVol.toFixed(6)),
      idiosyncraticVolatility: Number(idiosyncraticVol.toFixed(6)),
      systematicFraction: Number(systematicFraction.toFixed(4)),
      idiosyncraticFraction: Number(idiosyncraticFraction.toFixed(4)),
      decomposedAt: new Date().toISOString()
    });
  }
}
