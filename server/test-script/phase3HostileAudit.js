/**
 * Comprehensive Hostile Numerical and Semantic Integrity Audit for Phase 3
 * Tests all 24 adversarial fixtures, edge cases, invariants, and mathematical formulas.
 */

import { evaluateMarketRisk } from '../risk/marketRisk.engine.js';
import { evaluateFinancialRisk } from '../risk/financialRisk.engine.js';
import { evaluateLiquidityRisk } from '../risk/liquidityRisk.engine.js';
import { evaluateEarningsQuality } from '../risk/earningsQuality.engine.js';
import { evaluateGrowthRisk } from '../risk/growthRisk.engine.js';
import { evaluateEventRisk } from '../risk/eventRisk.engine.js';
import { evaluateGovernanceRisk } from '../risk/governanceRisk.engine.js';
import { evaluateDataQualityRisk } from '../risk/dataQuality.engine.js';
import { buildRiskProfile } from '../risk/riskAggregation.engine.js';

import { calculateConcentration } from '../portfolio/concentration.engine.js';
import { calculatePairwiseCorrelation, buildCorrelationMatrix } from '../portfolio/correlation.engine.js';
import { evaluateDiversification } from '../portfolio/diversification.engine.js';
import { calculateTargetWeights } from '../portfolio/positionSizing.engine.js';
import { buildPortfolioAnalytics } from '../portfolio/portfolioRisk.engine.js';

import { evaluateInvestorFit } from '../decision/investorFit.engine.js';
import { calculateConviction } from '../decision/conviction.engine.js';
import { buildDecisionEvidenceGraph } from '../decision/decisionEvidence.engine.js';
import { makeInvestmentDecision } from '../decision/decision.engine.js';
import { sealTruthPackage, validateTruthPackage } from '../tools/evidence.tool.js';

let passed = 0;
let failed = 0;
const findings = [];

function assert(condition, testName, details = '') {
  if (condition) {
    passed++;
    console.log(`  [AUDIT PASS] ${testName}`);
  } else {
    failed++;
    console.error(`  [AUDIT FAIL] ${testName} - ${details}`);
    findings.push({ testName, details });
  }
}

console.log('================================================================================');
console.log('STARTING PHASE 3 HOSTILE NUMERICAL & SEMANTIC INTEGRITY AUDIT');
console.log('================================================================================\n');

// -----------------------------------------------------------------------------
// SECTION 1: MARKET RISK ADVERSARIAL AUDIT
// -----------------------------------------------------------------------------
console.log('--- SECTION 1: MARKET RISK ADVERSARIAL AUDIT ---');

// 1.1 Beta = 0 and Negative Beta
const mktZeroBeta = evaluateMarketRisk({ currentPrice: 100, fiftyTwoWeekHigh: 120, fiftyTwoWeekLow: 80, beta: 0 });
assert(mktZeroBeta.metrics.beta.value === 0, '1.1 Beta = 0 is preserved exactly (not treated as missing/falsy)');

const mktNegBeta = evaluateMarketRisk({ currentPrice: 100, fiftyTwoWeekHigh: 120, fiftyTwoWeekLow: 80, beta: -0.35 });
assert(mktNegBeta.metrics.beta.value === -0.35, '1.2 Negative beta (-0.35) preserved without corruption');

// 1.3 Missing Beta & Missing 52W High/Low
const mktMissingAll = evaluateMarketRisk({});
assert(mktMissingAll.metrics.beta.value === null, '1.3 Missing beta propagates as null (no fake 1.0 default)');
assert(mktMissingAll.metrics.drawdown52w.value === null, '1.4 Missing 52W high produces null drawdown');
assert(mktMissingAll.metrics.distanceFromLow52w.value === null, '1.5 Missing 52W low produces null distance');
assert(mktMissingAll.severity === 'UNKNOWN', '1.6 Severity is UNKNOWN when all market inputs missing');

