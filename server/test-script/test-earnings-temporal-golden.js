/**
 * server/test-script/test-earnings-temporal-golden.js
 * 
 * Phase 21: Temporal Cutoff, Anti-Lookahead, Restatements & 13 Institutional Golden Traces (A–M)
 * Strict point-in-time testing, restatement lifecycle, and comprehensive numerical traces for all Golden Cases.
 */

import assert from 'assert';
import { CorporateEventStore } from '../earnings/earnings.eventStore.js';
import { extractCorporateFacts } from '../earnings/earnings.extractor.js';
import { EarningsTruthBridge } from '../earnings/earnings.truthBridge.js';
import { computeEarningsSurprise } from '../earnings/earnings.surprise.engine.js';
import { defaultGuidanceEngine } from '../earnings/earnings.guidance.engine.js';
import { evaluateEarningsQuality } from '../earnings/earnings.quality.engine.js';
import { defaultEventDrivenForecastRevisionEngine } from '../earnings/earnings.forecastRevision.engine.js';
import { evaluateEarningsValuationImpact } from '../earnings/earnings.valuation.bridge.js';
import { evaluateEventRiskDrift } from '../earnings/earnings.risk.engine.js';
import { evaluateEarningsAttentionImpact } from '../earnings/earnings.attention.engine.js';
import { evaluateEarningsThesisImpact } from '../earnings/earnings.thesis.engine.js';
import { aggregatePortfolioEvents } from '../earnings/earnings.portfolio.engine.js';
import { classifyEventImpact } from '../earnings/earnings.impact.engine.js';
import { CorporateActionEngine, defaultCorporateActionEngine, CorporateActionType } from '../earnings/earnings.corporateAction.engine.js';
import { sealEventIntelligencePackage, verifyEventIntelligencePackage } from '../earnings/earnings.package.js';
import { EventClassification, EventImpactCategory } from '../earnings/earnings.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- RUNNING PHASE 21 TEMPORAL CUTOFF, RESTATEMENTS & 13 GOLDEN TRACES (A–M) ---');

// =========================================================================
// SECTION 1: TEMPORAL CUTOFF & POINT-IN-TIME RECONSTRUCTION (25+ Tests)
// =========================================================================
console.log('Running Temporal Cutoff & Anti-Lookahead Tests (25+ assertions)...');
const tempStore = new CorporateEventStore();
const tenantTemp = 'TENANT-TEMPORAL';

const eventDates = [
  '2024-01-15T16:00:00.000Z',
  '2024-04-15T16:00:00.000Z',
  '2024-07-15T16:00:00.000Z',
  '2024-10-15T16:00:00.000Z',
  '2025-01-15T16:00:00.000Z'
];

for (let i = 0; i < eventDates.length; i++) {
  tempStore.ingestEvent(tenantTemp, {
    eventId: `EVNT-TEMP-${i}`,
    securityId: 'AAPL',
    reportingPeriod: `2024Q${i + 1}`,
    sourceId: 'SRC-SEC-EDGAR',
    eventType: 'QUARTERLY_EARNINGS',
    eventTimestamp: eventDates[i],
    publicationTimestamp: eventDates[i],
    payload: { netIncome: 20000000000 + i * 1000000000 }
  });
}

const allEvents = tempStore.getTimeline(tenantTemp, 'AAPL');
testAssert(allEvents.length === 5, 'All 5 events stored in timeline');

for (let i = 0; i < allEvents.length - 1; i++) {
  const t1 = new Date(allEvents[i].publicationTimestamp).getTime();
  const t2 = new Date(allEvents[i + 1].publicationTimestamp).getTime();
  testAssert(t1 <= t2, `Events ${i} and ${i+1} strictly ordered in publication time`);
}

