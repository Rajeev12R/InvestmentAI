import {
  deepFreeze,
  computeExposureHash,
  ExposureClassification,
  ExposureSourceTier
} from './exposure.types.js';

/**
 * Phase 30 — Deterministic Portfolio Exposure Aggregation Engine
 */
export class ExposureAggregationEngine {
  /**
   * Aggregate Portfolio Exposures across Direct, Look-Through, Sector, Geography, Currency, Duration & Liquidity
   * @param {Object} params
   * @param {string} params.portfolioExposureId
   * @param {string} params.portfolioId
   * @param {Array<{ symbol: string, weight: number, isLookThrough?: boolean, underlying?: Array<{ symbol: string, weight: number }>, sector?: string, revenueGeography?: Record<string, number>, domicile?: string, currency?: string, duration?: number, advParticipation?: number, spreadBps?: number }>} params.holdings
   * @param {Array<{ symbol: string, weight: number, sector?: string, currency?: string }>} params.benchmarkHoldings
   */
  static aggregatePortfolioExposure({
    portfolioExposureId = `port-exp-${Date.now()}`,
    portfolioId = 'port-1',
    holdings = [],
    benchmarkHoldings = [],
    baseCurrency = 'USD'
  } = {}) {
    if (!Array.isArray(holdings) || holdings.length === 0) {
      throw new Error('holdings array is required and must contain at least 1 holding');
    }

    let grossExposure = 0;
    let netExposure = 0;
    let totalLong = 0;
    let totalShort = 0;

    let totalLookThroughWeight = 0;
    let lookThroughCoveredWeight = 0;
    let lookThroughUncoveredWeight = 0;

    const sectorExposures = {};
    const revenueGeoExposures = {};
    const domicileGeoExposures = {};
    const currencyExposures = {};
    let weightedDuration = 0;
    let totalDurationEligibleWeight = 0;
    let weightedSpreadBps = 0;
    let weightedAdvParticipation = 0;

    const expandedHoldings = [];

    for (const h of holdings) {
      const w = h.weight || 0;
      grossExposure += Math.abs(w);
      netExposure += w;
      if (w > 0) totalLong += w;
      else if (w < 0) totalShort += Math.abs(w);

      // Direct vs Look-through
      if (h.isLookThrough) {
        totalLookThroughWeight += Math.abs(w);
        if (Array.isArray(h.underlying) && h.underlying.length > 0) {
          const underWeightSum = h.underlying.reduce((sum, u) => sum + (u.weight || 0), 0);
          lookThroughCoveredWeight += Math.abs(w) * Math.min(1.0, underWeightSum);
          if (underWeightSum < 1.0) {
            lookThroughUncoveredWeight += Math.abs(w) * (1.0 - underWeightSum);
          }
          for (const u of h.underlying) {
            const effectiveWeight = w * (u.weight || 0);
            expandedHoldings.push({
              symbol: u.symbol,
              effectiveWeight,
              classification: ExposureClassification.LOOK_THROUGH_EXPOSURE,
              parentHolding: h.symbol
            });
          }
        } else {
          lookThroughUncoveredWeight += Math.abs(w);
          expandedHoldings.push({
            symbol: h.symbol,
            effectiveWeight: w,
            classification: ExposureClassification.UNCOVERED_LOOK_THROUGH,
            lookThroughStatus: 'UNAVAILABLE'
          });
        }
      } else {
        expandedHoldings.push({
          symbol: h.symbol,
          effectiveWeight: w,
          classification: ExposureClassification.DIRECT_EXPOSURE
        });
      }

      // Sector Aggregation
      const sec = h.sector || 'UNCLASSIFIED';
      sectorExposures[sec] = (sectorExposures[sec] || 0) + w;

      // Domicile Geography
      const dom = h.domicile || 'UNCLASSIFIED';
      domicileGeoExposures[dom] = (domicileGeoExposures[dom] || 0) + w;

      // Revenue Geography
      if (h.revenueGeography && typeof h.revenueGeography === 'object') {
        for (const [geo, pct] of Object.entries(h.revenueGeography)) {
          revenueGeoExposures[geo] = (revenueGeoExposures[geo] || 0) + (w * pct);
        }
      } else {
        revenueGeoExposures[dom] = (revenueGeoExposures[dom] || 0) + w;
      }

      // Currency Aggregation
      const curr = h.currency || baseCurrency;
      currencyExposures[curr] = (currencyExposures[curr] || 0) + w;

      // Duration & DV01
      if (typeof h.duration === 'number' && !isNaN(h.duration)) {
        weightedDuration += w * h.duration;
        totalDurationEligibleWeight += Math.abs(w);
      }

      // Liquidity Aggregation
      if (typeof h.spreadBps === 'number') {
        weightedSpreadBps += Math.abs(w) * h.spreadBps;
      }
      if (typeof h.advParticipation === 'number') {
        weightedAdvParticipation += Math.abs(w) * h.advParticipation;
      }
    }

    // Benchmark-relative active exposures
    const activeSectorExposures = {};
    const benchmarkSectorExposures = {};
    if (Array.isArray(benchmarkHoldings) && benchmarkHoldings.length > 0) {
      for (const bh of benchmarkHoldings) {
        const bSec = bh.sector || 'UNCLASSIFIED';
        benchmarkSectorExposures[bSec] = (benchmarkSectorExposures[bSec] || 0) + (bh.weight || 0);
      }
      const allSectors = new Set([...Object.keys(sectorExposures), ...Object.keys(benchmarkSectorExposures)]);
      for (const s of allSectors) {
        const pW = sectorExposures[s] || 0;
        const bW = benchmarkSectorExposures[s] || 0;
        activeSectorExposures[s] = Number((pW - bW).toFixed(6));
      }
    }

    // Normalization & Rounding
    const roundObj = (obj) => {
      const res = {};
      for (const [k, v] of Object.entries(obj)) res[k] = Number(v.toFixed(6));
      return res;
    };

    const lookThroughCoverage = totalLookThroughWeight > 0 ? lookThroughCoveredWeight / totalLookThroughWeight : 1.0;
    const portfolioDV01 = weightedDuration * 0.0001; // Approx DV01 per $ portfolio value

    const result = {
      portfolioExposureId,
      portfolioId,
      baseCurrency,
      grossExposure: Number(grossExposure.toFixed(6)),
      netExposure: Number(netExposure.toFixed(6)),
      totalLong: Number(totalLong.toFixed(6)),
      totalShort: Number(totalShort.toFixed(6)),
      isLeveraged: grossExposure > 1.0001,
      lookThroughMetrics: {
        totalLookThroughWeight: Number(totalLookThroughWeight.toFixed(6)),
        lookThroughCoveredWeight: Number(lookThroughCoveredWeight.toFixed(6)),
        lookThroughUncoveredWeight: Number(lookThroughUncoveredWeight.toFixed(6)),
        lookThroughCoverage: Number(lookThroughCoverage.toFixed(4))
      },
      sectorExposures: roundObj(sectorExposures),
      activeSectorExposures: roundObj(activeSectorExposures),
      revenueGeographyExposures: roundObj(revenueGeoExposures),
      domicileGeographyExposures: roundObj(domicileGeoExposures),
      currencyExposures: roundObj(currencyExposures),
      durationMetrics: {
        effectiveDuration: Number(weightedDuration.toFixed(4)),
        portfolioDV01: Number(portfolioDV01.toFixed(6)),
        durationEligibleWeight: Number(totalDurationEligibleWeight.toFixed(4))
      },
      liquidityMetrics: {
        weightedSpreadBps: Number(weightedSpreadBps.toFixed(2)),
        weightedAdvParticipation: Number(weightedAdvParticipation.toFixed(4))
      },
      expandedHoldings,
      calculatedAt: new Date().toISOString()
    };

    result.hash = computeExposureHash(result);
    return deepFreeze(result);
  }
}
