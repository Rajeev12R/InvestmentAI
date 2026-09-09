import {
  deepFreeze,
  computePerformanceHash,
  SkillConfidenceLevel,
  SkillStatus,
  ProcessDisciplineLevel,
  PersistenceClassification,
  CapacityRiskLevel
} from './performance.types.js';

export const DEFAULT_SCORECARD_WEIGHTS = Object.freeze({
  riskAdjusted: 0.15,
  factorAdjustedAlpha: 0.20,
  timing: 0.10,
  selection: 0.15,
  allocation: 0.10,
  processDiscipline: 0.15,
  persistence: 0.15
});

/**
 * Phase 29 — Multi-Dimensional Manager & Strategy Skill Scorecard Engine
 */
export class PerformanceScorecardEngine {
  /**
   * Build Manager Skill Evaluation Scorecard
   * @param {Object} params
   * @param {string} params.evaluationId
   * @param {string} params.managerId
   * @param {Object} params.riskMetrics
   * @param {Object} params.factorMetrics
   * @param {Object} params.timingSkill
   * @param {Object} params.selectionSkill
   * @param {Object} params.allocationSkill
   * @param {Object} params.processSkill
   * @param {Object} params.persistenceMetrics
   * @param {Object} params.luckMetrics
   * @param {Object} params.capacityAssessment
   * @param {Object} params.weights
   */
  static evaluateManagerScorecard({
    evaluationId = `mgr-eval-${Date.now()}`,
    managerId,
    riskMetrics = {},
    factorMetrics = {},
    timingSkill = {},
    selectionSkill = {},
    allocationSkill = {},
    processSkill = {},
    persistenceMetrics = {},
    luckMetrics = {},
    capacityAssessment = {},
    weights = DEFAULT_SCORECARD_WEIGHTS
  } = {}) {
    if (!managerId) throw new Error('managerId is required');

    // 1. Risk-adjusted subscore (0 to 100)
    // Sharpe > 1.5 => 100, Sharpe < 0 => 0
    const sharpe = riskMetrics.sharpeRatio || 0;
    const infoRatio = riskMetrics.informationRatio || 0;
    const riskScore = Math.max(0, Math.min(100, (sharpe * 40) + (infoRatio * 30) + (riskMetrics.battingAverage ? riskMetrics.battingAverage * 30 : 15)));

    // 2. Factor-adjusted Alpha subscore (0 to 100)
    const alphaTStat = factorMetrics.alphaTStat || 0;
    const idioFraction = factorMetrics.idiosyncraticFraction !== undefined ? factorMetrics.idiosyncraticFraction : 0.5;
    const factorScore = Math.max(0, Math.min(100, (Math.min(3, Math.max(0, alphaTStat)) / 3) * 60 + (idioFraction * 40)));

    // 3. Timing Subscore (0 to 100)
    const timingT = timingSkill.timingTStat || 0;
    const timingScore = timingSkill.timingCoefficient > 0 ? Math.max(0, Math.min(100, 50 + (timingT * 25))) : 30;

    // 4. Selection Subscore (0 to 100)
    const hitRate = selectionSkill.hitRate || 0.5;
    const selScore = Math.max(0, Math.min(100, (hitRate - 0.40) * 333)); // 0.40 -> 0, 0.70 -> 100

    // 5. Allocation Subscore (0 to 100)
    const allocContrib = allocationSkill.allocationContribution || 0;
    const allocScore = allocContrib > 0 ? Math.min(100, 50 + (allocContrib * 1000)) : 30;

    // 6. Process Discipline Subscore (0 to 100)
    const disciplineScore = (processSkill.disciplineScore !== undefined ? processSkill.disciplineScore : 0.8) * 100;

    // 7. Persistence Subscore (0 to 100)
    let persScore = 50;
    if (persistenceMetrics.classification === PersistenceClassification.PERSISTENT) persScore = 95;
    else if (persistenceMetrics.classification === PersistenceClassification.IMPROVING) persScore = 80;
    else if (persistenceMetrics.classification === PersistenceClassification.REGIME_DEPENDENT) persScore = 60;
    else if (persistenceMetrics.classification === PersistenceClassification.INCONSISTENT) persScore = 35;
    else if (persistenceMetrics.classification === PersistenceClassification.DECAYING) persScore = 20;

    // Normalize weights
    const w = {
      risk: weights.riskAdjusted || DEFAULT_SCORECARD_WEIGHTS.riskAdjusted,
      factor: weights.factorAdjustedAlpha || DEFAULT_SCORECARD_WEIGHTS.factorAdjustedAlpha,
      timing: weights.timing || DEFAULT_SCORECARD_WEIGHTS.timing,
      selection: weights.selection || DEFAULT_SCORECARD_WEIGHTS.selection,
      allocation: weights.allocation || DEFAULT_SCORECARD_WEIGHTS.allocation,
      process: weights.processDiscipline || DEFAULT_SCORECARD_WEIGHTS.processDiscipline,
      persistence: weights.persistence || DEFAULT_SCORECARD_WEIGHTS.persistence
    };
    const totalW = Object.values(w).reduce((a, b) => a + b, 0);

    let rawCompositeScore = (
      (riskScore * w.risk) +
      (factorScore * w.factor) +
      (timingScore * w.timing) +
      (selScore * w.selection) +
      (allocScore * w.allocation) +
      (disciplineScore * w.process) +
      (persScore * w.persistence)
    ) / (totalW > 0 ? totalW : 1);

    // Apply Capacity Penalty if constrained
    let capacityPenalty = 0;
    if (capacityAssessment.capacityRiskLevel === CapacityRiskLevel.CRITICAL_DRAG) {
      capacityPenalty = 20;
    } else if (capacityAssessment.capacityRiskLevel === CapacityRiskLevel.CAPACITY_CONSTRAINED) {
      capacityPenalty = 10;
    }
    const finalScore = Number(Math.max(0, Math.min(100, rawCompositeScore - capacityPenalty)).toFixed(2));

    // Determine Overall Confidence & Skill Classification
    let confidenceLevel = SkillConfidenceLevel.INSUFFICIENT_EVIDENCE;
    
    // Invariant: If systematic fraction >= 70% or factor R-squared >= 0.70 => PERFORMANCE_LIKELY_SYSTEMATIC
    if ((factorMetrics.systematicFraction !== undefined && factorMetrics.systematicFraction >= 0.70) ||
        (factorMetrics.rSquared !== undefined && factorMetrics.rSquared >= 0.70)) {
      confidenceLevel = SkillConfidenceLevel.PERFORMANCE_LIKELY_SYSTEMATIC;
    } else if (finalScore >= 75 && (luckMetrics.isStatisticallySignificant || (factorMetrics.alphaTStat && factorMetrics.alphaTStat >= 1.96))) {
      confidenceLevel = SkillConfidenceLevel.SUPPORTED_SKILL_INDICATOR;
    } else if (finalScore >= 50) {
      confidenceLevel = SkillConfidenceLevel.WEAK_SKILL_EVIDENCE;
    } else {
      confidenceLevel = SkillConfidenceLevel.PERFORMANCE_HIGHLY_UNCERTAIN;
    }

    const result = {
      evaluationId,
      managerId,
      finalScore,
      dimensionScores: {
        riskAdjustedScore: Number(riskScore.toFixed(2)),
        factorAdjustedScore: Number(factorScore.toFixed(2)),
        timingScore: Number(timingScore.toFixed(2)),
        selectionScore: Number(selScore.toFixed(2)),
        allocationScore: Number(allocScore.toFixed(2)),
        processDisciplineScore: Number(disciplineScore.toFixed(2)),
        persistenceScore: Number(persScore.toFixed(2))
      },
      capacityPenalty,
      confidenceLevel,
      weightsUsed: w,
      evaluatedAt: new Date().toISOString()
    };

    result.hash = computePerformanceHash(result);
    return deepFreeze(result);
  }
}
