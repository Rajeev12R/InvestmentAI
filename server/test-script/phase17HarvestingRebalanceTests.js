/**
 * Phase 17 — Test Suite 3: Harvesting, Wash-Sale, Tax-Aware Rebalancing, Scenarios & Constraints
 */

import { strict as assert } from 'assert';
import { TaxStatus, HarvestStatus, WashSaleStatus, ScenarioType } from '../tax/tax.types.js';
import { TaxHarvestingEngine } from '../tax/tax.harvesting.engine.js';
import { TaxWashSaleEngine } from '../tax/tax.washSale.engine.js';
import { TaxRebalanceEngine } from '../tax/tax.rebalance.engine.js';
import { TaxScenarioEngine } from '../tax/tax.scenario.engine.js';
import { TaxComparisonEngine } from '../tax/tax.comparison.engine.js';
import { TaxConstraintEngine } from '../tax/tax.constraint.engine.js';
import { TAX_POLICY_V1, TAX_POLICY_V2 } from '../tax/tax.config.js';

let totalAssertions = 0;
function testAssert(cond, msg) {
  assert(cond, msg);
  totalAssertions++;
}

console.log('--- RUNNING PHASE 17 SUITE 3: HARVESTING, REBALANCING & SCENARIOS TESTS ---');

// 1. Wash Sale Engine: 30-Day Lookback detection
const washLookbackRes = TaxWashSaleEngine.evaluateWashSale({
  securityId: 'NVDA',
  saleDate: '2024-06-15T00:00:00.000Z',
  isLoss: true
}, [
  { transactionId: 'TX-1', securityId: 'NVDA', side: 'BUY', date: '2024-06-01T00:00:00.000Z', quantity: 50 } // 14 days prior
], 'US');
testAssert(washLookbackRes.status === TaxStatus.PASS, 'Wash sale evaluation completes');
testAssert(washLookbackRes.washSaleStatus === WashSaleStatus.DISALLOWED, 'Wash sale triggered on 14-day lookback');
testAssert(washLookbackRes.violatingTransactions.length === 1, 'Found 1 violating transaction');

// 2. Wash Sale Engine: Substantially Identical flag
const washSubstRes = TaxWashSaleEngine.evaluateWashSale({
  securityId: 'SPY',
  saleDate: '2024-06-15T00:00:00.000Z',
  isLoss: true,
  replacementSecurityId: 'SUBSTANTIALLY_IDENTICAL_INDEX_ETF'
}, [], 'US');
testAssert(washSubstRes.washSaleStatus === WashSaleStatus.POTENTIAL_RESTRICTION, 'Substantially identical replacement flagged POTENTIAL_RESTRICTION');

// 3. Tax-Loss Harvesting Engine
const openLotsHarvest = [
  { lotId: 'LOT-H1', securityId: 'TSLA', acquisitionDate: '2023-01-01T00:00:00.000Z', acquisitionPrice: 300.0, quantity: 100, costBasis: 30000.0 }, // Unrealized loss: 100 * (150 - 300) = -$15,000 (LTCG)
  { lotId: 'LOT-H2', securityId: 'AAPL', acquisitionDate: '2024-05-01T00:00:00.000Z', acquisitionPrice: 200.0, quantity: 10, costBasis: 2000.0 },   // Unrealized loss: 10 * (195 - 200) = -$50 (Below $100 min loss hurdle)
  { lotId: 'LOT-H3', securityId: 'GOOGL', acquisitionDate: '2024-01-01T00:00:00.000Z', acquisitionPrice: 100.0, quantity: 100, costBasis: 10000.0 }  // Unrealized gain: 100 * (180 - 100) = +$8,000 (Gain, not loss)
];

const currentPrices = { TSLA: 150.0, AAPL: 195.0, GOOGL: 180.0 };

