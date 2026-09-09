import {
  AttributionStatus,
  SignalEngagementLevel,
  AttributionConfidenceLevel,
  EvaluationPeriodType,
  EffectType
} from './attribution.types.js';

export class AlphaAttributionValidationError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.name = 'AlphaAttributionValidationError';
    this.errors = errors;
  }
}

/**
 * Validate SignalObservation schema
 */
export function validateSignalObservation(obs) {
  const errors = [];
  if (!obs || typeof obs !== 'object') throw new AlphaAttributionValidationError('Observation must be an object');
  if (!obs.observationId) errors.push('observationId is required');
  if (!obs.signalId) errors.push('signalId is required');
  if (!obs.entityId) errors.push('entityId is required');
  if (obs.observedValue === undefined || obs.observedValue === null) errors.push('observedValue is required');
  if (!obs.informationCutoff) errors.push('informationCutoff is required');

  if (errors.length > 0) {
    throw new AlphaAttributionValidationError(`Invalid SignalObservation: ${errors.join(', ')}`, errors);
  }
  return true;
}

/**
 * Validate SignalPrediction schema
 */
export function validateSignalPrediction(pred) {
  const errors = [];
  if (!pred || typeof pred !== 'object') throw new AlphaAttributionValidationError('Prediction must be an object');
  if (!pred.predictionId) errors.push('predictionId is required');
  if (!pred.signalId) errors.push('signalId is required');
  if (!pred.entityId) errors.push('entityId is required');
  if (pred.predictedDirection === undefined) errors.push('predictedDirection is required');
  if (!pred.predictionHorizon) errors.push('predictionHorizon is required');
  if (!pred.informationCutoff) errors.push('informationCutoff is required');

  if (errors.length > 0) {
    throw new AlphaAttributionValidationError(`Invalid SignalPrediction: ${errors.join(', ')}`, errors);
  }
  return true;
}

/**
 * Validate SignalOutcome schema
 */
export function validateSignalOutcome(out) {
  const errors = [];
  if (!out || typeof out !== 'object') throw new AlphaAttributionValidationError('Outcome must be an object');
  if (!out.outcomeId) errors.push('outcomeId is required');
  if (!out.entityId) errors.push('entityId is required');
  const ret = out.realizedReturn !== undefined ? out.realizedReturn : (out.totalReturn !== undefined ? out.totalReturn : out.priceReturn);
  if (ret === undefined || isNaN(ret)) errors.push('valid realizedReturn is required');
  if (!out.outcomeStart) errors.push('outcomeStart timestamp is required');
  if (!out.outcomeEnd) errors.push('outcomeEnd timestamp is required');
  if (new Date(out.outcomeStart) >= new Date(out.outcomeEnd)) {
    errors.push('outcomeStart must be strictly before outcomeEnd');
  }

  if (errors.length > 0) {
    throw new AlphaAttributionValidationError(`Invalid SignalOutcome: ${errors.join(', ')}`, errors);
  }
  return true;
}

/**
 * Validate SignalPerformanceRecord schema
 */
export function validateSignalPerformanceRecord(rec) {
  const errors = [];
  if (!rec || typeof rec !== 'object') throw new AlphaAttributionValidationError('Performance record must be an object');
  if (!rec.performanceId) errors.push('performanceId is required');
  if (!rec.signalId) errors.push('signalId is required');
  if (!rec.evaluationPeriod) errors.push('evaluationPeriod is required');
  if (rec.hitRate === undefined || isNaN(rec.hitRate)) errors.push('valid hitRate is required');

  if (errors.length > 0) {
    throw new AlphaAttributionValidationError(`Invalid SignalPerformanceRecord: ${errors.join(', ')}`, errors);
  }
  return true;
}

/**
 * Validate SignalAttribution schema
 */
export function validateSignalAttribution(attr) {
  const errors = [];
  if (!attr || typeof attr !== 'object') throw new AlphaAttributionValidationError('SignalAttribution must be an object');
  if (!attr.attributionId) errors.push('attributionId is required');
  if (!attr.entityId) errors.push('entityId is required');
  const ret = attr.attributedReturn !== undefined ? attr.attributedReturn : (attr.totalAttributed !== undefined ? attr.totalAttributed : attr.activeReturn);
  if (ret === undefined || isNaN(ret)) errors.push('valid attributedReturn is required');
  if (!attr.status || !Object.values(AttributionStatus).includes(attr.status)) errors.push('valid AttributionStatus is required');

  if (errors.length > 0) {
    throw new AlphaAttributionValidationError(`Invalid SignalAttribution: ${errors.join(', ')}`, errors);
  }
  return true;
}

/**
 * Validate DecisionSignalContribution schema
 */
export function validateDecisionSignalContribution(contrib) {
  const errors = [];
  if (!contrib || typeof contrib !== 'object') throw new AlphaAttributionValidationError('DecisionSignalContribution must be an object');
  if (!contrib.contributionId) errors.push('contributionId is required');
  if (!contrib.decisionId) errors.push('decisionId is required');
  if (contrib.engagementLevel && !Object.values(SignalEngagementLevel).includes(contrib.engagementLevel)) {
    errors.push('valid SignalEngagementLevel is required');
  }

  if (errors.length > 0) {
    throw new AlphaAttributionValidationError(`Invalid DecisionSignalContribution: ${errors.join(', ')}`, errors);
  }
  return true;
}

/**
 * Validate CounterfactualResult schema
 */
export function validateCounterfactualResult(cf) {
  const errors = [];
  if (!cf || typeof cf !== 'object') throw new AlphaAttributionValidationError('CounterfactualResult must be an object');
  if (!cf.counterfactualId) errors.push('counterfactualId is required');
  if (!cf.counterfactualType) errors.push('counterfactualType is required');
  if (cf.baselineOutcome === undefined || cf.counterfactualOutcome === undefined) {
    errors.push('baselineOutcome and counterfactualOutcome are required');
  }

  if (errors.length > 0) {
    throw new AlphaAttributionValidationError(`Invalid CounterfactualResult: ${errors.join(', ')}`, errors);
  }
  return true;
}

/**
 * Validate AlphaAttributionPackage schema
 */
export function validateAlphaAttributionPackage(pkg) {
  const errors = [];
  if (!pkg || typeof pkg !== 'object') throw new AlphaAttributionValidationError('Package must be an object');
  if (!pkg.packageId) errors.push('packageId is required');
  if (!pkg.evaluationPeriod) errors.push('evaluationPeriod is required');
  if (!pkg.informationCutoff) errors.push('informationCutoff is required');
  if (!pkg.explanationDAG || !Array.isArray(pkg.explanationDAG.nodes)) {
    errors.push('valid explanationDAG with nodes array is required');
  }

  if (errors.length > 0) {
    throw new AlphaAttributionValidationError(`Invalid AlphaAttributionPackage: ${errors.join(', ')}`, errors);
  }
  return true;
}
