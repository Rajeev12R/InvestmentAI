import assert from 'assert';
import { PerformanceSkillEngine } from '../performanceSkill/performance.skill.engine.js';
import { SkillStatus, SkillConfidenceLevel } from '../performanceSkill/performance.types.js';

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

console.log('=== Suite 5: Market & Asset Timing Skill ===');

it('Treynor-Mazuy positive market timing detection', () => {
  // Synthesize timing: y = 0.001 + 1.0 * rm + 2.5 * rm^2
  const N = 50;
  const rm = [];
  const y = [];

  for (let i = 0; i < N; i++) {
    const m = (Math.sin(i * 0.5) * 0.04);
    rm.push(m);
    y.push(0.001 + 1.0 * m + 2.5 * (m * m));
  }

  const res = PerformanceSkillEngine.evaluateTimingSkill({
    portfolioExcessReturns: y,
    marketExcessReturns: rm,
    model: 'TREYNOR_MAZUY',
    periodsPerYear: 12
  });

  assert(res.timingCoefficient > 0);
  assert(res.timingTStat >= 1.96);
  assert.strictEqual(res.skillStatus, SkillStatus.SUPPORTED);
  assert.strictEqual(res.confidenceLevel, SkillConfidenceLevel.SUPPORTED_SKILL_INDICATOR);
});

it('Henriksson-Merton downside protection timing detection', () => {
  const N = 50;
  const rm = [];
  const y = [];

  for (let i = 0; i < N; i++) {
    const m = (Math.sin(i * 0.5) * 0.04);
    rm.push(m);
    // When m < 0, manager reduces loss
    const hmTerm = Math.max(0, -m) * 0.8;
    y.push(0.001 + 0.9 * m + hmTerm);
  }

  const res = PerformanceSkillEngine.evaluateTimingSkill({
    portfolioExcessReturns: y,
    marketExcessReturns: rm,
    model: 'HENRIKSSON_MERTON',
    periodsPerYear: 12
  });

  assert(res.timingCoefficient > 0);
  assert.strictEqual(res.skillStatus, SkillStatus.SUPPORTED);
});

console.log(`PASSED: ${passed} assertions passed.\n`);
