import {
  deepFreeze,
  computeExposureHash,
  BreachPrecedenceLevel,
  BreachStatus
} from './exposure.types.js';

/**
 * Phase 30 — Deterministic Compliance Limits & Phase 16 Precedence Engine
 */
export class ExposureComplianceLimitsEngine {
  /**
   * Evaluate Portfolio Exposures against Limits
   * @param {Object} params
   * @param {Object} params.portfolioExposure Aggregated exposure object
   * @param {Array<{ limitId: string, dimension: string, maxLimit: number, minLimit?: number, precedence: BreachPrecedenceLevel, description?: string }>} params.limits
   */
  static checkExposureLimits({
    portfolioExposure = {},
    limits = []
  } = {}) {
    const breaches = [];
    const evaluations = [];

    // Precedence sorting order: REGULATORY > FIRM > CLIENT_IPS > PM_SOFT
    const precedenceRank = {
      [BreachPrecedenceLevel.REGULATORY_MANDATE]: 1,
      [BreachPrecedenceLevel.FIRM_MANDATE]: 2,
      [BreachPrecedenceLevel.CLIENT_IPS_RULE]: 3,
      [BreachPrecedenceLevel.PM_SOFT_LIMIT]: 4
    };

    const sortedLimits = [...limits].sort((a, b) => {
      const rA = precedenceRank[a.precedence] || 99;
      const rB = precedenceRank[b.precedence] || 99;
      return rA - rB;
    });

    for (const lim of sortedLimits) {
      const dim = lim.dimension;
      let observedValue = 0;

      if (dim === 'GROSS_EXPOSURE') observedValue = portfolioExposure.grossExposure || 0;
      else if (dim === 'NET_EXPOSURE') observedValue = portfolioExposure.netExposure || 0;
      else if (dim === 'DURATION') observedValue = portfolioExposure.durationMetrics?.effectiveDuration || 0;
      else if (dim.startsWith('SECTOR:')) {
        const secName = dim.replace('SECTOR:', '');
        observedValue = portfolioExposure.sectorExposures?.[secName] || 0;
      } else if (dim.startsWith('CURRENCY:')) {
        const currName = dim.replace('CURRENCY:', '');
        observedValue = portfolioExposure.currencyExposures?.[currName] || 0;
      } else if (dim.startsWith('GEOGRAPHY:')) {
        const geoName = dim.replace('GEOGRAPHY:', '');
        observedValue = portfolioExposure.domicileGeographyExposures?.[geoName] || 0;
      }

      let status = BreachStatus.COMPLIANT;
      const isMaxBreached = lim.maxLimit !== undefined && observedValue > lim.maxLimit;
      const isMinBreached = lim.minLimit !== undefined && observedValue < lim.minLimit;
      const isNearMax = lim.maxLimit !== undefined && observedValue >= (lim.maxLimit * 0.90) && observedValue <= lim.maxLimit;

      if (isMaxBreached || isMinBreached) {
        status = BreachStatus.BREACHED;
        const breachObj = {
          breachId: `breach_${lim.limitId}_${Date.now()}`,
          limitId: lim.limitId,
          dimension: dim,
          precedence: lim.precedence,
          precedenceRank: precedenceRank[lim.precedence],
          observedValue: Number(observedValue.toFixed(4)),
          limitThreshold: isMaxBreached ? lim.maxLimit : lim.minLimit,
          violationDelta: Number((isMaxBreached ? (observedValue - lim.maxLimit) : (lim.minLimit - observedValue)).toFixed(4)),
          status: BreachStatus.BREACHED,
          description: lim.description || `Exposure limit breached for ${dim}`,
          timestamp: new Date().toISOString()
        };
        breaches.push(breachObj);
      } else if (isNearMax) {
        status = BreachStatus.WARNING;
      }

      evaluations.push({
        limitId: lim.limitId,
        dimension: dim,
        precedence: lim.precedence,
        observedValue: Number(observedValue.toFixed(4)),
        status
      });
    }

    const hasBreaches = breaches.length > 0;
    const highestBreachPrecedence = hasBreaches ? breaches[0].precedence : null;

    return deepFreeze({
      isCompliant: !hasBreaches,
      breachCount: breaches.length,
      highestBreachPrecedence,
      breaches,
      evaluations,
      evaluatedAt: new Date().toISOString()
    });
  }
}
