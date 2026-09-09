/**
 * Phase 13 - Process Intelligence Configuration & Policy Thresholds
 * 
 * Versioned scoring configurations, threshold definitions, and causal attribution classifications.
 * Historical evaluations remain bound to their respective configuration version.
 */

export const CausalAttributionLevel = Object.freeze({
  OBSERVED: 'OBSERVED',
  SUPPORTED_BY_EVIDENCE: 'SUPPORTED_BY_EVIDENCE',
  MODEL_ATTRIBUTED: 'MODEL_ATTRIBUTED',
  ASSOCIATED_WITH: 'ASSOCIATED_WITH',
  CAUSALLY_ESTABLISHED: 'CAUSALLY_ESTABLISHED'
});

export const PROCESS_SCORE_CONFIG_V1 = Object.freeze({
  configId: 'PROCESS_SCORE_CONFIG_V1',
  version: 1,
  evidenceWeight: 0.15,
  coverageWeight: 0.15,
  valuationWeight: 0.15,
  riskWeight: 0.15,
  thesisWeight: 0.15,
  falsificationWeight: 0.15,
  forecastWeight: 0.10,
  goodDecisionThreshold: 65,
  minEvaluatedWeightThreshold: 0.50,
  createdAt: '2025-01-01T00:00:00.000Z'
});

export const PROCESS_SCORE_CONFIG_V2 = Object.freeze({
  configId: 'PROCESS_SCORE_CONFIG_V2',
  version: 2,
  evidenceWeight: 0.20,
  coverageWeight: 0.10,
  valuationWeight: 0.15,
  riskWeight: 0.20,
  thesisWeight: 0.15,
  falsificationWeight: 0.10,
  forecastWeight: 0.10,
  goodDecisionThreshold: 70,
  minEvaluatedWeightThreshold: 0.50,
  createdAt: '2026-01-01T00:00:00.000Z'
});

export const PROCESS_THRESHOLDS_V1 = Object.freeze({
  thresholdConfigId: 'PROCESS_THRESHOLDS_V1',
  version: 1,
  forecastError: {
    pointValidatedThreshold: 0.05,        // <= 5% error -> VALIDATED
    pointPartiallyValidatedThreshold: 0.15 // <= 15% error -> PARTIALLY_VALIDATED
  },
  calibration: {
    minBucketSampleSize: 5,
    minTotalSampleSize: 10,
    wellCalibratedErrorMargin: 0.10,
    signalThreshold: 10 // >= 10 is established, 5-9 is SIGNAL
  },
  drift: {
    minOccurrencesThreshold: 3
  },
  restatement: {
    materialityThresholdPercentage: 10.0 // > 10% change -> MATERIAL
  },
  biasControls: {
    minSurvivorshipCoverage: 0.80 // >= 80% coverage to be bias protected
  }
});

export const scoringConfigRegistry = new Map([
  [PROCESS_SCORE_CONFIG_V1.configId, PROCESS_SCORE_CONFIG_V1],
  [PROCESS_SCORE_CONFIG_V2.configId, PROCESS_SCORE_CONFIG_V2]
]);

export function getScoringConfig(configId = 'PROCESS_SCORE_CONFIG_V1') {
  return scoringConfigRegistry.get(configId) || PROCESS_SCORE_CONFIG_V1;
}
