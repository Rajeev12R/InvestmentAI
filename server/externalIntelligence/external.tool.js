import { defaultExternalStore } from './external.store.js';
import { defaultSignalEngine } from './external.signal.engine.js';
import { defaultCorroborationEngine } from './external.corroboration.engine.js';

export const externalIntelligenceCopilotTools = {
  /**
   * Search External Intelligence by query or ticker
   */
  searchExternalIntelligence: async ({ tenantId = 'tenant_default', subjectId, observationType = null }) => {
    const list = defaultExternalStore.listEntities(tenantId, 'observations', obs => {
      const matchSubject = !subjectId || obs.subjectId === subjectId;
      const matchType = !observationType || obs.observationType === observationType;
      return matchSubject && matchType;
    });
    return {
      tenantId,
      subjectId,
      totalFound: list.length,
      observations: list
    };
  },

  /**
   * Explain an External Signal & Quality Score
   */
  explainExternalSignal: async ({ tenantId = 'tenant_default', observationId }) => {
    const obs = defaultExternalStore.getEntityAsOf(tenantId, 'observations', observationId);
    if (!obs) return { found: false, explanation: `Observation ${observationId} not found` };

    const src = defaultExternalStore.getEntityAsOf(tenantId, 'sources', obs.sourceId);
    const quality = defaultSignalEngine.evaluateSignalQuality(tenantId, obs);

    return {
      found: true,
      observationId: obs.observationId,
      subjectId: obs.subjectId,
      observationType: obs.observationType,
      classification: obs.observationClass,
      source: {
        sourceId: src?.sourceId,
        publisher: src?.publisher,
        verificationStatus: src?.verificationStatus
      },
      quality,
      explanation: `Observation ${obs.observationId} of type ${obs.observationType} for ${obs.subjectId} is classified as ${obs.observationClass} with quality tier ${quality.qualityTier} (Score: ${quality.qualityScore}).`
    };
  },

  /**
   * Explain Source Verification Status
   */
  explainSourceVerification: async ({ tenantId = 'tenant_default', sourceId }) => {
    const src = defaultExternalStore.getEntityAsOf(tenantId, 'sources', sourceId);
    if (!src) return { found: false, explanation: `Source ${sourceId} not found` };

    return {
      found: true,
      sourceId: src.sourceId,
      publisher: src.publisher,
      sourceType: src.sourceType,
      verificationStatus: src.verificationStatus,
      verificationEvidence: src.verificationEvidence,
      verifiedAt: src.verifiedAt,
      explanation: `Source ${src.publisher} (${src.sourceType}) is verified as ${src.verificationStatus} via method: ${src.verificationMethod || 'N/A'}.`
    };
  },

  /**
   * Compare External Sources
   */
  compareExternalSources: async ({ tenantId = 'tenant_default', observationIds = [] }) => {
    const observations = observationIds.map(id => defaultExternalStore.getEntityAsOf(tenantId, 'observations', id)).filter(Boolean);
    const sources = observations.map(obs => defaultExternalStore.getEntityAsOf(tenantId, 'sources', obs.sourceId)).filter(Boolean);

    return {
      totalObservations: observations.length,
      observations,
      sources
    };
  },

  /**
   * Explain Corroboration State across Observations
   */
  explainCorroboration: async ({ tenantId = 'tenant_default', subjectId, observationIds = [] }) => {
    const corr = defaultCorroborationEngine.evaluateCorroboration(tenantId, { subjectId, observationIds });
    return {
      subjectId,
      corroborationState: corr.state,
      isCorroborated: corr.isCorroborated,
      independentSourcesCount: corr.independentSourcesCount,
      hasConflicts: corr.hasConflicts,
      explanation: `Corroboration state for ${subjectId} is ${corr.state} with ${corr.independentSourcesCount} independent publisher(s).`
    };
  },

  /**
   * Explain Competitive Signal
   */
  explainCompetitiveSignal: async ({ tenantId = 'tenant_default', subjectId }) => {
    const signals = defaultExternalStore.listEntities(tenantId, 'observations', obs => 
      obs.subjectId === subjectId && obs.observationType === 'COMPETITIVE_SIGNAL'
    );
    return {
      subjectId,
      signalsCount: signals.length,
      signals
    };
  },

  /**
   * Explain Supply Chain Dependencies
   */
  explainSupplyChainSignal: async ({ tenantId = 'tenant_default', subjectId }) => {
    const signals = defaultExternalStore.listEntities(tenantId, 'observations', obs => 
      obs.subjectId === subjectId && obs.observationType === 'SUPPLY_CHAIN_SIGNAL'
    );
    return {
      subjectId,
      signalsCount: signals.length,
      signals
    };
  },

  /**
   * Explain Management Commentary
   */
  explainManagementCommentary: async ({ tenantId = 'tenant_default', subjectId }) => {
    const commentary = defaultExternalStore.listEntities(tenantId, 'observations', obs => 
      obs.subjectId === subjectId && obs.observationType === 'MANAGEMENT_COMMENTARY'
    );
    return {
      subjectId,
      commentaryCount: commentary.length,
      commentary
    };
  },

  /**
   * Explain Signal Historical Performance
   */
  explainSignalPerformance: async ({ signalType, predictions = [] }) => {
    return defaultSignalEngine.evaluateSignalPerformance({ signalType, predictions });
  }
};