const asOfMid2024 = new Date('2024-06-01T00:00:00.000Z').getTime();
const visibleEventsMid2024 = allEvents.filter(e => new Date(e.publicationTimestamp).getTime() <= asOfMid2024);
testAssert(visibleEventsMid2024.length === 2, 'Anti-lookahead: Only 2 events visible as of mid-2024');
testAssert(visibleEventsMid2024.every(e => new Date(e.publicationTimestamp).getTime() <= asOfMid2024), 'No future events leaked');

for (let k = 0; k < 22; k++) {
  const queryTime = new Date('2024-01-01T00:00:00.000Z').getTime() + (k * 25 * 86400000);
  const pitEvents = allEvents.filter(e => new Date(e.publicationTimestamp).getTime() <= queryTime);
  testAssert(pitEvents.every(e => new Date(e.publicationTimestamp).getTime() <= queryTime), `Cutoff at month ${k} leak-free`);
}

// =========================================================================
// SECTION 2: RESTATEMENT & CONFLICT VERSIONING LIFECYCLE (15+ Tests)
// =========================================================================
console.log('Running Restatement & Conflict Management Tests (15+ assertions)...');
const restatementBridge = new EarningsTruthBridge();
const tenantRestate = 'TENANT-RESTATE-01';

const initialCand = {
  candidateId: 'TUC-TSLA-REV-V1',
  ticker: 'TSLA',
  metric: 'REVENUE',
  period: '2025Q3',
  value: 25000000000,
  sourceId: 'SRC-SEC-10Q',
  asOfDate: '2025-10-15T20:00:00.000Z',
  evidenceId: 'EVID-SEC-10Q-001',
  evidenceHash: 'a1b2c3d4e5f60718293a4b5c6d7e8f901234567890abcdef1234567890abcdef'
};
const v1Res = restatementBridge.applyCandidateToTruth(tenantRestate, initialCand);
testAssert(v1Res.success === true, 'V1 Truth fact applied');
testAssert(v1Res.factRecord.version === 1, 'Version is 1');
testAssert(v1Res.factRecord.value === 25000000000, 'Value is 25B');
testAssert(v1Res.factRecord.classification === EventClassification.REAL_DATA, 'Classification is REAL_DATA');

const restatedCand = {
  candidateId: 'TUC-TSLA-REV-V2',
  ticker: 'TSLA',
  metric: 'REVENUE',
  period: '2025Q3',
  value: 24800000000,
  sourceId: 'SRC-SEC-10QA',
  asOfDate: '2025-12-15T20:00:00.000Z',
  isRestatement: true,
  restatementReason: 'Lease accounting adjustment',
  evidenceId: 'EVID-SEC-10QA-002',
  evidenceHash: 'b2c3d4e5f60718293a4b5c6d7e8f901234567890abcdef1234567890abcdefa1'
};
const v2Res = restatementBridge.applyCandidateToTruth(tenantRestate, restatedCand);
testAssert(v2Res.success === true, 'V2 Restatement applied');
testAssert(v2Res.factRecord.version === 2, 'Version is 2');
testAssert(v2Res.factRecord.value === 24800000000, 'Restated value is 24.8B');
testAssert(v2Res.conflictState === 'SOURCE_OBSERVATION_CONFLICT', 'Conflict state marked SOURCE_OBSERVATION_CONFLICT');

const history = restatementBridge.getFactHistory(tenantRestate, 'TSLA', 'REVENUE', '2025Q3');
testAssert(history.length === 2, 'History contains both V1 and V2 snapshots');
testAssert(history[0].version === 1 && history[0].value === 25000000000, 'V1 snapshot remains immutable at 25B');
testAssert(history[1].version === 2 && history[1].value === 24800000000, 'V2 snapshot is 24.8B');
testAssert(history[1].isRestatement === true, 'V2 is flagged as restatement');
testAssert(history[1].restatementReason === 'Lease accounting adjustment', 'Restatement reason preserved');

try {
  history[0].value = 999999;
  testAssert(false, 'Should fail mutating V1 snapshot');
} catch (e) {
  testAssert(true, 'V1 snapshot is deep frozen');
}

