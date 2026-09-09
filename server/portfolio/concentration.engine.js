import { HERFINDAHL_THRESHOLDS, CONCENTRATION_THRESHOLDS } from './portfolio.types.js';

/**
 * Calculates portfolio weights, top position concentrations, sector concentrations, and HHI.
 *
 * @param {Array<{ ticker: string, value: number, sector?: string, assetClass?: string }>} positions
 * @returns {Object} Concentration analysis results
 */
export function calculateConcentration(positions = []) {
  if (!Array.isArray(positions) || positions.length === 0) {
    return {
      status: 'UNAVAILABLE',
      reason: 'No positions provided',
      totalPortfolioValue: 0,
      positionCount: 0,
      positions: [],
      topHoldings: { top1: null, top3: null, top5: null },
      hhi: null,
      concentrationLevel: 'UNKNOWN',
      sectorBreakdown: {},
      sectorConcentration: { topSector: null, topSectorWeight: null }
    };
  }

  // Filter valid positions
  const validPositions = positions.filter(p => p && typeof p.value === 'number' && p.value > 0);
  if (validPositions.length === 0) {
    return {
      status: 'UNAVAILABLE',
      reason: 'No positions with positive value',
      totalPortfolioValue: 0,
      positionCount: 0,
      positions: [],
      topHoldings: { top1: null, top3: null, top5: null },
      hhi: null,
      concentrationLevel: 'UNKNOWN',
      sectorBreakdown: {},
      sectorConcentration: { topSector: null, topSectorWeight: null }
    };
  }

  const totalPortfolioValue = validPositions.reduce((sum, p) => sum + p.value, 0);

  // Compute individual weights
  const weightedPositions = validPositions.map(p => {
    const weight = p.value / totalPortfolioValue;
    return {
      ticker: p.ticker,
      value: p.value,
      sector: p.sector || 'Unassigned',
      assetClass: p.assetClass || 'EQUITY',
      weight: Math.round(weight * 10000) / 10000, // 4 decimal places
      weightPct: Math.round(weight * 10000) / 100 // 2 decimal percentage
    };
  }).sort((a, b) => b.weight - a.weight);

  // Top N concentrations
  const top1Weight = weightedPositions[0]?.weight ?? 0;
  const top3Weight = weightedPositions.slice(0, 3).reduce((s, p) => s + p.weight, 0);
  const top5Weight = weightedPositions.slice(0, 5).reduce((s, p) => s + p.weight, 0);

  // Herfindahl-Hirschman Index: sum(w_i^2) where w_i is in 0..1 or 0..10000 points.
  // Standard financial HHI is sum of (weightPct)^2, range 0 to 10,000.
  const hhiScore = weightedPositions.reduce((sum, p) => {
    const pct = p.weight * 100;
    return sum + (pct * pct);
  }, 0);
  const hhi = Math.round(hhiScore);

  let concentrationLevel = 'LOW';
  if (hhi >= HERFINDAHL_THRESHOLDS.HIGH) {
    concentrationLevel = 'HIGH';
  } else if (hhi >= HERFINDAHL_THRESHOLDS.MODERATE) {
    concentrationLevel = 'MODERATE';
  }

  // Sector breakdown
  const sectorMap = {};
  for (const pos of weightedPositions) {
    const s = pos.sector;
    if (!sectorMap[s]) {
      sectorMap[s] = { sector: s, totalValue: 0, weight: 0, positions: [] };
    }
    sectorMap[s].totalValue += pos.value;
    sectorMap[s].weight += pos.weight;
    sectorMap[s].positions.push(pos.ticker);
  }

  const sectorBreakdown = Object.values(sectorMap)
    .map(s => ({
      sector: s.sector,
      totalValue: s.totalValue,
      weight: Math.round(s.weight * 10000) / 10000,
      weightPct: Math.round(s.weight * 10000) / 100,
      positions: s.positions
    }))
    .sort((a, b) => b.weight - a.weight);

  const topSector = sectorBreakdown[0] || null;

  return {
    status: 'COMPLETE',
    totalPortfolioValue,
    positionCount: weightedPositions.length,
    positions: weightedPositions,
    topHoldings: {
      top1: Math.round(top1Weight * 10000) / 10000,
      top3: Math.round(top3Weight * 10000) / 10000,
      top5: Math.round(top5Weight * 10000) / 10000
    },
    hhi,
    concentrationLevel,
    sectorBreakdown,
    sectorConcentration: {
      topSector: topSector ? topSector.sector : null,
      topSectorWeight: topSector ? topSector.weight : null
    },
    thresholds: {
      singlePositionCap: CONCENTRATION_THRESHOLDS.MAX_SINGLE_POSITION,
      top3Cap: CONCENTRATION_THRESHOLDS.MAX_TOP3_CONCENTRATION,
      topSectorCap: CONCENTRATION_THRESHOLDS.MAX_SECTOR_CONCENTRATION
    },
    warnings: [
      ...(top1Weight > CONCENTRATION_THRESHOLDS.MAX_SINGLE_POSITION
        ? [`Single position ${weightedPositions[0].ticker} exceeds ${(CONCENTRATION_THRESHOLDS.MAX_SINGLE_POSITION * 100)}% cap at ${(top1Weight * 100).toFixed(1)}%`]
        : []),
      ...(top3Weight > CONCENTRATION_THRESHOLDS.MAX_TOP3_CONCENTRATION
        ? [`Top 3 holdings exceed ${(CONCENTRATION_THRESHOLDS.MAX_TOP3_CONCENTRATION * 100)}% cap at ${(top3Weight * 100).toFixed(1)}%`]
        : []),
      ...(topSector && topSector.weight > CONCENTRATION_THRESHOLDS.MAX_SECTOR_CONCENTRATION
        ? [`Top sector ${topSector.sector} exceeds ${(CONCENTRATION_THRESHOLDS.MAX_SECTOR_CONCENTRATION * 100)}% cap at ${(topSector.weight * 100).toFixed(1)}%`]
        : [])
    ]
  };
}
