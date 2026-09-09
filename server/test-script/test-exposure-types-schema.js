import assert from 'assert';
import {
  ExposureStatus,
  ExposureSourceTier,
  ExposureClassification,
  FactorCategory,
  RiskMethodology,
  BreachPrecedenceLevel,
  BreachStatus,
  ExposureChangeType,
  CommonDriverType,
  computeExposureHash,
  deepFreeze
} from '../exposureRisk/exposure.types.js';
import {
  validateExposureObservation,
  validateFactorDefinition,
  validatePortfolioExposure,
  validateRiskDecomposition,
  validateCommonDriver,
  validateHiddenConcentration,
  validateExposureLimit,
  validateExposureBreach,
  validateExposureChange,
  validateExposureRiskPackage,
  ExposureRiskValidationError
} from '../exposureRisk/exposure.schema.js';

let passed = 0;
function it(desc, fn) {
  try {
    fn();
    passed++;
  } catch (err) {
    console.error(`FAILED: ${desc}`);
    throw err;
  }
}

console.log('=== Suite 1: Exposure & Risk Types, Taxonomy & Schemas ===');

it('Enums and Taxonomy integrity', () => {
  assert.strictEqual(ExposureStatus.ACTIVE, 'ACTIVE');
  assert.strictEqual(ExposureSourceTier.VERIFIED_REAL_DATA, 'VERIFIED_REAL_DATA');
  assert.strictEqual(ExposureClassification.DIRECT_EXPOSURE, 'DIRECT_EXPOSURE');
  assert.strictEqual(ExposureClassification.LOOK_THROUGH_EXPOSURE, 'LOOK_THROUGH_EXPOSURE');
  assert.strictEqual(FactorCategory.EQUITY_STYLE, 'EQUITY_STYLE');
  assert.strictEqual(RiskMethodology.PARAMETRIC_COVARIANCE, 'PARAMETRIC_COVARIANCE');
  assert.strictEqual(BreachPrecedenceLevel.REGULATORY_MANDATE, 'REGULATORY_MANDATE');
  assert.strictEqual(BreachStatus.BREACHED, 'BREACHED');
  assert.strictEqual(ExposureChangeType.FACTOR_ROTATION, 'FACTOR_ROTATION');
  assert.strictEqual(CommonDriverType.SHARED_SUPPLY_CHAIN, 'SHARED_SUPPLY_CHAIN');
});

it('Deterministic canonical hashing and deep freeze', () => {
  const obj = { b: 2, a: 1, c: { y: 20, x: 10 } };
  const h1 = computeExposureHash(obj);
  const h2 = computeExposureHash({ a: 1, c: { x: 10, y: 20 }, b: 2 });
  assert.strictEqual(h1, h2);

  const frozen = deepFreeze({ x: 1, nested: { y: 2 } });
  assert.throws(() => { frozen.x = 10; });
  assert.throws(() => { frozen.nested.y = 20; });
});

it('Validate ExposureObservation schema', () => {
  const valid = {
    observationId: 'obs_1',
    entityId: 'NVDA',
    factorId: 'MARKET_BETA',
    exposureValue: 1.45
  };
  assert.strictEqual(validateExposureObservation(valid), true);
  assert.throws(() => validateExposureObservation({ observationId: 'obs_1' }), ExposureRiskValidationError);
});

it('Validate FactorDefinition schema', () => {
  const valid = {
    factorId: 'fact_smb',
    name: 'Size Factor (SMB)',
    category: FactorCategory.EQUITY_STYLE
  };
  assert.strictEqual(validateFactorDefinition(valid), true);
  assert.throws(() => validateFactorDefinition({ factorId: 'fact_smb', name: 'Size', category: 'INVALID' }), ExposureRiskValidationError);
});

it('Validate PortfolioExposure schema', () => {
  const valid = {
    portfolioExposureId: 'port_exp_1',
    portfolioId: 'port_1',
    grossExposure: 1.20,
    netExposure: 0.80
  };
  assert.strictEqual(validatePortfolioExposure(valid), true);
  assert.throws(() => validatePortfolioExposure({ portfolioExposureId: 'port_exp_1' }), ExposureRiskValidationError);
});

it('Validate RiskDecomposition schema', () => {
  const valid = {
    riskDecompId: 'risk_1',
    totalVolatility: 0.16,
    componentRiskContributions: { NVDA: 0.05, AAPL: 0.04 }
  };
  assert.strictEqual(validateRiskDecomposition(valid), true);
  assert.throws(() => validateRiskDecomposition({ riskDecompId: 'risk_1' }), ExposureRiskValidationError);
});

it('Validate CommonDriver schema', () => {
  const valid = {
    driverId: 'drv_tsmc',
    driverType: CommonDriverType.SHARED_SUPPLY_CHAIN,
    affectedSecurities: ['NVDA', 'AMD', 'AAPL']
  };
  assert.strictEqual(validateCommonDriver(valid), true);
  assert.throws(() => validateCommonDriver({ driverId: 'drv_tsmc', driverType: 'INVALID' }), ExposureRiskValidationError);
});

it('Validate HiddenConcentration schema', () => {
  const valid = {
    concentrationId: 'conc_1',
    securityHHI: 0.045
  };
  assert.strictEqual(validateHiddenConcentration(valid), true);
  assert.throws(() => validateHiddenConcentration({ concentrationId: 'conc_1' }), ExposureRiskValidationError);
});

it('Validate ExposureLimit schema', () => {
  const valid = {
    limitId: 'lim_tech_sector',
    dimension: 'SECTOR:TECHNOLOGY',
    maxLimit: 0.35,
    precedence: BreachPrecedenceLevel.FIRM_MANDATE
  };
  assert.strictEqual(validateExposureLimit(valid), true);
  assert.throws(() => validateExposureLimit({ limitId: 'lim_1' }), ExposureRiskValidationError);
});

it('Validate ExposureBreach schema', () => {
  const valid = {
    breachId: 'breach_1',
    limitId: 'lim_tech_sector',
    status: BreachStatus.BREACHED
  };
  assert.strictEqual(validateExposureBreach(valid), true);
  assert.throws(() => validateExposureBreach({ breachId: 'breach_1' }), ExposureRiskValidationError);
});

it('Validate ExposureChange schema', () => {
  const valid = {
    changeId: 'chg_1',
    changeType: ExposureChangeType.FACTOR_ROTATION
  };
  assert.strictEqual(validateExposureChange(valid), true);
  assert.throws(() => validateExposureChange({ changeId: 'chg_1', changeType: 'INVALID' }), ExposureRiskValidationError);
});

it('Validate ExposureRiskPackage schema', () => {
  const valid = {
    packageId: 'pkg_1',
    portfolioId: 'port_1',
    explanationDAG: { nodes: [], edges: [] }
  };
  assert.strictEqual(validateExposureRiskPackage(valid), true);
  assert.throws(() => validateExposureRiskPackage({ packageId: 'pkg_1' }), ExposureRiskValidationError);
});

console.log(`PASSED: ${passed} assertions passed.\n`);