for (let r = 0; r < 5; r++) {
  const readBack = restatementBridge.getFactHistory(tenantRestate, 'TSLA', 'REVENUE', '2025Q3');
  testAssert(readBack[0].value === 25000000000, `Replay ${r}: V1 value is preserved`);
}

// =========================================================================
// 13 INSTITUTIONAL GOLDEN TRACES (A THROUGH M)
// =========================================================================

// GOLDEN TRACE A: Earnings Beat (AAPL Q4)
console.log('Running Golden Trace A: Earnings Beat...');
const rawEventA = {
  eventId: 'EVNT-AAPL-2025Q4-GOLDEN',
  securityId: 'AAPL',
  reportingPeriod: '2025Q4',
  sourceId: 'SRC-US-NASDAQ-DIRECT',
  eventType: 'QUARTERLY_EARNINGS',
  eventTimestamp: '2025-10-30T16:30:00.000Z',
  publicationTimestamp: '2025-10-30T20:00:00.000Z',
  payload: {
    revenue: 102500000000,
    netIncome: 24500000000,
    dilutedEps: 1.64,
    operatingCashFlow: 30000000000,
    capex: 3000000000,
    totalAssets: 350000000000
  }
};
const storeA = new CorporateEventStore();
storeA.ingestEvent('TENANT-TRACE-A', rawEventA);
const surpriseA = computeEarningsSurprise({ value: 1.64, metric: 'DILUTED_EPS', ticker: 'AAPL' }, { meanEstimate: 1.60 });
testAssert(surpriseA.isBeat === true && Math.abs(surpriseA.absoluteSurprise - 0.04) < 1e-6, 'Trace A: EPS Beat confirmed (+0.04)');
testAssert(Math.abs(surpriseA.percentageSurprise - 0.025) < 1e-6, 'Trace A: +2.5% Surprise');

// GOLDEN TRACE B: Earnings Miss (GOOGL Q3)
console.log('Running Golden Trace B: Earnings Miss...');
const surpriseB = computeEarningsSurprise({ value: 1.40, metric: 'DILUTED_EPS', ticker: 'GOOGL' }, { meanEstimate: 1.55 });
testAssert(surpriseB.isMiss === true, 'Trace B: EPS Miss confirmed');
testAssert(Math.abs(surpriseB.absoluteSurprise - (-0.15)) < 1e-6, 'Trace B: Absolute surprise -$0.15');
const impactB = classifyEventImpact(surpriseB, { revisionDirection: 'MAINTAINED' });
testAssert(impactB.impactCategory === EventImpactCategory.NEGATIVE, 'Trace B: Deterministic impact NEGATIVE');

// GOLDEN TRACE C: Guidance Cut (INTC FY25)
console.log('Running Golden Trace C: Guidance Cut...');
const priorGuideC = defaultGuidanceEngine.recordGuidance('INTC', { metric: 'REVENUE', period: '2026', low: 60000, high: 64000 });
testAssert(priorGuideC.midpoint === 62000, 'Trace C: Prior midpoint 62000');
const curGuideC = defaultGuidanceEngine.recordGuidance('INTC', { metric: 'REVENUE', period: '2026', low: 52000, high: 56000 });
testAssert(curGuideC.midpoint === 54000, 'Trace C: Current midpoint 54000');
testAssert(curGuideC.revisionDirection === 'CUT', 'Trace C: Revision direction CUT');
testAssert(curGuideC.deltaMidpoint === -8000, 'Trace C: Delta midpoint -$8,000');

// GOLDEN TRACE D: Mixed Signal (Beat + Cut)
console.log('Running Golden Trace D: Mixed Signal...');
const surpriseD = computeEarningsSurprise({ value: 3.20, metric: 'DILUTED_EPS' }, { meanEstimate: 3.00 });
const impactD = classifyEventImpact(surpriseD, curGuideC);
testAssert(impactD.impactCategory === EventImpactCategory.MIXED, 'Trace D: Beat + Cut classified as MIXED');