const harvestRes = TaxHarvestingEngine.identifyHarvestCandidates({
  openLots: openLotsHarvest,
  currentPrices,
  transactionHistory: [],
  asOf: '2024-06-01T00:00:00.000Z',
  jurisdiction: 'US',
  accountType: 'TAXABLE',
  minLossDollars: 100.0,
  minLossPercent: 0.02
});

testAssert(harvestRes.status === TaxStatus.PASS, 'Harvesting engine passes');
testAssert(harvestRes.candidateCount === 1, 'Exactly 1 candidate identified (TSLA)');
testAssert(harvestRes.candidates[0].lotId === 'LOT-H1', 'Candidate is TSLA lot');
testAssert(harvestRes.candidates[0].unrealizedLoss === 15000.0, 'Unrealized loss is $15,000');
testAssert(harvestRes.candidates[0].estimatedTaxBenefit === (15000.0 * 0.20), 'LTCG tax benefit is $3,000');
testAssert(harvestRes.candidates[0].status === HarvestStatus.HARVEST_CANDIDATE, 'Candidate status is HARVEST_CANDIDATE');

// 4. Constraint Engine: Position limit & Shorting
const validCandidateWeights = { AAPL: 0.30, MSFT: 0.30, GOOGL: 0.40 };
const constraintPass = TaxConstraintEngine.validateCandidateConstraints(validCandidateWeights, {
  maxPositionWeight: 0.40,
  allowShorting: false,
  maxLeverage: 1.0
});
testAssert(constraintPass.status === TaxStatus.PASS && constraintPass.feasible === true, 'Valid candidate weights pass constraints');

const invalidShortWeights = { AAPL: 0.50, MSFT: -0.10, GOOGL: 0.60 };
const constraintShortFail = TaxConstraintEngine.validateCandidateConstraints(invalidShortWeights, {
  maxPositionWeight: 0.40,
  allowShorting: false,
  maxLeverage: 1.0
});
testAssert(constraintShortFail.status === TaxStatus.INFEASIBLE_CONSTRAINTS, 'Shorting violation rejected with INFEASIBLE_CONSTRAINTS');

// 5. Multi-Objective Tax-Aware Rebalancing Engine
const openLotsBySec = {
  AAPL: [{ lotId: 'LOT-A1', securityId: 'AAPL', acquisitionDate: '2024-05-01T00:00:00.000Z', acquisitionPrice: 100.0, quantity: 2000, costBasis: 200000.0 }], // Recent STCG lot
  MSFT: [{ lotId: 'LOT-M1', securityId: 'MSFT', acquisitionDate: '2023-01-01T00:00:00.000Z', acquisitionPrice: 200.0, quantity: 1500, costBasis: 300000.0 }]
};

const rebPrices = { AAPL: 200.0, MSFT: 400.0, GOOGL: 150.0 };

const rebalanceRes = TaxRebalanceEngine.generateTaxAwareRebalance({
  portfolioId: 'PORT-MAIN',
  workspaceId: 'WS-TAX',
  currentWeights: { AAPL: 0.40, MSFT: 0.60, GOOGL: 0.00 },
  targetWeights: { AAPL: 0.20, MSFT: 0.50, GOOGL: 0.30 }, // Requires selling AAPL (which has heavy STCG)
  currentPrices: rebPrices,
  portfolioValue: 1000000,
  openLotsBySecurity: openLotsBySec,
  expectedReturns: { AAPL: 0.09, MSFT: 0.10, GOOGL: 0.11 },
  volatilities: { AAPL: 0.20, MSFT: 0.18, GOOGL: 0.22 },
  constraints: { maxPositionWeight: 0.60, allowShorting: false, maxLeverage: 1.0 },
  policy: TAX_POLICY_V1,
  asOf: '2024-06-01T00:00:00.000Z',
  jurisdiction: 'US',
  accountType: 'TAXABLE'
});

