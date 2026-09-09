import assert from 'assert';
import { SignalIndependenceEngine } from '../signalIntelligence/signal.independence.engine.js';
import { SignalDependencyType, SignalType } from '../signalIntelligence/signal.types.js';

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

console.log('=== Suite 4: Signal Independence & Dependency DAG ===');

it('should detect shared Knowledge Graph facts and apply weight discounting without double counting', () => {
  const engine = new SignalIndependenceEngine();

  // Two signals referencing the exact same underlying Fact ID: FACT_DATACENTER_REV
  const inputs = [
    {
      inputId: 'sig_fund_rev',
      signalType: SignalType.FUNDAMENTAL_SIGNAL,
      sharedFactId: 'FACT_DATACENTER_REV',
      evidenceIds: ['ev_10k_sec']
    },
    {
      inputId: 'sig_mgmt_guid',
      signalType: SignalType.MANAGEMENT_SIGNAL,
      sharedFactId: 'FACT_DATACENTER_REV',
      evidenceIds: ['ev_10k_sec']
    },
    {
      inputId: 'sig_alt_traffic',
      signalType: SignalType.ALTERNATIVE_DATA_SIGNAL,
      sharedFactId: 'FACT_ALT_PANEL_USERS',
      evidenceIds: ['ev_similarweb_panel']
    }
  ];

  const res = engine.analyzeIndependence('tenant_01', {
    entityId: 'NVDA',
    inputs
  });

  assert.strictEqual(res.totalInputsCount, 3);
  assert.strictEqual(res.sharedFacts.includes('FACT_DATACENTER_REV'), true);
  assert.strictEqual(res.dependencyGroups.length, 1);
  assert.strictEqual(res.dependencyGroups[0].dependencyType, SignalDependencyType.SHARED_UNDERLYING_FACT);

  // Discount factor for the 2 dependent signals is 0.50
  assert.strictEqual(res.effectiveWeightsAdjustment['sig_fund_rev'], 0.50);
  assert.strictEqual(res.effectiveWeightsAdjustment['sig_mgmt_guid'], 0.50);
  assert.strictEqual(res.effectiveWeightsAdjustment['sig_alt_traffic'], 1.0);
  assert.strictEqual(res.independentEffectiveCount < 3.0, true);
});

it('should calculate EvidenceDiversityScore considering both source variety and evidence spans', () => {
  const engine = new SignalIndependenceEngine();

  // Case 1: Low diversity (3 syndicated articles deriving from the same PR Newswire wire)
  const lowDiversityInputs = [
    { inputId: 'in_1', sourceId: 'src_repub_1', originalWireSource: 'PR_NEWSWIRE_RELEASE', evidenceIds: ['ev_pr_1'] },
    { inputId: 'in_2', sourceId: 'src_repub_2', originalWireSource: 'PR_NEWSWIRE_RELEASE', evidenceIds: ['ev_pr_1'] },
    { inputId: 'in_3', sourceId: 'src_repub_3', originalWireSource: 'PR_NEWSWIRE_RELEASE', evidenceIds: ['ev_pr_1'] }
  ];

  const lowRes = engine.analyzeIndependence('tenant_01', { entityId: 'AAPL', inputs: lowDiversityInputs });
  assert.strictEqual(lowRes.dependencyGroups.length >= 1, true);
  assert.strictEqual(lowRes.evidenceDiversityScore <= 0.60, true);

  // Case 2: High diversity (Company SEC Filing + Regulatory Agency Notice + Independent Alternative Panel)
  const highDiversityInputs = [
    { inputId: 'in_sec', sourceId: 'src_sec_edgar', evidenceIds: ['ev_sec_10k'] },
    { inputId: 'in_bis', sourceId: 'src_bis_regulatory', evidenceIds: ['ev_bis_notice'] },
    { inputId: 'in_alt', sourceId: 'src_idc_analytics', evidenceIds: ['ev_idc_data'] }
  ];

  const highRes = engine.analyzeIndependence('tenant_01', { entityId: 'AAPL', inputs: highDiversityInputs });
  assert.strictEqual(highRes.dependencyGroups.length, 0);
  assert.strictEqual(highRes.evidenceDiversityScore, 1.0);
  assert.strictEqual(highRes.independentEffectiveCount, 3.0);
});

console.log(`PASSED: ${totalAssertions} assertions passed.\n`);