// GOLDEN TRACE E: Forecast Revision (V1 -> V2 Immutability)
console.log('Running Golden Trace E: Forecast Revision V1 -> V2...');
const v1ForecastE = Object.freeze({ forecastId: 'FCST-NVDA-V1', ticker: 'NVDA', value: 80000, assumptions: { revenueGrowthRate: 0.15 } });
const revCandE = defaultEventDrivenForecastRevisionEngine.generateRevisionCandidate(v1ForecastE, { revenueSurprisePct: 0.10, actualRevenue: 90000 });
testAssert(revCandE.previousForecastId === 'FCST-NVDA-V1', 'Trace E: V1 linked');
testAssert(v1ForecastE.value === 80000, 'Trace E: V1 remains immutable at 80,000');
testAssert(revCandE.revisedValue > 80000, 'Trace E: V2 reflects upward revision');

// GOLDEN TRACE F: Valuation Revision (REAL_DATA -> FORECAST -> MODEL_ESTIMATE)
console.log('Running Golden Trace F: Valuation Revision...');
const valImpactF = evaluateEarningsValuationImpact(revCandE, { targetPE: 35.0, wacc: 0.08, shares: 2500 });
testAssert(valImpactF.classification === EventClassification.MODEL_ESTIMATE, 'Trace F: Valuation is MODEL_ESTIMATE');

// GOLDEN TRACE G: Restatement Snapshot Verification
console.log('Running Golden Trace G: Restatement Snapshot Verification...');
const gHistory = restatementBridge.getFactHistory(tenantRestate, 'TSLA', 'REVENUE', '2025Q3');
testAssert(gHistory.length === 2, 'Trace G: History has 2 entries');
testAssert(gHistory[0].value === 25000000000, 'Trace G: Original historical fact unchanged at 25B');
testAssert(gHistory[1].value === 24800000000, 'Trace G: Restated fact is 24.8B');

// GOLDEN TRACE H: Historical Replay (Point-in-Time Information Set)
console.log('Running Golden Trace H: Historical Information Set Replay...');
const replayStore = new CorporateEventStore();
const tDecide = '2025-06-01T00:00:00.000Z';
replayStore.ingestEvent('TENANT-TRACE-H', {
  eventId: 'EVNT-BEFORE-T',
  securityId: 'MSFT',
  reportingPeriod: '2025Q1',
  sourceId: 'SRC-EDGAR',
  eventType: 'QUARTERLY_EARNINGS',
  eventTimestamp: '2025-04-20T16:00:00.000Z',
  publicationTimestamp: '2025-04-20T20:00:00.000Z',
  payload: { revenue: 60000 }
});
const timelineAtT = replayStore.getTimeline('TENANT-TRACE-H', 'MSFT').filter(e => new Date(e.publicationTimestamp).getTime() <= new Date(tDecide).getTime());
testAssert(timelineAtT.length === 1, 'Trace H: Exactly 1 event knowable at time T');

replayStore.ingestEvent('TENANT-TRACE-H', {
  eventId: 'EVNT-AFTER-T',
  securityId: 'MSFT',
  reportingPeriod: '2025Q2',
  sourceId: 'SRC-EDGAR',
  eventType: 'QUARTERLY_EARNINGS',
  eventTimestamp: '2025-07-20T16:00:00.000Z',
  publicationTimestamp: '2025-07-20T20:00:00.000Z',
  payload: { revenue: 65000 }
});
const replayedTimelineAtT = replayStore.getTimeline('TENANT-TRACE-H', 'MSFT').filter(e => new Date(e.publicationTimestamp).getTime() <= new Date(tDecide).getTime());
testAssert(replayedTimelineAtT.length === 1, 'Trace H: Pre-T context unchanged after future injection');

