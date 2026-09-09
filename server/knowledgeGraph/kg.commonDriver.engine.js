/**
 * server/knowledgeGraph/kg.commonDriver.engine.js
 * 
 * Phase 23: Portfolio Common-Driver & Hidden Concentration Intelligence Engine
 * Computes Gross & Net driver exposure, driver HHI, driver overlap, and effective number of drivers (N_eff).
 */

import { deepFreeze } from './kg.types.js';

export class PortfolioCommonDriverEngine {
  /**
   * Computes comprehensive common driver concentration across portfolio holdings
   */
  calculateCommonDrivers(positionsInput = []) {
    const positions = Array.isArray(positionsInput) ? positionsInput : (positionsInput && Array.isArray(positionsInput.positions) ? positionsInput.positions : []);

    let totalLongValue = 0;
    let totalShortValue = 0;

    for (const p of positions) {
      const mv = typeof p.marketValue === 'number' && Number.isFinite(p.marketValue) ? p.marketValue : 0;
      if (mv >= 0) totalLongValue += mv;
      else totalShortValue += Math.abs(mv);
    }

    const netPortfolioValue = totalLongValue - totalShortValue;
    const grossPortfolioValue = totalLongValue + totalShortValue;

    const driverGrossSum = new Map();
    const driverNetSum = new Map();
    const driverHoldingsMap = new Map();

    for (const p of positions) {
      const mv = typeof p.marketValue === 'number' && Number.isFinite(p.marketValue) ? p.marketValue : 0;
      const ticker = p.ticker || 'UNKNOWN';
      const drivers = p.drivers || {};

      for (const [driverName, driverBeta] of Object.entries(drivers)) {
        if (typeof driverBeta !== 'number' || !Number.isFinite(driverBeta)) continue;
        const normDriver = driverName.trim().toUpperCase();

        const dollarExp = mv * driverBeta;
        const absDollarExp = Math.abs(mv * driverBeta);

        driverNetSum.set(normDriver, (driverNetSum.get(normDriver) || 0) + dollarExp);
        driverGrossSum.set(normDriver, (driverGrossSum.get(normDriver) || 0) + absDollarExp);

        if (!driverHoldingsMap.has(normDriver)) {
          driverHoldingsMap.set(normDriver, []);
        }
        driverHoldingsMap.get(normDriver).push({
          ticker,
          marketValue: mv,
          driverBeta,
          dollarExposure: dollarExp
        });
      }
    }

    const totalGrossDriverExposure = Array.from(driverGrossSum.values()).reduce((a, b) => a + b, 0);

    // Compute HHI and N_eff
    const driverShares = [];
    const driverBreakdown = [];

    for (const [driver, grossVal] of driverGrossSum.entries()) {
      const netVal = driverNetSum.get(driver) || 0;
      const grossShare = totalGrossDriverExposure > 0 ? (grossVal / totalGrossDriverExposure) : 0;
      const netWeight = netPortfolioValue !== 0 ? (netVal / netPortfolioValue) : 0;
      driverShares.push(grossShare);

      driverBreakdown.push({
        driverName: driver,
        grossDollarExposure: grossVal,
        netDollarExposure: netVal,
        grossSharePct: grossShare * 100,
        netPortfolioWeightPct: netWeight * 100,
        holdingsCount: driverHoldingsMap.get(driver)?.length || 0,
        contributingHoldings: driverHoldingsMap.get(driver) || []
      });
    }

    // Sort descending by gross exposure
    driverBreakdown.sort((a, b) => b.grossDollarExposure - a.grossDollarExposure);

    // Driver HHI = Sum(share^2) * 10,000
    const sumSqShares = driverShares.reduce((acc, s) => acc + (s * s), 0);
    const driverHHI = Math.round(sumSqShares * 10000);
    const effectiveNumberOfDrivers = sumSqShares > 0 ? (1 / sumSqShares) : 0;

    // Top 3 driver concentration
    const top3GrossShare = driverBreakdown.slice(0, 3).reduce((acc, d) => acc + (d.grossSharePct || 0), 0);

    return deepFreeze({
      totalLongValue,
      totalShortValue,
      netPortfolioValue,
      grossPortfolioValue,
      totalDriversCount: driverBreakdown.length,
      driverHHI,
      effectiveNumberOfDrivers: Math.round(effectiveNumberOfDrivers * 100) / 100,
      top3DriverConcentrationPct: Math.round(top3GrossShare * 100) / 100,
      driverBreakdown,
      classification: 'MODEL_ESTIMATE'
    });
  }
}

export const defaultPortfolioCommonDriverEngine = new PortfolioCommonDriverEngine();
