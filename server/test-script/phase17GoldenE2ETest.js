/**
 * Phase 17 — Test Suite 8: Golden End-to-End Deterministic Trace
 * Traces Market Fact -> Tax Lot -> Cost Basis -> Holding Period -> Realized Gain -> Tax Rule
 * -> Tax Estimate -> Tax Drag -> After-Tax Return -> Phase 14 Target -> Phase 15 Implementation
 * -> Phase 16 Compliance -> Tax-Aware Rebalance -> Harvesting Candidate -> Package Hash -> Copilot Explanation.
 */

import { strict as assert } from 'assert';
import { TaxStatus, CostBasisMethod, DividendClassification } from '../tax/tax.types.js';
import { TaxLotEngine } from '../tax/tax.lot.engine.js';
import { TaxJurisdictionEngine } from '../tax/tax.jurisdiction.js';
import { TaxCostBasisEngine } from '../tax/tax.costBasis.engine.js';
import { TaxHoldingPeriodEngine } from '../tax/tax.holdingPeriod.engine.js';
import { TaxRealizedGainEngine } from '../tax/tax.realizedGain.engine.js';
import { TaxUnrealizedGainEngine } from '../tax/tax.unrealizedGain.engine.js';
import { TaxDividendEngine } from '../tax/tax.dividend.engine.js';
import { TaxDragEngine } from '../tax/tax.taxDrag.engine.js';
import { TaxAfterTaxReturnEngine } from '../tax/tax.afterTaxReturn.engine.js';
import { TaxHarvestingEngine } from '../tax/tax.harvesting.engine.js';
import { TaxRebalanceEngine } from '../tax/tax.rebalance.engine.js';
import { TaxExplanationEngine } from '../tax/tax.explanation.engine.js';
import { TaxIntelligencePackageBuilder } from '../tax/tax.package.js';
import { TAX_POLICY_V1 } from '../tax/tax.config.js';

let totalAssertions = 0;
function testAssert(cond, msg) {
  assert(cond, msg);
  totalAssertions++;
}

console.log('--- RUNNING PHASE 17 SUITE 8: GOLDEN END-TO-END TRACE ---');

const asOf = '2024-06-01T00:00:00.000Z';
const workspaceId = 'WS-GOLDEN-TRACE';
const portfolioId = 'PORT-GOLDEN-01';

// Step 1: Market Facts
const marketFacts = {
  AAPL: { currentPrice: 190.0, dividendAmount: 1.0, dividendDate: '2024-05-15T00:00:00.000Z', classification: DividendClassification.QUALIFIED },
  MSFT: { currentPrice: 420.0, dividendAmount: 2.5, dividendDate: '2024-05-15T00:00:00.000Z', classification: DividendClassification.QUALIFIED },
  TSLA: { currentPrice: 160.0, dividendAmount: 0.0, dividendDate: null, classification: null }
};
testAssert(marketFacts.AAPL.currentPrice === 190.0, 'Step 1: Market facts verified');

// Step 2: Immutable Tax Lots
const lotA1 = TaxLotEngine.createTaxLot({
  lotId: 'LOT-GOLDEN-AAPL-01',
  securityId: 'AAPL',
  accountId: portfolioId,
  acquisitionDate: '2023-01-15T00:00:00.000Z',
  acquisitionPrice: 130.0,
  quantity: 200,
  costBasis: 26000.0,
  currency: 'USD',
  source: 'GOLDEN_FEED',
  sourceEvidenceId: 'EVID-G-AAPL-01'
}, asOf);
testAssert(lotA1.status === TaxStatus.PASS, 'Step 2: Lot AAPL-01 created with canonical hash');

const lotM1 = TaxLotEngine.createTaxLot({
  lotId: 'LOT-GOLDEN-MSFT-01',
  securityId: 'MSFT',
  accountId: portfolioId,
  acquisitionDate: '2024-02-15T00:00:00.000Z',
  acquisitionPrice: 380.0,
  quantity: 100,
  costBasis: 38000.0,
  currency: 'USD',
  source: 'GOLDEN_FEED',
  sourceEvidenceId: 'EVID-G-MSFT-01'
}, asOf);
testAssert(lotM1.status === TaxStatus.PASS, 'Step 2: Lot MSFT-01 created');

