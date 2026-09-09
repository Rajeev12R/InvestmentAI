import {
  deepFreeze,
  computePerformanceHash,
  TimingDimension,
  ProcessDisciplineLevel,
  SkillStatus,
  SkillConfidenceLevel
} from './performance.types.js';

/**
 * Helper for 3-parameter OLS (intercept, linear, quadratic/option)
 */
function run3ParamRegression(Y, X1, X2) {
  const n = Y.length;
  // Matrix X: [1, X1, X2]
  let s_x1 = 0, s_x2 = 0, s_y = 0;
  let s_x1sq = 0, s_x2sq = 0, s_x1x2 = 0;
  let s_x1y = 0, s_x2y = 0;

  for (let i = 0; i < n; i++) {
    const y = Y[i];
    const x1 = X1[i];
    const x2 = X2[i];
    s_y += y;
    s_x1 += x1;
    s_x2 += x2;
    s_x1sq += x1 * x1;
    s_x2sq += x2 * x2;
    s_x1x2 += x1 * x2;
    s_x1y += x1 * y;
    s_x2y += x2 * y;
  }

  // Build normal equations and solve via Cramer's rule / direct inversion
  const A = [
    [n, s_x1, s_x2],
    [s_x1, s_x1sq, s_x1x2],
    [s_x2, s_x1x2, s_x2sq]
  ];
  const B = [s_y, s_x1y, s_x2y];

  const det3 = (m) =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);

  const detA = det3(A);
  if (Math.abs(detA) < 1e-12) {
    return { alpha: 0, beta: 1, gamma: 0, tGamma: 0, rSquared: 0 };
  }

  const replaceCol = (m, colIdx, col) => {
    const res = m.map(row => [...row]);
    for (let i = 0; i < 3; i++) res[i][colIdx] = col[i];
    return res;
  };

  const alpha = det3(replaceCol(A, 0, B)) / detA;
  const beta = det3(replaceCol(A, 1, B)) / detA;
  const gamma = det3(replaceCol(A, 2, B)) / detA;

  let sse = 0;
  let sst = 0;
  const meanY = s_y / n;
  for (let i = 0; i < n; i++) {
    const yHat = alpha + beta * X1[i] + gamma * X2[i];
    const e = Y[i] - yHat;
    sse += e * e;
    sst += Math.pow(Y[i] - meanY, 2);
  }

  const rSquared = sst > 0 ? Math.max(0, 1 - (sse / sst)) : 0;
  const df = n - 3;
  const sigmaSq = df > 0 ? sse / df : 0;

  // Variance of gamma is sigmaSq * (A^-1)[2][2]
  // Minor (2,2) of A
  const minor22 = A[0][0] * A[1][1] - A[0][1] * A[1][0];
  const varGamma = (minor22 / detA) * sigmaSq;
  const seGamma = varGamma > 0 ? Math.sqrt(varGamma) : 1e-6;
  const tGamma = gamma / seGamma;

  return { alpha, beta, gamma, tGamma, rSquared, seGamma };
}

/**
 * Phase 29 — Deterministic Skill Engine (Timing, Selection, Allocation, Process Quality)
 */
