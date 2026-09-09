/**
 * Phase 17 — Tax Repository
 * Multi-Tenant Workspace Isolated In-Memory & Audit Store
 */

import { canonicalHash, deepFreeze, TaxStatus } from './tax.types.js';
import { TAX_POLICY_V1, TAX_POLICY_V2 } from './tax.config.js';

export class TaxRepository {
  constructor() {
    this.lotsByWorkspace = new Map();       // workspaceId -> Map(lotId -> lot)
    this.packagesByWorkspace = new Map();   // workspaceId -> Map(packageId -> package)
    this.policiesByWorkspace = new Map();   // workspaceId -> Map(policyId -> policy)
    this.auditLogsByWorkspace = new Map();  // workspaceId -> Array(auditRecord)

    // Seed default global policies in a default workspace
    this.savePolicy('global', TAX_POLICY_V1);
    this.savePolicy('global', TAX_POLICY_V2);
  }

  // --- Tax Lots ---
  saveLot(workspaceId, lot) {
    if (!workspaceId || !lot || !lot.lotId) return null;
    if (!this.lotsByWorkspace.has(workspaceId)) {
      this.lotsByWorkspace.set(workspaceId, new Map());
    }
    const store = this.lotsByWorkspace.get(workspaceId);
    store.set(lot.lotId, deepFreeze({ ...lot }));
    return store.get(lot.lotId);
  }

  getLot(workspaceId, lotId) {
    if (!workspaceId || !lotId) return null;
    const store = this.lotsByWorkspace.get(workspaceId);
    if (!store) return null;
    return store.get(lotId) || null;
  }

  getLotsByPortfolio(workspaceId, portfolioId) {
    if (!workspaceId || !portfolioId) return [];
    const store = this.lotsByWorkspace.get(workspaceId);
    if (!store) return [];
    return Array.from(store.values()).filter(l => l.accountId === portfolioId || l.portfolioId === portfolioId);
  }

  // --- Sealed Packages ---
  savePackage(workspaceId, pkg) {
    if (!workspaceId || !pkg || !pkg.packageId) return null;
    if (!this.packagesByWorkspace.has(workspaceId)) {
      this.packagesByWorkspace.set(workspaceId, new Map());
    }
    const store = this.packagesByWorkspace.get(workspaceId);
    store.set(pkg.packageId, deepFreeze({ ...pkg }));
    return store.get(pkg.packageId);
  }

  getPackage(workspaceId, packageId) {
    if (!workspaceId || !packageId) return null;
    const store = this.packagesByWorkspace.get(workspaceId);
    if (!store) return null;
    return store.get(packageId) || null;
  }

  getLatestPackageByPortfolio(workspaceId, portfolioId) {
    if (!workspaceId || !portfolioId) return null;
    const store = this.packagesByWorkspace.get(workspaceId);
    if (!store) return null;
    const pkgs = Array.from(store.values()).filter(p => p.portfolioId === portfolioId);
    if (pkgs.length === 0) return null;
    return pkgs.sort((a, b) => new Date(b.asOf) - new Date(a.asOf))[0];
  }

  // --- Policies ---
  savePolicy(workspaceId, policy) {
    if (!workspaceId || !policy || !policy.policyId) return null;
    if (!this.policiesByWorkspace.has(workspaceId)) {
      this.policiesByWorkspace.set(workspaceId, new Map());
    }
    const store = this.policiesByWorkspace.get(workspaceId);
    store.set(policy.policyId, deepFreeze({ ...policy }));
    return store.get(policy.policyId);
  }

  getPolicy(workspaceId, policyId) {
    if (!policyId) return null;
    // Check workspace first, then global
    const store = this.policiesByWorkspace.get(workspaceId);
    if (store && store.has(policyId)) return store.get(policyId);
    const globalStore = this.policiesByWorkspace.get('global');
    return globalStore?.get(policyId) || null;
  }

  // --- Audit Trail ---
  recordAuditEvent(workspaceId, event) {
    if (!workspaceId || !event) return null;
    if (!this.auditLogsByWorkspace.has(workspaceId)) {
      this.auditLogsByWorkspace.set(workspaceId, []);
    }
    const logs = this.auditLogsByWorkspace.get(workspaceId);
    const previousHash = logs.length > 0 ? logs[logs.length - 1].eventHash : 'GENESIS';

    const rawEvent = {
      ...event,
      workspaceId,
      sequence: logs.length + 1,
      timestamp: event.timestamp || new Date().toISOString(),
      previousHash
    };

    const eventHash = canonicalHash(rawEvent);
    const immutableEvent = deepFreeze({
      ...rawEvent,
      eventHash
    });

    logs.push(immutableEvent);
    return immutableEvent;
  }

  getAuditLogs(workspaceId, portfolioId) {
    if (!workspaceId) return [];
    const logs = this.auditLogsByWorkspace.get(workspaceId) || [];
    if (!portfolioId) return logs;
    return logs.filter(l => l.portfolioId === portfolioId);
  }

  clear() {
    this.lotsByWorkspace.clear();
    this.packagesByWorkspace.clear();
    this.policiesByWorkspace.clear();
    this.auditLogsByWorkspace.clear();
    this.savePolicy('global', TAX_POLICY_V1);
    this.savePolicy('global', TAX_POLICY_V2);
  }
}

export const taxRepository = new TaxRepository();