// 1.4 Boundary equality: currentPrice == High / currentPrice == Low
const mktAtHigh = evaluateMarketRisk({ currentPrice: 150, fiftyTwoWeekHigh: 150, fiftyTwoWeekLow: 100, beta: 1.0 });
assert(mktAtHigh.metrics.drawdown52w.value === 0, '1.7 Price at 52W high produces exact 0% drawdown');

const mktAtLow = evaluateMarketRisk({ currentPrice: 100, fiftyTwoWeekHigh: 150, fiftyTwoWeekLow: 100, beta: 1.0 });
assert(mktAtLow.metrics.distanceFromLow52w.value === 0, '1.8 Price at 52W low produces exact 0% distance from low');

// -----------------------------------------------------------------------------
// SECTION 2: FINANCIAL RISK ADVERSARIAL AUDIT
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 2: FINANCIAL RISK ADVERSARIAL AUDIT ---');

// 2.1 Negative EBITDA (prohibits standard positive multiple / ratio)
const finNegEbitda = evaluateFinancialRisk({ totalDebt: 1000, totalCash: 200, ebitda: -500 }, 'Technology');
assert(finNegEbitda.metrics.netDebtToEbitda.value === null, '2.1 Negative EBITDA sets Net Debt/EBITDA to null (not a misleading negative leverage)');
assert(finNegEbitda.metrics.netDebtToEbitda.status === 'UNAVAILABLE', '2.2 Negative EBITDA status marked UNAVAILABLE');

// 2.2 Negative Stockholders Equity
const finNegEquity = evaluateFinancialRisk({ totalDebt: 2000, totalStockholderEquity: -500 }, 'Consumer');
assert(finNegEquity.metrics.debtToEquity.value === null, '2.3 Negative equity sets Debt/Equity to null (avoids nonsensical negative leverage)');

// 2.3 Zero / Missing Interest Expense
const finZeroInterest = evaluateFinancialRisk({ operatingIncome: 500, interestExpense: 0 }, 'Technology');
assert(finZeroInterest.metrics.interestCoverage.value === null, '2.4 Zero interest expense sets Interest Coverage to null (avoids divide-by-zero Infinity)');

// 2.4 Banking Sector Prohibitions
const finBankSector = evaluateFinancialRisk({ totalDebt: 500000, totalCash: 100000, ebitda: 50000 }, 'Banking');
assert(finBankSector.metrics.netDebtToEbitda.value === null, '2.5 Banking sector prohibits Net Debt / EBITDA');
assert(finBankSector.metrics.netDebtToEbitda.status === 'NOT_APPROPRIATE', '2.6 Banking sector status is NOT_APPROPRIATE');

// -----------------------------------------------------------------------------
// SECTION 3: LIQUIDITY RISK ADVERSARIAL AUDIT
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 3: LIQUIDITY RISK ADVERSARIAL AUDIT ---');

// 3.1 Daily dollar turnover = Price * Volume (units check)
const liqTurnover = evaluateLiquidityRisk({}, { currentPrice: 250.50, averageVolume: 2000000 });
// 250.50 * 2,000,000 = 501,000,000 USD
assert(liqTurnover.metrics.dailyDollarTurnover.value === 501000000, '3.1 Daily dollar turnover correctly computed in currency units ($501M)');

// 3.2 Zero Volume & Extreme Illiquidity
const liqIlliquid = evaluateLiquidityRisk({ currentRatio: 0.5 }, { currentPrice: 5.0, averageVolume: 10000 }); // $50k daily volume
assert(liqIlliquid.signals.some(s => s.metric === 'dailyDollarTurnover' && s.severity === 'CRITICAL'), '3.2 Extreme illiquidity (< $500k daily volume) triggers CRITICAL signal');
assert(liqIlliquid.signals.some(s => s.metric === 'currentRatio' && s.severity === 'CRITICAL'), '3.3 Severe working capital deficit (Current Ratio 0.5x) triggers CRITICAL signal');

