import { performanceStore } from './performance.store.js';
import { PerformanceMeasurementEngine } from './performance.measurement.engine.js';
import { PerformanceFactorEngine } from './performance.factor.engine.js';
import { PerformanceSkillEngine } from './performance.skill.engine.js';
import { PerformancePersistenceEngine } from './performance.persistence.engine.js';
import { PerformanceLuckEngine } from './performance.luck.engine.js';
import { PerformanceScorecardEngine } from './performance.scorecard.engine.js';
import { PerformancePackageBuilder } from './performance.package.js';

/**
 * Phase 29 — 12 Read-Only Institutional Copilot Inspection Tools
 */
export const performanceSkillTools = {
  // 1. Inspect Performance Measurement
  tool_inspect_performance_measurement: async ({ portfolioReturns, benchmarkReturns, riskFreeRate, periodsPerYear }) => {
    return PerformanceMeasurementEngine.measureRiskAdjustedMetrics({
      portfolioReturns,
      benchmarkReturns,
      riskFreeRate,
      periodsPerYear
    });
  },

  // 2. Inspect Benchmark Comparison
  tool_inspect_benchmark_comparison: async ({ benchmarkId, tenantId, asOf }) => {
    const bench = performanceStore.getBenchmark(benchmarkId, tenantId, asOf);
    return {
      benchmark: bench || null,
      found: !!bench,
      asOf: asOf || 'LATEST'
    };
  },

  // 3. Inspect Factor Exposures
  tool_inspect_factor_exposures: async ({ portfolioExcessReturns, factorReturns, periodsPerYear }) => {
    return PerformanceFactorEngine.estimateFactorExposure({
      portfolioExcessReturns,
      factorReturns,
      periodsPerYear
    });
  },

  // 4. Inspect Timing Skill
  tool_inspect_timing_skill: async ({ portfolioExcessReturns, marketExcessReturns, model, periodsPerYear }) => {
    return PerformanceSkillEngine.evaluateTimingSkill({
      portfolioExcessReturns,
      marketExcessReturns,
      model,
      periodsPerYear
    });
  },

  // 5. Inspect Selection Skill
  tool_inspect_selection_skill: async ({ securityEvaluations, activeShare }) => {
    return PerformanceSkillEngine.evaluateSelectionSkill({
      securityEvaluations,
      activeShare
    });
  },

  // 6. Inspect Allocation Skill
  tool_inspect_allocation_skill: async ({ sectorAllocations }) => {
    return PerformanceSkillEngine.evaluateAllocationSkill({
      sectorAllocations
    });
  },

  // 7. Inspect Process Quality
  tool_inspect_process_quality: async ({ mandateAdherenceRate, riskLimitBreaches, decisionConsistencyRate, lossCutoffCompliance }) => {
    return PerformanceSkillEngine.evaluateProcessSkill({
      mandateAdherenceRate,
      riskLimitBreaches,
      decisionConsistencyRate,
      lossCutoffCompliance
    });
  },

  // 8. Inspect Performance Persistence
  tool_inspect_performance_persistence: async ({ portfolioReturns, benchmarkReturns, windowSize, periodsPerYear }) => {
    return PerformancePersistenceEngine.evaluateRollingPersistence({
      portfolioReturns,
      benchmarkReturns,
      windowSize,
      periodsPerYear
    });
  },

  // 9. Inspect Luck & Significance
  tool_inspect_luck_and_significance: async ({ portfolioReturns, benchmarkReturns, riskFreeRate, numBootstraps, seed }) => {
    return PerformanceLuckEngine.runBootstrapSignificance({
      portfolioReturns,
      benchmarkReturns,
      riskFreeRate,
      numBootstraps,
      seed
    });
  },

  // 10. Inspect Capacity Constraints
  tool_inspect_capacity_constraints: async ({ currentAum, estimatedCapacityLimit, advParticipationRate, estimatedSlippageBps }) => {
    return PerformancePersistenceEngine.evaluateCapacityConstraints({
      currentAum,
      estimatedCapacityLimit,
      advParticipationRate,
      estimatedSlippageBps
    });
  },

  // 11. Inspect Manager Scorecard
  tool_inspect_manager_scorecard: async ({ managerId, riskMetrics, factorMetrics, timingSkill, selectionSkill, allocationSkill, processSkill, persistenceMetrics, luckMetrics, capacityAssessment, weights }) => {
    return PerformanceScorecardEngine.evaluateManagerScorecard({
      managerId,
      riskMetrics,
      factorMetrics,
      timingSkill,
      selectionSkill,
      allocationSkill,
      processSkill,
      persistenceMetrics,
      luckMetrics,
      capacityAssessment,
      weights
    });
  },

  // 12. Inspect Sealed Package
  tool_inspect_sealed_package: async ({ packageId, tenantId }) => {
    const pkg = performanceStore.getPackage(packageId, tenantId);
    if (!pkg) {
      return { found: false, packageId };
    }
    const verification = PerformancePackageBuilder.verifyPackage(pkg);
    return {
      found: true,
      package: pkg,
      verification
    };
  }
};
