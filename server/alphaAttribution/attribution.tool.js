import { defaultAttributionStore } from './attribution.store.js';
import { defaultPredictionScoringEngine } from './attribution.prediction.engine.js';
import { defaultDecompositionEngine } from './attribution.decomposition.engine.js';
import { defaultDecisionAttributionEngine } from './attribution.decision.engine.js';
import { defaultCounterfactualEngine } from './attribution.counterfactual.engine.js';
import { defaultBenchmarkEngine } from './attribution.benchmark.engine.js';
import { defaultDriftGovernanceEngine } from './attribution.drift.engine.js';
import { defaultAlphaPackageEngine } from './attribution.package.js';

export const alphaAttributionCopilotTools = {
  getSignalPerformanceSummary: async ({ tenantId = 'tenant_default', signalId, evaluationPeriod = 'HISTORICAL' }) => {
    const list = defaultAttributionStore.listEntities(tenantId, 'performances', p => p.signalId === signalId && p.evaluationPeriod === evaluationPeriod);
    if (list.length > 0) return { success: true, performance: list[0] };
    return { success: false, reason: 'Performance record not found' };
  },

  getSecurityAlphaAttribution: async ({ tenantId = 'tenant_default', entityId, asOf = null }) => {
    const list = defaultAttributionStore.listEntities(tenantId, 'attributions', a => a.entityId === entityId, asOf);
    if (list.length > 0) return { success: true, attribution: list[list.length - 1] };
    return { success: false, reason: 'Attribution not found' };
  },

  getPortfolioAlphaAttribution: async ({ tenantId = 'tenant_default', portfolioId = 'PORTFOLIO', asOf = null }) => {
    const attributions = defaultAttributionStore.listEntities(tenantId, 'attributions', null, asOf);
    return {
      success: true,
      portfolioId,
      totalHoldingsAttributed: attributions.length,
      attributions
    };
  },

  getDecisionAttribution: async ({ tenantId = 'tenant_default', decisionId }) => {
    const list = defaultAttributionStore.listEntities(tenantId, 'decisionContributions', d => d.decisionId === decisionId);
    if (list.length > 0) return { success: true, decisionContribution: list[0] };
    return { success: false, reason: 'Decision contribution not found' };
  },

  getCounterfactualAnalysis: async ({ tenantId = 'tenant_default', counterfactualId }) => {
    const cf = defaultAttributionStore.getEntityAsOf(tenantId, 'counterfactuals', counterfactualId);
    if (cf) return { success: true, counterfactual: cf };
    return { success: false, reason: 'Counterfactual not found' };
  },

  getBrinsonBenchmarkAttribution: async ({ sectors = [], methodology = 'BRINSON_FACHLER' }) => {
    const result = defaultBenchmarkEngine.calculateBrinsonAttribution({ sectors, methodology });
    return { success: true, brinson: result };
  },

  getRegimeConditionalPerformance: async ({ signalId, regimePerformance = {} }) => {
    const result = defaultDriftGovernanceEngine.evaluateRegimePerformance({ signalId, regimePerformance });
    return { success: true, regimeAnalysis: result };
  },

  getSurvivorshipBiasAssessment: async ({ universeCount, delistedEntitiesIncluded, historicalPointInTimeConstituents }) => {
    const result = defaultDriftGovernanceEngine.assessSurvivorshipBias({
      universeCount,
      delistedEntitiesIncluded,
      historicalPointInTimeConstituents
    });
    return { success: true, survivorshipAssessment: result };
  },

  getAttributionExplanationDAG: async ({ tenantId = 'tenant_default', packageId }) => {
    const pkg = defaultAttributionStore.getEntityAsOf(tenantId, 'packages', packageId);
    if (pkg && pkg.explanationDAG) {
      return { success: true, packageId, explanationDAG: pkg.explanationDAG };
    }
    return { success: false, reason: 'Package or Explanation DAG not found' };
  },

  verifyAlphaPackageSeal: async ({ tenantId = 'tenant_default', packageId }) => {
    const pkg = defaultAttributionStore.getEntityAsOf(tenantId, 'packages', packageId);
    if (!pkg) return { success: false, reason: 'Package not found' };
    const verification = defaultAlphaPackageEngine.verifyAttributionSeal(pkg);
    return { success: true, verification };
  }
};
