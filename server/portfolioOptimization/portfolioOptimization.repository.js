/**
 * server/portfolioOptimization/portfolioOptimization.repository.js
 * 
 * Phase 33: Multi-Tenant Point-in-Time Optimization Repository & Audit Store
 */

import { deepFreeze } from './portfolioOptimization.types.js';

export class PortfolioOptimizationRepository {
  constructor() {
    // Multi-tenant store: tenantId -> Map(packageId -> sealedPackage)
    this.packages = new Map();
    // Snapshot temporal index: tenantId -> Map(snapshotId -> Array of packages sorted by sealedAt)
    this.snapshotIndex = new Map();
  }

  /**
   * Saves a sealed optimization package into the multi-tenant store.
   */
  savePackage(tenantId, sealedPackage) {
    if (!tenantId || !sealedPackage || !sealedPackage.packageId) {
      throw new Error('Valid tenantId and sealedPackage required');
    }

    if (!this.packages.has(tenantId)) {
      this.packages.set(tenantId, new Map());
      this.snapshotIndex.set(tenantId, new Map());
    }

    const tenantPackages = this.packages.get(tenantId);
    tenantPackages.set(sealedPackage.packageId, sealedPackage);

    if (sealedPackage.portfolioSnapshotId) {
      const snapMap = this.snapshotIndex.get(tenantId);
      if (!snapMap.has(sealedPackage.portfolioSnapshotId)) {
        snapMap.set(sealedPackage.portfolioSnapshotId, []);
      }
      snapMap.get(sealedPackage.portfolioSnapshotId).push(sealedPackage);
    }

    return true;
  }

  /**
   * Retrieves a sealed optimization package by ID with strict tenant isolation.
   */
  getPackage(tenantId, packageId) {
    if (!this.packages.has(tenantId)) return null;
    return this.packages.get(tenantId).get(packageId) || null;
  }

  /**
   * Retrieves the latest optimization decision valid as of a Point-in-Time temporal cutoff.
   */
  getOptimizationAsOf(tenantId, snapshotId, asOfTimestamp) {
    if (!this.snapshotIndex.has(tenantId)) return null;
    const snapMap = this.snapshotIndex.get(tenantId);
    if (!snapMap.has(snapshotId)) return null;

    const list = snapMap.get(snapshotId);
    const cutoff = new Date(asOfTimestamp).getTime();

    // Find the latest package sealed at or before cutoff
    for (let i = list.length - 1; i >= 0; i--) {
      const pkgTime = new Date(list[i].asOf || list[i].sealedAt).getTime();
      if (pkgTime <= cutoff) {
        return list[i];
      }
    }

    return null;
  }

  /**
   * Lists all packages for a tenant.
   */
  listPackages(tenantId) {
    if (!this.packages.has(tenantId)) return [];
    return Array.from(this.packages.get(tenantId).values());
  }

  /**
   * Clears repository data (for test isolation).
   */
  clear() {
    this.packages.clear();
    this.snapshotIndex.clear();
  }
}

export const portfolioOptimizationRepository = new PortfolioOptimizationRepository();
