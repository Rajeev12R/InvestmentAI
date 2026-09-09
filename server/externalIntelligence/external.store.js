import { deepFreeze } from './external.types.js';
import {
  validateSource,
  validateRawArtifact,
  validateExtractedEvidence,
  validateExternalObservation,
  validateAlternativeDataset,
  validateTruthUpdateCandidate
} from './external.schema.js';

export class ExternalIntelligenceStore {
  constructor() {
    this.reset();
  }

  reset() {
    // Tenant-isolated tables
    // tenantId -> entityType -> id -> [versioned entries]
    this.tables = new Map();
  }

  _getTenantTable(tenantId = 'tenant_default', entityType) {
    if (!this.tables.has(tenantId)) {
      this.tables.set(tenantId, new Map());
    }
    const tenantMap = this.tables.get(tenantId);
    if (!tenantMap.has(entityType)) {
      tenantMap.set(entityType, new Map());
    }
    return tenantMap.get(entityType);
  }

  /**
   * Save an entity revision with validation & immutable versioning
   */
  saveEntity(tenantId = 'tenant_default', entityType, entity, validator) {
    const validated = validator ? validator(entity) : entity;
    const table = this._getTenantTable(tenantId, entityType);

    const ENTITY_PRIMARY_KEYS = {
      sources: 'sourceId',
      rawArtifacts: 'artifactId',
      extractedEvidences: 'evidenceId',
      observations: 'observationId',
      datasets: 'datasetId',
      signals: 'signalId',
      candidates: 'candidateId',
      corroborations: 'corroborationId',
      licenses: 'licenseId'
    };

    const idKey = ENTITY_PRIMARY_KEYS[entityType] || 'id';
    const id = validated[idKey] || validated.id;
    if (!id) throw new Error(`Entity missing primary key ${idKey}`);

    if (!table.has(id)) {
      table.set(id, []);
    }
    const history = table.get(id);

    const record = deepFreeze({
      ...validated,
      _storeVersion: history.length + 1,
      _savedAt: validated.retrievedAt || validated.publicationTimestamp || validated.timestamp || new Date().toISOString()
    });

    history.push(record);
    return record;
  }

  // Typed convenience savers
  saveSource(tenantId, src) { return this.saveEntity(tenantId, 'sources', src, validateSource); }
  saveRawArtifact(tenantId, art) { return this.saveEntity(tenantId, 'rawArtifacts', art, validateRawArtifact); }
  saveEvidence(tenantId, ev) { return this.saveEntity(tenantId, 'extractedEvidences', ev, validateExtractedEvidence); }
  saveObservation(tenantId, obs) { return this.saveEntity(tenantId, 'observations', obs, validateExternalObservation); }
  saveDataset(tenantId, ds) { return this.saveEntity(tenantId, 'datasets', ds, validateAlternativeDataset); }
  saveCandidate(tenantId, cand) { return this.saveEntity(tenantId, 'candidates', cand, validateTruthUpdateCandidate); }
  saveSignal(tenantId, sig) { return this.saveEntity(tenantId, 'signals', sig); }
  saveCorroboration(tenantId, corr) { return this.saveEntity(tenantId, 'corroborations', corr); }

  /**
   * Point-in-Time Temporal Retrieval: gets state as of a specified ISO timestamp
   */
  getEntityAsOf(tenantId = 'tenant_default', entityType, id, asOf = null) {
    const table = this._getTenantTable(tenantId, entityType);
    if (!table.has(id)) return null;
    const history = table.get(id);
    if (history.length === 0) return null;

    if (!asOf) {
      return history[history.length - 1]; // Latest
    }

    const cutoff = new Date(asOf).getTime();
    for (let i = history.length - 1; i >= 0; i--) {
      const record = history[i];
      const recordTime = new Date(
        record.knowledgeAvailableAt || record.publicationTimestamp || record.retrievedAt || record._savedAt || 0
      ).getTime();
      if (recordTime <= cutoff) {
        return record;
      }
    }
    return null;
  }

  /**
   * List entities with tenant isolation & optional temporal cutoff
   */
  listEntities(tenantId = 'tenant_default', entityType, filterFn = null, asOf = null) {
    const table = this._getTenantTable(tenantId, entityType);
    const results = [];
    for (const [id] of table.entries()) {
      const entity = this.getEntityAsOf(tenantId, entityType, id, asOf);
      if (entity && (!filterFn || filterFn(entity))) {
        results.push(entity);
      }
    }
    return results;
  }

  /**
   * Get complete revision history of an entity
   */
  getEntityHistory(tenantId = 'tenant_default', entityType, id) {
    const table = this._getTenantTable(tenantId, entityType);
    if (!table.has(id)) return [];
    return [...table.get(id)];
  }
}

export const defaultExternalStore = new ExternalIntelligenceStore();