testAssert(rebalanceRes.status === TaxStatus.PASS, 'Rebalance engine executes');
testAssert(rebalanceRes.nominalRebalance.realizedTax > 0, 'Nominal rebalance incurs realized tax');
testAssert(rebalanceRes.taxAwareRebalance.realizedTax < rebalanceRes.nominalRebalance.realizedTax, 'Tax-aware rebalance reduces realized tax liability');
testAssert(rebalanceRes.taxSavings > 0, 'Tax savings is positive');
testAssert(rebalanceRes.decision === TaxStatus.TAX_AWARE_REBALANCE_PREFERRED, 'Tax-aware rebalance is PREFERRED');

// 6. Scenario Engine (Scenarios A–E)
const scenarioRes = TaxScenarioEngine.evaluateScenarios({
  portfolioId: 'PORT-MAIN',
  workspaceId: 'WS-TAX',
  currentWeights: { AAPL: 0.40, MSFT: 0.60, GOOGL: 0.00 },
  targetWeights: { AAPL: 0.20, MSFT: 0.50, GOOGL: 0.30 },
  currentPrices: rebPrices,
  portfolioValue: 1000000,
  openLotsBySecurity: openLotsBySec,
  allOpenLots: Object.values(openLotsBySec).flat(),
  expectedReturns: { AAPL: 0.09, MSFT: 0.10, GOOGL: 0.11 },
  volatilities: { AAPL: 0.20, MSFT: 0.18, GOOGL: 0.22 },
  constraints: { maxPositionWeight: 0.60, allowShorting: false, maxLeverage: 1.0 },
  policy: TAX_POLICY_V1,
  asOf: '2024-06-01T00:00:00.000Z',
  jurisdiction: 'US',
  accountType: 'TAXABLE'
});

testAssert(scenarioRes.status === TaxStatus.PASS, 'Scenario evaluation passes');
testAssert(scenarioRes.scenarios.length === 5, 'All 5 Scenarios (A to E) generated');
testAssert(scenarioRes.scenarios[0].scenario === ScenarioType.A_NO_REBALANCE, 'Scenario A is NO_REBALANCE');
testAssert(scenarioRes.scenarios[1].scenario === ScenarioType.B_FULL_TARGET, 'Scenario B is FULL_TARGET');
testAssert(scenarioRes.scenarios[2].scenario === ScenarioType.C_TAX_AWARE, 'Scenario C is TAX_AWARE');
testAssert(scenarioRes.scenarios[3].scenario === ScenarioType.D_HARVEST_ONLY, 'Scenario D is HARVEST_ONLY');
testAssert(scenarioRes.scenarios[4].scenario === ScenarioType.E_PARTIAL_REBALANCE, 'Scenario E is PARTIAL_REBALANCE');

// 7. 3-Way Comparison Engine
const compRes = TaxComparisonEngine.comparePortfolios(
  { expectedReturn: 0.096, afterTaxExpectedReturn: 0.096, volatility: 0.18, realizedTax: 0, turnover: 0, taxDrag: 0 },
  { expectedReturn: 0.101, afterTaxExpectedReturn: 0.075, volatility: 0.17, realizedTax: 26000, turnover: 0.30, taxDrag: 0.026 },
  { expectedReturn: 0.099, afterTaxExpectedReturn: 0.086, volatility: 0.17, realizedTax: 13000, turnover: 0.15, taxDrag: 0.013 }
);

testAssert(compRes.status === TaxStatus.PASS, 'Comparison engine passes');
testAssert(compRes.comparisonMatrix.expectedReturn.target === 0.101, 'Target nominal return is 10.1%');
testAssert(compRes.comparisonMatrix.afterTaxExpectedReturn.taxAware === 0.086, 'Tax-aware after-tax return is 8.6% (superior to nominal 7.5%)');
testAssert(compRes.taxSavings === 13000, 'Tax savings is $13,000');

