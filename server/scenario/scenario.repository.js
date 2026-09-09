/**
 * server/scenario/scenario.repository.js
 * 
 * Phase 19: Tenant-Isolated Scenario & Sealed Package Repository
 * Immutable, tenant-isolated store for custom scenario templates and sealed execution runs.
 */

export class ScenarioRepository {
  constructor() {
    // Map<tenantId, Map<scenarioId, scenarioDef>>
    this.templatesByTenant = new Map();
    // Map<tenantId, Map<sealId, sealedPackage>>
    this.sealedPackagesByTenant = new Map();
  }

  _getTenantTemplates(tenantId) {
    if (!tenantId || typeof tenantId !== 'string') {
      throw new Error('Valid tenantId is required');
    }
    if (!this.templatesByTenant.has(tenantId)) {
      this.templatesByTenant.set(tenantId, new Map());
    }
    return this.templatesByTenant.get(tenantId);
  }

  _getTenantPackages(tenantId) {
    if (!tenantId || typeof tenantId !== 'string') {
      throw new Error('Valid tenantId is required');
    }
    if (!this.sealedPackagesByTenant.has(tenantId)) {
      this.sealedPackagesByTenant.set(tenantId, new Map());
    }
    return this.sealedPackagesByTenant.get(tenantId);
  }

  saveScenarioTemplate(tenantId, scenarioDef) {
    if (!scenarioDef || !scenarioDef.id) {
      throw new Error('scenarioDef with valid id is required');
    }
    const store = this._getTenantTemplates(tenantId);
    store.set(scenarioDef.id, Object.freeze({ ...scenarioDef, savedAt: new Date().toISOString() }));
    return store.get(scenarioDef.id);
  }

  getScenarioTemplate(tenantId, scenarioId) {
    const store = this._getTenantTemplates(tenantId);
    return store.get(scenarioId) || null;
  }

  listScenarioTemplates(tenantId) {
    const store = this._getTenantTemplates(tenantId);
    return Array.from(store.values());
  }

  saveSealedPackage(tenantId, sealedPackage) {
    if (!sealedPackage || !sealedPackage.sealId) {
      throw new Error('sealedPackage with valid sealId is required');
    }
    if (sealedPackage.tenantId !== tenantId) {
      throw new Error(`Tenant mismatch: package tenantId (${sealedPackage.tenantId}) does not match repository tenantId (${tenantId})`);
    }
    const store = this._getTenantPackages(tenantId);
    store.set(sealedPackage.sealId, sealedPackage);
    return store.get(sealedPackage.sealId);
  }

  getSealedPackage(tenantId, sealId) {
    const store = this._getTenantPackages(tenantId);
    return store.get(sealId) || null;
  }

  listSealedPackages(tenantId) {
    const store = this._getTenantPackages(tenantId);
    return Array.from(store.values());
  }

  clear() {
    this.templatesByTenant.clear();
    this.sealedPackagesByTenant.clear();
  }
}

export const defaultScenarioRepository = new ScenarioRepository();
