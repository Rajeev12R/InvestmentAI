import assert from 'assert';
import { ExposureComplianceLimitsEngine } from '../exposureRisk/exposure.compliance.limits.engine.js';
import { BreachPrecedenceLevel, BreachStatus } from '../exposureRisk/exposure.types.js';

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

console.log('=== Suite 11: Compliance Limits & Phase 16 Precedence Breaches ===');

it('Detect regulatory and firm mandate breaches with precedence ordering', () => {
  const portfolioExp = {
    grossExposure: 1.45,
    netExposure: 0.95,
    sectorExposures: { TECHNOLOGY: 0.45 }
  };

  const limits = [
    { limitId: 'lim_firm_tech', dimension: 'SECTOR:TECHNOLOGY', maxLimit: 0.35, precedence: BreachPrecedenceLevel.FIRM_MANDATE },
    { limitId: 'lim_reg_leverage', dimension: 'GROSS_EXPOSURE', maxLimit: 1.30, precedence: BreachPrecedenceLevel.REGULATORY_MANDATE }
  ];

  const res = ExposureComplianceLimitsEngine.checkExposureLimits({
    portfolioExposure: portfolioExp,
    limits
  });

  assert.strictEqual(res.isCompliant, false);
  assert.strictEqual(res.breachCount, 2);
  // Highest precedence breach must be REGULATORY_MANDATE
  assert.strictEqual(res.highestBreachPrecedence, BreachPrecedenceLevel.REGULATORY_MANDATE);
  assert.strictEqual(res.breaches[0].precedence, BreachPrecedenceLevel.REGULATORY_MANDATE);
});

it('Warning state when exposure is within 90% of max limit', () => {
  const portfolioExp = {
    grossExposure: 0.95,
    netExposure: 0.95,
    sectorExposures: { TECHNOLOGY: 0.28 }
  };

  const limits = [
    { limitId: 'lim_tech', dimension: 'SECTOR:TECHNOLOGY', maxLimit: 0.30, precedence: BreachPrecedenceLevel.CLIENT_IPS_RULE }
  ];

  const res = ExposureComplianceLimitsEngine.checkExposureLimits({
    portfolioExposure: portfolioExp,
    limits
  });

  assert.strictEqual(res.isCompliant, true);
  assert.strictEqual(res.evaluations[0].status, BreachStatus.WARNING);
});

console.log(`PASSED: ${passed} assertions passed.\n`);