// -----------------------------------------------------------------------------
// SECTION 4: EARNINGS QUALITY ADVERSARIAL AUDIT
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 4: EARNINGS QUALITY ADVERSARIAL AUDIT ---');

// 4.1 Zero or Negative Net Income
const earnZeroNI = evaluateEarningsQuality({ netIncome: 0, operatingCashFlow: 500 });
assert(earnZeroNI.metrics.cfoToNetIncome.value === null, '4.1 Net Income = 0 sets CFO/NI to null (avoids divide-by-zero)');

const earnNegNI = evaluateEarningsQuality({ netIncome: -200, operatingCashFlow: 300 });
assert(earnNegNI.metrics.cfoToNetIncome.value === null, '4.2 Negative Net Income sets CFO/NI to null');

// 4.2 Cash Flow Divergence (Net Income > 0 but CFO << NI or negative)
const earnDivergence = evaluateEarningsQuality({ netIncome: 1000, operatingCashFlow: 200, freeCashFlow: -100, totalRevenue: 5000 });
assert(earnDivergence.metrics.cfoToNetIncome.value === 0.20, '4.3 CFO/NI conversion is 0.20x');
assert(earnDivergence.signals.some(s => s.severity === 'CRITICAL' && s.direction === 'CASH_FLOW_DIVERGENCE'), '4.4 Severe cash flow divergence triggers CRITICAL signal');

// -----------------------------------------------------------------------------
// SECTION 5: DATA QUALITY & EVIDENCE COVERAGE AUDIT
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 5: DATA QUALITY & EVIDENCE COVERAGE AUDIT ---');

// 5.1 Monotonicity: Removing data MUST reduce coverage and increase data risk
const caseA_Full = evaluateDataQualityRisk({
  financials: { totalRevenue: 100, netIncome: 10, totalDebt: 20, totalCash: 5, operatingCashFlow: 15, freeCashFlow: 10 },
  stockData: { currentPrice: 50, beta: 1.1, sharesOutstanding: 1000 }
});

const caseB_Partial = evaluateDataQualityRisk({
  financials: { totalRevenue: 100, netIncome: 10, totalDebt: 20, totalCash: 5 },
  stockData: { currentPrice: 50 }
});

const caseC_CriticalMissing = evaluateDataQualityRisk({
  financials: { totalRevenue: 100 },
  stockData: {}
});

assert(caseA_Full.metrics.dataCoverageRatio === 1.0, '5.1 100% data has coverageRatio = 1.0');
assert(caseA_Full.severity === 'LOW', '5.2 Full data has LOW data quality risk');
assert(caseB_Partial.metrics.dataCoverageRatio < caseA_Full.metrics.dataCoverageRatio, '5.3 Partial data strictly decreases coverage ratio');
assert(caseC_CriticalMissing.severity === 'CRITICAL', '5.4 Multiple missing critical facts escalates to CRITICAL data quality risk');

// -----------------------------------------------------------------------------
// SECTION 6: PORTFOLIO CONCENTRATION & HHI AUDIT
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 6: PORTFOLIO CONCENTRATION & HHI AUDIT ---');

// Test Case A: Single asset 100% -> HHI = 10,000, N_eff = 1.0
const portA = calculateConcentration([{ ticker: 'AAPL', value: 100000 }]);
const divA = evaluateDiversification(portA);
assert(portA.hhi === 10000, '6.1 100% Single position HHI = 10,000');
assert(divA.effectiveNumberOfBets === 1.0, '6.2 100% Single position N_eff = 1.0');
assert(divA.diversificationLevel === 'POOR', '6.3 100% Single position classified as POOR diversification');

