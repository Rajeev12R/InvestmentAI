/**
 * @file portfolioChange.engine.js
 * Compares multi-period portfolio states (T0 -> T1) to detect structural drift in
 * allocation, concentration, sector weights, correlation, and decision distributions.
 */

/**
 * Calculates multi-period portfolio drift between T0 and T1.
 * @param {Object} stateT0 Baseline portfolio state
 * @param {Object} stateT1 Updated portfolio state
 * @returns {Object} Comprehensive portfolio drift report
 */
export function calculatePortfolioStateChange(stateT0, stateT1) {
  if (!stateT0 || !stateT1) {
    return {
      hasDrift: false,
      reason: 'Insufficient state for comparison',
      allocationDrift: [],
      sectorDrift: {},
      concentrationDrift: {},
      decisionDistributionDrift: {}
    };
  }

  // 1. Allocation Drift per Holding
  const holdingsT0Map = new Map((stateT0.holdings || []).map(h => [h.ticker, h.weight || 0]));
  const holdingsT1Map = new Map((stateT1.holdings || []).map(h => [h.ticker, h.weight || 0]));
  const allTickers = Array.from(new Set([...holdingsT0Map.keys(), ...holdingsT1Map.keys()]));

  const allocationDrift = [];
  for (const ticker of allTickers) {
    const w0 = holdingsT0Map.get(ticker) || 0;
    const w1 = holdingsT1Map.get(ticker) || 0;
    const ppDiff = Number(((w1 - w0) * 100).toFixed(2)); // percentage-point change
    const pctChange = w0 > 0 ? Number((((w1 - w0) / w0) * 100).toFixed(2)) : null;

    if (Math.abs(ppDiff) >= 0.5) { // >= 0.5 percentage point drift
      allocationDrift.push({
        ticker,
        weightT0: Number(w0.toFixed(4)),
        weightT1: Number(w1.toFixed(4)),
        percentagePointDiff: ppDiff,
        pctChange
      });
    }
  }

  // 2. Sector Exposure Drift (Percentage Points & Pct Change)
  const secT0 = stateT0.exposureMetrics?.sectorExposure || {};
  const secT1 = stateT1.exposureMetrics?.sectorExposure || {};
  const allSectors = Array.from(new Set([...Object.keys(secT0), ...Object.keys(secT1)]));

  const sectorDrift = {};
  for (const sec of allSectors) {
    const s0 = secT0[sec] || 0;
    const s1 = secT1[sec] || 0;
    const ppDiff = Number(((s1 - s0) * 100).toFixed(2));
    const pctChange = s0 > 0 ? Number((((s1 - s0) / s0) * 100).toFixed(2)) : null;

    if (Math.abs(ppDiff) >= 1.0) { // >= 1.0 percentage point drift
      sectorDrift[sec] = {
        weightT0: Number(s0.toFixed(4)),
        weightT1: Number(s1.toFixed(4)),
        percentagePointDiff: ppDiff,
        pctChange
      };
    }
  }

  // 3. Concentration Metrics Drift
  const expT0 = stateT0.exposureMetrics || {};
  const expT1 = stateT1.exposureMetrics || {};

  const concentrationDrift = {
    top1Diff: Number(((expT1.top1Weight || 0) - (expT0.top1Weight || 0)).toFixed(4)),
    top3Diff: Number(((expT1.top3Weight || 0) - (expT0.top3Weight || 0)).toFixed(4)),
    hhiDiff: (expT1.hhi || 0) - (expT0.hhi || 0),
    nEffDiff: Number(((expT1.nEff || 0) - (expT0.nEff || 0)).toFixed(2))
  };

  // 4. Decision Distribution Drift
  const decT0 = countDecisions(stateT0.holdings || []);
  const decT1 = countDecisions(stateT1.holdings || []);
  const decisionDistributionDrift = {
    t0: decT0,
    t1: decT1,
    changedCount: Object.keys(decT1).reduce((sum, key) => sum + Math.abs((decT1[key] || 0) - (decT0[key] || 0)), 0)
  };

  const hasDrift = allocationDrift.length > 0 ||
                   Object.keys(sectorDrift).length > 0 ||
                   Math.abs(concentrationDrift.hhiDiff) >= 100 ||
                   decisionDistributionDrift.changedCount > 0;

  return {
    hasDrift,
    allocationDrift,
    sectorDrift,
    concentrationDrift,
    decisionDistributionDrift,
    comparedAt: new Date().toISOString()
  };
}

function countDecisions(holdings) {
  const counts = { BUY: 0, WATCH: 0, HOLD: 0, AVOID: 0, UNKNOWN: 0 };
  for (const h of holdings) {
    const d = (h.decision || 'UNKNOWN').toUpperCase();
    counts[d] = (counts[d] || 0) + 1;
  }
  return counts;
}
