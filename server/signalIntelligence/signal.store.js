import { deepFreeze, computeSignalHash } from './signal.types.js';
import {
  validateSignal,
  validateNormalizedSignalInput,
  validateCompositeSignal,
  validateSignalPackage
} from './signal.schema.js';

export class SignalIntelligenceStore {
  constructor() {
    this.tenants = new Map();
  }

  _getTenantData(tenantId) {
    if (!this.tenants.has(tenantId)) {
      this.tenants.set(tenantId, {
        signals: new Map(), // signalId -> [versions]
        normalizedInputs: new Map(), // inputId -> [versions]
        weightConfigs: new Map(), // configId -> [versions]
        dependencies: new Map(), // dependencyId -> [versions]
        compositeSignals: new Map(), // compositeId -> [versions]
        divergences: new Map(), // divergenceId -> [versions]
        validations: new Map(), // validationId -> [versions]
        packages: new Map(), // packageId -> [versions]
        feedbacks: new Map() // feedbackId -> [versions]
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

    // Validate Schema
    if (collectionName === 'signals') validateSignal(entity);
    if (collectionName === 'normalizedInputs') validateNormalizedSignalInput(entity);
    if (collectionName === 'compositeSignals') validateCompositeSignal(entity);
    if (collectionName === 'packages') validateSignalPackage(entity);

    const idKey = this._getIdKeyForCollection(collectionName);
    const id = entity[idKey];
    if (!id) throw new Error(`Entity missing primary key: ${idKey}`);

    const existingHistory = tenant[collectionName].get(id) || [];
    const version = (entity.version || existingHistory.length + 1);
    const timestamp = entity.knowledgeCutoff || entity.generatedAt || entity.createdAt || new Date().toISOString();

    const record = deepFreeze({
      ...entity,
      version,
      storedAt: entity.storedAt || timestamp,
      knowledgeCutoff: timestamp,
      contentHash: computeSignalHash(entity)
    });

    existingHistory.push(record);
    tenant[collectionName].set(id, existingHistory);
    return record;
  }

  _getIdKeyForCollection(collectionName) {
    const map = {
      signals: 'signalId',
      normalizedInputs: 'inputId',
      weightConfigs: 'configId',
      dependencies: 'dependencyId',
      compositeSignals: 'compositeSignalId',
      divergences: 'divergenceId',
      validations: 'validationId',
      packages: 'packageId',
      feedbacks: 'feedbackId'
    };
    return map[collectionName] || 'id';
  }

  getEntityAsOf(tenantId = 'tenant_default', collectionName, id, asOfTimestamp = null) {
    const tenant = this._getTenantData(tenantId);
    const history = tenant[collectionName]?.get(id);
    if (!history || history.length === 0) return null;

    if (!asOfTimestamp) {
      return history[history.length - 1];
    }

    const targetTime = new Date(asOfTimestamp).getTime();
    const valid = history.filter(item => {
      const itemTime = new Date(item.knowledgeCutoff || item.storedAt).getTime();
      return itemTime <= targetTime;
    });

    if (valid.length === 0) return null;
    return valid[valid.length - 1];
  }

  getEntityHistory(tenantId = 'tenant_default', collectionName, id) {
    const tenant = this._getTenantData(tenantId);
    return tenant[collectionName]?.get(id) || [];
  }

  listEntities(tenantId = 'tenant_default', collectionName, filterFn = null, asOfTimestamp = null) {
    const tenant = this._getTenantData(tenantId);
    const map = tenant[collectionName];
    if (!map) return [];

    const results = [];
    for (const [id] of map.entries()) {
      const entity = this.getEntityAsOf(tenantId, collectionName, id, asOfTimestamp);
      if (entity) {
        if (!filterFn || filterFn(entity)) {
          results.push(entity);
        }
      }
    }
    return results;
  }

  // Convenience Methods
  saveSignal(tenantId, signal) { return this.saveEntity(tenantId, 'signals', signal); }
  saveNormalizedInput(tenantId, input) { return this.saveEntity(tenantId, 'normalizedInputs', input); }
  saveCompositeSignal(tenantId, comp) { return this.saveEntity(tenantId, 'compositeSignals', comp); }
  savePackage(tenantId, pkg) { return this.saveEntity(tenantId, 'packages', pkg); }
  saveDivergence(tenantId, div) { return this.saveEntity(tenantId, 'divergences', div); }
  saveValidation(tenantId, val) { return this.saveEntity(tenantId, 'validations', val); }
  saveWeightConfig(tenantId, cfg) { return this.saveEntity(tenantId, 'weightConfigs', cfg); }
}

export const defaultSignalStore = new SignalIntelligenceStore();
