/**
 * test-synthesis-context-builder.js
 * Suite 3: Research Context Builder Tests across 10 Canonical Domains
 */

import assert from 'assert';
import { defaultResearchContextBuilder } from '../researchSynthesis/synthesis.context.builder.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- Running Suite 3: Research Context Builder Tests ---');

const cutoff = '2026-01-01T00:00:00.000Z';
const context = defaultResearchContextBuilder.buildResearchContext('NVDA', cutoff, 'FULL', {
  tenantId: 'tenant-test-3',
  fundamentals: { revenue: 120000000, grossMargin: 72.5 },
  valuation: { dcfFairValue: 180.0, relativeFairValue: 195.0 },
  forecast: { forwardEps: 5.50, forecastVintage: '2026-Q1' },
  earnings: { reportedEps: 1.40, surprisePct: 12.0 },
  macro: { currentRegime: 'DISINFLATION_EXPANSION' },
  risk: { overallRiskScore: 38 },
  portfolio: { portfolioWeightPct: 5.0 },
  scenario: { baseCaseReturnPct: 22.0 },
  thesis: { healthStatus: 'SUPPORTED' },
  decision: { lastDecision: 'OVERWEIGHT' }
});

testAssert(context.subjectId === 'NVDA', 'Subject ID normalized to uppercase');
testAssert(context.tenantId === 'tenant-test-3', 'Tenant ID preserved');
testAssert(typeof context.contextHash === 'string' && context.contextHash.length === 64, 'Deterministic context SHA-256 generated');

// Verify all 10 domains exist
const domains = context.domains;
testAssert(domains.fundamentals.revenue === 120000000, 'Fundamentals domain populated');
testAssert(domains.valuation.dcfFairValue === 180.0, 'Valuation domain populated');
testAssert(domains.forecast.forwardEps === 5.50, 'Forecast domain populated');
testAssert(domains.earnings.surprisePct === 12.0, 'Earnings domain populated');
testAssert(domains.macro.currentRegime === 'DISINFLATION_EXPANSION', 'Macro domain populated');
testAssert(domains.risk.overallRiskScore === 38, 'Risk domain populated');
testAssert(domains.portfolio.portfolioWeightPct === 5.0, 'Portfolio domain populated');
testAssert(domains.scenario.baseCaseReturnPct === 22.0, 'Scenario domain populated');
testAssert(domains.thesis.healthStatus === 'SUPPORTED', 'Thesis domain populated');
testAssert(domains.decision.lastDecision === 'OVERWEIGHT', 'Decision domain populated');

console.log(`[PASS] Suite 3 Research Context Builder passed: ${assertionCount} assertions`);
export default { assertionCount };
