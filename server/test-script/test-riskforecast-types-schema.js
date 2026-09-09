import {
  DataClassification,
  RiskHorizon,
  HORIZON_DAYS,
  VolatilityModel,
  CovarianceModel,
  VaRMethod,
  ModelHealthState,
  BudgetScope,
  BudgetUtilizationStatus,
  CompliancePrecedence,
  CovarianceRepairMethod,
  deepFreeze,
  computeRiskForecastHash
} from '../riskForecast/riskForecast.types.js';
import { RiskForecastConfig } from '../riskForecast/riskForecast.config.js';
import { RiskForecastSchema } from '../riskForecast/riskForecast.schema.js';

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  passed++;
}

console.log('--- SUITE 1: Risk Forecast Types, Taxonomy, Configuration & Schemas ---');

// 1. Data Classification Enums
assert(DataClassification.OBSERVED === 'OBSERVED', 'DataClassification.OBSERVED exists');
assert(DataClassification.DERIVED === 'DERIVED', 'DataClassification.DERIVED exists');
assert(DataClassification.MODEL_ESTIMATE === 'MODEL_ESTIMATE', 'DataClassification.MODEL_ESTIMATE exists');
assert(DataClassification.FORECAST === 'FORECAST', 'DataClassification.FORECAST exists');
assert(DataClassification.SCENARIO_INPUT === 'SCENARIO_INPUT', 'DataClassification.SCENARIO_INPUT exists');
assert(DataClassification.SCENARIO_OUTPUT === 'SCENARIO_OUTPUT', 'DataClassification.SCENARIO_OUTPUT exists');
assert(DataClassification.CONFIGURED === 'CONFIGURED', 'DataClassification.CONFIGURED exists');
assert(DataClassification.ASSUMPTION === 'ASSUMPTION', 'DataClassification.ASSUMPTION exists');
assert(DataClassification.UNAVAILABLE === 'UNAVAILABLE', 'DataClassification.UNAVAILABLE exists');

// 2. Risk Horizons
assert(RiskHorizon.ONE_DAY === '1D', 'RiskHorizon 1D');
assert(RiskHorizon.FIVE_DAY === '5D', 'RiskHorizon 5D');
assert(RiskHorizon.TWENTY_DAY === '20D', 'RiskHorizon 20D');
assert(RiskHorizon.SIXTY_DAY === '60D', 'RiskHorizon 60D');
assert(RiskHorizon.ONE_YEAR === '252D', 'RiskHorizon 252D');
assert(HORIZON_DAYS['1D'] === 1, 'HORIZON_DAYS 1D is 1');
assert(HORIZON_DAYS['252D'] === 252, 'HORIZON_DAYS 252D is 252');

// 3. Models and Health States
assert(VolatilityModel.HISTORICAL === 'HISTORICAL', 'VolatilityModel HISTORICAL');
assert(VolatilityModel.EWMA === 'EWMA', 'VolatilityModel EWMA');
assert(CovarianceModel.HISTORICAL === 'HISTORICAL', 'CovarianceModel HISTORICAL');
assert(CovarianceModel.EWMA === 'EWMA', 'CovarianceModel EWMA');
assert(VaRMethod.HISTORICAL === 'HISTORICAL', 'VaRMethod HISTORICAL');
assert(VaRMethod.PARAMETRIC === 'PARAMETRIC', 'VaRMethod PARAMETRIC');
assert(ModelHealthState.VALID === 'VALID', 'ModelHealthState VALID');
assert(ModelHealthState.DEGRADED === 'DEGRADED', 'ModelHealthState DEGRADED');
assert(ModelHealthState.INSUFFICIENT_DATA === 'INSUFFICIENT_DATA', 'ModelHealthState INSUFFICIENT_DATA');
assert(ModelHealthState.FAILED === 'FAILED', 'ModelHealthState FAILED');
assert(ModelHealthState.STALE === 'STALE', 'ModelHealthState STALE');

