import { defaultSignalStore } from './signal.store.js';
import { defaultFusionEngine } from './signal.fusion.engine.js';
import { defaultPortfolioSignalEngine } from './signal.portfolio.engine.js';
import { defaultIndependenceEngine } from './signal.independence.engine.js';
import { defaultPackageEngine } from './signal.package.js';

export const signalIntelligenceCopilotTools = {
  getCompositeSignal: async ({ tenantId = 'tenant_default', entityId, asOf = null }) => {
    const list = defaultSignalStore.listEntities(tenantId, 'compositeSignals', c => c.entityId === entityId, asOf);
    return list.length > 0 ? list[list.length - 1] : { message: `No composite signal found for ${entityId}` };
  },

  explainSignal: async ({ tenantId = 'tenant_default', compositeSignalId }) => {
    const comp = defaultSignalStore.getEntityAsOf(tenantId, 'compositeSignals', compositeSignalId);
    if (!comp) return { error: `CompositeSignal ${compositeSignalId} not found` };
    return {
      entityId: comp.entityId,
      score: comp.score,
      regime: comp.regime,
      direction: comp.direction,
      confidence: comp.confidence,
      hasConflict: comp.hasConflict,
      divergencesCount: comp.divergences?.length || 0,
      topContributors: comp.contributors.slice(0, 5)
    };
  },

  explainSignalContribution: async ({ tenantId = 'tenant_default', compositeSignalId }) => {
    const comp = defaultSignalStore.getEntityAsOf(tenantId, 'compositeSignals', compositeSignalId);
    if (!comp) return { error: `CompositeSignal ${compositeSignalId} not found` };
    return {
      compositeSignalId,
      entityId: comp.entityId,
      totalScore: comp.score,
      contributors: comp.contributors.map(c => ({
        signalType: c.signalType,
        normalizedValue: c.normalizedValue,
        decayedValue: c.decayedValue,
        weight: c.weight,
        contribution: c.contribution
      }))
    };
  },

  explainSignalConflict: async ({ tenantId = 'tenant_default', compositeSignalId }) => {
    const comp = defaultSignalStore.getEntityAsOf(tenantId, 'compositeSignals', compositeSignalId);
    if (!comp) return { error: `CompositeSignal ${compositeSignalId} not found` };
    return {
      compositeSignalId,
      entityId: comp.entityId,
      hasConflict: comp.hasConflict,
      positiveWeightSum: comp.positiveWeightSum,
      negativeWeightSum: comp.negativeWeightSum,
      regime: comp.regime
    };
  },

  explainSignalHistory: async ({ tenantId = 'tenant_default', entityId }) => {
    const list = defaultSignalStore.listEntities(tenantId, 'compositeSignals', c => c.entityId === entityId);
    return {
      entityId,
      vintagesCount: list.length,
      history: list.map(v => ({
        compositeSignalId: v.compositeSignalId,
        score: v.score,
        regime: v.regime,
        knowledgeCutoff: v.knowledgeCutoff,
        version: v.version
      }))
    };
  },

  explainSignalValidation: async ({ tenantId = 'tenant_default', signalType }) => {
    const validations = defaultSignalStore.listEntities(tenantId, 'validations', val => val.signalType === signalType);
    return validations.length > 0 ? validations[validations.length - 1] : { message: `No validation records found for ${signalType}` };
  },

  explainSignalDependencies: async ({ tenantId = 'tenant_default', entityId }) => {
    const list = defaultSignalStore.listEntities(tenantId, 'compositeSignals', c => c.entityId === entityId);
    const latest = list.length > 0 ? list[list.length - 1] : null;
    if (!latest) return { message: `No signals found for ${entityId}` };
    return {
      entityId,
      evidenceDiversityScore: latest.evidenceDiversityScore,
      independentEffectiveCount: latest.independentEffectiveCount,
      dependencyGroups: latest.dependencyGroups || []
    };
  },

  findSignalDivergences: async ({ tenantId = 'tenant_default', entityId = null }) => {
    const list = defaultSignalStore.listEntities(tenantId, 'compositeSignals', c => !entityId || c.entityId === entityId);
    const allDivergences = list.flatMap(c => c.divergences || []);
    return { count: allDivergences.length, divergences: allDivergences };
  },

  getPortfolioSignalConcentration: async ({ tenantId = 'tenant_default', portfolioId = 'port_default', holdings = [] }) => {
    return defaultPortfolioSignalEngine.aggregatePortfolioSignals(tenantId, { portfolioId, holdings });
  },

  compareSignals: async ({ tenantId = 'tenant_default', entityIds = [] }) => {
    const results = {};
    for (const id of entityIds) {
      const list = defaultSignalStore.listEntities(tenantId, 'compositeSignals', c => c.entityId === id);
      results[id] = list.length > 0 ? list[list.length - 1] : null;
    }
    return results;
  }
};