export class PerformanceSkillEngine {
  /**
   * 1. Timing Skill: Treynor-Mazuy & Henriksson-Merton Models
   */
  static evaluateTimingSkill({
    timingSkillId = `timing-${Date.now()}`,
    timingDimension = TimingDimension.MARKET_TIMING,
    portfolioExcessReturns = [],
    marketExcessReturns = [],
    model = 'TREYNOR_MAZUY', // 'TREYNOR_MAZUY' | 'HENRIKSSON_MERTON'
    periodsPerYear = 252
  } = {}) {
    if (!Array.isArray(portfolioExcessReturns) || portfolioExcessReturns.length < 10) {
      throw new Error('portfolioExcessReturns must contain at least 10 observations');
    }
    if (!Array.isArray(marketExcessReturns) || marketExcessReturns.length !== portfolioExcessReturns.length) {
      throw new Error('marketExcessReturns must match length of portfolioExcessReturns');
    }

    const n = portfolioExcessReturns.length;
    let X2 = [];
    if (model === 'TREYNOR_MAZUY') {
      // Treynor-Mazuy: X2 = (r_m - r_f)^2
      X2 = marketExcessReturns.map(rm => rm * rm);
    } else {
      // Henriksson-Merton: X2 = max(0, -(r_m - r_f))
      X2 = marketExcessReturns.map(rm => Math.max(0, -rm));
    }

    const reg = run3ParamRegression(portfolioExcessReturns, marketExcessReturns, X2);

    const timingCoefficient = Number(reg.gamma.toFixed(6));
    const timingTStat = Number(reg.tGamma.toFixed(4));
    const marketBeta = Number(reg.beta.toFixed(4));
    const annualizedAlpha = Number((reg.alpha * periodsPerYear).toFixed(6));

    let skillStatus = SkillStatus.INSUFFICIENT_EVIDENCE;
    let confidenceLevel = SkillConfidenceLevel.INSUFFICIENT_EVIDENCE;

    if (timingCoefficient > 0 && timingTStat >= 1.96) {
      skillStatus = SkillStatus.SUPPORTED;
      confidenceLevel = SkillConfidenceLevel.SUPPORTED_SKILL_INDICATOR;
    } else if (timingCoefficient > 0 && timingTStat >= 1.28) {
      skillStatus = SkillStatus.SKILL_INDICATOR;
      confidenceLevel = SkillConfidenceLevel.WEAK_SKILL_EVIDENCE;
    } else {
      skillStatus = SkillStatus.INSUFFICIENT_EVIDENCE;
      confidenceLevel = SkillConfidenceLevel.PERFORMANCE_LIKELY_SYSTEMATIC;
    }

    const result = {
      timingSkillId,
      timingDimension,
      model,
      sampleSize: n,
      marketBeta,
      annualizedAlpha,
      timingCoefficient,
      timingTStat,
      rSquared: Number(reg.rSquared.toFixed(4)),
      skillStatus,
      confidenceLevel,
      timingContribution: Number((timingCoefficient * (marketExcessReturns.reduce((a, b) => a + b*b, 0)/n) * periodsPerYear).toFixed(6)),
      evaluatedAt: new Date().toISOString()
    };

    result.hash = computePerformanceHash(result);
    return deepFreeze(result);
  }

