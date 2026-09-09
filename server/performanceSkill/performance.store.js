import { deepFreeze, computePerformanceHash } from './performance.types.js';
import {
  validatePerformanceEvaluation,
  validateBenchmarkDefinition,
  validateRiskAdjustedPerformance,
  validateFactorExposure,
  validateTimingSkill,
  validateSelectionSkill,
  validateAllocationSkill,
  validateProcessSkill,
  validatePerformancePersistence,
  validateCapacityAssessment,
  validateManagerEvaluation,
  validatePerformanceSkillPackage
} from './performance.schema.js';

/**
 * Phase 29 — Multi-Tenant, Point-in-Time Performance & Skill Store
 */
class PerformanceSkillStore {
  constructor() {
    this.reset();
  }

  reset() {
    this.tenants = new Map();
  }

  _getTenantStore(tenantId = 'default-tenant') {
    if (!this.tenants.has(tenantId)) {
      this.tenants.set(tenantId, {
        evaluations: new Map(),
        benchmarks: new Map(),
        riskAdjusted: new Map(),
        factorExposures: new Map(),
        timingSkills: new Map(),
        selectionSkills: new Map(),
        allocationSkills: new Map(),
        processSkills: new Map(),
        persistences: new Map(),
        capacities: new Map(),
        managerEvaluations: new Map(),
        packages: new Map()
      });
    }
    return this.tenants.get(tenantId);
  }

  // --- Benchmarks ---
  saveBenchmark(benchmark, tenantId = 'default-tenant') {
    validateBenchmarkDefinition(benchmark);
    const store = this._getTenantStore(tenantId);
    const entry = {
      ...benchmark,
      storedAt: benchmark.storedAt || new Date().toISOString(),
      hash: computePerformanceHash(benchmark)
    };
    deepFreeze(entry);
    store.benchmarks.set(benchmark.benchmarkId, entry);
    return entry;
  }

  getBenchmark(benchmarkId, tenantId = 'default-tenant', asOf = null) {
    const store = this._getTenantStore(tenantId);
    const bench = store.benchmarks.get(benchmarkId);
    if (!bench) return null;
    if (asOf && bench.informationCutoff && new Date(bench.informationCutoff) > new Date(asOf)) {
      return null;
    }
    return bench;
  }

  listBenchmarks(tenantId = 'default-tenant', asOf = null) {
    const store = this._getTenantStore(tenantId);
    const list = Array.from(store.benchmarks.values());
    if (!asOf) return list;
    return list.filter(b => !b.informationCutoff || new Date(b.informationCutoff) <= new Date(asOf));
  }

  // --- Evaluations ---
  saveEvaluation(evaluation, tenantId = 'default-tenant') {
    validatePerformanceEvaluation(evaluation);
    const store = this._getTenantStore(tenantId);
    const entry = {
      ...evaluation,
      storedAt: evaluation.storedAt || new Date().toISOString(),
      hash: computePerformanceHash(evaluation)
    };
    deepFreeze(entry);
    store.evaluations.set(evaluation.evaluationId, entry);
    return entry;
  }

  getEvaluation(evaluationId, tenantId = 'default-tenant', asOf = null) {
    const store = this._getTenantStore(tenantId);
    const ev = store.evaluations.get(evaluationId);
    if (!ev) return null;
    if (asOf && ev.informationCutoff && new Date(ev.informationCutoff) > new Date(asOf)) {
      return null;
    }
    return ev;
  }

  listEvaluations(tenantId = 'default-tenant', asOf = null) {
    const store = this._getTenantStore(tenantId);
    const list = Array.from(store.evaluations.values());
    if (!asOf) return list;
    return list.filter(e => !e.informationCutoff || new Date(e.informationCutoff) <= new Date(asOf));
  }

  // --- Risk Adjusted ---
  saveRiskAdjusted(riskPerf, tenantId = 'default-tenant') {
    validateRiskAdjustedPerformance(riskPerf);
    const store = this._getTenantStore(tenantId);
    const entry = {
      ...riskPerf,
      storedAt: riskPerf.storedAt || new Date().toISOString(),
      hash: computePerformanceHash(riskPerf)
    };
    deepFreeze(entry);
    store.riskAdjusted.set(riskPerf.riskPerfId, entry);
    return entry;
  }

  getRiskAdjusted(riskPerfId, tenantId = 'default-tenant') {
    const store = this._getTenantStore(tenantId);
    return store.riskAdjusted.get(riskPerfId) || null;
  }

  // --- Factor Exposure ---
  saveFactorExposure(factExp, tenantId = 'default-tenant') {
    validateFactorExposure(factExp);
    const store = this._getTenantStore(tenantId);
    const entry = {
      ...factExp,
      storedAt: factExp.storedAt || new Date().toISOString(),
      hash: computePerformanceHash(factExp)
    };
    deepFreeze(entry);
    store.factorExposures.set(factExp.factorExposureId, entry);
    return entry;
  }

  getFactorExposure(factorExposureId, tenantId = 'default-tenant') {
    const store = this._getTenantStore(tenantId);
    return store.factorExposures.get(factorExposureId) || null;
  }

