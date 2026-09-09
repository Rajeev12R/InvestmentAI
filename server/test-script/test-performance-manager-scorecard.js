import assert from 'assert';
import { PerformanceScorecardEngine, DEFAULT_SCORECARD_WEIGHTS } from '../performanceSkill/performance.scorecard.engine.js';
import { SkillConfidenceLevel, PersistenceClassification, CapacityRiskLevel } from '../performanceSkill/performance.types.js';

let passed = 0;
function it(desc, fn) {
  try {
    fn();
    passed++;
  } catch (err) {
    console.error(`FAILED: ${desc}`);
    throw err;
  }
}

console.log('=== Suite 11: Manager & Strategy Skill Scorecard ===');

it('High-skill manager scorecard with top ratings across dimensions', () => {
  const scorecard = PerformanceScorecardEngine.evaluateManagerScorecard({
    managerId: 'mgr_top',
    riskMetrics: { sharpeRatio: 1.8, informationRatio: 1.1, battingAverage: 0.65 },
    factorMetrics: { alphaTStat: 2.5, idiosyncraticFraction: 0.65, systematicFraction: 0.35, rSquared: 0.35 },
    timingSkill: { timingCoefficient: 0.05, timingTStat: 2.1 },
    selectionSkill: { hitRate: 0.64 },
    allocationSkill: { allocationContribution: 0.012 },
    processSkill: { disciplineScore: 0.95 },
    persistenceMetrics: { classification: PersistenceClassification.PERSISTENT },
    luckMetrics: { isStatisticallySignificant: true },
    capacityAssessment: { capacityRiskLevel: CapacityRiskLevel.LOW_CAPACITY_RISK }
  });

  assert(scorecard.finalScore >= 75);
  assert.strictEqual(scorecard.confidenceLevel, SkillConfidenceLevel.SUPPORTED_SKILL_INDICATOR);
  assert.strictEqual(scorecard.capacityPenalty, 0);
});

it('Systematic beta-driven strategy flagged PERFORMANCE_LIKELY_SYSTEMATIC regardless of nominal return', () => {
  const scorecard = PerformanceScorecardEngine.evaluateManagerScorecard({
    managerId: 'mgr_beta_rider',
    riskMetrics: { sharpeRatio: 1.5, informationRatio: 0.2, battingAverage: 0.52 },
    // 85% systematic factor explained => High R2
    factorMetrics: { alphaTStat: 0.8, idiosyncraticFraction: 0.15, systematicFraction: 0.85, rSquared: 0.85 },
    timingSkill: { timingCoefficient: -0.01, timingTStat: -0.5 },
    selectionSkill: { hitRate: 0.50 },
    allocationSkill: { allocationContribution: 0.001 },
    processSkill: { disciplineScore: 0.80 },
    persistenceMetrics: { classification: PersistenceClassification.INCONSISTENT },
    luckMetrics: { isStatisticallySignificant: false },
    capacityAssessment: { capacityRiskLevel: CapacityRiskLevel.LOW_CAPACITY_RISK }
  });

  assert.strictEqual(scorecard.confidenceLevel, SkillConfidenceLevel.PERFORMANCE_LIKELY_SYSTEMATIC);
});

it('Capacity penalty applied to constrained fund', () => {
  const scorecard = PerformanceScorecardEngine.evaluateManagerScorecard({
    managerId: 'mgr_capacity_strained',
    riskMetrics: { sharpeRatio: 1.4, informationRatio: 0.8, battingAverage: 0.60 },
    factorMetrics: { alphaTStat: 2.0, idiosyncraticFraction: 0.60, systematicFraction: 0.40, rSquared: 0.40 },
    timingSkill: { timingCoefficient: 0.02, timingTStat: 1.5 },
    selectionSkill: { hitRate: 0.58 },
    allocationSkill: { allocationContribution: 0.005 },
    processSkill: { disciplineScore: 0.90 },
    persistenceMetrics: { classification: PersistenceClassification.PERSISTENT },
    luckMetrics: { isStatisticallySignificant: true },
    capacityAssessment: { capacityRiskLevel: CapacityRiskLevel.CRITICAL_DRAG }
  });

  assert.strictEqual(scorecard.capacityPenalty, 20);
});

console.log(`PASSED: ${passed} assertions passed.\n`);
