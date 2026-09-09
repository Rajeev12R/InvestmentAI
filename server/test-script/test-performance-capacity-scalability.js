import assert from 'assert';
import { PerformancePersistenceEngine } from '../performanceSkill/performance.persistence.engine.js';
import { CapacityRiskLevel } from '../performanceSkill/performance.types.js';

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

console.log('=== Suite 10: Capacity, Scalability & Liquidity Drag ===');

it('Low capacity risk evaluation for scalable strategy', () => {
  const res = PerformancePersistenceEngine.evaluateCapacityConstraints({
    currentAum: 50000000,
    estimatedCapacityLimit: 500000000,
    advParticipationRate: 0.01,
    estimatedSlippageBps: 8
  });

  assert.strictEqual(res.capacityRiskLevel, CapacityRiskLevel.LOW_CAPACITY_RISK);
  assert.strictEqual(res.isCapacityConstrained, false);
  assert.strictEqual(res.utilizationRate, 0.10);
});

it('Critical capacity drag for oversized strategy', () => {
  const res = PerformancePersistenceEngine.evaluateCapacityConstraints({
    currentAum: 600000000,
    estimatedCapacityLimit: 500000000,
    advParticipationRate: 0.15,
    estimatedSlippageBps: 45
  });

  assert.strictEqual(res.capacityRiskLevel, CapacityRiskLevel.CRITICAL_DRAG);
  assert.strictEqual(res.isCapacityConstrained, true);
  assert(res.utilizationRate >= 1.0);
});

console.log(`PASSED: ${passed} assertions passed.\n`);
