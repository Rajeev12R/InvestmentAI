import {
  deepFreeze,
  computeExposureHash,
  CommonDriverType
} from './exposure.types.js';

/**
 * Phase 30 — Deterministic Common Driver & Hidden Concentration Engine
 */
export class ExposureCommonDriverEngine {
  /**
   * Identify Shared Common Drivers Across Portfolio Holdings
   * @param {Object} params
   * @param {Array<{ symbol: string, weight: number, supplyChain?: string[], keyCustomers?: string[], commodityDependencies?: string[], themes?: string[] }>} params.holdings
   */
  static identifyCommonDrivers({
    holdings = []
  } = {}) {
    if (!Array.isArray(holdings) || holdings.length === 0) {
      return { commonDrivers: [], driverCount: 0 };
    }

    const driverBuckets = new Map();

    for (const h of holdings) {
      const sym = h.symbol;
      const w = Math.abs(h.weight || 0);

      // 1. Supply Chain
      if (Array.isArray(h.supplyChain)) {
        for (const sup of h.supplyChain) {
          const key = `SUPPLY_CHAIN:${sup}`;
          if (!driverBuckets.has(key)) {
            driverBuckets.set(key, { driverType: CommonDriverType.SHARED_SUPPLY_CHAIN, name: sup, securities: new Set(), totalWeight: 0 });
          }
          const item = driverBuckets.get(key);
          item.securities.add(sym);
          item.totalWeight += w;
        }
      }

      // 2. Customer Concentration
      if (Array.isArray(h.keyCustomers)) {
        for (const cust of h.keyCustomers) {
          const key = `CUSTOMER:${cust}`;
          if (!driverBuckets.has(key)) {
            driverBuckets.set(key, { driverType: CommonDriverType.CUSTOMER_CONCENTRATION, name: cust, securities: new Set(), totalWeight: 0 });
          }
          const item = driverBuckets.get(key);
          item.securities.add(sym);
          item.totalWeight += w;
        }
      }

      // 3. Commodity Dependency
      if (Array.isArray(h.commodityDependencies)) {
        for (const com of h.commodityDependencies) {
          const key = `COMMODITY:${com}`;
          if (!driverBuckets.has(key)) {
            driverBuckets.set(key, { driverType: CommonDriverType.COMMODITY_DEPENDENCY, name: com, securities: new Set(), totalWeight: 0 });
          }
          const item = driverBuckets.get(key);
          item.securities.add(sym);
          item.totalWeight += w;
        }
      }

      // 4. Themes
      if (Array.isArray(h.themes)) {
        for (const thm of h.themes) {
          const key = `THEME:${thm}`;
          if (!driverBuckets.has(key)) {
            driverBuckets.set(key, { driverType: CommonDriverType.THEMATIC_OVERLAP, name: thm, securities: new Set(), totalWeight: 0 });
          }
          const item = driverBuckets.get(key);
          item.securities.add(sym);
          item.totalWeight += w;
        }
      }
    }

    const commonDrivers = [];
    for (const [key, val] of driverBuckets.entries()) {
      if (val.securities.size >= 2) {
        commonDrivers.push({
          driverId: `drv_${key.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          driverType: val.driverType,
          name: val.name,
          affectedSecurities: Array.from(val.securities),
          portfolioWeight: Number(val.totalWeight.toFixed(4)),
          exposureMagnitude: Number((val.totalWeight / (holdings.length > 0 ? 1.0 : 1.0)).toFixed(4)),
          identifiedAt: new Date().toISOString()
        });
      }
    }

    return deepFreeze({
      commonDrivers,
      driverCount: commonDrivers.length
    });
  }

  /**
   * Compute Nominal HHI vs Hidden Common-Driver HHI Concentration
   * @param {Object} params
   * @param {string} params.concentrationId
   * @param {Array<{ symbol: string, weight: number, sector?: string, revenueGeography?: Record<string, number> }>} params.holdings
   * @param {Array<Object>} params.commonDrivers
   */
  static evaluateHiddenConcentration({
    concentrationId = `conc-${Date.now()}`,
    holdings = [],
    commonDrivers = []
  } = {}) {
    if (!Array.isArray(holdings) || holdings.length === 0) {
      throw new Error('holdings array is required');
    }

    // 1. Nominal Security HHI = sum(w_i^2)
    let securityHHI = 0;
    const sectorWeights = {};

    for (const h of holdings) {
      const w = Math.abs(h.weight || 0);
      securityHHI += w * w;

      const sec = h.sector || 'UNCLASSIFIED';
      sectorWeights[sec] = (sectorWeights[sec] || 0) + w;
    }

    // 2. Sector HHI
    let sectorHHI = 0;
    for (const sW of Object.values(sectorWeights)) {
      sectorHHI += sW * sW;
    }

    // 3. Common Driver HHI
    let commonDriverHHI = 0;
    for (const cd of commonDrivers) {
      const dW = cd.portfolioWeight || 0;
      commonDriverHHI += dW * dW;
    }

    const effectiveNumberOfBets = securityHHI > 0 ? 1 / securityHHI : holdings.length;

    // Detect hidden concentration flag:
    // 1. Common driver HHI significantly exceeds nominal security HHI (e.g. > 1.5x)
    // 2. Common driver HHI is high (> 0.25) when security HHI is low (< 0.20)
    // 3. 100% of portfolio shares a common driver while multiple holdings exist
    const isHiddenConcentrationDetected =
      (commonDriverHHI > (securityHHI * 1.5) && commonDriverHHI > 0.30) ||
      (commonDriverHHI > 0.25 && securityHHI < 0.20) ||
      (commonDriverHHI >= 0.90 && holdings.length >= 2);

    const result = {
      concentrationId,
      holdingsCount: holdings.length,
      securityHHI: Number(securityHHI.toFixed(6)),
      sectorHHI: Number(sectorHHI.toFixed(6)),
      commonDriverHHI: Number(commonDriverHHI.toFixed(6)),
      effectiveNumberOfBets: Number(effectiveNumberOfBets.toFixed(2)),
      isHiddenConcentrationDetected,
      evaluatedAt: new Date().toISOString()
    };

    result.hash = computeExposureHash(result);
    return deepFreeze(result);
  }
}
