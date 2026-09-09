import { RiskForecastExplanationDAG } from '../riskForecast/riskForecast.explanation.js';
import { RiskForecastPackageBuilder } from '../riskForecast/riskForecast.package.js';
import { DataClassification } from '../riskForecast/riskForecast.types.js';

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  passed++;
}

console.log('--- SUITE 11: Explanation DAG & Sealed RiskForecastPackage ---');

const mockForecast = {
  portfolioVolatility: 16.42,
  dailyVolatility: 1.034,
  covarianceQuality: { positiveSemidefinite: true },
  repairApplied: false,
  marginalRiskDecomposition: {
    assetContributions: [
      { symbol: 'AAPL', weight: 0.6, componentRiskContribution: 10.2, percentageRiskContributionPercent: 62.1 },
      { symbol: 'MSFT', weight: 0.4, componentRiskContribution: 6.22, percentageRiskContributionPercent: 37.9 }
    ]
  },
  factorRiskContribution: {
    factorVolatility: 14.8,
    residualVolatility: 7.1,
    factorContributions: [
      { factor: 'MARKET', beta: 1.05, componentContribution: 11.2 }
    ]
  }
};

const mockBudgetEval = {
  evaluations: [
    { budgetId: 'RB_VOL', metric: 'Volatility', limit: 15.0, isBreached: true, overallStatus: 'RED', current: { utilizationPercent: 109.5 } }
  ]
};

// 1. Explanation DAG Generation
const dag = RiskForecastExplanationDAG.buildForecastExplanationDAG({
  portfolioSnapshotId: 'PS_SNAP_001',
  forecastResult: mockForecast,
  budgetEvaluation: mockBudgetEval
});

assert(dag.nodeCount >= 4, 'DAG contains root, covariance, assets, factors and budget nodes');
assert(dag.edgeCount >= 3, 'DAG contains edges');
assert(dag.isAcyclic === true, 'DAG is strictly acyclic');
assert(dag.nodes.some(n => n.type === 'FORECAST_ROOT'), 'Contains FORECAST_ROOT node');
assert(dag.nodes.some(n => n.type === 'RISK_BUDGET_ALERT'), 'Contains RISK_BUDGET_ALERT node');

// 2. Sealed RiskForecastPackage Creation
const sealedPkg = RiskForecastPackageBuilder.sealPackage({
  portfolioSnapshotId: 'PS_SNAP_001',
  truthSnapshotId: 'TRUTH_SNAP_001',
  asOf: '2026-09-07T00:00:00.000Z',
  forecastResult: mockForecast,
  budgetEvaluation: mockBudgetEval,
  tenantId: 'tenant_omega'
});

assert(sealedPkg.packageId.startsWith('RFPKG_'), 'Package ID starts with RFPKG_');
assert(sealedPkg.isSealed === true, 'isSealed is true');
assert(typeof sealedPkg.hash === 'string' && sealedPkg.hash.length === 64, 'SHA-256 hash is 64 characters');
assert(Object.isFrozen(sealedPkg), 'Sealed package is frozen (immutable)');

// 3. Package Cryptographic Verification
const verifyGood = RiskForecastPackageBuilder.verifyPackage(sealedPkg);
assert(verifyGood.isValid === true, 'Intact sealed package verifies cleanly');

// 4. Tamper Detection
const tamperedPkg = { ...sealedPkg, portfolioVolatility: 99.99 };
const verifyTampered = RiskForecastPackageBuilder.verifyPackage(tamperedPkg);
assert(verifyTampered.isValid === false, 'Tampered package is rejected by cryptographic hash verification');

console.log(`PASSED: ${passed}`);