// 4. Budget Scopes (12 Scopes)
const expectedScopes = ['PORTFOLIO', 'ASSET', 'SECTOR', 'INDUSTRY', 'FACTOR', 'CURRENCY', 'STRATEGY', 'MANAGER', 'LIQUIDITY', 'TAIL_RISK', 'TRACKING_ERROR', 'VOLATILITY'];
expectedScopes.forEach(scope => {
  assert(BudgetScope[scope] === scope, `BudgetScope ${scope} is properly defined`);
});

// 5. Budget Statuses & Compliance Precedence
assert(BudgetUtilizationStatus.GREEN === 'GREEN', 'BudgetUtilizationStatus GREEN');
assert(BudgetUtilizationStatus.AMBER === 'AMBER', 'BudgetUtilizationStatus AMBER');
assert(BudgetUtilizationStatus.RED === 'RED', 'BudgetUtilizationStatus RED');
assert(BudgetUtilizationStatus.UNAVAILABLE === 'UNAVAILABLE', 'BudgetUtilizationStatus UNAVAILABLE');

assert(CompliancePrecedence.REGULATORY === 'REGULATORY', 'CompliancePrecedence REGULATORY');
assert(CompliancePrecedence.FIRM === 'FIRM', 'CompliancePrecedence FIRM');
assert(CompliancePrecedence.PORTFOLIO === 'PORTFOLIO', 'CompliancePrecedence PORTFOLIO');
assert(CompliancePrecedence.STRATEGY === 'STRATEGY', 'CompliancePrecedence STRATEGY');
assert(CompliancePrecedence.SOFT === 'SOFT', 'CompliancePrecedence SOFT');

// 6. Covariance Repair Methods
assert(CovarianceRepairMethod.NONE === 'NONE', 'Repair NONE');
assert(CovarianceRepairMethod.EIGENVALUE_CLIPPING === 'EIGENVALUE_CLIPPING', 'Repair EIGENVALUE_CLIPPING');
assert(CovarianceRepairMethod.HIGHAM_NEAREST_PSD === 'HIGHAM_NEAREST_PSD', 'Repair HIGHAM_NEAREST_PSD');
assert(CovarianceRepairMethod.SHRINKAGE_LEDROIT_WOLF === 'SHRINKAGE_LEDROIT_WOLF', 'Repair SHRINKAGE_LEDROIT_WOLF');

// 7. deepFreeze immutability
const testObj = { a: 1, nested: { b: 2 } };
deepFreeze(testObj);
assert(Object.isFrozen(testObj), 'Root object is frozen');
assert(Object.isFrozen(testObj.nested), 'Nested object is frozen');

// 8. computeRiskForecastHash determinism
const objA = { z: 1, a: [1, 2, { k: 'v' }], timestamp: '2026-01-01' };
const objB = { a: [1, 2, { k: 'v' }], z: 1, createdAt: '2026-02-01' };
const hashA = computeRiskForecastHash(objA);
const hashB = computeRiskForecastHash(objB);
assert(typeof hashA === 'string' && hashA.length === 64, 'Hash is valid 64-char hex string');
assert(hashA === hashB, 'Hash is deterministic and excludes temporal timestamps');

// 9. Schema Validations
assert(RiskForecastSchema.validateForecastRequest({
  portfolioSnapshotId: 'PS_01',
  asOf: '2026-09-07T00:00:00.000Z',
  horizons: ['1D', '5D', '20D'],
  holdings: [{ symbol: 'AAPL', weight: 0.6 }, { symbol: 'MSFT', weight: 0.4 }]
}) === true, 'Valid forecast request passes schema');

assert(RiskForecastSchema.validateRiskBudget({
  budgetId: 'RB_01',
  scope: BudgetScope.PORTFOLIO,
  metric: 'Annualized Volatility',
  limit: 15.0,
  unit: '%'
}) === true, 'Valid risk budget passes schema');

assert(RiskForecastSchema.validateRiskLimit({
  limitId: 'LIM_01',
  precedence: CompliancePrecedence.REGULATORY,
  metric: 'Gross Leverage',
  threshold: 200.0
}) === true, 'Valid risk limit passes schema');

console.log(`PASSED: ${passed}`);
