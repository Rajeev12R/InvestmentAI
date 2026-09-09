import crypto from 'crypto';
import { SignalRegime, computeSignalHash, deepFreeze } from './signal.types.js';
import { defaultSignalStore } from './signal.store.js';

export class SignalPortfolioEngine {
  constructor(store = defaultSignalStore) {
    this.store = store;
  }

  /**
   * Aggregate security-level signals into portfolio-level signal intelligence.
   * Handles long positions, short positions (negative weights), leverage, and common signal concentration.
   */
  aggregatePortfolioSignals(tenantId = 'tenant_default', {
    portfolioId = 'port_default',
    holdings = [], // [{ ticker: 'NVDA', weight: 0.20, compositeScore: 0.85, dominantDriver: 'AI_CAPEX' }]
    knowledgeCutoff = new Date().toISOString()
  }) {
    if (!holdings || holdings.length === 0) {
      return {
        portfolioId,
        netSignalScore: 0.0,
        grossSignalScore: 0.0,
        longExposure: 0.0,
        shortExposure: 0.0,
        grossExposure: 0.0,
        netExposure: 0.0,
        concentrationRisks: [],
        driverConcentrations: {},
        holdingsCount: 0,
        knowledgeCutoff,
        aggregatedAt: new Date().toISOString()
      };
    }

    let weightedScoreSum = 0;
    let grossWeightedScoreSum = 0;
    let longExposure = 0;
    let shortExposure = 0;
    const driverExposureMap = {};

    for (const h of holdings) {
      const w = h.weight !== undefined ? Number(h.weight) : 0;
      const score = h.compositeScore !== undefined ? Number(h.compositeScore) : 0;
      const absWeight = Math.abs(w);

      if (w >= 0) {
        longExposure += w;
      } else {
        shortExposure += absWeight;
      }

      weightedScoreSum += (w * score);
      grossWeightedScoreSum += (absWeight * Math.abs(score));

      // Driver Concentration Tracking
      const driver = h.dominantDriver || h.primaryFactor || 'UNSPECIFIED';
      if (!driverExposureMap[driver]) driverExposureMap[driver] = { totalWeight: 0, tickers: [] };
      driverExposureMap[driver].totalWeight += absWeight;
      driverExposureMap[driver].tickers.push(h.ticker);
    }

    const grossExposure = parseFloat((longExposure + shortExposure).toFixed(4));
    const netExposure = parseFloat((longExposure - shortExposure).toFixed(4));
    const netSignalScore = parseFloat(weightedScoreSum.toFixed(4));
    const grossSignalScore = parseFloat(grossWeightedScoreSum.toFixed(4));

    // Identify Common Signal / Driver Concentration
    const concentrationRisks = [];
    for (const [driver, data] of Object.entries(driverExposureMap)) {
      const roundedWeight = parseFloat(data.totalWeight.toFixed(4));
      if (roundedWeight >= 0.35 && data.tickers.length >= 2) {
        concentrationRisks.push({
          riskType: 'SIGNAL_CONCENTRATION_RISK',
          driver,
          driverExposurePct: roundedWeight,
          affectedPositionsCount: data.tickers.length,
          affectedTickers: data.tickers,
          severity: roundedWeight >= 0.50 ? 'HIGH' : 'MEDIUM',
          description: `Portfolio has ${Math.round(roundedWeight * 100)}% cumulative exposure concentrated in ${driver} across ${data.tickers.length} positions.`
        });
      }
    }

    return {
      portfolioId,
      netSignalScore,
      grossSignalScore,
      longExposure: parseFloat(longExposure.toFixed(4)),
      shortExposure: parseFloat(shortExposure.toFixed(4)),
      grossExposure,
      netExposure,
      concentrationRisks,
      driverConcentrations: driverExposureMap,
      holdingsCount: holdings.length,
      knowledgeCutoff,
      aggregatedAt: new Date().toISOString()
    };
  }
}

export const defaultPortfolioSignalEngine = new SignalPortfolioEngine();