// Test Case B: 10 equal assets (10% each) -> HHI = 1,000, N_eff = 10.0
const pos10 = Array.from({ length: 10 }, (_, i) => ({ ticker: `STK${i}`, value: 10000, sector: `Sector${i % 5}` }));
const portB = calculateConcentration(pos10);
const divB = evaluateDiversification(portB);
// HHI = 10 * (10^2) = 1,000
assert(portB.hhi === 1000, `6.4 10 equal positions HHI = 1,000 (actual: ${portB.hhi})`);
assert(divB.effectiveNumberOfBets === 10.0, `6.5 10 equal positions N_eff = 10.0 (actual: ${divB.effectiveNumberOfBets})`);
assert(divB.diversificationLevel === 'STRONG', '6.6 10 equal positions classified as STRONG diversification');

// Test Case C: Scale invariance property (multiplying values by constant does not change weights)
const pos10Scaled = pos10.map(p => ({ ...p, value: p.value * 7.5 }));
const portBScaled = calculateConcentration(pos10Scaled);
assert(portBScaled.hhi === portB.hhi, '6.7 Scale Invariance: Multiplying portfolio by constant preserves exact HHI');
assert(portBScaled.positions[0].weight === portB.positions[0].weight, '6.8 Scale Invariance: Normalized weights are identical');

// -----------------------------------------------------------------------------
// SECTION 7: CORRELATION ENGINE AUDIT
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 7: CORRELATION ENGINE AUDIT ---');

const s1 = [0.01, 0.03, -0.02, 0.04, -0.01, 0.05];
const s2 = [0.01, 0.03, -0.02, 0.04, -0.01, 0.05]; // Identical -> +1.0
const s3 = [-0.01, -0.03, 0.02, -0.04, 0.01, -0.05]; // Inverse -> -1.0
const sFlat = [0.02, 0.02, 0.02, 0.02, 0.02, 0.02]; // Zero variance -> 0.0
const sShort = [0.01, 0.02]; // Insufficient observations -> null

assert(calculatePairwiseCorrelation(s1, s2) === 1.0, '7.1 Identical return series correlation = +1.0');
assert(calculatePairwiseCorrelation(s1, s3) === -1.0, '7.2 Perfectly inverse return series correlation = -1.0');
assert(calculatePairwiseCorrelation(s1, sFlat) === 0.0, '7.3 Flat return series (zero variance) returns 0.0 (no NaN)');
assert(calculatePairwiseCorrelation(s1, sShort, 5) === null, '7.4 Insufficient observations (< 5) returns null (no fabricated correlation)');

// -----------------------------------------------------------------------------
// SECTION 8: POSITION SIZING AUDIT
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 8: POSITION SIZING AUDIT ---');

// 8.1 Target weights sum to exactly 1.0
const sizingPositions = [
  { ticker: 'AAPL', value: 50000, volatility: 0.25 },
  { ticker: 'MSFT', value: 30000, volatility: 0.20 },
  { ticker: 'JNJ', value: 20000, volatility: 0.15 }
];

const eqSizing = calculateTargetWeights(sizingPositions, { model: 'EQUAL_WEIGHT', maxPositionCap: 0.40 });
const sumEq = Math.round(eqSizing.targets.reduce((s, t) => s + t.targetWeight, 0) * 100) / 100;
assert(sumEq === 1.0, `8.1 Equal-weight targets sum to 1.00 (actual: ${sumEq})`);

const riskParitySizing = calculateTargetWeights(sizingPositions, { model: 'RISK_PARITY_VOL', maxPositionCap: 0.45 });
const sumRP = Math.round(riskParitySizing.targets.reduce((s, t) => s + t.targetWeight, 0) * 100) / 100;
assert(sumRP === 1.0, `8.2 Risk-parity targets sum to 1.00 (actual: ${sumRP})`);
assert(riskParitySizing.targets.every(t => t.targetWeight <= 0.4501), '8.3 Single-position 45% cap enforced strictly across all positions');

