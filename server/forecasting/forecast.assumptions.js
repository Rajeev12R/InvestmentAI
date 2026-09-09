/**
 * server/forecasting/forecast.assumptions.js
 * 
 * Phase 20: Explicit Assumption Management & Registry
 * Manages transparent, immutable analyst and model assumptions.
 */

import { ForecastClassification, canonicalHash, deepFreeze } from './forecast.types.js';
import { validateAssumption } from './forecast.schema.js';

export class AssumptionRegistry {
  constructor() {
    // Map<tenantId, Map<assumptionId, AssumptionObject>>
    this.storeByTenant = new Map();
  }

  _getTenantStore(tenantId) {
    if (!tenantId || typeof tenantId !== 'string') {
      throw new Error('Valid tenantId is required for assumption management');
    }
    if (!this.storeByTenant.has(tenantId)) {
      this.storeByTenant.set(tenantId, new Map());
    }
    return this.storeByTenant.get(tenantId);
  }

  /**
   * Registers a new explicit assumption
   */
  registerAssumption(tenantId, assumptionData, createdBy = 'ANALYST_DEFAULT') {
    validateAssumption(assumptionData);

    const now = new Date().toISOString();
    const assumptionObject = {
      assumptionId: assumptionData.assumptionId,
      description: assumptionData.description || `Explicit assumption for ${assumptionData.metric}`,
      metric: assumptionData.metric.toUpperCase(),
      value: assumptionData.value,
      unit: assumptionData.unit || 'RATIO',
      period: assumptionData.period || 'FY+1',
      rationale: assumptionData.rationale,
      sourceEvidenceId: assumptionData.sourceEvidenceId || null,
      classification: ForecastClassification.ASSUMPTION,
      createdBy,
      createdAt: now,
      version: assumptionData.version || '1.0.0',
      status: 'ACTIVE'
    };

    const hash = canonicalHash({
      tenantId,
      assumptionId: assumptionObject.assumptionId,
      metric: assumptionObject.metric,
      value: assumptionObject.value,
      period: assumptionObject.period,
      rationale: assumptionObject.rationale,
      version: assumptionObject.version
    });

    assumptionObject.hash = hash;
    const frozen = deepFreeze(assumptionObject);

    const store = this._getTenantStore(tenantId);
    store.set(assumptionObject.assumptionId, frozen);
    return frozen;
  }

  /**
   * Retrieves an assumption by ID
   */
  getAssumption(tenantId, assumptionId) {
    const store = this._getTenantStore(tenantId);
    return store.get(assumptionId) || null;
  }

  /**
   * Lists all registered assumptions for a tenant
   */
  listAssumptions(tenantId) {
    const store = this._getTenantStore(tenantId);
    return Array.from(store.values());
  }

  clear() {
    this.storeByTenant.clear();
  }
}

export const defaultAssumptionRegistry = new AssumptionRegistry();
