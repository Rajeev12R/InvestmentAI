/**
 * Phase 16 — Institutional Compliance Repository
 * Multi-tenant workspace-isolated storage for compliance packages, evaluations, breaches, and exceptions.
 */

import { deepFreeze } from './compliance.types.js';

export class ComplianceRepository {
  constructor() {
    // workspaceId -> Array of sealed compliance packages
    this.packages = new Map();
    // workspaceId -> Map: breachId -> breach object
    this.breaches = new Map();
    // workspaceId -> Map: exceptionId -> exception object
    this.exceptions = new Map();
    // workspaceId -> Array of raw evaluations
    this.evaluations = new Map();
  }

  // --- PACKAGES ---
  savePackage(pkg) {
    if (!pkg || !pkg.workspaceId || !pkg.packageId) {
      throw new Error('Invalid compliance package for storage');
    }
    const ws = pkg.workspaceId;
    if (!this.packages.has(ws)) {
      this.packages.set(ws, []);
    }
    this.packages.get(ws).unshift(deepFreeze(pkg));
    return pkg;
  }

  getPackageById(packageId, workspaceId) {
    if (!this.packages.has(workspaceId)) return null;
    return this.packages.get(workspaceId).find(p => p.packageId === packageId) || null;
  }

  listPackagesByPortfolio(portfolioId, workspaceId) {
    if (!this.packages.has(workspaceId)) return [];
    return this.packages.get(workspaceId).filter(p => p.portfolioId === portfolioId);
  }

  // --- BREACHES ---
  saveBreach(breach) {
    if (!breach || !breach.workspaceId || !breach.breachId) {
      throw new Error('Invalid breach object for storage');
    }
    const ws = breach.workspaceId;
    if (!this.breaches.has(ws)) {
      this.breaches.set(ws, new Map());
    }
    this.breaches.get(ws).set(breach.breachId, deepFreeze(breach));
    return breach;
  }

  getBreachById(breachId, workspaceId) {
    if (!this.breaches.has(workspaceId)) return null;
    return this.breaches.get(workspaceId).get(breachId) || null;
  }

  listBreachesByPortfolio(portfolioId, workspaceId) {
    if (!this.breaches.has(workspaceId)) return [];
    const wsBreaches = this.breaches.get(workspaceId);
    const result = [];
    for (const [_, b] of wsBreaches.entries()) {
      if (b.portfolioId === portfolioId) {
        result.push(b);
      }
    }
    return result;
  }

  // --- EXCEPTIONS ---
  saveException(exception) {
    if (!exception || !exception.workspaceId || !exception.exceptionId) {
      throw new Error('Invalid exception object for storage');
    }
    const ws = exception.workspaceId;
    if (!this.exceptions.has(ws)) {
      this.exceptions.set(ws, new Map());
    }
    this.exceptions.get(ws).set(exception.exceptionId, deepFreeze(exception));
    return exception;
  }

  getExceptionById(exceptionId, workspaceId) {
    if (!this.exceptions.has(workspaceId)) return null;
    return this.exceptions.get(workspaceId).get(exceptionId) || null;
  }

  listExceptionsByPortfolio(portfolioId, workspaceId) {
    if (!this.exceptions.has(workspaceId)) return [];
    const wsExceptions = this.exceptions.get(workspaceId);
    const result = [];
    for (const [_, e] of wsExceptions.entries()) {
      if (e.portfolioId === portfolioId) {
        result.push(e);
      }
    }
    return result;
  }

  // --- EVALUATIONS ---
  saveEvaluation(evaluation) {
    if (!evaluation || !evaluation.workspaceId || !evaluation.complianceId) {
      throw new Error('Invalid evaluation object for storage');
    }
    const ws = evaluation.workspaceId;
    if (!this.evaluations.has(ws)) {
      this.evaluations.set(ws, []);
    }
    this.evaluations.get(ws).unshift(deepFreeze(evaluation));
    return evaluation;
  }

  listEvaluationsByPortfolio(portfolioId, workspaceId) {
    if (!this.evaluations.has(workspaceId)) return [];
    return this.evaluations.get(workspaceId).filter(e => e.portfolioId === portfolioId);
  }

  clear() {
    this.packages.clear();
    this.breaches.clear();
    this.exceptions.clear();
    this.evaluations.clear();
  }
}

export const complianceRepository = new ComplianceRepository();
