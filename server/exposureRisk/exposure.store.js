import { deepFreeze, computeExposureHash } from './exposure.types.js';
import {
  validateExposureObservation,
  validateFactorDefinition,
  validatePortfolioExposure,
  validateRiskDecomposition,
  validateCommonDriver,
  validateHiddenConcentration,
  validateExposureLimit,
  validateExposureBreach,
  validateExposureChange,
  validateExposureRiskPackage
} from './exposure.schema.js';

/**
 * Phase 30 — Multi-Tenant, Point-in-Time Exposure & Risk Store
 */
class ExposureRiskStore {
  constructor() {
    this.reset();
  }

  reset() {
    this.tenants = new Map();
  }

  _getTenantStore(tenantId = 'default-tenant') {
    if (!this.tenants.has(tenantId)) {
      this.tenants.set(tenantId, {
        observations: new Map(),
        factorDefinitions: new Map(),
        portfolioExposures: new Map(),
        riskDecompositions: new Map(),
        commonDrivers: new Map(),
        hiddenConcentrations: new Map(),
        exposureLimits: new Map(),
        exposureBreaches: new Map(),
        exposureChanges: new Map(),
        packages: new Map()
      });
    }
    return this.tenants.get(tenantId);
  }

  // --- Factor Definitions ---
  saveFactorDefinition(factDef, tenantId = 'default-tenant') {
    validateFactorDefinition(factDef);
    const store = this._getTenantStore(tenantId);
    const entry = {
      ...factDef,
      storedAt: factDef.storedAt || new Date().toISOString(),
      hash: computeExposureHash(factDef)
    };
    deepFreeze(entry);
    store.factorDefinitions.set(factDef.factorId, entry);
    return entry;
  }

  getFactorDefinition(factorId, tenantId = 'default-tenant', asOf = null) {
    const store = this._getTenantStore(tenantId);
    const fact = store.factorDefinitions.get(factorId);
    if (!fact) return null;
    if (asOf && fact.informationCutoff && new Date(fact.informationCutoff) > new Date(asOf)) {
      return null;
    }
    return fact;
  }

  listFactorDefinitions(tenantId = 'default-tenant', asOf = null) {
    const store = this._getTenantStore(tenantId);
    const list = Array.from(store.factorDefinitions.values());
    if (!asOf) return list;
    return list.filter(f => !f.informationCutoff || new Date(f.informationCutoff) <= new Date(asOf));
  }

  // --- Exposure Observations ---
  saveExposureObservation(obs, tenantId = 'default-tenant') {
    validateExposureObservation(obs);
    const store = this._getTenantStore(tenantId);
    const entry = {
      ...obs,
      storedAt: obs.storedAt || new Date().toISOString(),
      hash: computeExposureHash(obs)
    };
    deepFreeze(entry);
    store.observations.set(obs.observationId, entry);
    return entry;
  }

  getExposureObservation(observationId, tenantId = 'default-tenant', asOf = null) {
    const store = this._getTenantStore(tenantId);
    const obs = store.observations.get(observationId);
    if (!obs) return null;
    if (asOf && obs.informationCutoff && new Date(obs.informationCutoff) > new Date(asOf)) {
      return null;
    }
    return obs;
  }

  listExposureObservations(tenantId = 'default-tenant', asOf = null) {
    const store = this._getTenantStore(tenantId);
    const list = Array.from(store.observations.values());
    if (!asOf) return list;
    return list.filter(o => !o.informationCutoff || new Date(o.informationCutoff) <= new Date(asOf));
  }

  // --- Portfolio Exposure ---
  savePortfolioExposure(portExp, tenantId = 'default-tenant') {
    validatePortfolioExposure(portExp);
    const store = this._getTenantStore(tenantId);
    const entry = {
      ...portExp,
      storedAt: portExp.storedAt || new Date().toISOString(),
      hash: computeExposureHash(portExp)
    };
    deepFreeze(entry);
    store.portfolioExposures.set(portExp.portfolioExposureId, entry);
    return entry;
  }

  getPortfolioExposure(portfolioExposureId, tenantId = 'default-tenant', asOf = null) {
    const store = this._getTenantStore(tenantId);
    const exp = store.portfolioExposures.get(portfolioExposureId);
    if (!exp) return null;
    if (asOf && exp.informationCutoff && new Date(exp.informationCutoff) > new Date(asOf)) {
      return null;
    }
    return exp;
  }

  listPortfolioExposures(tenantId = 'default-tenant', asOf = null) {
    const store = this._getTenantStore(tenantId);
    const list = Array.from(store.portfolioExposures.values());
    if (!asOf) return list;
    return list.filter(e => !e.informationCutoff || new Date(e.informationCutoff) <= new Date(asOf));
  }

  // --- Risk Decomposition ---
  saveRiskDecomposition(risk, tenantId = 'default-tenant') {
    validateRiskDecomposition(risk);
    const store = this._getTenantStore(tenantId);
    const entry = {
      ...risk,
      storedAt: risk.storedAt || new Date().toISOString(),
      hash: computeExposureHash(risk)
    };
    deepFreeze(entry);
    store.riskDecompositions.set(risk.riskDecompId, entry);
    return entry;
  }

