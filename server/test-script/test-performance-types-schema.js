import assert from 'assert';
import {
  SkillStatus,
  SkillConfidenceLevel,
  PersistenceClassification,
  FactorType,
  TimingDimension,
  ProcessDisciplineLevel,
  CapacityRiskLevel,
  SurvivorshipRisk,
  EvaluationPeriodType,
  computePerformanceHash,
  deepFreeze
} from '../performanceSkill/performance.types.js';
import {
  validatePerformanceEvaluation,
  validateBenchmarkDefinition,
  validateRiskAdjustedPerformance,
  validateFactorExposure,
  validateTimingSkill,
  validateSelectionSkill,
  validateAllocationSkill,
  validateProcessSkill,
  validatePerformancePersistence,
  validateCapacityAssessment,
  validateManagerEvaluation,
  validatePerformanceSkillPackage,
  PerformanceSkillValidationError
} from '../performanceSkill/performance.schema.js';

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

console.log('=== Suite 1: Performance & Skill Types, Taxonomy & Schemas ===');

it('Enums and Taxonomy integrity', () => {
  assert.strictEqual(SkillStatus.OBSERVED_PERFORMANCE, 'OBSERVED_PERFORMANCE');
  assert.strictEqual(SkillStatus.SUPPORTED, 'SUPPORTED');
  assert.strictEqual(SkillConfidenceLevel.SUPPORTED_SKILL_INDICATOR, 'SUPPORTED_SKILL_INDICATOR');
  assert.strictEqual(SkillConfidenceLevel.PERFORMANCE_LIKELY_SYSTEMATIC, 'PERFORMANCE_LIKELY_SYSTEMATIC');
  assert.strictEqual(PersistenceClassification.PERSISTENT, 'PERSISTENT');
  assert.strictEqual(FactorType.MARKET_BETA, 'MARKET_BETA');
  assert.strictEqual(TimingDimension.MARKET_TIMING, 'MARKET_TIMING');
  assert.strictEqual(ProcessDisciplineLevel.DISCIPLINED, 'DISCIPLINED');
  assert.strictEqual(CapacityRiskLevel.CRITICAL_DRAG, 'CRITICAL_DRAG');
  assert.strictEqual(SurvivorshipRisk.LOW, 'LOW');
  assert.strictEqual(EvaluationPeriodType.LIVE_REALIZED, 'LIVE_REALIZED');
});

it('Deterministic canonical hashing and deep freeze', () => {
  const obj = { b: 2, a: 1, c: { y: 20, x: 10 } };
  const h1 = computePerformanceHash(obj);
  const h2 = computePerformanceHash({ a: 1, c: { x: 10, y: 20 }, b: 2 });
  assert.strictEqual(h1, h2);

  const frozen = deepFreeze({ x: 1, nested: { y: 2 } });
  assert.throws(() => { frozen.x = 10; });
  assert.throws(() => { frozen.nested.y = 20; });
});

it('Validate PerformanceEvaluation schema', () => {
  const valid = {
    evaluationId: 'eval_1',
    portfolioId: 'port_1',
    benchmark: 'SP500',
    portfolioReturn: 0.15,
    benchmarkReturn: 0.10
  };
  assert.strictEqual(validatePerformanceEvaluation(valid), true);
  assert.throws(() => validatePerformanceEvaluation({ evaluationId: 'eval_1' }), PerformanceSkillValidationError);
});

it('Validate BenchmarkDefinition schema', () => {
  const valid = {
    benchmarkId: 'bench_1',
    name: 'S&P 500 Total Return',
    methodology: 'MARKET_CAP_WEIGHTED',
    informationCutoff: '2026-03-01T00:00:00Z'
  };
  assert.strictEqual(validateBenchmarkDefinition(valid), true);
  assert.throws(() => validateBenchmarkDefinition({ benchmarkId: 'bench_1' }), PerformanceSkillValidationError);
});