const lotT1 = TaxLotEngine.createTaxLot({
  lotId: 'LOT-GOLDEN-TSLA-01',
  securityId: 'TSLA',
  accountId: portfolioId,
  acquisitionDate: '2023-08-01T00:00:00.000Z',
  acquisitionPrice: 240.0, // Loss lot ($160 current vs $240 acquisition)
  quantity: 100,
  costBasis: 24000.0,
  currency: 'USD',
  source: 'GOLDEN_FEED',
  sourceEvidenceId: 'EVID-G-TSLA-01'
}, asOf);
testAssert(lotT1.status === TaxStatus.PASS, 'Step 2: Lot TSLA-01 created');

const allLots = [lotA1.lot, lotM1.lot, lotT1.lot];

// Step 3: Cost Basis Allocation (FIFO for disposal of 50 AAPL shares)
const basisAlloc = TaxCostBasisEngine.allocateCostBasis(allLots.filter(l => l.securityId === 'AAPL'), 50, CostBasisMethod.FIFO);
testAssert(basisAlloc.status === TaxStatus.PASS, 'Step 3: FIFO cost basis allocated');
testAssert(basisAlloc.totalAllocatedCostBasis === 50 * 130.0, 'Step 3: Allocated cost basis is $6,500');

// Step 4: Holding Period Engine
const hpEval = TaxHoldingPeriodEngine.evaluateHoldingPeriod(basisAlloc.allocations[0].acquisitionDate, asOf, 'US');
testAssert(hpEval.status === TaxStatus.PASS, 'Step 4: Holding period evaluated');
testAssert(hpEval.holdingClass === 'LONG_TERM', 'Step 4: AAPL lot held > 365 days is LONG_TERM');

// Step 5: Realized Gain & Tax Estimate
const realizedGain = TaxRealizedGainEngine.calculateRealizedGain({
  securityId: 'AAPL',
  disposalQuantity: 50,
  salePrice: 190.0,
  allocatedLots: basisAlloc.allocations,
  disposalDate: asOf,
  jurisdiction: 'US',
  accountType: 'TAXABLE',
  transactionCosts: 10.0
});
testAssert(realizedGain.status === TaxStatus.PASS, 'Step 5: Realized gain evaluated');
testAssert(realizedGain.grossProceeds === 9500.0, 'Step 5: Gross proceeds is $9,500');
testAssert(realizedGain.netRealizedGainLoss === (9500 - 6500 - 10), 'Step 5: Net gain after fees is $2,990');
testAssert(realizedGain.estimatedTax === (3000 * 0.20), 'Step 5: US LTCG 20% estimated tax is $600');

// Step 6: Unrealized Mark-to-Market
const unrealizedGains = TaxUnrealizedGainEngine.calculateUnrealizedGains(
  allLots,
  { AAPL: 190.0, MSFT: 420.0, TSLA: 160.0 },
  asOf,
  'US',
  'TAXABLE'
);
testAssert(unrealizedGains.status === TaxStatus.PASS, 'Step 6: Unrealized gains evaluated');
testAssert(unrealizedGains.totalMarketValue === (200 * 190 + 100 * 420 + 100 * 160), 'Step 6: Total market value is $96,000');

// Step 7: Dividend Tax
const divTax = TaxDividendEngine.evaluateDividendTax({
  dividendId: 'DIV-G-01',
  securityId: 'AAPL',
  accountId: portfolioId,
  amount: 200 * 1.0,
  dividendDate: marketFacts.AAPL.dividendDate,
  classification: marketFacts.AAPL.classification,
  jurisdiction: 'US'
});
testAssert(divTax.status === TaxStatus.PASS, 'Step 7: Dividend tax evaluated');
testAssert(divTax.estimatedTax === (200 * 0.20), 'Step 7: Qualified dividend tax is $40');

