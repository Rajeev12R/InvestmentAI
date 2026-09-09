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

console.log('=== Suite 6: Security Selection & Sector Allocation Skill ===');

it('Selection skill breadth, hit rate, and Fundamental Law IR calculation', () => {
  const securities = [];
  // 30 securities: 20 outperform (+3%), 10 underperform (-2%) => Hit rate = 66.7%
  for (let i = 0; i < 30; i++) {
    const isWin = i < 20;
    securities.push({
      symbol: `SEC_${i}`,
      activeWeight: 0.033,
      activeReturn: isWin ? 0.03 : -0.02
    });
  }

  const res = PerformanceSkillEngine.evaluateSelectionSkill({
    securityEvaluations: securities,
    activeShare: 0.82
  });

  assert.strictEqual(res.breadth, 30);
  assert(res.hitRate > 0.60);
  assert(res.impliedIC > 0.20);
  assert(res.theoreticalIR > 1.0);
  assert(res.selectionContribution > 0);
  assert.strictEqual(res.skillStatus, SkillStatus.SUPPORTED);
  assert.strictEqual(res.confidenceLevel, SkillConfidenceLevel.SUPPORTED_SKILL_INDICATOR);
});

it('Allocation skill Brinson decomposition and hit rate', () => {
  const sectors = [
    { sector: 'TECH', portfolioWeight: 0.40, benchmarkWeight: 0.25, portfolioSectorReturn: 0.15, benchmarkSectorReturn: 0.14 },
    { sector: 'FINANCIALS', portfolioWeight: 0.10, benchmarkWeight: 0.20, portfolioSectorReturn: 0.05, benchmarkSectorReturn: 0.04 },
    { sector: 'HEALTHCARE', portfolioWeight: 0.25, benchmarkWeight: 0.25, portfolioSectorReturn: 0.08, benchmarkSectorReturn: 0.08 },
    { sector: 'ENERGY', portfolioWeight: 0.25, benchmarkWeight: 0.30, portfolioSectorReturn: 0.02, benchmarkSectorReturn: 0.03 }
  ];

  const res = PerformanceSkillEngine.evaluateAllocationSkill({
    sectorAllocations: sectors
  });

  assert.strictEqual(res.sectorCount, 4);
  assert(res.allocationContribution > 0);
  assert(res.allocationHitRate >= 0.5);
  assert.strictEqual(res.skillStatus, SkillStatus.SUPPORTED);
});

console.log(`PASSED: ${passed} assertions passed.\n`);