// 8. Policy V2 Rebalance weighting check
const rebV2Res = TaxRebalanceEngine.generateTaxAwareRebalance({
  portfolioId: 'PORT-MAIN',
  workspaceId: 'WS-TAX',
  currentWeights: { AAPL: 0.40, MSFT: 0.60, GOOGL: 0.00 },
  targetWeights: { AAPL: 0.20, MSFT: 0.50, GOOGL: 0.30 },
  currentPrices: rebPrices,
  portfolioValue: 1000000,
  openLotsBySecurity: openLotsBySec,
  expectedReturns: { AAPL: 0.09, MSFT: 0.10, GOOGL: 0.11 },
  volatilities: { AAPL: 0.20, MSFT: 0.18, GOOGL: 0.22 },
  constraints: { maxPositionWeight: 0.60, allowShorting: false, maxLeverage: 1.0 },
  policy: TAX_POLICY_V2,
  asOf: '2026-02-01T00:00:00.000Z',
  jurisdiction: 'US',
  accountType: 'TAXABLE'
});
// 9. Scale Invariance Check: $100k vs $1M portfolio
const reb100kRes = TaxRebalanceEngine.generateTaxAwareRebalance({
  portfolioId: 'PORT-100K',
  workspaceId: 'WS-TAX',
  currentWeights: { AAPL: 0.40, MSFT: 0.60, GOOGL: 0.00 },
  targetWeights: { AAPL: 0.20, MSFT: 0.50, GOOGL: 0.30 },
  currentPrices: rebPrices,
  portfolioValue: 100000,
  openLotsBySecurity: {
    AAPL: [{ lotId: 'LOT-A1-100K', securityId: 'AAPL', acquisitionDate: '2024-05-01T00:00:00.000Z', acquisitionPrice: 100.0, quantity: 200, costBasis: 20000.0 }],
    MSFT: [{ lotId: 'LOT-M1-100K', securityId: 'MSFT', acquisitionDate: '2023-01-01T00:00:00.000Z', acquisitionPrice: 200.0, quantity: 150, costBasis: 30000.0 }]
  },
  expectedReturns: { AAPL: 0.09, MSFT: 0.10, GOOGL: 0.11 },
  volatilities: { AAPL: 0.20, MSFT: 0.18, GOOGL: 0.22 },
  constraints: { maxPositionWeight: 0.60, allowShorting: false, maxLeverage: 1.0 },
  policy: TAX_POLICY_V1,
  asOf: '2024-06-01T00:00:00.000Z',
  jurisdiction: 'US',
  accountType: 'TAXABLE'
});
testAssert(reb100kRes.status === TaxStatus.PASS, 'Rebalance with $100k passes');
testAssert(Math.abs(reb100kRes.taxAwareRebalance.expectedReturn - rebalanceRes.taxAwareRebalance.expectedReturn) < 1e-4, 'Scale-invariant expected return matches between $100k and $1M');
testAssert(Math.abs((reb100kRes.taxSavings / 100000) - (rebalanceRes.taxSavings / 1000000)) < 1e-4, 'Tax savings as % of portfolio is scale-invariant');
testAssert(Math.abs(reb100kRes.taxAwareRebalance.utilityScore - rebalanceRes.taxAwareRebalance.utilityScore) < 1e-3, 'Utility score is scale-invariant');

// 10. Wash Sale Jurisdiction Isolation: India does not trigger US wash sale rule
const washIndiaRes = TaxWashSaleEngine.evaluateWashSale({
  securityId: 'RELIANCE',
  saleDate: '2024-08-15T00:00:00.000Z',
  isLoss: true
}, [
  { transactionId: 'TX-IN-1', securityId: 'RELIANCE', side: 'BUY', date: '2024-08-01T00:00:00.000Z', quantity: 50 }
], 'IN');
testAssert(washIndiaRes.status === TaxStatus.PASS, 'India wash sale eval passes');
testAssert(washIndiaRes.washSaleStatus === WashSaleStatus.ALLOWED, 'India has ALLOWED for wash sale (no statutory rule)');
testAssert(washIndiaRes.disallowedLoss === 0, 'Disallowed loss is 0 under India jurisdiction');

console.log(`PASSED: Suite 3 completed with ${totalAssertions} assertions.`);