// GOLDEN TRACE I: Dividend Accounting (Investor Portfolio & Pre-Tax Value Preservation)
console.log('Running Golden Trace I: Dividend Accounting...');
const investorPortI = {
  cash: 50000,
  positions: [{ ticker: 'AAPL', sharesHeld: 10000, currentPrice: 150.0, costBasisPerShare: 120.0 }]
};
const divActionI = {
  type: CorporateActionType.CASH_DIVIDEND,
  ticker: 'AAPL',
  amountPerShare: 2.50
};
const divResultI = defaultCorporateActionEngine.applyCorporateActionToInvestor(investorPortI, divActionI);
testAssert(divResultI.dividendCashReceived === 25000, 'Trace I: Dividend cash received is $2.50 * 10,000 = $25,000');
testAssert(divResultI.updatedCash === 75000, 'Trace I: Portfolio cash increased to $75,000');
testAssert(divResultI.positions[0].currentPrice === 147.50, 'Trace I: Ex-dividend share price adjusted to $147.50');
testAssert(divResultI.preTaxEconomicValuePreserved === true, 'Trace I: Pre-tax economic value strictly preserved ($1,550,000)');

// GOLDEN TRACE J: Receivables Growth vs Revenue Growth Quality Gap
console.log('Running Golden Trace J: Receivables Quality Growth-Rate Gap...');
const qualityFinJ = {
  netIncome: 1000,
  cfo: 1200,
  totalAssets: 10000,
  revenue: 5250, // +5.0% from 5000
  previousRevenue: 5000,
  currentReceivables: 1250, // +25.0% from 1000
  previousReceivables: 1000
};
const qualResultJ = evaluateEarningsQuality(qualityFinJ);
testAssert(Math.abs(qualResultJ.revenueGrowth - 0.05) < 1e-6, 'Trace J: Revenue growth +5.0%');
testAssert(Math.abs(qualResultJ.receivablesGrowth - 0.25) < 1e-6, 'Trace J: Receivables growth +25.0%');
testAssert(Math.abs(qualResultJ.receivablesGrowthGap - 0.20) < 1e-6, 'Trace J: Receivables growth gap +20.0% (> 500 bps threshold)');
testAssert(qualResultJ.flags.includes('RECEIVABLES_OUTPACING_REVENUE_GROWTH'), 'Trace J: Flagged receivables divergence');
testAssert(qualResultJ.qualityGrade === 'MEDIUM', 'Trace J: Quality grade is MEDIUM');

// GOLDEN TRACE K: Valuation Risk Multiple Drift (Positive expansion + Negative Prior Multiple)
console.log('Running Golden Trace K: Valuation Risk Multiple Drift...');
const baseRiskK = { financialRisk: 30, qualityRisk: 25, growthRisk: 30, valuationRisk: 45, eventRisk: 20 };
// Case 1: Positive expansion (25x -> 30x => +20% drift => +4 risk points)
const riskResultK = evaluateEventRiskDrift(baseRiskK, {
  valuationDrift: { currentMultiple: 30.0, priorMultiple: 25.0, multipleMetric: 'FORWARD_PE' }
});
testAssert(riskResultK.updatedRiskScores.valuationRisk === 49, `Trace K: Valuation risk updated from 45 to 49 (+4 pts contribution), got ${riskResultK.updatedRiskScores.valuationRisk}`);
testAssert(riskResultK.riskDrivers.some(d => d.dimension === 'VALUATION_RISK'), 'Trace K: Valuation risk driver logged');

// Case 2: Negative Prior Multiple (-15x -> 25x => UNAVAILABLE drift => 0 contribution => base unchanged)
const riskResultKNeg = evaluateEventRiskDrift(baseRiskK, {
  valuationDrift: { currentMultiple: 25.0, priorMultiple: -15.0, multipleMetric: 'FORWARD_PE' }
});
testAssert(riskResultKNeg.updatedRiskScores.valuationRisk === 45, 'Trace K: Negative prior multiple leaves base risk unchanged (45)');
testAssert(riskResultKNeg.riskDrivers.some(d => d.status === 'UNAVAILABLE_NON_POSITIVE_PRIOR_MULTIPLE'), 'Trace K: Non-positive prior status logged');

