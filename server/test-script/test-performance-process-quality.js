import assert from 'assert';
import { PerformanceSkillEngine } from '../performanceSkill/performance.skill.engine.js';
import { ProcessDisciplineLevel } from '../performanceSkill/performance.types.js';

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

console.log('=== Suite 7: Process Quality & Mandate Discipline (Phase 13 Bridge) ===');

it('Disciplined process with perfect adherence and zero breaches', () => {
  const res = PerformanceSkillEngine.evaluateProcessSkill({
    mandateAdherenceRate: 1.0,
    riskLimitBreaches: 0,
    decisionConsistencyRate: 0.98,
    lossCutoffCompliance: 1.0
  });

  assert.strictEqual(res.disciplineLevel, ProcessDisciplineLevel.DISCIPLINED);
  assert(res.disciplineScore >= 0.90);
  assert.strictEqual(res.processDecoupledFromReturn, true);
});

it('Undisciplined process with repeated limit breaches', () => {
  const res = PerformanceSkillEngine.evaluateProcessSkill({
    mandateAdherenceRate: 0.70,
    riskLimitBreaches: 3,
    decisionConsistencyRate: 0.60,
    lossCutoffCompliance: 0.50
  });

  assert.strictEqual(res.disciplineLevel, ProcessDisciplineLevel.UNDISCIPLINED);
  assert(res.disciplineScore < 0.65);
});

it('Decoupling verification: Disciplined process evaluated independently of negative returns', () => {
  const proc = PerformanceSkillEngine.evaluateProcessSkill({
    mandateAdherenceRate: 1.0,
    riskLimitBreaches: 0,
    decisionConsistencyRate: 1.0,
    lossCutoffCompliance: 1.0
  });

  // Process is disciplined even if a hypothetical market downturn produced negative returns
  assert.strictEqual(proc.disciplineLevel, ProcessDisciplineLevel.DISCIPLINED);
  assert.strictEqual(proc.processDecoupledFromReturn, true);
});

console.log(`PASSED: ${passed} assertions passed.\n`);
