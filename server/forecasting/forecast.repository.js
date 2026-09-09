/**
 * server/forecasting/forecast.repository.js
 * 
 * Phase 20: Tenant-Isolated Forecast Repository
 * Immutable, tenant-isolated store for forecasts, assumptions, and sealed packages.
 */

export class ForecastRepository {
  constructor() {
    // Map<tenantId, Map<forecastId, ForecastRecord>>
    this.forecastsByTenant = new Map();
    // Map<tenantId, Map<sealId, SealedPackage>>
    this.sealedPackagesByTenant = new Map();
  }

  _getTenantForecasts(tenantId) {
    if (!tenantId || typeof tenantId !== 'string') {
      throw new Error('Valid tenantId is required');
    }
    if (!this.forecastsByTenant.has(tenantId)) {
      this.forecastsByTenant.set(tenantId, new Map());
    }
    return this.forecastsByTenant.get(tenantId);
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

  saveForecast(tenantId, forecastRecord) {
    if (!forecastRecord || !forecastRecord.forecastId) {
      throw new Error('forecastRecord with valid forecastId is required');
    }
    const store = this._getTenantForecasts(tenantId);
    store.set(forecastRecord.forecastId, forecastRecord);
    return store.get(forecastRecord.forecastId);
  }

  getForecast(tenantId, forecastId) {
    const store = this._getTenantForecasts(tenantId);
    return store.get(forecastId) || null;
  }

  listForecasts(tenantId, ticker = null) {
    const store = this._getTenantForecasts(tenantId);
    const all = Array.from(store.values());
    if (ticker) {
      return all.filter(f => f.ticker?.toUpperCase() === ticker.toUpperCase());
    }
    return all;
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
    this.forecastsByTenant.clear();
    this.sealedPackagesByTenant.clear();
  }
}

export const defaultForecastRepository = new ForecastRepository();