  // --- Timing Skill ---
  saveTimingSkill(timing, tenantId = 'default-tenant') {
    validateTimingSkill(timing);
    const store = this._getTenantStore(tenantId);
    const entry = {
      ...timing,
      storedAt: timing.storedAt || new Date().toISOString(),
      hash: computePerformanceHash(timing)
    };
    deepFreeze(entry);
    store.timingSkills.set(timing.timingSkillId, entry);
    return entry;
  }

  getTimingSkill(timingSkillId, tenantId = 'default-tenant') {
    const store = this._getTenantStore(tenantId);
    return store.timingSkills.get(timingSkillId) || null;
  }

  // --- Selection Skill ---
  saveSelectionSkill(sel, tenantId = 'default-tenant') {
    validateSelectionSkill(sel);
    const store = this._getTenantStore(tenantId);
    const entry = {
      ...sel,
      storedAt: sel.storedAt || new Date().toISOString(),
      hash: computePerformanceHash(sel)
    };
    deepFreeze(entry);
    store.selectionSkills.set(sel.selectionSkillId, entry);
    return entry;
  }

  getSelectionSkill(selectionSkillId, tenantId = 'default-tenant') {
    const store = this._getTenantStore(tenantId);
    return store.selectionSkills.get(selectionSkillId) || null;
  }

  // --- Allocation Skill ---
  saveAllocationSkill(alloc, tenantId = 'default-tenant') {
    validateAllocationSkill(alloc);
    const store = this._getTenantStore(tenantId);
    const entry = {
      ...alloc,
      storedAt: alloc.storedAt || new Date().toISOString(),
      hash: computePerformanceHash(alloc)
    };
    deepFreeze(entry);
    store.allocationSkills.set(alloc.allocationSkillId, entry);
    return entry;
  }

  getAllocationSkill(allocationSkillId, tenantId = 'default-tenant') {
    const store = this._getTenantStore(tenantId);
    return store.allocationSkills.get(allocationSkillId) || null;
  }

  // --- Process Skill ---
  saveProcessSkill(proc, tenantId = 'default-tenant') {
    validateProcessSkill(proc);
    const store = this._getTenantStore(tenantId);
    const entry = {
      ...proc,
      storedAt: proc.storedAt || new Date().toISOString(),
      hash: computePerformanceHash(proc)
    };
    deepFreeze(entry);
    store.processSkills.set(proc.processSkillId, entry);
    return entry;
  }

  getProcessSkill(processSkillId, tenantId = 'default-tenant') {
    const store = this._getTenantStore(tenantId);
    return store.processSkills.get(processSkillId) || null;
  }

  // --- Persistence ---
  savePersistence(pers, tenantId = 'default-tenant') {
    validatePerformancePersistence(pers);
    const store = this._getTenantStore(tenantId);
    const entry = {
      ...pers,
      storedAt: pers.storedAt || new Date().toISOString(),
      hash: computePerformanceHash(pers)
    };
    deepFreeze(entry);
    store.persistences.set(pers.persistenceId, entry);
    return entry;
  }

  getPersistence(persistenceId, tenantId = 'default-tenant') {
    const store = this._getTenantStore(tenantId);
    return store.persistences.get(persistenceId) || null;
  }

  // --- Capacity ---
  saveCapacity(cap, tenantId = 'default-tenant') {
    validateCapacityAssessment(cap);
    const store = this._getTenantStore(tenantId);
    const entry = {
      ...cap,
      storedAt: cap.storedAt || new Date().toISOString(),
      hash: computePerformanceHash(cap)
    };
    deepFreeze(entry);
    store.capacities.set(cap.capacityId, entry);
    return entry;
  }

  getCapacity(capacityId, tenantId = 'default-tenant') {
    const store = this._getTenantStore(tenantId);
    return store.capacities.get(capacityId) || null;
  }

  // --- Manager Evaluation ---
  saveManagerEvaluation(mgr, tenantId = 'default-tenant') {
    validateManagerEvaluation(mgr);
    const store = this._getTenantStore(tenantId);
    const entry = {
      ...mgr,
      storedAt: mgr.storedAt || new Date().toISOString(),
      hash: computePerformanceHash(mgr)
    };
    deepFreeze(entry);
    store.managerEvaluations.set(mgr.evaluationId, entry);
    return entry;
  }

  getManagerEvaluation(evaluationId, tenantId = 'default-tenant') {
    const store = this._getTenantStore(tenantId);
    return store.managerEvaluations.get(evaluationId) || null;
  }

  // --- Sealed Packages ---
  savePackage(pkg, tenantId = 'default-tenant') {
    validatePerformanceSkillPackage(pkg);
    const store = this._getTenantStore(tenantId);
    const entry = {
      ...pkg,
      storedAt: pkg.storedAt || new Date().toISOString(),
      hash: computePerformanceHash(pkg)
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
      evaluationsCount: store.evaluations.size,
      benchmarksCount: store.benchmarks.size,
      riskAdjustedCount: store.riskAdjusted.size,
      factorExposuresCount: store.factorExposures.size,
      timingSkillsCount: store.timingSkills.size,
      selectionSkillsCount: store.selectionSkills.size,
      allocationSkillsCount: store.allocationSkills.size,
      processSkillsCount: store.processSkills.size,
      persistencesCount: store.persistences.size,
      capacitiesCount: store.capacities.size,
      managerEvaluationsCount: store.managerEvaluations.size,
      packagesCount: store.packages.size
    };
  }
}

export const performanceStore = new PerformanceSkillStore();
