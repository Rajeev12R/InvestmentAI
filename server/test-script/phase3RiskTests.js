import { evaluateMarketRisk } from '../risk/marketRisk.engine.js';
import { evaluateFinancialRisk } from '../risk/financialRisk.engine.js';
import { evaluateLiquidityRisk } from '../risk/liquidityRisk.engine.js';
import { evaluateEarningsQuality } from '../risk/earningsQuality.engine.js';
import { evaluateGrowthRisk } from '../risk/growthRisk.engine.js';
import { evaluateEventRisk } from '../risk/eventRisk.engine.js';
import { evaluateGovernanceRisk } from '../risk/governanceRisk.engine.js';
import { evaluateDataQualityRisk } from '../risk/dataQuality.engine.js';
import { buildRiskProfile } from '../risk/riskAggregation.engine.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('=== PHASE 3 RISK INTELLIGENCE SUITE ===\n');

// Test 1: Market Risk with valid beta and 52-week data
console.log('1. Market Risk Engine');
const mktResult = evaluateMarketRisk({
  currentPrice: 200,
  fiftyTwoWeekHigh: 250,
  fiftyTwoWeekLow: 150,
  beta: 1.6
});
assert(mktResult.status === 'CALCULATED', 'Market risk status is CALCULATED');
assert(mktResult.metrics.beta.value === 1.6, 'Beta is preserved exactly (1.6)');
assert(mktResult.signals.some(s => s.metric === 'beta' && s.severity === 'HIGH'), 'High beta signal triggered for beta > 1.4');
assert(mktResult.metrics.drawdown52w.value === -20, 'Max drawdown is calculated (-20%)');

// Test 2: Market Risk with missing data (no synthetic defaults)
const mktMissing = evaluateMarketRisk({});
assert(mktMissing.metrics.beta.value === null, 'Missing beta propagates as null (no fake 1.0)');
assert(mktMissing.metrics.drawdown52w.value === null, 'Missing drawdown is null');
assert(mktMissing.severity === 'UNKNOWN', 'Severity is UNKNOWN when core market inputs are missing');

// Test 3: Financial Risk - Standard Industrial Corporate
console.log('\n2. Financial Risk Engine');
const finCorp = evaluateFinancialRisk({
  totalDebt: 5000,
  totalCash: 1000,
  ebitda: 1000,
  totalStockholderEquity: 4000,
  currentRatio: 1.2
}, 'Technology');
assert(finCorp.metrics.netDebtToEbitda.value === 4.0, 'Net debt / EBITDA is 4.0x');
assert(finCorp.signals.some(s => s.metric === 'netDebtToEbitda' && (s.severity === 'HIGH' || s.severity === 'CRITICAL')), 'Elevated leverage signal triggered (> 3.5x)');
assert(finCorp.severity === 'HIGH' || finCorp.severity === 'CRITICAL', 'Financial risk is HIGH/CRITICAL due to elevated leverage');

// Test 4: Financial Risk - Banking Sector Rules (EV/EBITDA prohibited)
const finBank = evaluateFinancialRisk({
  totalDebt: 100000,
  totalCash: 20000,
  ebitda: 15000,
  priceToBook: 0.9,
  currentRatio: null
}, 'Financial Services');
assert(finBank.metrics.netDebtToEbitda.value === null, 'Net Debt/EBITDA is NULL for banks (prohibited)');
assert(finBank.metrics.netDebtToEbitda.status === 'NOT_APPROPRIATE', 'Net Debt/EBITDA status is NOT_APPROPRIATE for banks');

// Test 5: Liquidity Risk
console.log('\n3. Liquidity Risk Engine');
const liqResult = evaluateLiquidityRisk(
  { currentRatio: 0.85, quickRatio: 0.60, totalCash: 100 },
  { currentPrice: 50, avgVolume: 500000 }
);
assert(liqResult.metrics.currentRatio.value === 0.85, 'Current ratio is 0.85');
assert(liqResult.signals.some(s => s.metric === 'currentRatio' && (s.severity === 'HIGH' || s.severity === 'CRITICAL')), 'Working capital pressure signal triggered');
assert(liqResult.severity === 'HIGH' || liqResult.severity === 'CRITICAL', 'Liquidity risk is HIGH');

