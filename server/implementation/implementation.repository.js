/**
 * Phase 15 — Implementation Repository
 * 
 * Provides workspace-isolated, immutable persistence for implementation packages,
 * plans, snapshots, reconciliations, and human approval audits.
 */

import { deepFreeze } from './implementation.types.js';

export class ImplementationRepository {
  constructor() {
    this.packages = new Map();         // packageId -> package
    this.plans = new Map();            // planId -> plan
    this.snapshots = new Map();        // snapshotId -> snapshot
    this.approvals = new Map();        // approvalId -> approval record
    this.reviews = new Map();          // reviewId -> review record
  }

  savePackage(pkg) {
    if (!pkg || !pkg.packageId || !pkg.workspaceId) {
      throw new Error('Invalid implementation package: missing packageId or workspaceId');
    }
    const frozen = deepFreeze({ ...pkg });
    this.packages.set(pkg.packageId, frozen);
    return frozen;
  }

  getPackageById(packageId, workspaceId) {
    const pkg = this.packages.get(packageId);
    if (!pkg) return null;
    if (workspaceId && pkg.workspaceId !== workspaceId) return null; // IDOR protection
    return pkg;
  }

  listPackagesByPortfolio(portfolioId, workspaceId) {
    const results = [];
    for (const pkg of this.packages.values()) {
      if (pkg.portfolioId === portfolioId && (!workspaceId || pkg.workspaceId === workspaceId)) {
        results.push(pkg);
      }
    }
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  listPackagesByWorkspace(workspaceId) {
    const results = [];
    for (const pkg of this.packages.values()) {
      if (pkg.workspaceId === workspaceId) {
        results.push(pkg);
      }
    }
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  savePlan(plan) {
    if (!plan || !plan.planId || !plan.workspaceId) {
      throw new Error('Invalid implementation plan: missing planId or workspaceId');
    }
    const frozen = deepFreeze({ ...plan });
    this.plans.set(plan.planId, frozen);
    return frozen;
  }

  getPlanById(planId, workspaceId) {
    const plan = this.plans.get(planId);
    if (!plan) return null;
    if (workspaceId && plan.workspaceId !== workspaceId) return null;
    return plan;
  }

  saveSnapshot(snapshot) {
    if (!snapshot || !snapshot.snapshotId || !snapshot.workspaceId) {
      throw new Error('Invalid snapshot: missing snapshotId or workspaceId');
    }
    const frozen = deepFreeze({ ...snapshot });
    this.snapshots.set(snapshot.snapshotId, frozen);
    return frozen;
  }

  getSnapshotById(snapshotId, workspaceId) {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) return null;
    if (workspaceId && snapshot.workspaceId !== workspaceId) return null;
    return snapshot;
  }

  saveApproval(approval) {
    if (!approval || !approval.planId || !approval.workspaceId) {
      throw new Error('Invalid approval: missing planId or workspaceId');
    }
    const approvalId = `APP-${approval.planId}`;
    const frozen = deepFreeze({ ...approval, approvalId });
    this.approvals.set(approvalId, frozen);
    return frozen;
  }

  getApprovalByPlanId(planId, workspaceId) {
    const approval = this.approvals.get(`APP-${planId}`);
    if (!approval) return null;
    if (workspaceId && approval.workspaceId !== workspaceId) return null;
    return approval;
  }

  clear() {
    this.packages.clear();
    this.plans.clear();
    this.snapshots.clear();
    this.approvals.clear();
    this.reviews.clear();
  }
}

export const implementationRepository = new ImplementationRepository();
