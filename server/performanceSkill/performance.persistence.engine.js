import {
  deepFreeze,
  computePerformanceHash,
  PersistenceClassification,
  CapacityRiskLevel
} from './performance.types.js';

/**
 * Phase 29 — Deterministic Persistence & Regime-Conditional Performance Engine
 */
export class PerformancePersistenceEngine {
  /**
   * Evaluate rolling alpha persistence
   * @param {Object} params
   * @param {string} params.persistenceId
   * @param {number[]} params.portfolioReturns
   * @param {number[]} params.benchmarkReturns
   * @param {number} params.windowSize Number of periods per rolling window (e.g. 12)
   * @param {number} params.periodsPerYear Periods per year (default 12 for monthly, 252 for daily)
   */
  static evaluateRollingPersistence({
    persistenceId = `pers-${Date.now()}`,
    portfolioReturns = [],
    benchmarkReturns = [],
    windowSize = 12,
    periodsPerYear = 12
  } = {}) {
    if (!Array.isArray(portfolioReturns) || portfolioReturns.length < windowSize) {
      const result = {
        persistenceId,
        classification: PersistenceClassification.INSUFFICIENT_SAMPLE,
        rollingAlphas: [],
        positiveFraction: 0,
        rollingStdDev: 0,
        sampleSize: portfolioReturns ? portfolioReturns.length : 0,
        evaluatedAt: new Date().toISOString()
      };
      result.hash = computePerformanceHash(result);
      return deepFreeze(result);
    }

    const n = portfolioReturns.length;
    const rollingAlphas = [];

    for (let i = 0; i <= n - windowSize; i++) {
      const pSlice = portfolioReturns.slice(i, i + windowSize);
      const bSlice = benchmarkReturns.slice(i, i + windowSize);

      const pMean = pSlice.reduce((a, b) => a + b, 0) / windowSize;
      const bMean = bSlice.reduce((a, b) => a + b, 0) / windowSize;

      const alphaAnn = (pMean - bMean) * periodsPerYear;
      rollingAlphas.push(Number(alphaAnn.toFixed(6)));
    }

    const posCount = rollingAlphas.filter(a => a > 0).length;
    const positiveFraction = rollingAlphas.length > 0 ? posCount / rollingAlphas.length : 0;

    // Rolling Alpha Volatility
    const meanAlpha = rollingAlphas.reduce((a, b) => a + b, 0) / rollingAlphas.length;
    const alphaVar = rollingAlphas.reduce((sum, a) => sum + Math.pow(a - meanAlpha, 2), 0) / (rollingAlphas.length > 1 ? rollingAlphas.length - 1 : 1);
    const rollingStdDev = Math.sqrt(alphaVar);

    // Trend in rolling alpha (slope)
    let slope = 0;
    if (rollingAlphas.length >= 3) {
      const xMean = (rollingAlphas.length - 1) / 2;
      let num = 0, den = 0;
      for (let t = 0; t < rollingAlphas.length; t++) {
        num += (t - xMean) * (rollingAlphas[t] - meanAlpha);
        den += Math.pow(t - xMean, 2);
      }
      slope = den > 0 ? num / den : 0;
    }

    // Determine Classification
    let classification = PersistenceClassification.INCONSISTENT;
    if (rollingAlphas.length < 6) {
      classification = PersistenceClassification.INSUFFICIENT_SAMPLE;
    } else if (slope < -0.005 && rollingAlphas[rollingAlphas.length - 1] < meanAlpha) {
      classification = PersistenceClassification.DECAYING;
    } else if (slope > 0.005 && rollingAlphas[rollingAlphas.length - 1] > meanAlpha) {
      classification = PersistenceClassification.IMPROVING;
    } else if (positiveFraction >= 0.75 && meanAlpha > 0 && slope >= -0.005) {
      classification = PersistenceClassification.PERSISTENT;
    } else if (positiveFraction < 0.60) {
      classification = PersistenceClassification.INCONSISTENT;
    }

    const result = {
      persistenceId,
      classification,
      sampleSize: n,
      windowSize,
      rollingAlphas,
      meanRollingAlpha: Number(meanAlpha.toFixed(6)),
      positiveFraction: Number(positiveFraction.toFixed(4)),
      rollingStdDev: Number(rollingStdDev.toFixed(6)),
      alphaTrendSlope: Number(slope.toFixed(6)),
      evaluatedAt: new Date().toISOString()
    };

    result.hash = computePerformanceHash(result);
    return deepFreeze(result);
  }

