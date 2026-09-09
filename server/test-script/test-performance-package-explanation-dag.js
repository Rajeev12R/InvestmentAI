import assert from 'assert';
import { PerformancePackageBuilder } from '../performanceSkill/performance.package.js';

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

console.log('=== Suite 12: Sealed Package & Explanation DAG ===');

it('Seal PerformanceSkillPackage with complete Explanation DAG', () => {
  const pkg = PerformancePackageBuilder.sealPackage({
    packageId: 'pkg_test_001',
    portfolioId: 'port_1',
    managerId: 'mgr_1',
    performanceEvaluation: { portfolioReturn: 0.18, benchmarkReturn: 0.12 },
    riskAdjusted: { sharpeRatio: 1.5, sortinoRatio: 1.8, maxDrawdown: 0.08, informationRatio: 0.9 },
    factorExposure: { rSquared: 0.45, annualizedAlpha: 0.04, alphaTStat: 2.2, systematicFraction: 0.45, factorBetas: { MARKET_BETA: 1.05 } },
    timingSkill: { timingCoefficient: 0.03, timingTStat: 2.0, skillStatus: 'SUPPORTED' },
    selectionSkill: { hitRate: 0.62, impliedIC: 0.24, breadth: 35, activeShare: 0.80 },
    allocationSkill: { allocationContribution: 0.015, allocationHitRate: 0.60 },
    processSkill: { disciplineScore: 0.92, disciplineLevel: 'DISCIPLINED' },
    persistence: { classification: 'PERSISTENT', positiveFraction: 0.85 },
    luck: { probPositiveAlpha: 0.96, sharpe95ConfidenceInterval: [0.8, 2.2], isStatisticallySignificant: true },
    capacity: { capacityRiskLevel: 'LOW_CAPACITY_RISK' },
    scorecard: { finalScore: 82.5, confidenceLevel: 'SUPPORTED_SKILL_INDICATOR' }
  });

  assert.strictEqual(pkg.packageId, 'pkg_test_001');
  assert.strictEqual(pkg.seal.status, 'SEALED_AUTHORITATIVE');
  assert.strictEqual(pkg.explanationDAG.nodes.length, 10);
  assert.strictEqual(pkg.explanationDAG.edges.length, 15);

  const verify = PerformancePackageBuilder.verifyPackage(pkg);
  assert.strictEqual(verify.isValid, true);
  assert.strictEqual(verify.computedHash, pkg.seal.hash);
});

it('Tamper detection invalidates modified package seal', () => {
  const pkg = PerformancePackageBuilder.sealPackage({
    packageId: 'pkg_test_002',
    portfolioId: 'port_2',
    managerId: 'mgr_2',
    performanceEvaluation: { portfolioReturn: 0.10, benchmarkReturn: 0.08 },
    riskAdjusted: { sharpeRatio: 1.1, maxDrawdown: 0.10 },
    scorecard: { finalScore: 70 }
  });

  // Tamper with an inner property by cloning and modifying
  const tampered = JSON.parse(JSON.stringify(pkg));
  tampered.performanceEvaluation.portfolioReturn = 0.50; // Tampered return!

  const verify = PerformancePackageBuilder.verifyPackage(tampered);
  assert.strictEqual(verify.isValid, false);
  assert.notStrictEqual(verify.computedHash, tampered.seal.hash);
});

console.log(`PASSED: ${passed} assertions passed.\n`);
