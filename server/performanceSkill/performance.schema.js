import {
  SkillStatus,
  SkillConfidenceLevel,
  PersistenceClassification,
  FactorType,
  TimingDimension,
  ProcessDisciplineLevel,
  CapacityRiskLevel,
  SurvivorshipRisk
} from './performance.types.js';

export class PerformanceSkillValidationError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.name = 'PerformanceSkillValidationError';
    this.errors = errors;
  }
}

/**
 * Validate PerformanceEvaluation schema
 */
export function validatePerformanceEvaluation(perf) {
  const errors = [];
  if (!perf || typeof perf !== 'object') throw new PerformanceSkillValidationError('PerformanceEvaluation must be an object');
  if (!perf.evaluationId) errors.push('evaluationId is required');
  if (!perf.portfolioId && !perf.entityId) errors.push('portfolioId or entityId is required');
  if (!perf.benchmark) errors.push('benchmark is required');
  if (perf.portfolioReturn === undefined || isNaN(perf.portfolioReturn)) errors.push('valid portfolioReturn is required');
  if (perf.benchmarkReturn === undefined || isNaN(perf.benchmarkReturn)) errors.push('valid benchmarkReturn is required');

  if (errors.length > 0) {
    throw new PerformanceSkillValidationError(`Invalid PerformanceEvaluation: ${errors.join(', ')}`, errors);
  }
  return true;
}

/**
 * Validate BenchmarkDefinition schema
 */
export function validateBenchmarkDefinition(bench) {
  const errors = [];
  if (!bench || typeof bench !== 'object') throw new PerformanceSkillValidationError('BenchmarkDefinition must be an object');
  if (!bench.benchmarkId) errors.push('benchmarkId is required');
  if (!bench.name) errors.push('name is required');
  if (!bench.methodology) errors.push('methodology is required');
  if (!bench.informationCutoff) errors.push('informationCutoff is required');

  if (errors.length > 0) {
    throw new PerformanceSkillValidationError(`Invalid BenchmarkDefinition: ${errors.join(', ')}`, errors);
  }
  return true;
}

/**
 * Validate RiskAdjustedPerformance schema
 */
export function validateRiskAdjustedPerformance(risk) {
  const errors = [];
  if (!risk || typeof risk !== 'object') throw new PerformanceSkillValidationError('RiskAdjustedPerformance must be an object');
  if (!risk.riskPerfId) errors.push('riskPerfId is required');
  if (risk.sharpeRatio === undefined || isNaN(risk.sharpeRatio)) errors.push('valid sharpeRatio is required');
  if (risk.maxDrawdown === undefined || isNaN(risk.maxDrawdown)) errors.push('valid maxDrawdown is required');

  if (errors.length > 0) {
    throw new PerformanceSkillValidationError(`Invalid RiskAdjustedPerformance: ${errors.join(', ')}`, errors);
  }
  return true;
}

/**
 * Validate FactorExposure schema
 */
export function validateFactorExposure(fact) {
  const errors = [];
  if (!fact || typeof fact !== 'object') throw new PerformanceSkillValidationError('FactorExposure must be an object');
  if (!fact.factorExposureId) errors.push('factorExposureId is required');
  if (!fact.factorBetas || typeof fact.factorBetas !== 'object') errors.push('factorBetas object is required');
  if (fact.rSquared === undefined || isNaN(fact.rSquared)) errors.push('valid rSquared is required');

  if (errors.length > 0) {
    throw new PerformanceSkillValidationError(`Invalid FactorExposure: ${errors.join(', ')}`, errors);
  }
  return true;
}

/**
 * Validate TimingSkill schema
 */
export function validateTimingSkill(timing) {
  const errors = [];
  if (!timing || typeof timing !== 'object') throw new PerformanceSkillValidationError('TimingSkill must be an object');
  if (!timing.timingSkillId) errors.push('timingSkillId is required');
  if (timing.timingCoefficient === undefined || isNaN(timing.timingCoefficient)) errors.push('valid timingCoefficient is required');

  if (errors.length > 0) {
    throw new PerformanceSkillValidationError(`Invalid TimingSkill: ${errors.join(', ')}`, errors);
  }
  return true;
}

/**
 * Validate SelectionSkill schema
 */
