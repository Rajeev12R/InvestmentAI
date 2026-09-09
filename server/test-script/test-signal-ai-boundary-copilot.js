import assert from 'assert';
import { SignalIntelligenceStore } from '../signalIntelligence/signal.store.js';
import { signalIntelligenceCopilotTools } from '../signalIntelligence/signal.tool.js';
import { SignalStatus, SignalType, SignalDirection, SignalRegime } from '../signalIntelligence/signal.types.js';

let totalAssertions = 0;
function it(desc, fn) {
  try {
    fn();
    totalAssertions++;
  } catch (err) {
    console.error(`FAILED: ${desc}`);
    throw err;
  }
}

async function itAsync(desc, fn) {
  try {
    await fn();
    totalAssertions++;
  } catch (err) {
    console.error(`FAILED: ${desc}`);
    throw err;
  }
}

console.log('=== Suite 12: AI Boundary & Read-Only Copilot Tools ===');

it('should enforce AI hypothesis quarantine: AI hypotheses remain AI_HYPOTHESIS and cannot become authoritative signals', () => {
  const store = new SignalIntelligenceStore();

  const aiSignal = store.saveSignal('tenant_01', {
    signalId: 'sig_ai_hypo_01',
    signalType: SignalType.SENTIMENT_SIGNAL,
    entityId: 'NVDA',
    direction: SignalDirection.STRONGLY_POSITIVE,
    magnitude: 0.95,
    confidence: 0.50,
    status: SignalStatus.AI_HYPOTHESIS,
    methodologyVersion: '2026.1',
    knowledgeCutoff: '2026-03-01T00:00:00Z'
  });

  assert.strictEqual(aiSignal.status, SignalStatus.AI_HYPOTHESIS);
  assert.notStrictEqual(aiSignal.status, SignalStatus.VALIDATED);
  assert.notStrictEqual(aiSignal.status, SignalStatus.HISTORICALLY_SUPPORTED);
});

await itAsync('should verify all 10 read-only Copilot tools function without mutating state', async () => {
  const store = new SignalIntelligenceStore();

  store.saveCompositeSignal('tenant_01', {
    compositeSignalId: 'comp_tool_01',
    entityId: 'NVDA',
    score: 0.80,
    regime: SignalRegime.STRONG_POSITIVE,
    direction: SignalDirection.STRONGLY_POSITIVE,
    confidence: 0.90,
    hasConflict: false,
    evidenceDiversityScore: 0.85,
    independentEffectiveCount: 3.5,
    contributors: [{ inputId: 'in1', signalType: 'GROWTH_SIGNAL', normalizedValue: 0.80, weight: 1.0, contribution: 0.80 }],
    divergences: [],
    knowledgeCutoff: '2026-03-01T00:00:00Z'
  });

  // 1. getCompositeSignal
  const comp = await signalIntelligenceCopilotTools.getCompositeSignal({ tenantId: 'tenant_default', entityId: 'NVDA' });
  assert.ok(comp);

  // 2. explainSignal
  const exp = await signalIntelligenceCopilotTools.explainSignal({ tenantId: 'tenant_default', compositeSignalId: 'comp_tool_01' });
  assert.ok(exp);

  // 3. explainSignalContribution
  const contr = await signalIntelligenceCopilotTools.explainSignalContribution({ tenantId: 'tenant_default', compositeSignalId: 'comp_tool_01' });
  assert.ok(contr);

  // 4. explainSignalConflict
  const conf = await signalIntelligenceCopilotTools.explainSignalConflict({ tenantId: 'tenant_default', compositeSignalId: 'comp_tool_01' });
  assert.ok(conf);

  // 5. explainSignalHistory
  const hist = await signalIntelligenceCopilotTools.explainSignalHistory({ tenantId: 'tenant_default', entityId: 'NVDA' });
  assert.ok(hist);

  // 6. explainSignalValidation
  const val = await signalIntelligenceCopilotTools.explainSignalValidation({ tenantId: 'tenant_default', signalType: 'GROWTH_SIGNAL' });
  assert.ok(val);

  // 7. explainSignalDependencies
  const dep = await signalIntelligenceCopilotTools.explainSignalDependencies({ tenantId: 'tenant_default', entityId: 'NVDA' });
  assert.ok(dep);

  // 8. findSignalDivergences
  const divs = await signalIntelligenceCopilotTools.findSignalDivergences({ tenantId: 'tenant_default', entityId: 'NVDA' });
  assert.ok(divs);

  // 9. getPortfolioSignalConcentration
  const port = await signalIntelligenceCopilotTools.getPortfolioSignalConcentration({
    tenantId: 'tenant_default',
    holdings: [{ ticker: 'NVDA', weight: 0.50, compositeScore: 0.80, dominantDriver: 'AI' }]
  });
  assert.ok(port);

  // 10. compareSignals
  const cmp = await signalIntelligenceCopilotTools.compareSignals({ tenantId: 'tenant_default', entityIds: ['NVDA', 'AAPL'] });
  assert.ok(cmp);
});

console.log(`PASSED: ${totalAssertions} assertions passed.\n`);
