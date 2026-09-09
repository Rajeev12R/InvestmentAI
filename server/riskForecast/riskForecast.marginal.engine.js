import { DataClassification } from './riskForecast.types.js';
import { RiskForecastConfig } from './riskForecast.config.js';
import { RiskForecastValidation } from './riskForecast.validation.js';

/**
 * Phase 31 — Marginal & Component Risk Contribution Engine
 */
export class RiskForecastMarginalEngine {
  /**
   * Decompose Portfolio Risk into Marginal, Component, and Percentage Contributions
   */
  static decomposeMarginalRisk({ symbols, weights, covarianceMatrix, periodsPerYear = 252 }) {
    if (!Array.isArray(symbols) || !Array.isArray(weights) || symbols.length !== weights.length) {
      throw new Error('symbols and weights must be arrays of equal length');
    }
    RiskForecastValidation.validateCovarianceMatrix(covarianceMatrix, symbols.length);

    const n = symbols.length;
    const ppy = periodsPerYear || RiskForecastConfig.PERIODS_PER_YEAR.DAILY;
    const annFactor = Math.sqrt(ppy);

    // Period variance = w^T * Sigma * w
    const periodVariance = RiskForecastValidation.quadraticForm(weights, covarianceMatrix);
    const periodVol = Math.sqrt(Math.max(0, periodVariance));
    const annualizedVol = periodVol * annFactor;

    if (periodVol <= 1e-12) {
      // Degenerate zero-volatility portfolio
      return {
        status: DataClassification.DERIVED,
        portfolioVolatilityPeriod: 0,
        portfolioVolatilityAnnualized: 0,
        marginalContributions: symbols.map((s, i) => ({ symbol: s, weight: weights[i], mrc: 0, crc: 0, prc: 0 })),
        reconciliationError: 0
      };
    }

    // Sigma * w vector
    const Sw = RiskForecastValidation.matrixVectorMultiply(covarianceMatrix, weights);

    const assetContributions = [];
    let sumCRC = 0;
    let sumPRC = 0;

    for (let i = 0; i < n; i++) {
      const sym = symbols[i];
      const w = weights[i];
      const Sw_i = Sw[i];

      // MRC_i = (Sigma * w)_i / sigma_p (Annualized)
      const mrcPeriod = Sw_i / periodVol;
      const mrcAnnualized = mrcPeriod * annFactor;

      // CRC_i = w_i * MRC_i (Annualized)
      const crcPeriod = w * mrcPeriod;
      const crcAnnualized = w * mrcAnnualized;

      // Percentage Risk Contribution = CRC_i / sigma_p = (w_i * (Sigma * w)_i) / sigma_p^2
      const prc = periodVariance > 0 ? (w * Sw_i) / periodVariance : 0;

      sumCRC += crcAnnualized;
      sumPRC += prc;

      assetContributions.push({
        symbol: sym,
        weight: w,
        marginalRiskContribution: mrcAnnualized,
        componentRiskContribution: crcAnnualized,
        percentageRiskContribution: prc,
        percentageRiskContributionPercent: prc * 100
      });
    }

    const reconciliationError = Math.abs(sumCRC - annualizedVol);
    const isValidReconciliation = reconciliationError <= RiskForecastConfig.TOLERANCES.RECONCILIATION_TOLERANCE;

    return {
      status: DataClassification.DERIVED,
      portfolioVariance: periodVariance * ppy,
      portfolioVolatilityPeriod: periodVol,
      portfolioVolatilityAnnualized: annualizedVol,
      periodsPerYear: ppy,
      assetContributions,
      sumComponentRisk: sumCRC,
      sumPercentageRisk: sumPRC,
      reconciliationError,
      isValidReconciliation,
      formula: 'MRC_i = (Sigma * w)_i / sigma_p, CRC_i = w_i * MRC_i, sum(CRC_i) = sigma_p'
    };
  }

  /**
   * Decompose Active Risk / Tracking Error against Benchmark
   */
  static decomposeActiveRisk({ symbols, weights, benchmarkWeights, covarianceMatrix, periodsPerYear = 252 }) {
    const n = symbols.length;
    const bWeights = benchmarkWeights || new Array(n).fill(0);
    const activeWeights = weights.map((w, i) => w - (bWeights[i] || 0));

    const ppy = periodsPerYear || RiskForecastConfig.PERIODS_PER_YEAR.DAILY;
    const annFactor = Math.sqrt(ppy);

    const activeVariance = RiskForecastValidation.quadraticForm(activeWeights, covarianceMatrix);
    const activeVol = Math.sqrt(Math.max(0, activeVariance));
    const annualizedTE = activeVol * annFactor;

    if (activeVol <= 1e-12) {
      return {
        status: DataClassification.DERIVED,
        trackingErrorAnnualized: 0,
        activeContributions: symbols.map((s, i) => ({ symbol: s, activeWeight: activeWeights[i], activeMRC: 0, activeCRC: 0, activePRC: 0 })),
        reconciliationError: 0
      };
    }

    const S_active_w = RiskForecastValidation.matrixVectorMultiply(covarianceMatrix, activeWeights);
    const activeContributions = [];
    let sumActiveCRC = 0;

    for (let i = 0; i < n; i++) {
      const sym = symbols[i];
      const aw = activeWeights[i];
      const activeMRC = (S_active_w[i] / activeVol) * annFactor;
      const activeCRC = aw * activeMRC;
      const activePRC = activeVariance > 0 ? (aw * S_active_w[i]) / activeVariance : 0;

      sumActiveCRC += activeCRC;
      activeContributions.push({
        symbol: sym,
        portfolioWeight: weights[i],
        benchmarkWeight: bWeights[i] || 0,
        activeWeight: aw,
        activeMarginalContribution: activeMRC,
        activeComponentContribution: activeCRC,
        activePercentageContribution: activePRC
      });
    }

    return {
      status: DataClassification.DERIVED,
      trackingErrorAnnualized: annualizedTE,
      activeContributions,
      sumActiveComponentRisk: sumActiveCRC,
      reconciliationError: Math.abs(sumActiveCRC - annualizedTE)
    };
  }
}
