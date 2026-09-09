/**
 * server/test-script/test-earnings-attention-thesis.js
 * 
 * Phase 21: Attention Scoring & Thesis Catalyst/Breaker Monitoring Tests
 */

import assert from 'assert';
import { evaluateEarningsAttentionImpact } from '../earnings/earnings.attention.engine.js';
import { evaluateEarningsThesisImpact } from '../earnings/earnings.thesis.engine.js';
import { EventClassification } from '../earnings/earnings.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- RUNNING PHASE 21 ATTENTION & THESIS IMPACT TESTS ---');

// 1. Attention Engine — Low/Neutral State
const neutralAttention = evaluateEarningsAttentionImpact('AAPL', {}, {}, { isHighQuality: true, flags: [] });
testAssert(neutralAttention.ticker === 'AAPL', 'Ticker formatted uppercase');
testAssert(neutralAttention.attentionLevel === 'LOW', 'Baseline attention is LOW');
testAssert(neutralAttention.attentionScore === 20, 'Baseline score is 20');
testAssert(neutralAttention.classification === EventClassification.DERIVED, 'Classification is DERIVED');

// 2. Attention Engine — EPS Miss (Score >= 75)
const missAttention = evaluateEarningsAttentionImpact(
  'AAPL',
  {
    surprises: {
      DILUTED_EPS: { isMiss: true, absoluteSurprise: -0.15 }
    }
  },
  {},
  { isHighQuality: true, flags: [] }
);
testAssert(missAttention.attentionLevel === 'HIGH', 'EPS Miss elevates attention to HIGH');
testAssert(missAttention.attentionScore >= 75, 'Attention score >= 75');
testAssert(missAttention.triggers.some(t => t.reason === 'EPS_MISS'), 'EPS_MISS trigger logged');

// 3. Attention Engine — Guidance Cut (Score >= 85 -> CRITICAL)
const cutAttention = evaluateEarningsAttentionImpact(
  'AAPL',
  {},
  { revisionDirection: 'CUT', pctRevision: -0.06 },
  { isHighQuality: true, flags: [] }
);
testAssert(cutAttention.attentionLevel === 'CRITICAL', 'Guidance cut elevates attention to CRITICAL');
testAssert(cutAttention.attentionScore >= 85, 'Attention score >= 85');
testAssert(cutAttention.triggers.some(t => t.reason === 'GUIDANCE_CUT'), 'GUIDANCE_CUT trigger logged');

// 4. Thesis Monitoring — Intact & Confirmed Catalyst
const sampleThesis = {
  id: 'THESIS-AAPL-BULL',
  ticker: 'AAPL',
  pillars: ['Services Growth', 'Gross Margin Expansion'],
  breakers: [
    { condition: 'OPERATING_MARGIN_BELOW', threshold: 0.20, description: 'Operating margin drops below 20%' },
    { condition: 'REVENUE_DECLINE', description: 'Revenue growth turns negative' }
  ]
};

const beatEvidence = {
  revenueSurprisePct: 0.08,
  operatingMarginActual: 0.31,
  revenueGrowthActual: 0.12
};

const thesisBeatResult = evaluateEarningsThesisImpact(sampleThesis, beatEvidence);
testAssert(thesisBeatResult.thesisIntact === true, 'Thesis intact on earnings beat');
testAssert(thesisBeatResult.implication === 'THESIS_CONFIRMED', 'Implication is THESIS_CONFIRMED');
testAssert(thesisBeatResult.confirmedCatalysts.length > 0, 'Catalyst confirmed');
testAssert(thesisBeatResult.requiresHumanReview === false, 'No human review needed when intact');
testAssert(thesisBeatResult.rule === 'AI_CANNOT_SILENTLY_MUTATE_INVESTMENT_THESIS', 'Invariant preserved');

// 5. Thesis Monitoring — Breaker Triggered
const brokenEvidence = {
  revenueSurprisePct: -0.04,
  operatingMarginActual: 0.17, // Breaker triggered (< 20%)
  revenueGrowthActual: 0.02
};