  /**
   * Evaluate Performance across Market Regimes (Bull, Bear, High Vol, Low Vol, etc.)
   * @param {Object} params
   * @param {Array<{ date: string, regime: string, portfolioReturn: number, benchmarkReturn: number }>} params.regimeObservations
   */
  static evaluateRegimeConditionality({
    regimeObservations = []
  } = {}) {
    if (!Array.isArray(regimeObservations) || regimeObservations.length === 0) {
      return { regimePerformance: {}, isRegimeDependent: false };
    }

    const regimeMap = {};
    for (const obs of regimeObservations) {
      const reg = obs.regime || 'UNKNOWN';
      if (!regimeMap[reg]) {
        regimeMap[reg] = { pReturns: [], bReturns: [] };
      }
      regimeMap[reg].pReturns.push(obs.portfolioReturn);
      regimeMap[reg].bReturns.push(obs.benchmarkReturn);
    }

    const regimePerformance = {};
    let positiveRegimes = 0;
    let totalRegimes = 0;

    for (const [reg, data] of Object.entries(regimeMap)) {
      const count = data.pReturns.length;
      const pMean = data.pReturns.reduce((a, b) => a + b, 0) / count;
      const bMean = data.bReturns.reduce((a, b) => a + b, 0) / count;
      const excess = pMean - bMean;

      regimePerformance[reg] = {
        sampleSize: count,
        portfolioMeanReturn: Number(pMean.toFixed(6)),
        benchmarkMeanReturn: Number(bMean.toFixed(6)),
        excessReturn: Number(excess.toFixed(6)),
        outperforming: excess > 0
      };

      totalRegimes++;
      if (excess > 0) positiveRegimes++;
    }

    const isRegimeDependent = totalRegimes >= 2 && (positiveRegimes === 1 || (positiveRegimes / totalRegimes) <= 0.5);

    return {
      regimePerformance,
      totalRegimes,
      positiveRegimes,
      isRegimeDependent,
      evaluatedAt: new Date().toISOString()
    };
  }

  /**
   * Evaluate Strategy Capacity vs Decay Constraints
   * @param {Object} params
   * @param {string} params.capacityId
   * @param {number} params.currentAum Current AUM ($)
   * @param {number} params.estimatedCapacityLimit Max estimated strategy capacity ($)
   * @param {number} params.advParticipationRate Average Daily Volume participation rate (e.g. 0.05 = 5%)
   * @param {number} params.estimatedSlippageBps Estimated slippage drag in basis points
   */
  static evaluateCapacityConstraints({
    capacityId = `cap-${Date.now()}`,
    currentAum = 100000000,
    estimatedCapacityLimit = 500000000,
    advParticipationRate = 0.02,
    estimatedSlippageBps = 15
  } = {}) {
    const utilizationRate = estimatedCapacityLimit > 0 ? currentAum / estimatedCapacityLimit : 1.0;

    let capacityRiskLevel = CapacityRiskLevel.LOW_CAPACITY_RISK;
    let isCapacityConstrained = false;

    if (utilizationRate >= 1.0 || advParticipationRate > 0.10) {
      capacityRiskLevel = CapacityRiskLevel.CRITICAL_DRAG;
      isCapacityConstrained = true;
    } else if (utilizationRate >= 0.75 || advParticipationRate > 0.05) {
      capacityRiskLevel = CapacityRiskLevel.CAPACITY_CONSTRAINED;
      isCapacityConstrained = true;
    } else if (utilizationRate >= 0.50) {
      capacityRiskLevel = CapacityRiskLevel.MODERATE_UTILIZATION;
    }

    const result = {
      capacityId,
      currentAum,
      estimatedCapacityLimit,
      utilizationRate: Number(utilizationRate.toFixed(4)),
      advParticipationRate: Number(advParticipationRate.toFixed(4)),
      estimatedSlippageBps,
      capacityRiskLevel,
      isCapacityConstrained,
      assessedAt: new Date().toISOString()
    };

    result.hash = computePerformanceHash(result);
    return deepFreeze(result);
  }
}