// 8.4 RISK_PARITY_VOL missing volatility/beta logs sizing.warnings while retaining weights
const rpMissing = calculateTargetWeights([
  { ticker: 'AAPL', value: 10000, volatility: 0.25 },
  { ticker: 'MSFT', value: 10000, beta: 1.1 },
  { ticker: 'UNKNOWN', value: 10000 }
], { model: 'RISK_PARITY_VOL' });
assert(rpMissing.warnings.length === 2, '8.4 RISK_PARITY_VOL records warnings for missing volatility/beta positions');
assert(Math.round(rpMissing.targets.reduce((s, t) => s + t.targetWeight, 0) * 100) / 100 === 1.0, '8.4b Target weights sum to 1.00 with fallback proxy');

// 8.5 CONVICTION_WEIGHTED missing conviction logs sizing.warnings while retaining weights
const convMissing = calculateTargetWeights([
  { ticker: 'AAPL', value: 10000, convictionScore: 85 },
  { ticker: 'UNKNOWN', value: 10000, convictionScore: null }
], { model: 'CONVICTION_WEIGHTED' });
assert(convMissing.warnings.length === 1 && convMissing.warnings[0].includes('assigned baseline median score (50/100)'), '8.5 CONVICTION_WEIGHTED records warning for missing conviction score');
assert(Math.round(convMissing.targets.reduce((s, t) => s + t.targetWeight, 0) * 100) / 100 === 1.0, '8.5b Target weights sum to 1.00 with median score proxy');

// -----------------------------------------------------------------------------
// SECTION 9: DECISION MATRIX & HOSTILE CASES AUDIT
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 9: DECISION MATRIX & HOSTILE CASES AUDIT ---');

// Hostile Case A: Undervalued + Low Risk -> BUY
const decA = makeInvestmentDecision({
  valuation: {
    valuationSummary: { valuationStatus: 'UNDERVALUED', currentPrice: 100, compositeFairValue: 140, marginOfSafetyPct: 28.5 },
    modelAgreement: { status: 'COMPLETE', modelsEvaluated: ['DCF', 'RELATIVE'], dispersion: 'LOW' }
  },
  riskProfile: { overallRiskLevel: 'LOW', criticalFlags: [] },
  investorProfile: 'BALANCED_VALUE'
});
assert(decA.decision === 'BUY', '9.1 Case A: Undervalued + Low Risk produces BUY');

// Hostile Case B: Undervalued + CRITICAL Risk -> AVOID (Never BUY)
const decB = makeInvestmentDecision({
  valuation: {
    valuationSummary: { valuationStatus: 'UNDERVALUED', currentPrice: 50, compositeFairValue: 120, marginOfSafetyPct: 58.3 }
  },
  riskProfile: { overallRiskLevel: 'CRITICAL', criticalFlags: ['CRITICAL_LEVERAGE'] },
  investorProfile: 'BALANCED_VALUE'
});
assert(decB.decision === 'AVOID', '9.2 Case B: Undervalued + CRITICAL Risk strictly produces AVOID (Capital preservation override)');

// Hostile Case C: Overvalued + Low Risk -> WATCH (Never BUY)
const decC = makeInvestmentDecision({
  valuation: {
    valuationSummary: { valuationStatus: 'OVERVALUED', currentPrice: 200, compositeFairValue: 140, marginOfSafetyPct: -42.8 }
  },
  riskProfile: { overallRiskLevel: 'LOW', criticalFlags: [] },
  investorProfile: 'BALANCED_VALUE'
});
assert(decC.decision === 'WATCH', '9.3 Case C: Overvalued asset produces WATCH');

// Hostile Case D: Missing Valuation -> WATCH (Never BUY)
const decD = makeInvestmentDecision({
  valuation: { valuationSummary: { valuationStatus: 'UNAVAILABLE' } },
  riskProfile: { overallRiskLevel: 'LOW', criticalFlags: [] },
  investorProfile: 'BALANCED_VALUE'
});
assert(decD.decision === 'WATCH', '9.4 Case D: Missing valuation produces WATCH (Zero fake buy)');

