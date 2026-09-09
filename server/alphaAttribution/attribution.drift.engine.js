import { PerformanceTrend, SurvivorshipRisk, EvaluationPeriodType } from './attribution.types.js';

export class SignalDriftAndGovernanceEngine {
  /**
   * Evaluate Performance Decay and Drift over signal age windows.
   * ageBuckets: [ { minDays: 0, maxDays: 30, hitRate: 0.65, ic: 0.12 }, { minDays: 31, maxDays: 60, hitRate: 0.52, ic: 0.04 } ]
   */
  evaluatePerformanceDrift({
    signalId,
    ageBuckets = []
  }) {
    if (!ageBuckets || ageBuckets.length < 2) {
      return {
        signalId,
        trend: PerformanceTrend.PERFORMANCE_STABILITY,
        decayRatePerMonth: 0.0,
        isDecaying: false,
        ageBuckets
      };
    }

    const first = ageBuckets[0];
    const last = ageBuckets[ageBuckets.length - 1];

    const icDrop = (first.ic || 0) - (last.ic || 0);
    const hitRateDrop = (first.hitRate || 0) - (last.hitRate || 0);

    let trend = PerformanceTrend.PERFORMANCE_STABILITY;
    if (icDrop > 0.05 || hitRateDrop > 0.08) {
      trend = PerformanceTrend.PERFORMANCE_DECAY;
    } else if (icDrop < -0.05 && hitRateDrop < -0.05) {
      trend = PerformanceTrend.PERFORMANCE_IMPROVEMENT;
    }

    return {
      signalId,
      trend,
      icDrop: parseFloat(icDrop.toFixed(4)),
      hitRateDrop: parseFloat(hitRateDrop.toFixed(4)),
      isDecaying: trend === PerformanceTrend.PERFORMANCE_DECAY,
      ageBuckets
    };
  }

  /**
   * Evaluate Regime-Conditional Performance
   * regimePerformance: { 'EXPANSION': { hitRate: 0.70, ic: 0.15 }, 'CONTRACTION': { hitRate: 0.45, ic: -0.02 } }
   */
  evaluateRegimePerformance({
    signalId,
    regimePerformance = {}
  }) {
    const regimes = Object.keys(regimePerformance);
    if (regimes.length < 2) {
      return {
        signalId,
        isRegimeDependent: false,
        dominantRegime: regimes[0] || 'ALL',
        regimePerformance
      };
    }

    let minHitRate = 1.0;
    let maxHitRate = 0.0;
    let dominantRegime = regimes[0];

    for (const r of regimes) {
      const hr = regimePerformance[r].hitRate || 0;
      if (hr > maxHitRate) {
        maxHitRate = hr;
        dominantRegime = r;
      }
      if (hr < minHitRate) {
        minHitRate = hr;
      }
    }

    // High spread between best and worst regime indicates regime dependence
    const isRegimeDependent = (maxHitRate - minHitRate) >= 0.20;

    return {
      signalId,
      isRegimeDependent,
      dominantRegime,
      spread: parseFloat((maxHitRate - minHitRate).toFixed(4)),
      regimePerformance
    };
  }

  /**
   * Assess Survivorship Bias Risk
   */
  assessSurvivorshipBias({
    universeCount = 100,
    delistedEntitiesIncluded = 0,
    historicalPointInTimeConstituents = true
  }) {
    let risk = SurvivorshipRisk.LOW;
    const delistedRatio = delistedEntitiesIncluded / (universeCount || 1);

    if (!historicalPointInTimeConstituents) {
      risk = SurvivorshipRisk.UNCONTROLLED;
    } else if (delistedEntitiesIncluded === 0 && universeCount > 50) {
      risk = SurvivorshipRisk.HIGH;
    } else if (delistedRatio < 0.02) {
      risk = SurvivorshipRisk.MODERATE;
    }

    return {
      universeCount,
      delistedEntitiesIncluded,
      delistedRatio: parseFloat(delistedRatio.toFixed(4)),
      historicalPointInTimeConstituents,
      survivorshipRisk: risk,
      isSurvivorshipSafe: risk === SurvivorshipRisk.LOW || risk === SurvivorshipRisk.MODERATE
    };
  }

  /**
   * Calculate Multiple Testing & Data Mining Risk (Family-Wise Error Rate)
   */
  calculateMultipleTestingRisk({
    signalsTestedCount = 1,
    nominalAlpha = 0.05,
    parameterSearchCount = 1
  }) {
    const totalHypotheses = signalsTestedCount * parameterSearchCount;
    // FWER = 1 - (1 - nominalAlpha)^totalHypotheses
    const familyWiseErrorRate = totalHypotheses > 0
      ? 1 - Math.pow(1 - nominalAlpha, totalHypotheses)
      : nominalAlpha;

    // Bonferroni adjusted critical alpha
    const bonferroniAlpha = parseFloat((nominalAlpha / (totalHypotheses || 1)).toFixed(6));

    let dataMiningRisk = 'LOW';
    if (totalHypotheses >= 50) dataMiningRisk = 'HIGH';
    else if (totalHypotheses >= 10) dataMiningRisk = 'MODERATE';

    return {
      signalsTestedCount,
      parameterSearchCount,
      totalHypotheses,
      nominalAlpha,
      bonferroniAlpha,
      familyWiseErrorRate: parseFloat(familyWiseErrorRate.toFixed(4)),
      dataMiningRisk
    };
  }
}

export const defaultDriftGovernanceEngine = new SignalDriftAndGovernanceEngine();
