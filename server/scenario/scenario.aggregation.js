/**
 * server/scenario/scenario.aggregation.js
 * 
 * Phase 19: Portfolio Scenario Aggregation & Attribution
 * Aggregates position-level stress impacts to compute portfolio NAV, sector/asset class shifts, and factor contributions.
 */

import { ValueStatus } from './scenario.types.js';
import { evaluateSecurityScenario } from './scenario.sensitivity.js';
import { calculateDelta, calculatePercentDelta } from './scenario.transform.js';
import { SCENARIO_CONFIG } from './scenario.config.js';

/**
 * Aggregates scenario shock impacts across a multi-asset portfolio.
 */
export function aggregatePortfolioScenario(portfolio, scenarioDef, options = {}) {
  if (!portfolio || typeof portfolio !== 'object') {
    throw new TypeError('portfolio must be a valid object');
  }
  if (!Array.isArray(portfolio.positions)) {
    throw new TypeError('portfolio.positions must be an array');
  }
  if (!scenarioDef || !Array.isArray(scenarioDef.shocks)) {
    throw new TypeError('scenarioDef.shocks must be an array');
  }

  const baseCurrency = portfolio.currency || options.baseCurrency || 'USD';
  const baselineCash = typeof portfolio.cash === 'number' && Number.isFinite(portfolio.cash) ? portfolio.cash : 0.0;
  
  // Stressed cash (may be shocked if FX shock applies to non-base cash)
  let stressedCash = baselineCash;

  let baselinePositionsNav = 0.0;
  let stressedPositionsNav = 0.0;

  const positionResults = [];
  const sectorMap = {};
  const assetClassMap = {};

  for (const pos of portfolio.positions) {
    const evaluated = evaluateSecurityScenario(pos, scenarioDef.shocks, { baseCurrency });
    positionResults.push(evaluated);

    const bVal = evaluated.baseline.marketValue;
    const sVal = evaluated.stressed.marketValue;

    baselinePositionsNav += bVal;
    stressedPositionsNav += sVal;

    // Sector attribution aggregation
    const sec = evaluated.sector;
    if (!sectorMap[sec]) {
      sectorMap[sec] = {
        sector: sec,
        baselineValue: 0.0,
        stressedValue: 0.0,
        pnlDollar: 0.0,
        baselineWeight: 0.0,
        stressedWeight: 0.0,
        contributionToNavPercent: 0.0
      };
    }
    sectorMap[sec].baselineValue += bVal;
    sectorMap[sec].stressedValue += sVal;
    sectorMap[sec].pnlDollar += evaluated.deltas.pnlDollar;

    // Asset class attribution aggregation
    const ac = evaluated.assetClass;
    if (!assetClassMap[ac]) {
      assetClassMap[ac] = {
        assetClass: ac,
        baselineValue: 0.0,
        stressedValue: 0.0,
        pnlDollar: 0.0,
        baselineWeight: 0.0,
        stressedWeight: 0.0
      };
    }
    assetClassMap[ac].baselineValue += bVal;
    assetClassMap[ac].stressedValue += sVal;
    assetClassMap[ac].pnlDollar += evaluated.deltas.pnlDollar;
  }

  const baselineTotalNav = baselinePositionsNav + baselineCash;
  const stressedTotalNav = stressedPositionsNav + stressedCash;
  const portfolioPnlDollar = calculateDelta(baselineTotalNav, stressedTotalNav);
  const portfolioPnlPercent = calculatePercentDelta(baselineTotalNav, stressedTotalNav);

  // Calculate weights & contributions
  for (const posRes of positionResults) {
    posRes.baseline.weight = baselineTotalNav > 0 ? (posRes.baseline.marketValue / baselineTotalNav) : 0;
    posRes.stressed.weight = stressedTotalNav > 0 ? (posRes.stressed.marketValue / stressedTotalNav) : 0;
    posRes.deltas.weightDelta = posRes.stressed.weight - posRes.baseline.weight;
    posRes.deltas.contributionToNavPercent = baselineTotalNav > 0 ? (posRes.deltas.pnlDollar / baselineTotalNav) : 0;
  }

  for (const secKey of Object.keys(sectorMap)) {
    const sec = sectorMap[secKey];
    sec.baselineWeight = baselineTotalNav > 0 ? (sec.baselineValue / baselineTotalNav) : 0;
    sec.stressedWeight = stressedTotalNav > 0 ? (sec.stressedValue / stressedTotalNav) : 0;
    sec.pnlPercent = calculatePercentDelta(sec.baselineValue, sec.stressedValue);
    sec.contributionToNavPercent = baselineTotalNav > 0 ? (sec.pnlDollar / baselineTotalNav) : 0;
  }

  for (const acKey of Object.keys(assetClassMap)) {
    const ac = assetClassMap[acKey];
    ac.baselineWeight = baselineTotalNav > 0 ? (ac.baselineValue / baselineTotalNav) : 0;
    ac.stressedWeight = stressedTotalNav > 0 ? (ac.stressedValue / stressedTotalNav) : 0;
    ac.pnlPercent = calculatePercentDelta(ac.baselineValue, ac.stressedValue);
  }

  // Top gainers and losers
  const sortedByPnlPercent = [...positionResults].sort((a, b) => b.deltas.pnlPercent - a.deltas.pnlPercent);
  const topGainers = sortedByPnlPercent.slice(0, 5).map(p => ({
    ticker: p.ticker,
    pnlPercent: p.deltas.pnlPercent,
    pnlDollar: p.deltas.pnlDollar
  }));
  const topLosers = [...sortedByPnlPercent].reverse().slice(0, 5).map(p => ({
    ticker: p.ticker,
    pnlPercent: p.deltas.pnlPercent,
    pnlDollar: p.deltas.pnlDollar
  }));

  return {
    scenarioId: scenarioDef.id || 'CUSTOM_SCENARIO',
    scenarioName: scenarioDef.name || 'Custom Scenario',
    scenarioType: scenarioDef.scenarioType,
    horizon: scenarioDef.horizon || 'HORIZON_1M',
    baseCurrency,
    baseline: {
      nav: baselineTotalNav,
      positionsValue: baselinePositionsNav,
      cash: baselineCash,
      status: ValueStatus.DERIVED
    },
    stressed: {
      nav: stressedTotalNav,
      positionsValue: stressedPositionsNav,
      cash: stressedCash,
      status: ValueStatus.SCENARIO_OUTPUT
    },
    deltas: {
      pnlDollar: portfolioPnlDollar,
      pnlPercent: portfolioPnlPercent,
      status: ValueStatus.SCENARIO_OUTPUT
    },
    positions: positionResults,
    sectorAttribution: Object.values(sectorMap),
    assetClassAttribution: Object.values(assetClassMap),
    topGainers,
    topLosers
  };
}
