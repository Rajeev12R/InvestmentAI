/**
 * @file portfolioAlerts.engine.js
 * Generates deterministic portfolio-level alerts for concentration, correlation,
 * sector imbalances, and sizing mismatches.
 */

import { ATTENTION_THRESHOLDS } from '../attention/attentionThresholds.js';

/**
 * Generates portfolio-level alerts.
 * @param {Object} exposureMetrics Output from exposure.engine.js
 * @param {Object} [driftReport] Output from portfolioChange.engine.js
 * @returns {Array<Object>} Portfolio alerts
 */
export function generatePortfolioAlerts(exposureMetrics, driftReport = null, timestamp = null) {
  const alerts = [];
  const alertTimestamp = timestamp || '2026-09-06T00:00:00.000Z';

  if (!exposureMetrics) return alerts;

  // 1. Single Position Concentration Alert
  if (exposureMetrics.top1Weight >= ATTENTION_THRESHOLDS.PORTFOLIO_CONCENTRATION_THRESHOLDS.TOP_1_HIGH) {
    alerts.push({
      alertId: 'PALERT-TOP1',
      type: 'PORTFOLIO_CONCENTRATION',
      severity: 'HIGH',
      title: 'Excessive Single-Position Concentration',
      message: `Top single holding accounts for ${(exposureMetrics.top1Weight * 100).toFixed(1)}% of portfolio (threshold: ${(ATTENTION_THRESHOLDS.PORTFOLIO_CONCENTRATION_THRESHOLDS.TOP_1_HIGH * 100).toFixed(0)}%).`,
      metrics: { top1Weight: exposureMetrics.top1Weight, hhi: exposureMetrics.hhi },
      timestamp: alertTimestamp
    });
  }

  // 2. Top 3 Concentration Alert
  if (exposureMetrics.top3Weight >= ATTENTION_THRESHOLDS.PORTFOLIO_CONCENTRATION_THRESHOLDS.TOP_3_HIGH) {
    alerts.push({
      alertId: 'PALERT-TOP3',
      type: 'PORTFOLIO_CONCENTRATION',
      severity: 'HIGH',
      title: 'Top 3 Holdings Concentration Risk',
      message: `Top 3 holdings represent ${(exposureMetrics.top3Weight * 100).toFixed(1)}% of total portfolio value.`,
      metrics: { top3Weight: exposureMetrics.top3Weight, hhi: exposureMetrics.hhi },
      timestamp: alertTimestamp
    });
  }

  // 3. High Correlation Cluster Alert
  if (exposureMetrics.correlationClusters && exposureMetrics.correlationClusters.length > 0) {
    exposureMetrics.correlationClusters.forEach((cluster, idx) => {
      alerts.push({
        alertId: `PALERT-CORR-${idx}`,
        type: 'CORRELATION_RISK',
        severity: cluster.severity || 'HIGH',
        title: 'High Pairwise Correlation Cluster',
        message: `${cluster.pairs.length} asset pair(s) exhibit pairwise correlation >= 0.80, reducing effective portfolio diversification.`,
        metrics: { clusterPairs: cluster.pairs, correlationLevel: exposureMetrics.correlationLevel },
        timestamp: alertTimestamp
      });
    });
  }

  // 4. Low Effective Independent Bets Alert
  if (exposureMetrics.nEff > 0 && exposureMetrics.nEff < ATTENTION_THRESHOLDS.PORTFOLIO_CONCENTRATION_THRESHOLDS.N_EFF_LOW && exposureMetrics.holdingsCount >= 4) {
    alerts.push({
      alertId: 'PALERT-NEFF',
      type: 'DIVERSIFICATION_DEFICIT',
      severity: 'MEDIUM',
      title: 'Low Effective Independent Bets (N_eff)',
      message: `Portfolio has ${exposureMetrics.holdingsCount} nominal holdings but only ${exposureMetrics.nEff} effective independent bets due to weight concentration.`,
      metrics: { nEff: exposureMetrics.nEff, holdingsCount: exposureMetrics.holdingsCount },
      timestamp: alertTimestamp
    });
  }

  return alerts;
}