// -----------------------------------------------------------------------------
// SECTION 10: INVESTOR FIT & CONVICTION AUDIT
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 10: INVESTOR FIT & CONVICTION AUDIT ---');

// 10.1 Changing Investor Profile does not alter objective raw metrics
const rawFacts = { freeCashFlow: { value: 1000000, type: 'GROUNDED' } };
const fitCons = evaluateInvestorFit({ investorProfile: 'CONSERVATIVE_INCOME', financialFacts: rawFacts });
const fitAgg = evaluateInvestorFit({ investorProfile: 'AGGRESSIVE_GROWTH', financialFacts: rawFacts });
assert(rawFacts.freeCashFlow.value === 1000000, '10.1 Invariant: Evaluating investor fit does not mutate raw financial facts');
assert(fitCons.investorProfile !== fitAgg.investorProfile, '10.2 Investor profiles remain isolated');

// 10.2 Conviction scoring reflects data completeness & model agreement
const convHigh = calculateConviction({
  valuation: { modelAgreement: { status: 'COMPLETE', modelsEvaluated: ['DCF', 'RELATIVE'], dispersion: 'LOW' } },
  riskProfile: { categoryBreakdowns: { DATA_QUALITY: { metrics: { dataCoverageRatio: 0.95 } } }, criticalFlags: [] }
});
assert(convHigh.convictionLevel === 'HIGH', '10.3 High coverage + agreeing models yields HIGH conviction');

const convLow = calculateConviction({
  valuation: { modelAgreement: { status: 'INSUFFICIENT_MODELS', modelsEvaluated: [] } },
  riskProfile: { categoryBreakdowns: { DATA_QUALITY: { metrics: { dataCoverageRatio: 0.40 } } }, criticalFlags: ['CRITICAL_LEVERAGE'] }
});
assert(convLow.convictionLevel === 'LOW' || convLow.convictionLevel === 'SPECULATIVE', '10.4 Poor coverage + critical flags yields LOW/SPECULATIVE conviction');

// -----------------------------------------------------------------------------
// SECTION 11: TRUTH PACKAGE SEAL & TAMPER DETECTION AUDIT
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 11: TRUTH PACKAGE SEAL & TAMPER DETECTION AUDIT ---');

const mockTruthPackage = {
  company: { ticker: 'AAPL', name: 'Apple Inc.' },
  financialFacts: [{ id: 'financial.revenue', metric: 'Revenue', value: 383000000000, status: 'GROUNDED', source: { provider: 'SEC' }, retrievedAt: new Date().toISOString() }],
  calculatedMetrics: [{ id: 'financial.netDebt', metric: 'Net Debt', value: 50000000000, status: 'CALCULATED', formula: 'Debt - Cash', inputs: ['debt', 'cash'], retrievedAt: new Date().toISOString() }],
  valuationModels: {},
  riskSignals: { overallScore: 35, overallRiskLevel: 'LOW' },
  provenance: [{ id: 'financial.revenue', status: 'GROUNDED' }]
};

const seal1 = sealTruthPackage(mockTruthPackage);
assert(seal1.valid === true, '11.1 Truth Package seal generated successfully');
assert(typeof seal1.packageHash === 'string' && seal1.packageHash.length === 64, '11.2 SHA-256 seal is valid 64-char hex string');

// Tamper test: Mutate revenue in truth package
const tamperedPackage = JSON.parse(JSON.stringify(mockTruthPackage));
tamperedPackage.financialFacts[0].value = 999999999999;
const sealTampered = sealTruthPackage(tamperedPackage);
assert(sealTampered.packageHash !== seal1.packageHash, '11.3 Tamper Detection: Mutating underlying fact changes SHA-256 seal hash');

console.log(`\n================================================================================`);
console.log(`HOSTILE AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED`);
console.log(`================================================================================\n`);

if (failed > 0) {
  process.exit(1);
}