it('Validate RiskAdjustedPerformance schema', () => {
  const valid = {
    riskPerfId: 'risk_1',
    sharpeRatio: 1.45,
    maxDrawdown: 0.08
  };
  assert.strictEqual(validateRiskAdjustedPerformance(valid), true);
  assert.throws(() => validateRiskAdjustedPerformance({ riskPerfId: 'risk_1' }), PerformanceSkillValidationError);
});

it('Validate FactorExposure schema', () => {
  const valid = {
    factorExposureId: 'fact_1',
    factorBetas: { MARKET_BETA: 1.05 },
    rSquared: 0.85
  };
  assert.strictEqual(validateFactorExposure(valid), true);
  assert.throws(() => validateFactorExposure({ factorExposureId: 'fact_1' }), PerformanceSkillValidationError);
});

it('Validate TimingSkill schema', () => {
  const valid = {
    timingSkillId: 'timing_1',
    timingCoefficient: 0.04
  };
  assert.strictEqual(validateTimingSkill(valid), true);
  assert.throws(() => validateTimingSkill({ timingSkillId: 'timing_1' }), PerformanceSkillValidationError);
});

it('Validate SelectionSkill schema', () => {
  const valid = {
    selectionSkillId: 'sel_1',
    selectionContribution: 0.035
  };
  assert.strictEqual(validateSelectionSkill(valid), true);
  assert.throws(() => validateSelectionSkill({ selectionSkillId: 'sel_1' }), PerformanceSkillValidationError);
});

it('Validate AllocationSkill schema', () => {
  const valid = {
    allocationSkillId: 'alloc_1',
    allocationContribution: 0.015
  };
  assert.strictEqual(validateAllocationSkill(valid), true);
  assert.throws(() => validateAllocationSkill({ allocationSkillId: 'alloc_1' }), PerformanceSkillValidationError);
});

it('Validate ProcessSkill schema', () => {
  const valid = {
    processSkillId: 'proc_1',
    disciplineLevel: ProcessDisciplineLevel.DISCIPLINED
  };
  assert.strictEqual(validateProcessSkill(valid), true);
  assert.throws(() => validateProcessSkill({ processSkillId: 'proc_1', disciplineLevel: 'INVALID' }), PerformanceSkillValidationError);
});

it('Validate PerformancePersistence schema', () => {
  const valid = {
    persistenceId: 'pers_1',
    classification: PersistenceClassification.PERSISTENT
  };
  assert.strictEqual(validatePerformancePersistence(valid), true);
  assert.throws(() => validatePerformancePersistence({ persistenceId: 'pers_1', classification: 'INVALID' }), PerformanceSkillValidationError);
});

it('Validate CapacityAssessment schema', () => {
  const valid = {
    capacityId: 'cap_1',
    currentAum: 100000000
  };
  assert.strictEqual(validateCapacityAssessment(valid), true);
  assert.throws(() => validateCapacityAssessment({ capacityId: 'cap_1' }), PerformanceSkillValidationError);
});

it('Validate ManagerEvaluation schema', () => {
  const valid = {
    evaluationId: 'mgr_1',
    managerId: 'mgr_john'
  };
  assert.strictEqual(validateManagerEvaluation(valid), true);
  assert.throws(() => validateManagerEvaluation({ evaluationId: 'mgr_1' }), PerformanceSkillValidationError);
});

it('Validate PerformanceSkillPackage schema', () => {
  const valid = {
    packageId: 'pkg_1',
    evaluationPeriod: { startDate: '2025-01-01', endDate: '2025-12-31' },
    informationCutoff: '2026-03-01T00:00:00Z',
    explanationDAG: { nodes: [], edges: [] }
  };
  assert.strictEqual(validatePerformanceSkillPackage(valid), true);
  assert.throws(() => validatePerformanceSkillPackage({ packageId: 'pkg_1' }), PerformanceSkillValidationError);
});

console.log(`PASSED: ${passed} assertions passed.\n`);
