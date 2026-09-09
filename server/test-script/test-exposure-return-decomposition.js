import assert from 'assert';
import { ExposureFactorEngine } from '../exposureRisk/exposure.factor.engine.js';

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

console.log('=== Suite 5: Factor Return Decomposition & Exact Residual ===');

it('Decompose portfolio return with exact residual preservation', () => {
  const betas = { MARKET: 1.10, VALUE: 0.30, MOMENTUM: 0.20 };
  const returns = { MARKET: 0.08, VALUE: -0.02, MOMENTUM: 0.05 };
  // Expected factor contrib = (1.1*0.08) + (0.3*-0.02) + (0.2*0.05) = 0.088 - 0.006 + 0.010 = 0.092
  // If Rf = 0.02, total explained = 0.02 + 0.092 = 0.112
  // Realized Rp = 0.15 => Residual = 0.15 - 0.112 = 0.038
  const res = ExposureFactorEngine.decomposeFactorReturns({
    portfolioReturn: 0.15,
    riskFreeRate: 0.02,
    portfolioFactorBetas: betas,
    factorReturns: returns
  });

  assert.strictEqual(res.totalFactorContribution, 0.092);
  assert.strictEqual(res.residual, 0.038);
  assert.strictEqual(res.reconciled, true);
});

it('Handle negative alpha and negative factor returns', () => {
  const betas = { MARKET: 1.0 };
  const returns = { MARKET: -0.10 };
  const res = ExposureFactorEngine.decomposeFactorReturns({
    portfolioReturn: -0.12,
    riskFreeRate: 0.01,
    portfolioFactorBetas: betas,
    factorReturns: returns
  });

  assert.strictEqual(res.totalFactorContribution, -0.10);
  assert.strictEqual(res.residual, -0.03);
  assert.strictEqual(res.reconciled, true);
});

console.log(`PASSED: ${passed} assertions passed.\n`);
