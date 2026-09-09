import { deepFreeze, computePerformanceHash, SkillStatus, SkillConfidenceLevel } from './performance.types.js';
import { validatePerformanceSkillPackage } from './performance.schema.js';

/**
 * Phase 29 — Sealed Performance & Skill Intelligence Package with Explanation DAG
 */
export class PerformancePackageBuilder {
  /**
   * Build and Cryptographically Seal PerformanceSkillPackage
   * @param {Object} params
   * @param {string} params.packageId
   * @param {string} params.portfolioId
   * @param {string} params.managerId
   * @param {Object} params.evaluationPeriod
   * @param {string} params.informationCutoff
   * @param {Object} params.performanceEvaluation
   * @param {Object} params.riskAdjusted
   * @param {Object} params.factorExposure
   * @param {Object} params.timingSkill
   * @param {Object} params.selectionSkill
   * @param {Object} params.allocationSkill
   * @param {Object} params.processSkill
   * @param {Object} params.persistence
   * @param {Object} params.luck
   * @param {Object} params.capacity
   * @param {Object} params.scorecard
   */
  static sealPackage({
    packageId = `pkg-${Date.now()}`,
    portfolioId = 'port-1',
    managerId = 'mgr-1',
    evaluationPeriod = { startDate: '2024-01-01', endDate: '2025-12-31', type: 'LIVE_REALIZED' },
    informationCutoff = new Date().toISOString(),
    performanceEvaluation = {},
    riskAdjusted = {},
    factorExposure = {},
    timingSkill = {},
    selectionSkill = {},
    allocationSkill = {},
    processSkill = {},
    persistence = {},
    luck = {},
    capacity = {},
    scorecard = {}
  } = {}) {
    // Build deterministic Explanation DAG nodes & edges
    const nodes = [
      {
        id: 'node_raw_perf',
        type: 'PERFORMANCE_OBSERVATION',
        label: 'Raw Portfolio & Benchmark Performance',
        data: {
          portfolioReturn: performanceEvaluation.portfolioReturn,
          benchmarkReturn: performanceEvaluation.benchmarkReturn,
          activeReturn: (performanceEvaluation.portfolioReturn || 0) - (performanceEvaluation.benchmarkReturn || 0)
        }
      },
      {
        id: 'node_risk_adj',
        type: 'RISK_ADJUSTMENT',
        label: 'Risk-Adjusted Ratios & Drawdowns',
        data: {
          sharpeRatio: riskAdjusted.sharpeRatio,
          sortinoRatio: riskAdjusted.sortinoRatio,
          maxDrawdown: riskAdjusted.maxDrawdown,
          informationRatio: riskAdjusted.informationRatio
        }
      },
      {
        id: 'node_factor_exp',
        type: 'FACTOR_DECOMPOSITION',
        label: 'Multi-Factor Exposure & Beta Neutralization',
        data: {
          rSquared: factorExposure.rSquared,
          annualizedAlpha: factorExposure.annualizedAlpha,
          alphaTStat: factorExposure.alphaTStat,
          systematicFraction: factorExposure.systematicFraction,
          factorBetas: factorExposure.factorBetas
        }
      },
      {
        id: 'node_timing_skill',
        type: 'TIMING_ATTRIBUTION',
        label: 'Market & Asset Timing Skill (Treynor-Mazuy)',
        data: {
          timingCoefficient: timingSkill.timingCoefficient,
          timingTStat: timingSkill.timingTStat,
          skillStatus: timingSkill.skillStatus
        }
      },
      {
        id: 'node_selection_skill',
        type: 'SELECTION_ATTRIBUTION',
        label: 'Security Selection Breadth & Fundamental Law',
        data: {
          hitRate: selectionSkill.hitRate,
          impliedIC: selectionSkill.impliedIC,
          breadth: selectionSkill.breadth,
          activeShare: selectionSkill.activeShare
        }
      },
      {
        id: 'node_allocation_skill',
        type: 'ALLOCATION_ATTRIBUTION',
        label: 'Sector/Asset Allocation (Brinson-Fachler)',
        data: {
          allocationContribution: allocationSkill.allocationContribution,
          allocationHitRate: allocationSkill.allocationHitRate
        }
      },
      {
        id: 'node_process_skill',
        type: 'PROCESS_QUALITY',
        label: 'Process Discipline & Policy Mandate Adherence',
        data: {
          disciplineScore: processSkill.disciplineScore,
          disciplineLevel: processSkill.disciplineLevel,
          processDecoupledFromReturn: true
        }
      },
      {
        id: 'node_persistence',
        type: 'PERSISTENCE_EVALUATION',
        label: 'Rolling Alpha & Regime Stability',
        data: {
          classification: persistence.classification,
          positiveFraction: persistence.positiveFraction
        }
      },
      {
        id: 'node_luck_stat',
        type: 'LUCK_STATISTICAL_SIGNIFICANCE',
        label: 'Bootstrap Significance & Multiple Testing Control',
        data: {
          probPositiveAlpha: luck.probPositiveAlpha,
          sharpe95ConfidenceInterval: luck.sharpe95ConfidenceInterval,
          isStatisticallySignificant: luck.isStatisticallySignificant
        }
      },
      {
        id: 'node_scorecard_seal',
        type: 'MANAGER_SCORECARD_SEAL',
        label: 'Comprehensive Sealed Manager & Strategy Scorecard',
        data: {
          finalScore: scorecard.finalScore,
          confidenceLevel: scorecard.confidenceLevel
        }
      }
    ];

    const edges = [
      { from: 'node_raw_perf', to: 'node_risk_adj', label: 'risk_normalization' },
      { from: 'node_raw_perf', to: 'node_factor_exp', label: 'factor_regression' },
      { from: 'node_raw_perf', to: 'node_timing_skill', label: 'timing_model' },
      { from: 'node_raw_perf', to: 'node_selection_skill', label: 'selection_model' },
      { from: 'node_raw_perf', to: 'node_allocation_skill', label: 'allocation_model' },
      { from: 'node_factor_exp', to: 'node_persistence', label: 'alpha_series' },
      { from: 'node_factor_exp', to: 'node_luck_stat', label: 'significance_test' },
      { from: 'node_risk_adj', to: 'node_scorecard_seal', label: 'score_input' },
      { from: 'node_factor_exp', to: 'node_scorecard_seal', label: 'score_input' },
      { from: 'node_timing_skill', to: 'node_scorecard_seal', label: 'score_input' },
      { from: 'node_selection_skill', to: 'node_scorecard_seal', label: 'score_input' },
      { from: 'node_allocation_skill', to: 'node_scorecard_seal', label: 'score_input' },
      { from: 'node_process_skill', to: 'node_scorecard_seal', label: 'score_input' },
      { from: 'node_persistence', to: 'node_scorecard_seal', label: 'score_input' },
      { from: 'node_luck_stat', to: 'node_scorecard_seal', label: 'score_input' }
    ];

    const pkgPayload = {
      packageId,
      portfolioId,
      managerId,
      evaluationPeriod,
      informationCutoff,
      performanceEvaluation,
      riskAdjusted,
      factorExposure,
      timingSkill,
      selectionSkill,
      allocationSkill,
      processSkill,
      persistence,
      luck,
      capacity,
      scorecard,
      explanationDAG: {
        nodes,
        edges
      },
      sealedAt: new Date().toISOString()
    };

    validatePerformanceSkillPackage(pkgPayload);

    const sealHash = computePerformanceHash(pkgPayload);
    pkgPayload.seal = {
      algorithm: 'SHA-256',
      hash: sealHash,
      status: 'SEALED_AUTHORITATIVE'
    };

    return deepFreeze(pkgPayload);
  }

  /**
   * Verify Sealed Performance Package Integrity
   * @param {Object} pkg 
   */
  static verifyPackage(pkg) {
    if (!pkg || typeof pkg !== 'object' || !pkg.seal || !pkg.seal.hash) {
      return { isValid: false, reason: 'Missing seal or package payload' };
    }

    const { seal, ...payloadToVerify } = pkg;
    const computedHash = computePerformanceHash(payloadToVerify);

    const isValid = computedHash === seal.hash;
    return {
      isValid,
      expectedHash: seal.hash,
      computedHash,
      verifiedAt: new Date().toISOString()
    };
  }
}