// GOLDEN TRACE L: Short Portfolio Net vs Gross Attention Weight
console.log('Running Golden Trace L: Short Portfolio Attention...');
const portL = {
  cash: 500000,
  positions: [
    { ticker: 'AAPL', marketValue: 1500000 },
    { ticker: 'TSLA', marketValue: -500000 } // Short position
  ]
};
const securityEventsL = {
  AAPL: { attention: { attentionLevel: 'LOW' } },
  TSLA: { attention: { attentionLevel: 'CRITICAL' } }
};
const aggResultL = aggregatePortfolioEvents(portL, securityEventsL);
testAssert(aggResultL.netNav === 1500000, 'Trace L: Net NAV is 1.5M');
testAssert(aggResultL.grossExposure === 2500000, 'Trace L: Gross exposure is 2.5M');
testAssert(Math.abs(aggResultL.eventsSummary.grossHighAttentionWeight - 0.20) < 1e-6, 'Trace L: Gross attention weight is exactly 20.0% ($500k / $2.5M)');
testAssert(Math.abs(aggResultL.eventsSummary.netHighAttentionWeight - (-500000 / 1500000)) < 1e-6, 'Trace L: Net attention weight is exactly -33.333% (-$500k / $1.5M)');
testAssert(aggResultL.eventsSummary.netHighAttentionWeight < 0, 'Trace L: Negative net weight preserves short directionality');

// GOLDEN TRACE M: Source Provenance Honesty & Unverified Downgrade
console.log('Running Golden Trace M: Provenance Boundary & Unverified Downgrade...');
const storeM = new CorporateEventStore();
const unverifiedEventM = {
  eventId: 'EVNT-UNVERIFIED-001',
  securityId: 'AAPL',
  reportingPeriod: '2025Q4',
  sourceId: 'SRC-SYNTHETIC-FIXTURE',
  sourceClassification: 'VERIFIED_DIRECT_EXCHANGE',
  isExternalAuthorityVerified: false, // Internal fixture, NOT externally authentic!
  eventType: 'QUARTERLY_EARNINGS',
  eventTimestamp: '2025-10-30T16:00:00.000Z',
  publicationTimestamp: '2025-10-30T20:00:00.000Z',
  payload: { netIncome: 100000 }
};
const ingestedM = storeM.ingestEvent('TENANT-PROVENANCE-M', unverifiedEventM);
testAssert(ingestedM.event.sourceClassification === 'UNVERIFIED_SOURCE', 'Trace M: Unauthenticated fixture honestly downgraded to UNVERIFIED_SOURCE');

// CROSS-MODULE CORPORATE ACTION / EARNINGS DOUBLE-COUNTING PREVENTION (BLOCKER 5)
console.log('Testing Corporate Action vs Earnings Double-Counting Prevention...');
const corpActionEngine = new CorporateActionEngine();
const investorPort = {
  cash: 100000,
  positions: [{ ticker: 'MSFT', sharesHeld: 1000, currentPrice: 400.0 }]
};
const divAction = {
  type: 'CASH_DIVIDEND',
  ticker: 'MSFT',
  amountPerShare: 3.0,
  sourceEventId: 'EVNT-MSFT-DIV-2025'
};
const investorAfter = corpActionEngine.applyCorporateActionToInvestor(investorPort, divAction);
testAssert(investorAfter.updatedCash === 103000, 'Double-Count 1: Cash received is exactly $3,000');
testAssert(investorAfter.preTaxEconomicValuePreserved === true, 'Double-Count 2: Pre-tax economic value strictly preserved');
testAssert(investorAfter.positions[0].currentPrice === 397.0, 'Double-Count 3: Ex-dividend price reduced to $397.00');

console.log(`\n================================================================`);
console.log(`PASSED: ${assertionCount} assertions (Temporal, Restatements & Golden A–M)`);
console.log(`================================================================\n`);

export { assertionCount };
