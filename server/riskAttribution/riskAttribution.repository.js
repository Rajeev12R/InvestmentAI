/**
 * server/riskAttribution/riskAttribution.repository.js
 * 
 * Phase 32: Multi-Tenant Point-in-Time Repository & Temporal Store
 * Multi-tenant isolation, immutable historical snapshots @ T1, versioned restatements, and audit trail.
 */

import { RiskAttributionPackageBuilder } from './riskAttribution.package.js';

export class RiskAttributionRepository {
  constructor() {
    // Map: tenantId -> Map<packageId, sealedPackage>
    this.packagesByTenant = new Map();
    // Map: tenantId -> Array<{ timestamp, action, packageId, portfolioSnapshotId, user }>
    this.auditLogs = new Map();
  }

  /**
   * Save Sealed Package with Multi-Tenant Isolation & Audit Trail
   */
  savePackage(tenantId, sealedPackage, user = 'system') {
    if (!tenantId || typeof tenantId !== 'string') {
      throw new Error('Valid tenantId is required');
    }
    if (!sealedPackage || !sealedPackage.packageId) {
      throw new Error('Valid sealedPackage with packageId is required');
    }

    // Verify package integrity before persisting
    const integrityCheck = RiskAttributionPackageBuilder.verifyPackageIntegrity(sealedPackage);
    if (!integrityCheck.isValid) {
      throw new Error(`Cannot persist corrupted package: ${integrityCheck.reason}`);
    }

    if (!this.packagesByTenant.has(tenantId)) {
      this.packagesByTenant.set(tenantId, new Map());
      this.auditLogs.set(tenantId, []);
    }

    const tenantStore = this.packagesByTenant.get(tenantId);
    tenantStore.set(sealedPackage.packageId, sealedPackage);

    const logEntry = {
      timestamp: new Date().toISOString(),
      action: 'SAVE_ATTRIBUTION_PACKAGE',
      packageId: sealedPackage.packageId,
      portfolioSnapshotId: sealedPackage.portfolioSnapshotId,
      user
    };
    this.auditLogs.get(tenantId).push(logEntry);

    return sealedPackage;
  }

  /**
   * Get Package by ID with Strict Tenant Isolation
   */
  getPackage(tenantId, packageId) {
    if (!this.packagesByTenant.has(tenantId)) return null;
    return this.packagesByTenant.get(tenantId).get(packageId) || null;
  }

  /**
   * Get Point-in-Time Attribution Snapshot @ T1
   */
  getAttributionAsOf(tenantId, portfolioSnapshotId, asOfCutoff) {
    if (!this.packagesByTenant.has(tenantId)) return null;
    const tenantStore = this.packagesByTenant.get(tenantId);
    const cutoffTime = new Date(asOfCutoff).getTime();

    const matching = [];
    for (const pkg of tenantStore.values()) {
      if (pkg.portfolioSnapshotId === portfolioSnapshotId) {
        const pkgTime = new Date(pkg.asOf || pkg.sealedAt).getTime();
        if (pkgTime <= cutoffTime) {
          matching.push(pkg);
        }
      }
    }

    if (matching.length === 0) return null;
    // Sort descending by asOf, then sealedAt to get the latest valid snapshot before or at cutoff
    matching.sort((a, b) => {
      const timeDiff = new Date(b.asOf || b.sealedAt).getTime() - new Date(a.asOf || a.sealedAt).getTime();
      if (timeDiff !== 0) return timeDiff;
      return new Date(b.sealedAt).getTime() - new Date(a.sealedAt).getTime();
    });
    return matching[0];
  }

  /**
   * Record a Versioned Restatement
   */
  recordRestatement(tenantId, originalPackageId, restatedPackage, reason = 'DATA_REVISION', user = 'system') {
    const orig = this.getPackage(tenantId, originalPackageId);
    if (!orig) {
      throw new Error(`Original package ${originalPackageId} not found in tenant ${tenantId}`);
    }

    // Persist new restated package without overwriting the original
    const saved = this.savePackage(tenantId, restatedPackage, user);

    this.auditLogs.get(tenantId).push({
      timestamp: new Date().toISOString(),
      action: 'RESTATE_ATTRIBUTION_PACKAGE',
      originalPackageId,
      restatedPackageId: restatedPackage.packageId,
      reason,
      user
    });

    return saved;
  }

  /**
   * List Packages for Tenant
   */
  listPackages(tenantId) {
    if (!this.packagesByTenant.has(tenantId)) return [];
    return Array.from(this.packagesByTenant.get(tenantId).values());
  }

  /**
   * Get Audit Logs for Tenant
   */
  getAuditLogs(tenantId) {
    return this.auditLogs.get(tenantId) || [];
  }

  /**
   * Clear (for testing)
   */
  clear() {
    this.packagesByTenant.clear();
    this.auditLogs.clear();
  }
}

export const riskAttributionRepository = new RiskAttributionRepository();