export function validateSelectionSkill(sel) {
  const errors = [];
  if (!sel || typeof sel !== 'object') throw new PerformanceSkillValidationError('SelectionSkill must be an object');
  if (!sel.selectionSkillId) errors.push('selectionSkillId is required');
  if (sel.selectionContribution === undefined || isNaN(sel.selectionContribution)) errors.push('valid selectionContribution is required');

  if (errors.length > 0) {
    throw new PerformanceSkillValidationError(`Invalid SelectionSkill: ${errors.join(', ')}`, errors);
  }
  return true;
}

/**
 * Validate AllocationSkill schema
 */
export function validateAllocationSkill(alloc) {
  const errors = [];
  if (!alloc || typeof alloc !== 'object') throw new PerformanceSkillValidationError('AllocationSkill must be an object');
  if (!alloc.allocationSkillId) errors.push('allocationSkillId is required');
  if (alloc.allocationContribution === undefined || isNaN(alloc.allocationContribution)) errors.push('valid allocationContribution is required');

  if (errors.length > 0) {
    throw new PerformanceSkillValidationError(`Invalid AllocationSkill: ${errors.join(', ')}`, errors);
  }
  return true;
}

/**
 * Validate ProcessSkill schema
 */
export function validateProcessSkill(proc) {
  const errors = [];
  if (!proc || typeof proc !== 'object') throw new PerformanceSkillValidationError('ProcessSkill must be an object');
  if (!proc.processSkillId) errors.push('processSkillId is required');
  if (!proc.disciplineLevel || !Object.values(ProcessDisciplineLevel).includes(proc.disciplineLevel)) {
    errors.push('valid ProcessDisciplineLevel is required');
  }

  if (errors.length > 0) {
    throw new PerformanceSkillValidationError(`Invalid ProcessSkill: ${errors.join(', ')}`, errors);
  }
  return true;
}

/**
 * Validate PerformancePersistence schema
 */
export function validatePerformancePersistence(pers) {
  const errors = [];
  if (!pers || typeof pers !== 'object') throw new PerformanceSkillValidationError('PerformancePersistence must be an object');
  if (!pers.persistenceId) errors.push('persistenceId is required');
  if (!pers.classification || !Object.values(PersistenceClassification).includes(pers.classification)) {
    errors.push('valid PersistenceClassification is required');
  }

  if (errors.length > 0) {
    throw new PerformanceSkillValidationError(`Invalid PerformancePersistence: ${errors.join(', ')}`, errors);
  }
  return true;
}

/**
 * Validate CapacityAssessment schema
 */
export function validateCapacityAssessment(cap) {
  const errors = [];
  if (!cap || typeof cap !== 'object') throw new PerformanceSkillValidationError('CapacityAssessment must be an object');
  if (!cap.capacityId) errors.push('capacityId is required');
  if (cap.currentAum === undefined || isNaN(cap.currentAum)) errors.push('valid currentAum is required');

  if (errors.length > 0) {
    throw new PerformanceSkillValidationError(`Invalid CapacityAssessment: ${errors.join(', ')}`, errors);
  }
  return true;
}

/**
 * Validate ManagerEvaluation schema
 */
export function validateManagerEvaluation(mgr) {
  const errors = [];
  if (!mgr || typeof mgr !== 'object') throw new PerformanceSkillValidationError('ManagerEvaluation must be an object');
  if (!mgr.evaluationId) errors.push('evaluationId is required');
  if (!mgr.managerId) errors.push('managerId is required');

  if (errors.length > 0) {
    throw new PerformanceSkillValidationError(`Invalid ManagerEvaluation: ${errors.join(', ')}`, errors);
  }
  return true;
}

/**
 * Validate PerformanceSkillPackage schema
 */
export function validatePerformanceSkillPackage(pkg) {
  const errors = [];
  if (!pkg || typeof pkg !== 'object') throw new PerformanceSkillValidationError('PerformanceSkillPackage must be an object');
  if (!pkg.packageId) errors.push('packageId is required');
  if (!pkg.evaluationPeriod) errors.push('evaluationPeriod is required');
  if (!pkg.informationCutoff) errors.push('informationCutoff is required');
  if (!pkg.explanationDAG || !Array.isArray(pkg.explanationDAG.nodes)) {
    errors.push('valid explanationDAG with nodes array is required');
  }

  if (errors.length > 0) {
    throw new PerformanceSkillValidationError(`Invalid PerformanceSkillPackage: ${errors.join(', ')}`, errors);
  }
  return true;
}
