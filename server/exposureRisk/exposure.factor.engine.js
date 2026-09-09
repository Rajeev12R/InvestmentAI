import { deepFreeze, computeExposureHash, FactorCategory } from './exposure.types.js';

/**
 * Phase 30 — Deterministic Factor Exposure & Return Decomposition Engine
 */
export class ExposureFactorEngine {
  /**
   * Calculate Portfolio-Level Factor Betas from Security Betas
   * @param {Object} params
   * @param {Array<{ symbol: string, weight: number, factorBetas: Record<string, number> }>} params.holdings
   * @param {Array<{ symbol: string, weight: number, factorBetas: Record<string, number> }>} params.benchmarkHoldings
   */
  static calculatePortfolioFactorExposures({
    holdings = [],
    benchmarkHoldings = []
  } = {}) {
    if (!Array.isArray(holdings) || holdings.length === 0) {
      throw new Error('holdings array is required');
    }

    const portfolioFactorBetas = {};
    const benchmarkFactorBetas = {};
    const activeFactorBetas = {};

    // Aggregate portfolio factor betas
    for (const h of holdings) {
      const w = h.weight || 0;
      if (h.factorBetas && typeof h.factorBetas === 'object') {
        for (const [fName, beta] of Object.entries(h.factorBetas)) {
          portfolioFactorBetas[fName] = (portfolioFactorBetas[fName] || 0) + (w * beta);
        }
      }
    }

    // Aggregate benchmark factor betas if provided
    if (Array.isArray(benchmarkHoldings) && benchmarkHoldings.length > 0) {
      for (const bh of benchmarkHoldings) {
        const bw = bh.weight || 0;
        if (bh.factorBetas && typeof bh.factorBetas === 'object') {
          for (const [fName, beta] of Object.entries(bh.factorBetas)) {
            benchmarkFactorBetas[fName] = (benchmarkFactorBetas[fName] || 0) + (bw * beta);
          }
        }
      }
      const allFactors = new Set([...Object.keys(portfolioFactorBetas), ...Object.keys(benchmarkFactorBetas)]);
      for (const f of allFactors) {
        const pB = portfolioFactorBetas[f] || 0;
        const bB = benchmarkFactorBetas[f] || 0;
        activeFactorBetas[f] = Number((pB - bB).toFixed(4));
      }
    }

    const roundObj = (obj) => {
      const res = {};
      for (const [k, v] of Object.entries(obj)) res[k] = Number(v.toFixed(4));
      return res;
    };

    return deepFreeze({
      portfolioFactorBetas: roundObj(portfolioFactorBetas),
      benchmarkFactorBetas: roundObj(benchmarkFactorBetas),
      activeFactorBetas: roundObj(activeFactorBetas),
      calculatedAt: new Date().toISOString()
    });
  }

  /**
   * Decompose Portfolio Return into Risk-Free + Factor Returns + Exact Residual
   * Model: R_p = R_f + sum(Beta_k * F_k) + Residual
   * @param {Object} params
   * @param {number} params.portfolioReturn Realized portfolio return
   * @param {number} params.riskFreeRate Risk free rate
   * @param {Record<string, number>} params.portfolioFactorBetas Beta for each factor
   * @param {Record<string, number>} params.factorReturns Realized return for each factor
   */
  static decomposeFactorReturns({
    portfolioReturn = 0,
    riskFreeRate = 0,
    portfolioFactorBetas = {},
    factorReturns = {}
  } = {}) {
    let totalFactorContribution = 0;
    const factorContributions = {};

    for (const [fName, beta] of Object.entries(portfolioFactorBetas)) {
      const fReturn = factorReturns[fName] || 0;
      const contrib = beta * fReturn;
      factorContributions[fName] = Number(contrib.toFixed(6));
      totalFactorContribution += contrib;
    }

    // Exact residual preservation: R_p - R_f - TotalFactorContribution
    const residual = portfolioReturn - riskFreeRate - totalFactorContribution;
    const reconciled = Math.abs((riskFreeRate + totalFactorContribution + residual) - portfolioReturn) < 1e-10;

    const result = {
      portfolioReturn: Number(portfolioReturn.toFixed(6)),
      riskFreeRate: Number(riskFreeRate.toFixed(6)),
      factorContributions,
      totalFactorContribution: Number(totalFactorContribution.toFixed(6)),
      residual: Number(residual.toFixed(6)),
      reconciled,
      decomposedAt: new Date().toISOString()
    };

    result.hash = computeExposureHash(result);
    return deepFreeze(result);
  }
}