const thesisBrokenResult = evaluateEarningsThesisImpact(sampleThesis, brokenEvidence);
testAssert(thesisBrokenResult.thesisIntact === false, 'Thesis breached');
testAssert(thesisBrokenResult.implication === 'THESIS_UNDER_PRESSURE', 'Implication is THESIS_UNDER_PRESSURE');
testAssert(thesisBrokenResult.triggeredBreakers.length === 1, '1 breaker triggered');
testAssert(thesisBrokenResult.requiresHumanReview === true, 'Flagged for human review');

// 6. Thesis Monitoring — Empty/Null Thesis
const noThesisResult = evaluateEarningsThesisImpact(null, beatEvidence);
testAssert(noThesisResult.hasThesis === false, 'Handled missing thesis');
testAssert(noThesisResult.classification === EventClassification.UNAVAILABLE, 'Classification UNAVAILABLE');

// 7. Formal Thesis Lifecycle State Machine Tests
const { ThesisStateMachine, ThesisLifecycleState } = await import('../earnings/earnings.thesis.engine.js');
const tsm = new ThesisStateMachine();
const tenant = 'TENANT-THESIS-LIFECYCLE';

// State 1: CURRENT_THESIS (Version 1)
const t1 = tsm.registerThesis(tenant, {
  id: 'THESIS-GOOGL-01',
  ticker: 'GOOGL',
  pillars: ['Search Monopolistic Moat', 'Cloud Profitability'],
  approvedBy: 'HUMAN_PM_LEAD'
});
testAssert(t1.state === ThesisLifecycleState.CURRENT_THESIS, 'Initial state is CURRENT_THESIS');
testAssert(t1.version === 1, 'Initial version is 1');

// State 2: CHANGE_PROPOSED
const proposal = tsm.proposeChange('THESIS-GOOGL-01', {
  pillars: ['Search Moat', 'Cloud Profitability', 'AI Model Integration'],
  rationale: 'Q4 AI revenue acceleration'
});
testAssert(proposal.state === ThesisLifecycleState.CHANGE_PROPOSED, 'State transitioned to CHANGE_PROPOSED');
testAssert(tsm.getActiveThesis('THESIS-GOOGL-01').version === 1, 'Active thesis version unchanged during proposal');

// State 3: HUMAN_REVIEW
const review = tsm.submitForReview('THESIS-GOOGL-01');
testAssert(review.state === ThesisLifecycleState.HUMAN_REVIEW, 'State transitioned to HUMAN_REVIEW');

// State 4: APPROVAL -> NEW_THESIS_VERSION (Version 2)
const t2 = tsm.approveProposal('THESIS-GOOGL-01', 'HUMAN_CIO_SIGNER');
testAssert(t2.version === 2, 'Approved proposal created Version 2');
testAssert(t2.state === ThesisLifecycleState.CURRENT_THESIS, 'New active version is CURRENT_THESIS');
testAssert(t2.approvedBy === 'HUMAN_CIO_SIGNER', 'Human approver recorded');

// State 5: Immutability of historical versions
const history = tsm.getThesisHistory('THESIS-GOOGL-01');
testAssert(history.length === 2, 'History contains 2 versions');
testAssert(history[0].version === 1, 'Version 1 preserved');
testAssert(history[1].version === 2, 'Version 2 active');

// State 6: REJECTED Proposal flow
tsm.proposeChange('THESIS-GOOGL-01', { pillars: ['Flawed Proposal'] });
const rejected = tsm.rejectProposal('THESIS-GOOGL-01', 'HUMAN_CIO_SIGNER', 'Insufficient evidence');
testAssert(rejected.state === ThesisLifecycleState.REJECTED, 'Proposal marked REJECTED');
testAssert(tsm.getActiveThesis('THESIS-GOOGL-01').version === 2, 'Active thesis still at Version 2 after rejection');

console.log(`PASSED: ${assertionCount} assertions`);
export { assertionCount };