  /**
   * 2. Selection Skill: Cross-Sectional Breadth, Hit Rate, Win/Loss, Active Share, Fundamental Law
   */
  static evaluateSelectionSkill({
    selectionSkillId = `selection-${Date.now()}`,
    securityEvaluations = [], // Array<{ symbol, activeWeight, activeReturn, benchmarkReturn, realizedReturn }>
    activeShare = 0.75,
    periodsPerYear = 252
  } = {}) {
    if (!Array.isArray(securityEvaluations) || securityEvaluations.length === 0) {
      throw new Error('securityEvaluations array is required');
    }

    const breadth = securityEvaluations.length;
    let wins = 0;
    let totalWinReturn = 0;
    let totalLossReturn = 0;
    let losses = 0;
    let totalSelectionContribution = 0;
    let hhiWeightSquares = 0;

    for (const sec of securityEvaluations) {
      const activeWeight = sec.activeWeight || 0;
      const activeReturn = sec.activeReturn !== undefined ? sec.activeReturn : (sec.realizedReturn - (sec.benchmarkReturn || 0));
      const contrib = activeWeight * activeReturn;
      totalSelectionContribution += contrib;

      hhiWeightSquares += Math.pow(Math.abs(activeWeight), 2);

      if (activeReturn > 0) {
        wins++;
        totalWinReturn += activeReturn;
      } else if (activeReturn < 0) {
        losses++;
        totalLossReturn += Math.abs(activeReturn);
      }
    }

    const hitRate = breadth > 0 ? wins / breadth : 0;
    const avgWin = wins > 0 ? totalWinReturn / wins : 0;
    const avgLoss = losses > 0 ? totalLossReturn / losses : 0;
    const winLossRatio = avgLoss > 0 ? avgWin / avgLoss : (avgWin > 0 ? 999 : 0);

    // Fundamental Law: Expected IR = IC * sqrt(Breadth)
    // Estimate realized IC from hit rate (Grinold approximation: IC ~ 2 * HitRate - 1)
    const impliedIC = Math.max(-1, Math.min(1, 2 * hitRate - 1));
    const theoreticalIR = impliedIC * Math.sqrt(breadth);
    const concentrationHHI = Number(hhiWeightSquares.toFixed(6));

    let skillStatus = SkillStatus.INSUFFICIENT_EVIDENCE;
    let confidenceLevel = SkillConfidenceLevel.INSUFFICIENT_EVIDENCE;

    if (hitRate >= 0.55 && breadth >= 20 && impliedIC > 0.05) {
      skillStatus = SkillStatus.SUPPORTED;
      confidenceLevel = SkillConfidenceLevel.SUPPORTED_SKILL_INDICATOR;
    } else if (hitRate >= 0.51 && breadth >= 10) {
      skillStatus = SkillStatus.SKILL_INDICATOR;
      confidenceLevel = SkillConfidenceLevel.WEAK_SKILL_EVIDENCE;
    } else {
      skillStatus = SkillStatus.INSUFFICIENT_EVIDENCE;
      confidenceLevel = SkillConfidenceLevel.PERFORMANCE_HIGHLY_UNCERTAIN;
    }

    const result = {
      selectionSkillId,
      breadth,
      hitRate: Number(hitRate.toFixed(4)),
      winLossRatio: Number(winLossRatio.toFixed(4)),
      impliedIC: Number(impliedIC.toFixed(4)),
      theoreticalIR: Number(theoreticalIR.toFixed(4)),
      concentrationHHI,
      activeShare: Number(activeShare.toFixed(4)),
      selectionContribution: Number(totalSelectionContribution.toFixed(6)),
      skillStatus,
      confidenceLevel,
      evaluatedAt: new Date().toISOString()
    };

    result.hash = computePerformanceHash(result);
    return deepFreeze(result);
  }

