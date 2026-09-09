import { deepFreeze, computeAttributionHash } from './attribution.types.js';
import {
  validateSignalObservation,
  validateSignalPrediction,
  validateSignalOutcome,
  validateSignalPerformanceRecord,
  validateSignalAttribution,
  validateDecisionSignalContribution,
  validateCounterfactualResult,
  validateAlphaAttributionPackage
} from './attribution.schema.js';

export class AlphaAttributionStore {
  constructor() {
    this.tenants = new Map();
  }

  _getTenantData(tenantId) {
    if (!this.tenants.has(tenantId)) {
      this.tenants.set(tenantId, {
        observations: new Map(), // observationId -> [versions]
        predictions: new Map(), // predictionId -> [versions]
        outcomes: new Map(), // outcomeId -> [versions]
        performances: new Map(), // performanceId -> [versions]
        attributions: new Map(), // attributionId -> [versions]
        decisionContributions: new Map(), // contributionId -> [versions]
        counterfactuals: new Map(), // counterfactualId -> [versions]
        packages: new Map() // packageId -> [versions]
      });
    }
    return this.tenants.get(tenantId);
  }

  saveEntity(tenantId = 'tenant_default', collectionName, entity) {
    if (!tenantId) throw new Error('tenantId is required');
    const tenant = this._getTenantData(tenantId);
    if (!tenant[collectionName]) {
      throw new Error(`Invalid collection name: ${collectionName}`);
    }

    // Schema validation
    if (collectionName === 'observations') validateSignalObservation(entity);
    if (collectionName === 'predictions') validateSignalPrediction(entity);
    if (collectionName === 'outcomes') validateSignalOutcome(entity);
    if (collectionName === 'performances') validateSignalPerformanceRecord(entity);
    if (collectionName === 'attributions') validateSignalAttribution(entity);
    if (collectionName === 'decisionContributions') validateDecisionSignalContribution(entity);
    if (collectionName === 'counterfactuals') validateCounterfactualResult(entity);
    if (collectionName === 'packages') validateAlphaAttributionPackage(entity);

    const idKey = this._getIdKeyForCollection(collectionName);
    const id = entity[idKey];
    if (!id) throw new Error(`Entity missing primary key: ${idKey}`);

    const existingHistory = tenant[collectionName].get(id) || [];
    const version = (entity.version || existingHistory.length + 1);
    const timestamp = entity.informationCutoff || entity.knowledgeCutoff || entity.generatedAt || entity.outcomeEnd || new Date().toISOString();

    const record = deepFreeze({
      ...entity,
      version,
      storedAt: entity.storedAt || timestamp,
      knowledgeCutoff: timestamp,
      contentHash: computeAttributionHash(entity)
    });

    existingHistory.push(record);
    tenant[collectionName].set(id, existingHistory);
    return record;
  }

  _getIdKeyForCollection(collectionName) {
    const map = {
      observations: 'observationId',
      predictions: 'predictionId',
      outcomes: 'outcomeId',
      performances: 'performanceId',
      attributions: 'attributionId',
      decisionContributions: 'contributionId',
      counterfactuals: 'counterfactualId',
      packages: 'packageId'
    };
    return map[collectionName] || 'id';
  }

  getEntityAsOf(tenantId = 'tenant_default', collectionName, id, asOf = null) {
    const tenant = this._getTenantData(tenantId);
    const history = tenant[collectionName]?.get(id);
    if (!history || history.length === 0) return null;

    if (!asOf) {
      return history[history.length - 1];
    }

    const asOfTime = new Date(asOf).getTime();
    for (let i = history.length - 1; i >= 0; i--) {
      const recordTime = new Date(history[i].knowledgeCutoff || history[i].storedAt).getTime();
      if (recordTime <= asOfTime) {
        return history[i];
      }
    }
    return null;
  }

  getEntityHistory(tenantId = 'tenant_default', collectionName, id) {
    const tenant = this._getTenantData(tenantId);
    return [...(tenant[collectionName]?.get(id) || [])];
  }

  listEntities(tenantId = 'tenant_default', collectionName, filterFn = null, asOf = null) {
    const tenant = this._getTenantData(tenantId);
    const collection = tenant[collectionName];
    if (!collection) return [];

    const results = [];
    for (const id of collection.keys()) {
      const entity = this.getEntityAsOf(tenantId, collectionName, id, asOf);
      if (entity) {
        if (!filterFn || filterFn(entity)) {
          results.push(entity);
        }
      }
    }
    return results;
  }

  // Convenience Helpers
  saveObservation(tenantId, obs) { return this.saveEntity(tenantId, 'observations', obs); }
  savePrediction(tenantId, pred) { return this.saveEntity(tenantId, 'predictions', pred); }
  saveOutcome(tenantId, out) { return this.saveEntity(tenantId, 'outcomes', out); }
  savePerformance(tenantId, perf) { return this.saveEntity(tenantId, 'performances', perf); }
  saveAttribution(tenantId, attr) { return this.saveEntity(tenantId, 'attributions', attr); }
  saveDecisionContribution(tenantId, dc) { return this.saveEntity(tenantId, 'decisionContributions', dc); }
  saveCounterfactual(tenantId, cf) { return this.saveEntity(tenantId, 'counterfactuals', cf); }
  savePackage(tenantId, pkg) { return this.saveEntity(tenantId, 'packages', pkg); }
}

export const defaultAttributionStore = new AlphaAttributionStore();