// Test 6: Earnings Quality Risk - Cash Flow Divergence
console.log('\n4. Earnings Quality Engine');
const earnDivergent = evaluateEarningsQuality({
  netIncome: 1000,
  operatingCashFlow: 600, // CFO significantly less than NI
  freeCashFlow: 300,
  totalRevenue: 5000
});
assert(earnDivergent.signals.some(s => s.metric === 'cfoToNetIncome'), 'CFO to NI accrual warning detected');
assert(earnDivergent.metrics.cfoToNetIncome.value === 0.6, 'CFO to NI ratio is 0.6');
assert(earnDivergent.severity === 'HIGH' || earnDivergent.severity === 'CRITICAL', 'Earnings quality severity elevated on divergence');

// Test 7: Growth Risk
console.log('\n5. Growth Risk Engine');
const growthResult = evaluateGrowthRisk({
  revenueGrowth: -0.08,
  operatingMargin: 0.04
});
assert(growthResult.signals.some(s => s.metric === 'revenueGrowth' && s.severity === 'HIGH'), 'REVENUE_CONTRACTION signal triggered for negative growth');

// Test 8: Event & News Headline Risk
console.log('\n6. Event Risk Engine');
const eventResult = evaluateEventRisk([
  { title: 'Regulatory Probe Initiated', severity: -0.5, sentiment: 'NEGATIVE', category: 'Regulatory' },
  { title: 'Lawsuit Filed by Competitor', severity: -0.4, sentiment: 'NEGATIVE', category: 'Legal' },
  { title: 'Earnings Missed Forecast', severity: -0.3, sentiment: 'NEGATIVE', category: 'Earnings' }
]);
assert(eventResult.metrics.negativeEvents === 3, 'Found 3 negative news items');
assert(eventResult.signals.some(s => s.direction === 'ELEVATED_HEADLINE_VELOCITY' || s.direction === 'SEVERE_HEADLINE_VELOCITY'), 'Adverse headline velocity signal triggered');

// Test 9: Governance Risk
console.log('\n7. Governance Risk Engine');
const govResult = evaluateGovernanceRisk({});
assert(govResult.status === 'UNAVAILABLE', 'Governance risk status is UNAVAILABLE when ungrounded');
assert(govResult.severity === 'UNKNOWN', 'Governance severity is UNKNOWN');

// Test 10: Data Quality Engine
console.log('\n8. Data Quality Engine');
const dataQResult = evaluateDataQualityRisk({
  financials: { totalRevenue: 100, netIncome: 10, totalDebt: 20, totalCash: 5, operatingCashFlow: 15, freeCashFlow: 10 },
  stockData: { currentPrice: 50, beta: 1.1, sharesOutstanding: 1000 }
});
assert(dataQResult.metrics.dataCoverageRatio > 0.8, 'Data coverage ratio > 80% with complete inputs');
assert(dataQResult.severity === 'LOW', 'Data quality risk is LOW when complete');

// Test 11: Risk Aggregation & Critical Flag Escalation
console.log('\n9. Comprehensive Risk Aggregation');
const fullProfile = buildRiskProfile({
  financials: {
    totalDebt: 8000,
    totalCash: 500,
    ebitda: 1000, // net debt / ebitda = 7.5x -> CRITICAL
    netIncome: 500,
    operatingCashFlow: 100,
    currentRatio: 0.7
  },
  stockData: { currentPrice: 25, beta: 1.8 }
});
assert(fullProfile.criticalFlags.length > 0, 'Critical risk flags populated');
assert(fullProfile.overallSeverity === 'CRITICAL' || fullProfile.overallSeverity === 'HIGH', 'Overall risk escalated appropriately');
assert(Object.keys(fullProfile.categories).length === 9, 'All 9 canonical risk categories present in profile');

console.log(`\n========================================`);
console.log(`Phase 3 Risk Tests: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