  /**
   * 3. Allocation Skill: Sector/Asset Class Allocation Brinson Decomposition
   */
  static evaluateAllocationSkill({
    allocationSkillId = `alloc-${Date.now()}`,
    sectorAllocations = [] // Array<{ sector, portfolioWeight, benchmarkWeight, portfolioSectorReturn, benchmarkSectorReturn }>
  } = {}) {
    if (!Array.isArray(sectorAllocations) || sectorAllocations.length === 0) {
      throw new Error('sectorAllocations array is required');
    }

    let totalAllocationContribution = 0;
    let totalSelectionContribution = 0;
    let totalInteractionContribution = 0;
    let correctOverweights = 0;
    let totalOverweights = 0;

    // Benchmark total return
    const benchmarkTotalReturn = sectorAllocations.reduce((sum, s) => sum + (s.benchmarkWeight * s.benchmarkSectorReturn), 0);

    for (const sec of sectorAllocations) {
      const w_p = sec.portfolioWeight || 0;
      const w_b = sec.benchmarkWeight || 0;
      const r_p = sec.portfolioSectorReturn || 0;
      const r_b = sec.benchmarkSectorReturn || 0;

      // Brinson-Fachler allocation: (w_p - w_b) * (r_b - R_B)
      const allocContrib = (w_p - w_b) * (r_b - benchmarkTotalReturn);
      // Pure selection: w_b * (r_p - r_b)
      const selContrib = w_b * (r_p - r_b);
      // Interaction: (w_p - w_b) * (r_p - r_b)
      const interContrib = (w_p - w_b) * (r_p - r_b);

      totalAllocationContribution += allocContrib;
      totalSelectionContribution += selContrib;
      totalInteractionContribution += interContrib;

      if (w_p > w_b) {
        totalOverweights++;
        if (r_b > benchmarkTotalReturn) {
          correctOverweights++;
        }
      }
    }

    const allocationHitRate = totalOverweights > 0 ? correctOverweights / totalOverweights : 0.5;

    let skillStatus = SkillStatus.INSUFFICIENT_EVIDENCE;
    let confidenceLevel = SkillConfidenceLevel.INSUFFICIENT_EVIDENCE;

    if (totalAllocationContribution > 0 && allocationHitRate >= 0.55) {
      skillStatus = SkillStatus.SUPPORTED;
      confidenceLevel = SkillConfidenceLevel.SUPPORTED_SKILL_INDICATOR;
    } else if (totalAllocationContribution > 0) {
      skillStatus = SkillStatus.SKILL_INDICATOR;
      confidenceLevel = SkillConfidenceLevel.WEAK_SKILL_EVIDENCE;
    } else {
      skillStatus = SkillStatus.INSUFFICIENT_EVIDENCE;
      confidenceLevel = SkillConfidenceLevel.PERFORMANCE_LIKELY_SYSTEMATIC;
    }

    const result = {
      allocationSkillId,
      sectorCount: sectorAllocations.length,
      allocationContribution: Number(totalAllocationContribution.toFixed(6)),
      selectionContribution: Number(totalSelectionContribution.toFixed(6)),
      interactionContribution: Number(totalInteractionContribution.toFixed(6)),
      allocationHitRate: Number(allocationHitRate.toFixed(4)),
      skillStatus,
      confidenceLevel,
      evaluatedAt: new Date().toISOString()
    };

    result.hash = computePerformanceHash(result);
    return deepFreeze(result);
  }

  /**
   * 4. Process Skill: Investment Process Discipline & Mandate Adherence (Phase 13 Integration)
   * INVARIANT: Process quality is strictly decoupled from realized outcome return.
   */
  static evaluateProcessSkill({
    processSkillId = `proc-${Date.now()}`,
    mandateAdherenceRate = 1.0, // 0.0 to 1.0
    riskLimitBreaches = 0,
    decisionConsistencyRate = 0.95, // % decisions adhering to registered investment policy
    lossCutoffCompliance = 1.0,
    evidenceCount = 20
  } = {}) {
    const disciplineScore = Number((
      (mandateAdherenceRate * 0.40) +
      (decisionConsistencyRate * 0.35) +
      (lossCutoffCompliance * 0.25) -
      (riskLimitBreaches * 0.10)
    ).toFixed(4));

    const boundedScore = Math.max(0, Math.min(1, disciplineScore));

    let disciplineLevel = ProcessDisciplineLevel.UNDISCIPLINED;
    if (boundedScore >= 0.85 && riskLimitBreaches === 0) {
      disciplineLevel = ProcessDisciplineLevel.DISCIPLINED;
    } else if (boundedScore >= 0.65) {
      disciplineLevel = ProcessDisciplineLevel.MODERATE_DISCIPLINE;
    }

    const result = {
      processSkillId,
      mandateAdherenceRate: Number(mandateAdherenceRate.toFixed(4)),
      riskLimitBreaches,
      decisionConsistencyRate: Number(decisionConsistencyRate.toFixed(4)),
      lossCutoffCompliance: Number(lossCutoffCompliance.toFixed(4)),
      disciplineScore: boundedScore,
      disciplineLevel,
      evidenceCount,
      processDecoupledFromReturn: true,
      evaluatedAt: new Date().toISOString()
    };

    result.hash = computePerformanceHash(result);
    return deepFreeze(result);
  }
}