  getRiskDecomposition(riskDecompId, tenantId = 'default-tenant') {
    const store = this._getTenantStore(tenantId);
    return store.riskDecompositions.get(riskDecompId) || null;
  }

  // --- Common Drivers ---
  saveCommonDriver(driver, tenantId = 'default-tenant') {
    validateCommonDriver(driver);
    const store = this._getTenantStore(tenantId);
    const entry = {
      ...driver,
      storedAt: driver.storedAt || new Date().toISOString(),
      hash: computeExposureHash(driver)
    };
    deepFreeze(entry);
    store.commonDrivers.set(driver.driverId, entry);
    return entry;
  }

  getCommonDriver(driverId, tenantId = 'default-tenant') {
    const store = this._getTenantStore(tenantId);
    return store.commonDrivers.get(driverId) || null;
  }

  listCommonDrivers(tenantId = 'default-tenant') {
    const store = this._getTenantStore(tenantId);
    return Array.from(store.commonDrivers.values());
  }

  // --- Hidden Concentration ---
  saveHiddenConcentration(conc, tenantId = 'default-tenant') {
    validateHiddenConcentration(conc);
    const store = this._getTenantStore(tenantId);
    const entry = {
      ...conc,
      storedAt: conc.storedAt || new Date().toISOString(),
      hash: computeExposureHash(conc)
    };
    deepFreeze(entry);
    store.hiddenConcentrations.set(conc.concentrationId, entry);
    return entry;
  }

  getHiddenConcentration(concentrationId, tenantId = 'default-tenant') {
    const store = this._getTenantStore(tenantId);
    return store.hiddenConcentrations.get(concentrationId) || null;
  }

  // --- Exposure Limits ---
  saveExposureLimit(limit, tenantId = 'default-tenant') {
    validateExposureLimit(limit);
    const store = this._getTenantStore(tenantId);
    const entry = {
      ...limit,
      storedAt: limit.storedAt || new Date().toISOString(),
      hash: computeExposureHash(limit)
    };
    deepFreeze(entry);
    store.exposureLimits.set(limit.limitId, entry);
    return entry;
  }

  listExposureLimits(tenantId = 'default-tenant') {
    const store = this._getTenantStore(tenantId);
    return Array.from(store.exposureLimits.values());
  }

  // --- Exposure Breaches ---
  saveExposureBreach(breach, tenantId = 'default-tenant') {
    validateExposureBreach(breach);
    const store = this._getTenantStore(tenantId);
    const entry = {
      ...breach,
      storedAt: breach.storedAt || new Date().toISOString(),
      hash: computeExposureHash(breach)
    };
    deepFreeze(entry);
    store.exposureBreaches.set(breach.breachId, entry);
    return entry;
  }

  listExposureBreaches(tenantId = 'default-tenant') {
    const store = this._getTenantStore(tenantId);
    return Array.from(store.exposureBreaches.values());
  }

  // --- Exposure Changes ---
  saveExposureChange(change, tenantId = 'default-tenant') {
    validateExposureChange(change);
    const store = this._getTenantStore(tenantId);
    const entry = {
      ...change,
      storedAt: change.storedAt || new Date().toISOString(),
      hash: computeExposureHash(change)
    };
    deepFreeze(entry);
    store.exposureChanges.set(change.changeId, entry);
    return entry;
  }

  listExposureChanges(tenantId = 'default-tenant') {
    const store = this._getTenantStore(tenantId);
    return Array.from(store.exposureChanges.values());
  }

  // --- Packages ---
  savePackage(pkg, tenantId = 'default-tenant') {
    validateExposureRiskPackage(pkg);
    const store = this._getTenantStore(tenantId);
    const entry = {
      ...pkg,
      storedAt: pkg.storedAt || new Date().toISOString(),
      hash: computeExposureHash(pkg)
    };
    deepFreeze(entry);
    store.packages.set(pkg.packageId, entry);
    return entry;
  }

  getPackage(packageId, tenantId = 'default-tenant') {
    const store = this._getTenantStore(tenantId);
    return store.packages.get(packageId) || null;
  }

  listPackages(tenantId = 'default-tenant') {
    const store = this._getTenantStore(tenantId);
    return Array.from(store.packages.values());
  }

  getStats(tenantId = 'default-tenant') {
    const store = this._getTenantStore(tenantId);
    return {
      observationsCount: store.observations.size,
      factorDefinitionsCount: store.factorDefinitions.size,
      portfolioExposuresCount: store.portfolioExposures.size,
      riskDecompositionsCount: store.riskDecompositions.size,
      commonDriversCount: store.commonDrivers.size,
      hiddenConcentrationsCount: store.hiddenConcentrations.size,
      exposureLimitsCount: store.exposureLimits.size,
      exposureBreachesCount: store.exposureBreaches.size,
      exposureChangesCount: store.exposureChanges.size,
      packagesCount: store.packages.size
    };
  }
}

export const exposureStore = new ExposureRiskStore();
