/**
 * Phase 18 — Institutional Liquidity Repository
 * In-memory multi-tenant workspace-isolated storage for observations, feasibility evaluations, packages, and audit logs.
 */

import { deepFreeze, canonicalHash } from './liquidity.types.js';

class LiquidityRepository {
  constructor() {
    this.observationsByWorkspace = new Map(); // workspaceId -> Map(ticker -> observation)
    this.feasibilityByWorkspace = new Map(); // workspaceId -> Array of feasibility records
    this.packagesByWorkspace = new Map(); // workspaceId -> Map(packageId -> sealedPackage)
    this.auditLogsByWorkspace = new Map(); // workspaceId -> Array of audit events
  }

  // --- Observations ---
  saveObservation(workspaceId, observation) {
    if (!this.observationsByWorkspace.has(workspaceId)) {
      this.observationsByWorkspace.set(workspaceId, new Map());
    }
    const wsMap = this.observationsByWorkspace.get(workspaceId);
    wsMap.set(observation.ticker, deepFreeze({ ...observation }));
    return observation;
  }

  getObservation(workspaceId, ticker) {
    if (!this.observationsByWorkspace.has(workspaceId)) return null;
    return this.observationsByWorkspace.get(workspaceId).get(ticker) || null;
  }

  getAllObservations(workspaceId) {
    if (!this.observationsByWorkspace.has(workspaceId)) return [];
    return Array.from(this.observationsByWorkspace.get(workspaceId).values());
  }

  // --- Feasibility Records ---
  saveFeasibility(workspaceId, record) {
    if (!this.feasibilityByWorkspace.has(workspaceId)) {
      this.feasibilityByWorkspace.set(workspaceId, []);
    }
    const rec = deepFreeze({
      ...record,
      id: `FEAS-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      recordedAt: new Date().toISOString()
    });
    this.feasibilityByWorkspace.get(workspaceId).push(rec);
    return rec;
  }

  getFeasibilityRecords(workspaceId) {
    if (!this.feasibilityByWorkspace.has(workspaceId)) return [];
    return [...this.feasibilityByWorkspace.get(workspaceId)];
  }

  // --- Sealed Packages ---
  savePackage(workspaceId, sealedPackage) {
    if (!this.packagesByWorkspace.has(workspaceId)) {
      this.packagesByWorkspace.set(workspaceId, new Map());
    }
    this.packagesByWorkspace.get(workspaceId).set(sealedPackage.packageId, deepFreeze(sealedPackage));
    return sealedPackage;
  }

  getPackage(workspaceId, packageId) {
    if (!this.packagesByWorkspace.has(workspaceId)) return null;
    return this.packagesByWorkspace.get(workspaceId).get(packageId) || null;
  }

  // --- Audit Trail ---
  recordAuditEvent(workspaceId, event) {
    if (!this.auditLogsByWorkspace.has(workspaceId)) {
      this.auditLogsByWorkspace.set(workspaceId, []);
    }
    const auditRecord = deepFreeze({
      eventId: `AUDIT-LIQ-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      workspaceId,
      timestamp: new Date().toISOString(),
      ...event,
      eventHash: canonicalHash(event)
    });
    this.auditLogsByWorkspace.get(workspaceId).push(auditRecord);
    return auditRecord;
  }

  getAuditLogs(workspaceId) {
    if (!this.auditLogsByWorkspace.has(workspaceId)) return [];
    return [...this.auditLogsByWorkspace.get(workspaceId)];
  }

  // Clear workspace for testing
  clearWorkspace(workspaceId) {
    this.observationsByWorkspace.delete(workspaceId);
    this.feasibilityByWorkspace.delete(workspaceId);
    this.packagesByWorkspace.delete(workspaceId);
    this.auditLogsByWorkspace.delete(workspaceId);
  }

  clearAll() {
    this.observationsByWorkspace.clear();
    this.feasibilityByWorkspace.clear();
    this.packagesByWorkspace.clear();
    this.auditLogsByWorkspace.clear();
  }
}

export const liquidityRepository = new LiquidityRepository();
