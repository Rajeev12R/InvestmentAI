import { RiskForecastRepository } from '../riskForecast/riskForecast.repository.js';
import { RiskForecastObservationEngine } from '../riskForecast/riskForecast.observation.engine.js';
import { BudgetScope } from '../riskForecast/riskForecast.types.js';

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  passed++;
}

console.log('--- SUITE 2: Multi-Tenant Repository, Temporal Integrity & Audit Store ---');

const repo = new RiskForecastRepository();

// 1. Multi-Tenant Package Isolation
const pkgT1 = { packageId: 'PKG_T1_001', portfolioSnapshotId: 'PS_T1', asOf: '2026-09-01T00:00:00.000Z', tenantId: 'tenant_alpha' };
const pkgT2 = { packageId: 'PKG_T2_001', portfolioSnapshotId: 'PS_T2', asOf: '2026-09-01T00:00:00.000Z', tenantId: 'tenant_beta' };

repo.savePackage(pkgT1, 'tenant_alpha');
repo.savePackage(pkgT2, 'tenant_beta');

assert(repo.getPackage('PKG_T1_001', 'tenant_alpha')?.packageId === 'PKG_T1_001', 'Tenant Alpha can read own package');
assert(repo.getPackage('PKG_T1_001', 'tenant_beta') === null, 'Tenant Beta CANNOT read Tenant Alpha package (cross-tenant isolated)');
assert(repo.getPackage('PKG_T2_001', 'tenant_beta')?.packageId === 'PKG_T2_001', 'Tenant Beta can read own package');
assert(repo.getPackage('PKG_T2_001', 'tenant_alpha') === null, 'Tenant Alpha CANNOT read Tenant Beta package');

// 2. Point-in-Time Package Queries
const pkgT1_old = { packageId: 'PKG_T1_OLD', portfolioSnapshotId: 'PS_T1_OLD', asOf: '2026-08-01T00:00:00.000Z', tenantId: 'tenant_alpha' };
repo.savePackage(pkgT1_old, 'tenant_alpha');

const allAlpha = repo.listPackages('tenant_alpha');
assert(allAlpha.length === 2, 'Tenant Alpha has 2 packages total');

const pitAlpha = repo.listPackages('tenant_alpha', '2026-08-15T00:00:00.000Z');
assert(pitAlpha.length === 1 && pitAlpha[0].packageId === 'PKG_T1_OLD', 'Point-in-time filter returns only historical packages <= asOf');

// 3. Risk Budget Multi-Tenant Storage & Audit Trail
const budgetA = { budgetId: 'RB_A1', scope: BudgetScope.PORTFOLIO, metric: 'Volatility', limit: 15.0 };
repo.saveBudget(budgetA, 'USER_ALICE', 'tenant_alpha');

const alphaBudgets = repo.getBudgets('tenant_alpha');
assert(alphaBudgets.length === 1 && alphaBudgets[0].budgetId === 'RB_A1', 'Tenant Alpha has saved budget');
assert(repo.getBudgets('tenant_beta').length === 0, 'Tenant Beta has zero budgets');

const alphaAudits = repo.getAuditLogs('tenant_alpha');
assert(alphaAudits.length >= 3, 'Tenant Alpha has audit entries for saved packages and budgets');
assert(alphaAudits.some(a => a.action === 'SAVE_BUDGET' && a.user === 'USER_ALICE'), 'Audit trail records action and user correctly');
assert(repo.getAuditLogs('tenant_beta').length === 1, 'Tenant Beta audit log is isolated');

// 4. Observation Temporal Filtering & Replay Safeguards
const mixedPriceSeries = {
  AAPL: [
    { timestamp: '2026-08-28T00:00:00.000Z', close: 150.0 },
    { timestamp: '2026-08-29T00:00:00.000Z', close: 152.0 },
    { timestamp: '2026-08-30T00:00:00.000Z', close: 155.0 },
    { timestamp: '2026-09-02T00:00:00.000Z', close: 160.0 } // FUTURE DATA relative to 2026-08-31
  ]
};

const obsProcessed = RiskForecastObservationEngine.processObservations({
  priceSeriesBySymbol: mixedPriceSeries,
  asOf: '2026-08-31T00:00:00.000Z',
  minObservations: 2
});

assert(obsProcessed.returnsBySymbol.AAPL.length === 2, 'Future observation on 2026-09-02 strictly filtered out');
assert(Math.abs(obsProcessed.returnsBySymbol.AAPL[0] - ((152 - 150) / 150)) < 1e-6, 'Return 1 is exactly calculated');
assert(Math.abs(obsProcessed.returnsBySymbol.AAPL[1] - ((155 - 152) / 152)) < 1e-6, 'Return 2 is exactly calculated');

// 5. Multi-Asset Returns Alignment
const returnsBySymbol = {
  AAPL: [0.01, 0.02, -0.01, 0.03],
  MSFT: [0.005, -0.01, 0.015, 0.02, 0.01] // 5 obs vs 4 obs
};
const aligned = RiskForecastObservationEngine.alignMultiAssetReturns(returnsBySymbol);
assert(aligned.observationCount === 4, 'Aligned matrix truncated to common minimum length 4');
assert(aligned.alignedMatrix[0].length === 4 && aligned.alignedMatrix[1].length === 4, 'All rows have equal length');
assert(aligned.alignedMatrix[1][3] === 0.01, 'Most recent observations retained');

console.log(`PASSED: ${passed}`);
