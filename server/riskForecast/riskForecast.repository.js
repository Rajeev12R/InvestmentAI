import { deepFreeze } from './riskForecast.types.js';

/**
 * Phase 31 — Multi-Tenant Point-in-Time Risk Forecast Repository
 */
export class RiskForecastRepository {
  constructor() {
    // Map<tenantId, Map<packageId, SealedPackage>>
    this.packages = new Map();
    // Map<tenantId, Map<budgetId, Budget>>
    this.budgets = new Map();
    // Map<tenantId, Array<AuditEvent>>
    this.auditLogs = new Map();
  }

  /**
   * Save a sealed package under tenant isolation
   */
  savePackage(pkg, tenantId = 'tenant_default') {
    if (!pkg || !pkg.packageId) {
      throw new Error('Valid package with packageId is required');
    }
    const tenant = pkg.tenantId || tenantId;
    if (!this.packages.has(tenant)) {
      this.packages.set(tenant, new Map());
    }
    this.packages.get(tenant).set(pkg.packageId, pkg);

    this.recordAudit({
      tenantId: tenant,
      action: 'SAVE_PACKAGE',
      packageId: pkg.packageId,
      portfolioSnapshotId: pkg.portfolioSnapshotId,
      timestamp: new Date().toISOString()
    });

    return pkg;
  }

  /**
   * Get package by ID for specific tenant
   */
  getPackage(packageId, tenantId = 'tenant_default') {
    if (!this.packages.has(tenantId)) return null;
    return this.packages.get(tenantId).get(packageId) || null;
  }

  /**
   * List packages for tenant with optional point-in-time filtering
   */
  listPackages(tenantId = 'tenant_default', asOf = null) {
    if (!this.packages.has(tenantId)) return [];
    const list = Array.from(this.packages.get(tenantId).values());
    if (asOf) {
      const asOfTime = new Date(asOf).getTime();
      return list.filter(p => new Date(p.asOf).getTime() <= asOfTime);
    }
    return list;
  }

  /**
   * Save or update a risk budget under tenant isolation with audit trail
   */
  saveBudget(budget, user = 'SYSTEM', tenantId = 'tenant_default') {
    if (!budget || !budget.budgetId) {
      throw new Error('Valid budget with budgetId is required');
    }
    if (!this.budgets.has(tenantId)) {
      this.budgets.set(tenantId, new Map());
    }
    this.budgets.get(tenantId).set(budget.budgetId, deepFreeze({ ...budget, tenantId }));

    this.recordAudit({
      tenantId,
      user,
      action: 'SAVE_BUDGET',
      budgetId: budget.budgetId,
      scope: budget.scope,
      metric: budget.metric,
      limit: budget.limit,
      timestamp: new Date().toISOString()
    });

    return budget;
  }

  /**
   * Get budgets for tenant
   */
  getBudgets(tenantId = 'tenant_default') {
    if (!this.budgets.has(tenantId)) return [];
    return Array.from(this.budgets.get(tenantId).values());
  }

  /**
   * Record append-only audit event
   */
  recordAudit(event) {
    const tenant = event.tenantId || 'tenant_default';
    if (!this.auditLogs.has(tenant)) {
      this.auditLogs.set(tenant, []);
    }
    this.auditLogs.get(tenant).push(Object.freeze({ ...event, id: `AUDIT_${Date.now()}_${Math.random().toString(36).substring(2, 7)}` }));
  }

  /**
   * Get audit logs for tenant
   */
  getAuditLogs(tenantId = 'tenant_default') {
    if (!this.auditLogs.has(tenantId)) return [];
    return [...this.auditLogs.get(tenantId)];
  }

  /**
   * Clear repository (for test isolation)
   */
  clear() {
    this.packages.clear();
    this.budgets.clear();
    this.auditLogs.clear();
  }
}

export const riskForecastRepository = new RiskForecastRepository();
