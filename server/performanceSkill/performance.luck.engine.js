import { deepFreeze, computePerformanceHash, SurvivorshipRisk, SkillConfidenceLevel } from './performance.types.js';

/**
 * Seeded PRNG (Mulberry32) for 100% deterministic bootstrap simulations
 */
class SeededRandom {
  constructor(seed = 123456789) {
    this.seed = seed;
  }

  next() {
    let t = (this.seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

/**
 * Phase 29 — Deterministic Luck, Statistical Significance & Multiple-Testing Engine
 */
export class PerformanceLuckEngine {
  /**
   * Run Deterministic Bootstrap Simulation for Alpha & Sharpe
   * @param {Object} params
   * @param {number[]} params.portfolioReturns
   * @param {number[]} params.benchmarkReturns
   * @param {number} params.riskFreeRate
   * @param {number} params.numBootstraps Default 1000
   * @param {number} params.seed Deterministic seed
   */
  static runBootstrapSignificance({
    portfolioReturns = [],
    benchmarkReturns = [],
    riskFreeRate = 0.0,
    periodsPerYear = 252,
    numBootstraps = 500,
    seed = 42
  } = {}) {
    if (!Array.isArray(portfolioReturns) || portfolioReturns.length < 5) {
      throw new Error('portfolioReturns must contain at least 5 observations');
    }

    const n = portfolioReturns.length;
    const prng = new SeededRandom(seed);
    const bootstrapSharpes = [];
    const bootstrapAlphas = [];

    const r_f_per = riskFreeRate / periodsPerYear;

    for (let b = 0; b < numBootstraps; b++) {
      const sampledP = [];
      const sampledB = [];

      for (let i = 0; i < n; i++) {
        const randIdx = Math.floor(prng.next() * n);
        sampledP.push(portfolioReturns[randIdx]);
        if (benchmarkReturns.length === n) {
          sampledB.push(benchmarkReturns[randIdx]);
        }
      }

      // Compute sample mean & vol
      const pMean = sampledP.reduce((acc, v) => acc + v, 0) / n;
      const bMean = sampledB.length > 0 ? sampledB.reduce((acc, v) => acc + v, 0) / n : 0;
      const pVariance = sampledP.reduce((sum, v) => sum + Math.pow(v - pMean, 2), 0) / (n - 1);
      const pVol = Math.sqrt(Math.max(0, pVariance)) * Math.sqrt(periodsPerYear);
      const annP = Math.pow(1 + pMean, periodsPerYear) - 1;

      const sr = pVol > 0 ? (annP - riskFreeRate) / pVol : 0;
      const alpha = (pMean - bMean) * periodsPerYear;

      bootstrapSharpes.push(sr);
      bootstrapAlphas.push(alpha);
    }

    // Sort to extract percentiles
    bootstrapSharpes.sort((a, b) => a - b);
    bootstrapAlphas.sort((a, b) => a - b);

    const getPercentile = (arr, pct) => {
      const idx = Math.min(arr.length - 1, Math.max(0, Math.floor(pct * (arr.length - 1))));
      return arr[idx];
    };

    const sharpeCI = [
      Number(getPercentile(bootstrapSharpes, 0.025).toFixed(4)),
      Number(getPercentile(bootstrapSharpes, 0.975).toFixed(4))
    ];

    const alphaCI = [
      Number(getPercentile(bootstrapAlphas, 0.025).toFixed(6)),
      Number(getPercentile(bootstrapAlphas, 0.975).toFixed(6))
    ];

    const probPositiveAlpha = Number((bootstrapAlphas.filter(a => a > 0).length / numBootstraps).toFixed(4));
    const probPositiveSharpe = Number((bootstrapSharpes.filter(s => s > 0).length / numBootstraps).toFixed(4));

    return {
      numBootstraps,
      sharpe95ConfidenceInterval: sharpeCI,
      alpha95ConfidenceInterval: alphaCI,
      probPositiveAlpha,
      probPositiveSharpe,
      isStatisticallySignificant: alphaCI[0] > 0
    };
  }

  /**
   * Multiple-Testing Adjustment (Harvey-Liu-Zhu / Bonferroni / FDR)
   * @param {Object} params
   * @param {number} params.observedTStat
   * @param {number} params.numberOfStrategiesTested M (e.g. 50 strategies tested)
   * @param {number} params.targetSignificance Nominal significance (e.g. 0.05)
   */
  static applyMultipleTestingAdjustment({
    observedTStat = 2.0,
    numberOfStrategiesTested = 20,
    targetSignificance = 0.05
  } = {}) {
    const M = Math.max(1, numberOfStrategiesTested);
    
    // Bonferroni corrected significance threshold
    const bonferroniAlpha = targetSignificance / M;
    
    // Approximate critical t-stat for Bonferroni alpha (two-tailed standard normal approximation)
    // For alpha=0.05: z=1.96. For alpha=0.05/20 = 0.0025: z approx 3.02
    // Simple robust rational approximation for inverse normal CDF
    const normalCrit = (p) => {
      // p in (0, 0.5)
      const t = Math.sqrt(-2 * Math.log(p));
      const c0 = 2.515517, c1 = 0.802853, c2 = 0.010328;
      const d1 = 1.432788, d2 = 0.189269, d3 = 0.001308;
      return t - ((c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t));
    };

    const twoTailedP = bonferroniAlpha / 2;
    const requiredTStat = Number(normalCrit(Math.min(0.49, Math.max(1e-7, twoTailedP))).toFixed(3));
    
    // Haircutted t-stat (Harvey-Liu haircut approximation)
    const haircutFactor = Math.sqrt(1 + (Math.log(M) / 2));
    const haircuttedTStat = Number((observedTStat / haircutFactor).toFixed(4));
    const passesAdjustedThreshold = Math.abs(observedTStat) >= requiredTStat;

    return {
      numberOfStrategiesTested: M,
      nominalTStat: Number(observedTStat.toFixed(4)),
      requiredTStatForSignificance: requiredTStat,
      haircuttedTStat,
      passesAdjustedThreshold,
      bonferroniAlpha: Number(bonferroniAlpha.toFixed(6))
    };
  }

  /**
   * Minimum Track Record Length (Bailey & Lopez de Prado)
   * @param {Object} params
   * @param {number} params.sharpeRatio Annualized Sharpe Ratio
   * @param {number} params.skewness Skewness of returns (default 0)
   * @param {number} params.kurtosis Kurtosis of returns (default 3 for normal)
   * @param {number} params.confidenceLevel Significance level (default 0.95 => z = 1.96)
   */
  static computeMinimumTrackRecordLength({
    sharpeRatio = 1.0,
    skewness = 0,
    kurtosis = 3,
    confidenceLevel = 0.95
  } = {}) {
    if (sharpeRatio <= 0) {
      return { minYearsRequired: 999, isSufficientTrackRecord: false };
    }

    const z = 1.96; // 95%
    const sr = sharpeRatio;
    // Formula: MinTRL = 1 + (1 - skewness * sr + ((kurtosis - 1) / 4) * sr^2) * (z / sr)^2
    const varianceAdjustment = 1 - (skewness * sr) + (((kurtosis - 1) / 4) * sr * sr);
    const minYears = Math.max(0.5, varianceAdjustment * Math.pow(z / sr, 2));

    return {
      annualizedSharpeRatio: Number(sr.toFixed(4)),
      skewness: Number(skewness.toFixed(4)),
      kurtosis: Number(kurtosis.toFixed(4)),
      minYearsRequired: Number(minYears.toFixed(2)),
      minMonthsRequired: Number((minYears * 12).toFixed(1))
    };
  }

  /**
   * Evaluate Survivorship Risk
   * @param {Object} params
   * @param {boolean} params.includesDefunctEntities
   * @param {boolean} params.pointInTimeConstituents
   * @param {number} params.backtestInceptionYears
   */
  static assessSurvivorshipRisk({
    includesDefunctEntities = true,
    pointInTimeConstituents = true,
    backtestInceptionYears = 5
  } = {}) {
    let survivorshipRisk = SurvivorshipRisk.LOW;

    if (!includesDefunctEntities && !pointInTimeConstituents) {
      survivorshipRisk = SurvivorshipRisk.UNCONTROLLED;
    } else if (!includesDefunctEntities || !pointInTimeConstituents) {
      survivorshipRisk = SurvivorshipRisk.HIGH;
    } else if (backtestInceptionYears > 15) {
      survivorshipRisk = SurvivorshipRisk.MODERATE;
    }

    return {
      includesDefunctEntities,
      pointInTimeConstituents,
      backtestInceptionYears,
      survivorshipRisk,
      assessedAt: new Date().toISOString()
    };
  }
}
