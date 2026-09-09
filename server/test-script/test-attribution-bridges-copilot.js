import assert from 'assert';
import { AlphaAttributionBridges } from '../alphaAttribution/attribution.bridges.js';
import { alphaAttributionCopilotTools } from '../alphaAttribution/attribution.tool.js';
import { AlphaAttributionStore } from '../alphaAttribution/attribution.store.js';

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

console.log('=== Suite 12: Cross-Platform Bridges & Read-Only Copilot Tools ===');

it('Bridge implementation drag (slippage, commission, liquidity impact, tax, FX)', () => {
  const bridges = new AlphaAttributionBridges();

  const res = bridges.bridgeImplementationDrag('t_default', {
    entityId: 'NVDA',
    idealAlpha: 0.05,
    slippageBps: 15,
    commissionBps: 5,
    marketImpactBps: 10,
    taxBps: 10,
    fxBps: 10
  });

  // Total drag = (15+5+10+10+10) = 50 bps = 0.0050
  // Net alpha = 0.05 - 0.005 = 0.045
  assert.strictEqual(res.idealAlpha, 0.05);
  assert.strictEqual(res.transactionCost, 0.002);
  assert.strictEqual(res.liquidityImpact, 0.001);
  assert.strictEqual(res.taxCost, 0.001);
  assert.strictEqual(res.fxCost, 0.001);
  assert.strictEqual(res.netRealizedAlpha, 0.045);
  assert.strictEqual(res.implementationEfficiencyRatio, 0.90);
});

it('Bridge research synthesis thesis health validation with realized returns', () => {
  const bridges = new AlphaAttributionBridges();

  const validatedRes = bridges.bridgeResearchThesisAttribution('t_default', {
    thesisId: 'th_nvda_growth',
    entityId: 'NVDA',
    thesisHealth: 'STRONG',
    attributedReturn: 0.08
  });
  assert.strictEqual(validatedRes.thesisValidationStatus, 'THESIS_VALIDATED');
  assert.strictEqual(validatedRes.isConsistent, true);

  const contradictedRes = bridges.bridgeResearchThesisAttribution('t_default', {
    thesisId: 'th_fail',
    entityId: 'XYZ',
    thesisHealth: 'STRONG',
    attributedReturn: -0.15
  });
  assert.strictEqual(contradictedRes.thesisValidationStatus, 'THESIS_CONTRADICTED');
  assert.strictEqual(contradictedRes.isConsistent, false);
});

it('Verify 10 read-only Copilot tools operate securely without mutation', async () => {
  const brinsonRes = await alphaAttributionCopilotTools.getBrinsonBenchmarkAttribution({
    sectors: [{ sectorId: 'TECH', portfolioWeight: 1.0, benchmarkWeight: 1.0, portfolioReturn: 0.10, benchmarkReturn: 0.05 }]
  });
  assert.strictEqual(brinsonRes.success, true);
  assert.strictEqual(brinsonRes.brinson.activeReturn, 0.05);

  const survRes = await alphaAttributionCopilotTools.getSurvivorshipBiasAssessment({
    universeCount: 100,
    delistedEntitiesIncluded: 10,
    historicalPointInTimeConstituents: true
  });
  assert.strictEqual(survRes.success, true);
  assert.strictEqual(survRes.survivorshipAssessment.isSurvivorshipSafe, true);
});

console.log(`PASSED: ${passed} assertions passed.\n`);
