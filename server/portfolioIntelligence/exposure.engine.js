/**
 * @file exposure.engine.js
 * Computes portfolio-level multi-asset concentration, HHI, sector distribution,
 * effective independent bets (N_eff), and correlation clusters.
 */

import { ATTENTION_THRESHOLDS } from '../attention/attentionThresholds.js';
import { ConcentrationLevel, CorrelationLevel } from './portfolioIntelligence.types.js';

/**
 * Calculates comprehensive portfolio exposure and concentration metrics.
 * @param {Array<Object>} holdings Array of { ticker, weight, value, sector, riskLevel, correlationWithOthers }
 * @param {Array<Array<number>>} [correlationMatrix] Optional pairwise correlation matrix
 * @param {Array<string>} [tickers] Optional array of tickers matching matrix rows/cols
 * @returns {Object} Comprehensive exposure metrics
 */
export function calculatePortfolioExposure(holdings = [], correlationMatrix = null, tickers = []) {
  if (!Array.isArray(holdings) || holdings.length === 0) {
    return {
      top1Weight: 0,
      top3Weight: 0,
      top5Weight: 0,
      hhi: 0,
      nEff: 0,
      concentrationLevel: ConcentrationLevel.LOW,
      sectorExposure: {},
      correlationClusters: [],
      correlationLevel: CorrelationLevel.LOW,
      holdingsCount: 0
    };
  }

  // Normalize weights if not already sum = 1.0
  const rawSum = holdings.reduce((acc, h) => acc + (typeof h.weight === 'number' ? h.weight : 0), 0);
  const normalizedHoldings = holdings.map(h => ({
    ...h,
    normalizedWeight: rawSum > 0 ? (h.weight || 0) / rawSum : (1 / holdings.length)
  }));

  // Sort by weight descending
  const sorted = [...normalizedHoldings].sort((a, b) => b.normalizedWeight - a.normalizedWeight);

  const top1Weight = sorted[0]?.normalizedWeight || 0;
  const top3Weight = sorted.slice(0, 3).reduce((acc, h) => acc + h.normalizedWeight, 0);
  const top5Weight = sorted.slice(0, 5).reduce((acc, h) => acc + h.normalizedWeight, 0);

  // Herfindahl-Hirschman Index: Sum of (w_i * 100)^2
  const hhi = Math.round(
    sorted.reduce((acc, h) => acc + Math.pow(h.normalizedWeight * 100, 2), 0)
  );

  // Effective Number of Independent Bets (N_eff = 1 / sum(w_i^2))
  const sumSqWeights = sorted.reduce((acc, h) => acc + Math.pow(h.normalizedWeight, 2), 0);
  const nEff = sumSqWeights > 0 ? Number((1 / sumSqWeights).toFixed(2)) : 0;

  // Concentration Classification
  let concentrationLevel = ConcentrationLevel.LOW;
  if (
    top1Weight >= ATTENTION_THRESHOLDS.PORTFOLIO_CONCENTRATION_THRESHOLDS.TOP_1_HIGH ||
    top3Weight >= ATTENTION_THRESHOLDS.PORTFOLIO_CONCENTRATION_THRESHOLDS.TOP_3_HIGH ||
    hhi >= ATTENTION_THRESHOLDS.PORTFOLIO_CONCENTRATION_THRESHOLDS.HHI_HIGH
  ) {
    concentrationLevel = ConcentrationLevel.HIGH;
  } else if (top1Weight >= 0.20 || top3Weight >= 0.50 || hhi >= 1500) {
    concentrationLevel = ConcentrationLevel.MODERATE;
  }

  // Sector Exposure
  const sectorExposure = {};
  for (const h of sorted) {
    const sector = h.sector || 'Unassigned';
    sectorExposure[sector] = (sectorExposure[sector] || 0) + h.normalizedWeight;
  }

  // Round sector exposure percentages
  for (const s of Object.keys(sectorExposure)) {
    sectorExposure[s] = Number(sectorExposure[s].toFixed(4));
  }

  // Correlation Clusters Analysis (> 0.80)
  const correlationClusters = [];
  let correlationLevel = CorrelationLevel.LOW;

  if (correlationMatrix && Array.isArray(correlationMatrix) && tickers && tickers.length === correlationMatrix.length) {
    const highCorrPairs = [];
    const n = tickers.length;
    let totalPairwiseCorr = 0;
    let pairCount = 0;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const corr = correlationMatrix[i][j];
        if (typeof corr === 'number') {
          totalPairwiseCorr += corr;
          pairCount++;
          if (corr >= ATTENTION_THRESHOLDS.PORTFOLIO_CONCENTRATION_THRESHOLDS.CORRELATION_HIGH_THRESHOLD) {
            highCorrPairs.push({
              tickerA: tickers[i],
              tickerB: tickers[j],
              correlation: Number(corr.toFixed(2))
            });
          }
        }
      }
    }

    const avgCorr = pairCount > 0 ? totalPairwiseCorr / pairCount : 0;
    if (avgCorr >= 0.65 || highCorrPairs.length >= 3) {
      correlationLevel = CorrelationLevel.HIGH;
    } else if (avgCorr >= 0.40 || highCorrPairs.length >= 1) {
      correlationLevel = CorrelationLevel.MODERATE;
    }

    if (highCorrPairs.length > 0) {
      correlationClusters.push({
        clusterName: 'High Correlation Cluster (>0.80)',
        pairs: highCorrPairs,
        severity: highCorrPairs.length >= 3 ? 'HIGH' : 'MODERATE'
      });
    }
  }

  return {
    top1Weight: Number(top1Weight.toFixed(4)),
    top3Weight: Number(top3Weight.toFixed(4)),
    top5Weight: Number(top5Weight.toFixed(4)),
    hhi,
    nEff,
    concentrationLevel,
    sectorExposure,
    correlationClusters,
    correlationLevel,
    holdingsCount: holdings.length
  };
}