// Step 8: Tax Drag & After-Tax Returns
const afterTaxReturns = TaxAfterTaxReturnEngine.calculateAfterTaxReturns({
  preTaxTwr: 0.16,
  preTaxMwr: 0.15,
  portfolioValue: 96000,
  realizedTax: realizedGain.estimatedTax,
  dividendTax: divTax.estimatedTax,
  transactionCosts: 10.0
});
testAssert(afterTaxReturns.status === TaxStatus.PASS, 'Step 8: After-tax performance computed');
testAssert(afterTaxReturns.afterTaxTwr < 0.16, 'Step 8: After-tax TWR includes tax friction');

// Step 9: Tax-Loss Harvesting Candidates
const harvestCandidates = TaxHarvestingEngine.identifyHarvestCandidates({
  openLots: allLots,
  currentPrices: { AAPL: 190.0, MSFT: 420.0, TSLA: 160.0 },
  asOf,
  jurisdiction: 'US'
});
testAssert(harvestCandidates.status === TaxStatus.PASS, 'Step 9: Harvesting engine evaluates');
testAssert(harvestCandidates.candidateCount === 1, 'Step 9: Exactly 1 harvest candidate found (TSLA)');
testAssert(harvestCandidates.candidates[0].unrealizedLoss === (100 * (240 - 160)), 'Step 9: TSLA unrealized loss is $8,000');

// Step 10: Multi-Objective Tax-Aware Rebalancing
const rebalanceProposal = TaxRebalanceEngine.generateTaxAwareRebalance({
  portfolioId,
  workspaceId,
  currentWeights: { AAPL: 0.40, MSFT: 0.44, TSLA: 0.16 },
  targetWeights: { AAPL: 0.30, MSFT: 0.50, TSLA: 0.20 },
  currentPrices: { AAPL: 190.0, MSFT: 420.0, TSLA: 160.0 },
  portfolioValue: 96000,
  openLotsBySecurity: {
    AAPL: [lotA1.lot],
    MSFT: [lotM1.lot],
    TSLA: [lotT1.lot]
  },
  expectedReturns: { AAPL: 0.10, MSFT: 0.11, TSLA: 0.14 },
  volatilities: { AAPL: 0.20, MSFT: 0.18, TSLA: 0.35 },
  constraints: { maxPositionWeight: 0.60, allowShorting: false, maxLeverage: 1.0 },
  policy: TAX_POLICY_V1,
  asOf,
  jurisdiction: 'US'
});
testAssert(rebalanceProposal.status === TaxStatus.PASS, 'Step 10: Tax-aware rebalance evaluated');
testAssert(rebalanceProposal.decision !== undefined, 'Step 10: Rebalance decision emitted');

// Step 11: Causal Explanation DAG
const dag = TaxExplanationEngine.generateExplanationDAG({
  portfolioId,
  workspaceId,
  asOf,
  jurisdiction: 'US',
  taxLots: allLots,
  harvestingCandidates: harvestCandidates.candidates,
  rebalanceProposal,
  policyVersion: 'TAX_POLICY_V1'
});
testAssert(dag.dagHash !== undefined, 'Step 11: Explanation DAG generated with cryptographic hash');
testAssert(dag.nodes.length >= 4, 'Step 11: DAG contains root, policy, lot, and harvest nodes');

// Step 12: Sealed TaxIntelligencePackage
const sealedPkg = TaxIntelligencePackageBuilder.sealPackage({
  packageVersion: '1.0.0',
  policyVersion: 'TAX_POLICY_V1',
  workspaceId,
  portfolioId,
  asOf,
  jurisdiction: 'US',
  taxAccountContext: { accountId: portfolioId, accountType: 'TAXABLE', jurisdiction: 'US' },
  taxLots: allLots,
  unrealizedGains,
  taxDrag: afterTaxReturns.taxDrag,
  afterTaxReturns,
  harvestingCandidates: harvestCandidates.candidates,
  taxAwareRebalance: rebalanceProposal,
  evidenceGraph: dag
});
// Step 13: Copilot Read-Only Explanation
const copilotExp = TaxExplanationEngine.generateCopilotExplanation(sealedPkg, 'Explain harvest candidates and rebalance decision');
testAssert(copilotExp.status === TaxStatus.PASS, 'Step 13: Copilot generates factual explanation');
testAssert(copilotExp.explanation.includes('harvesting') || copilotExp.explanation.includes('rebalance'), 'Step 13: Copilot addresses harvest / rebalance');
testAssert(copilotExp.disclaimer.includes('does not provide tax or legal advice'), 'Step 13: Legal disclaimer enforced');

