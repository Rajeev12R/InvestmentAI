import assert from 'assert';
import { PerformanceFactorEngine } from '../performanceSkill/performance.factor.engine.js';
import { SkillConfidenceLevel } from '../performanceSkill/performance.types.js';

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

console.log('=== Suite 4: Factor Exposure & Multi-Factor Attribution ===');

it('Run Multi-Factor OLS and separate systematic vs idiosyncratic return', () => {
  // Synthesize: y = 0.002 + 1.1 * MKT + 0.5 * SMB + noise
  const N = 40;
  const mkt = [];
  const smb = [];
  const y = [];

  for (let i = 0; i < N; i++) {
    const f1 = (Math.sin(i * 0.4) * 0.03);
    const f2 = (Math.cos(i * 0.3) * 0.02);
    mkt.push(f1);
    smb.push(f2);
    y.push(0.002 + 1.1 * f1 + 0.5 * f2 + (Math.sin(i * 1.5) * 0.002));
  }

  const result = PerformanceFactorEngine.estimateFactorExposure({
    portfolioExcessReturns: y,
    factorReturns: {
      MARKET_BETA: mkt,
      SIZE_SMB: smb
    },
    periodsPerYear: 12
  });

  assert(Math.abs(result.factorBetas.MARKET_BETA - 1.1) < 0.15);
  assert(Math.abs(result.factorBetas.SIZE_SMB - 0.5) < 0.15);
  assert(result.rSquared > 0.70);
  assert(result.systematicFraction > 0.60);
  assert(result.residuals.length === N);
  assert.strictEqual(result.skillConfidence, SkillConfidenceLevel.PERFORMANCE_LIKELY_SYSTEMATIC);
});

it('Handle pure idiosyncratic alpha generator', () => {
  const N = 40;
  const mkt = Array.from({ length: N }, (_, i) => Math.sin(i) * 0.01);
  // Pure alpha = 0.01 per period with zero factor correlation
  const y = Array.from({ length: N }, () => 0.01);

  const result = PerformanceFactorEngine.estimateFactorExposure({
    portfolioExcessReturns: y,
    factorReturns: {
      MARKET_BETA: mkt
    },
    periodsPerYear: 12
  });

  assert(result.annualizedAlpha > 0.10);
  assert(result.rSquared < 0.20);
  assert.notStrictEqual(result.hash, undefined);
});

console.log(`PASSED: ${passed} assertions passed.\n`);