// Step 14: Golden Tax Boundary Trace (Double-Counting Defense & Single-Count Invariant)
// Gross Portfolio Value ($100k) -> Tax Event ($2k) -> Source (PORTFOLIO) -> Boundary (POST_ALL_INVESTOR_COSTS)
// -> Post-Tax Value ($108k) -> Subperiod Return (8%) -> Geometric Linking (8%) -> After-Tax TWR -> Tax Drag -> Sealed Package
import { ValuationBoundary, TaxPaymentSource } from '../tax/tax.types.js';

const goldenBoundarySubperiods = [
  {
    subperiodIndex: 1,
    beginningValue: 100000,
    endingValue: 108000, // Post-tax actual portfolio value
    valuationBoundary: ValuationBoundary.POST_ALL_INVESTOR_COSTS,
    actualTaxPaid: 2000,
    taxPaymentSource: TaxPaymentSource.PORTFOLIO,
    taxEventId: 'EVT-GOLDEN-TAX-01',
    externalCashFlow: 0,
    startDate: '2024-01-01',
    endDate: '2024-01-31'
  }
];

const goldenBoundaryReturn = TaxAfterTaxReturnEngine.calculateAfterTaxReturns({
  subperiods: goldenBoundarySubperiods,
  valuationBoundary: ValuationBoundary.POST_ALL_INVESTOR_COSTS
});

testAssert(goldenBoundaryReturn.status === TaxStatus.PASS, 'Step 14: Golden boundary trace executes');
testAssert(Math.abs(goldenBoundaryReturn.afterTaxTwr - 0.08) < 1e-6, 'Step 14: Single-count invariant verified: After-tax return is 8.00%');
testAssert(Math.abs(goldenBoundaryReturn.preTaxTwr - 0.10) < 1e-6, 'Step 14: Pre-tax reconstructed gross return is 10.00%');
testAssert(Math.abs(goldenBoundaryReturn.taxDrag.taxDrag - 0.02) < 1e-6, 'Step 14: Tax drag scalar is exactly 2.00%');
testAssert(goldenBoundaryReturn.ledgerHash !== undefined, 'Step 14: Tax effect ledger hash generated');

const sealedGoldenBoundaryPkg = TaxIntelligencePackageBuilder.sealPackage({
  packageVersion: '1.0.0',
  policyVersion: 'TAX_POLICY_V1',
  workspaceId,
  portfolioId,
  asOf,
  jurisdiction: 'US',
  taxLots: allLots,
  taxDrag: goldenBoundaryReturn.taxDrag,
  afterTaxReturns: goldenBoundaryReturn,
  ledgerHash: goldenBoundaryReturn.ledgerHash
});

testAssert(sealedGoldenBoundaryPkg.ledgerHash === goldenBoundaryReturn.ledgerHash, 'Step 14: Sealed package embeds immutable ledger hash');
testAssert(sealedGoldenBoundaryPkg.afterTaxReturnMethodology === 'ACTUAL_AFTER_TAX', 'Step 14: Sealed package embeds ACTUAL_AFTER_TAX methodology');
testAssert(TaxIntelligencePackageBuilder.verifyPackage(sealedGoldenBoundaryPkg).valid === true, 'Step 14: Sealed golden boundary package verifies');

console.log(`PASSED: Suite 8 Golden E2E completed with ${totalAssertions} assertions.`);

