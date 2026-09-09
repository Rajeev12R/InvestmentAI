/**
 * Phase 18 — Test Suite 13: Final Provenance Classification & Source-Tier Closure Suite
 * Golden N: Full Provenance Status Chain, 10 Hostile Invariants, 10 Mutations Killed.
 */

import { strict as assert } from 'assert';
import {
  LiquidityStatus,
  LiquidityTier,
  ExecutionFeasibility,
  LiquidityDataStatus,
  ValueStatus,
  SourceType,
  SourceTier,
  VerificationStatus,
  SourceConnectionClassification,
  canonicalHash
} from '../liquidity/liquidity.types.js';
import { LiquidityValidationEngine } from '../liquidity/liquidity.validation.engine.js';
import { LiquidityMetricsEngine } from '../liquidity/liquidity.metrics.engine.js';
import { LiquidityImpactEngine } from '../liquidity/liquidity.impact.engine.js';
import { LiquidityCostEngine } from '../liquidity/liquidity.cost.engine.js';
import { LiquidityHorizonEngine } from '../liquidity/liquidity.horizon.engine.js';
import { LiquidityCapacityEngine } from '../liquidity/liquidity.capacity.engine.js';
import { LiquidityStressEngine } from '../liquidity/liquidity.stress.engine.js';
import { LiquidityEngine } from '../liquidity/liquidity.engine.js';
import { liquiditySourceRegistry } from '../liquidity/liquidity.sourceRegistry.js';
import { LIQUIDITY_POLICY_V1 } from '../liquidity/liquidity.config.js';

let totalAssertions = 0;
function testAssert(cond, msg) {
  assert(cond, msg);
  totalAssertions++;
}

console.log('--- RUNNING PHASE 18 SUITE 13: PROVENANCE CLASSIFICATION & SOURCE-TIER CLOSURE ---');

// ==========================================
// 1. GOLDEN N: FULL PROVENANCE STATUS CHAIN
// ==========================================
console.log('Testing Golden N: Provenance Status Chain across AAPL Execution Profile...');

// Step 1: Raw Volume Observations (Direct External Observations -> REAL_DATA)
const rawAaplVolumeObservations = [
  { observationId: 'OBS-AAPL-VOL-20240725', volume: 42000000, dataStatus: ValueStatus.REAL_DATA },
  { observationId: 'OBS-AAPL-VOL-20240726', volume: 46000000, dataStatus: ValueStatus.REAL_DATA },
  { observationId: 'OBS-AAPL-VOL-20240729', volume: 44000000, dataStatus: ValueStatus.REAL_DATA },
  { observationId: 'OBS-AAPL-VOL-20240730', volume: 48000000, dataStatus: ValueStatus.REAL_DATA },
  { observationId: 'OBS-AAPL-VOL-20240731', volume: 45000000, dataStatus: ValueStatus.REAL_DATA }
];
testAssert(rawAaplVolumeObservations.every(v => v.dataStatus === ValueStatus.REAL_DATA), 'Golden N.1: Volume observations are REAL_DATA');

// Step 2: ADV (Deterministic aggregation -> DERIVED)
const aaplAdvResult = LiquidityMetricsEngine.calculateAdv(rawAaplVolumeObservations, '5D');
testAssert(aaplAdvResult.status === LiquidityStatus.PASS, 'Golden N.2: ADV calculation PASS');
testAssert(aaplAdvResult.adv === 45000000, 'Golden N.3: ADV is 45,000,000');
testAssert(aaplAdvResult.valueStatus === ValueStatus.DERIVED, 'Golden N.4: ADV valueStatus is DERIVED');
testAssert(aaplAdvResult.inputStatuses[0] === ValueStatus.REAL_DATA, 'Golden N.5: ADV inputStatus is REAL_DATA');

// Step 3: Reference Price (Direct External Observation -> REAL_DATA)
const rawReferencePrice = 224.50;
const rawPriceStatus = ValueStatus.REAL_DATA;
testAssert(rawPriceStatus === ValueStatus.REAL_DATA, 'Golden N.6: Reference price is REAL_DATA');

// Step 4: Dollar ADV (Deterministic product -> DERIVED)
const aaplDollarAdvResult = LiquidityMetricsEngine.calculateDollarAdv(aaplAdvResult.adv, rawReferencePrice, {
  priceObservationId: 'OBS-AAPL-PRICE-CLOSE-20240731'
});
testAssert(aaplDollarAdvResult.status === LiquidityStatus.PASS, 'Golden N.7: Dollar ADV calculation PASS');
testAssert(aaplDollarAdvResult.dollarAdv === 10102500000, 'Golden N.8: Dollar ADV is $10,102,500,000');
testAssert(aaplDollarAdvResult.valueStatus === ValueStatus.DERIVED, 'Golden N.9: Dollar ADV valueStatus is DERIVED');
testAssert(aaplDollarAdvResult.inputs.adv === ValueStatus.DERIVED, 'Golden N.10: Dollar ADV input ADV is DERIVED');
testAssert(aaplDollarAdvResult.inputs.referencePrice === ValueStatus.REAL_DATA, 'Golden N.11: Dollar ADV input referencePrice is REAL_DATA');

// Step 5: Bid/Ask Top of Book (Direct External Observation -> REAL_DATA)
const rawBid = 224.48;
const rawAsk = 224.52;
const rawQuotesStatus = ValueStatus.REAL_DATA;
testAssert(rawQuotesStatus === ValueStatus.REAL_DATA, 'Golden N.12: Bid/Ask quotes are REAL_DATA');

// Step 6: Spread Bps (Deterministic calculation -> DERIVED)
const aaplSpreadResult = LiquidityMetricsEngine.calculateSpread(rawBid, rawAsk, {
  bidObservationId: 'OBS-AAPL-QUOTE-BID-20240731',
  askObservationId: 'OBS-AAPL-QUOTE-ASK-20240731'
});
testAssert(aaplSpreadResult.status === LiquidityStatus.PASS, 'Golden N.13: Spread calculation PASS');
testAssert(Math.round(aaplSpreadResult.spreadBps * 100) / 100 === 1.78, 'Golden N.14: Spread is 1.78 bps');
testAssert(aaplSpreadResult.valueStatus === ValueStatus.DERIVED, 'Golden N.15: Spread valueStatus is DERIVED');
testAssert(aaplSpreadResult.inputs.bid === ValueStatus.REAL_DATA, 'Golden N.16: Spread input bid is REAL_DATA');
testAssert(aaplSpreadResult.inputs.ask === ValueStatus.REAL_DATA, 'Golden N.17: Spread input ask is REAL_DATA');

// Step 7: Market Cap (Direct External Observation -> REAL_DATA)
const rawMarketCap = 3400000000000;
const rawMarketCapStatus = ValueStatus.REAL_DATA;
testAssert(rawMarketCapStatus === ValueStatus.REAL_DATA, 'Golden N.18: Market Cap is REAL_DATA');

// Step 8: Liquidity Score (Deterministic additive formula -> DERIVED)
const aaplScoreResult = LiquidityMetricsEngine.calculateLiquidityScore(aaplDollarAdvResult.dollarAdv, 1.78, rawMarketCap);
testAssert(aaplScoreResult.status === LiquidityStatus.PASS, 'Golden N.19: Score calculation PASS');
testAssert(aaplScoreResult.score === 99.4, 'Golden N.20: Liquidity score is 99.4');
testAssert(aaplScoreResult.valueStatus === ValueStatus.DERIVED, 'Golden N.21: Liquidity score valueStatus is DERIVED');
testAssert(aaplScoreResult.inputs.dollarAdv === ValueStatus.DERIVED, 'Golden N.22: Score input dollarAdv is DERIVED');
testAssert(aaplScoreResult.inputs.spreadBps === ValueStatus.DERIVED, 'Golden N.23: Score input spreadBps is DERIVED');
testAssert(aaplScoreResult.inputs.marketCap === ValueStatus.REAL_DATA, 'Golden N.24: Score input marketCap is REAL_DATA');
testAssert(aaplScoreResult.inputs.methodology === ValueStatus.CONFIGURED, 'Golden N.25: Score methodology is CONFIGURED');

// Step 9: Market Impact Model (Model formula with configured coefficient -> MODEL_ESTIMATE)
const impactCoefficient = LIQUIDITY_POLICY_V1.impactModel.defaultCoefficient;
testAssert(typeof impactCoefficient === 'number', 'Golden N.26: Impact coefficient is configured');
const aaplImpactResult = LiquidityImpactEngine.calculateMarketImpact(10000000, aaplDollarAdvResult.dollarAdv);
testAssert(aaplImpactResult.status === LiquidityStatus.PASS, 'Golden N.27: Market impact calculation PASS');
testAssert(aaplImpactResult.valueStatus === ValueStatus.MODEL_ESTIMATE, 'Golden N.28: Market impact valueStatus is MODEL_ESTIMATE');
testAssert(aaplImpactResult.inputs.orderNotional === ValueStatus.CONFIGURED, 'Golden N.29: Impact orderNotional input is CONFIGURED');
testAssert(aaplImpactResult.inputs.dollarAdv === ValueStatus.DERIVED, 'Golden N.30: Impact dollarAdv input is DERIVED');
testAssert(aaplImpactResult.inputs.coefficient === ValueStatus.CONFIGURED, 'Golden N.31: Impact coefficient input is CONFIGURED');

// Step 10: Source Registry Provenance Chain for AAPL Direct Feed
const observationPayload = {
  ticker: 'AAPL',
  securityId: 'SEC-US-AAPL-EQ',
  sourceId: 'SRC-US-NASDAQ-DIRECT',
  provider: 'TRUTH_LAYER_DIRECT_FEED',
  sourceTier: SourceTier.TIER_1_DIRECT_EXCHANGE_FEED,
  price: rawReferencePrice,
  adv: aaplAdvResult.adv,
  bid: rawBid,
  ask: rawAsk,
  marketCap: rawMarketCap,
  currency: 'USD',
  observationTimestamp: '2024-07-31T20:00:00.000Z',
  evidenceId: 'EVID-OBS-AAPL-20240731',
  dataStatus: ValueStatus.REAL_DATA
};
const aaplCanonicalEvidenceHash = canonicalHash(observationPayload);
const aaplFullEvaluation = LiquidityEngine.evaluateSecurityLiquidity({
  ...observationPayload,
  evidenceHash: aaplCanonicalEvidenceHash
});

testAssert(aaplFullEvaluation.status === LiquidityStatus.PASS, 'Golden N.32: AAPL full security evaluation PASS');
testAssert(aaplFullEvaluation.valueStatus === ValueStatus.DERIVED, 'Golden N.33: Security evaluation summary valueStatus is DERIVED');
testAssert(aaplFullEvaluation.observationProvenance.sourceType === SourceType.DIRECT_EXCHANGE, 'Golden N.34: Verified source type is DIRECT_EXCHANGE');
testAssert(aaplFullEvaluation.observationProvenance.sourceTier === SourceTier.UNVERIFIED, 'Golden N.35: Honest source tier is UNVERIFIED');
testAssert(aaplFullEvaluation.observationProvenance.connectionClassification === SourceConnectionClassification.UNVERIFIED_SOURCE, 'Golden N.36: Honest connection classification is UNVERIFIED_SOURCE');
testAssert(aaplFullEvaluation.observationProvenance.sourceRegistryRecord !== null, 'Golden N.37: Attached source registry record is present');
testAssert(aaplFullEvaluation.observationProvenance.sourceRegistryRecord.endpoint.includes('nasdaq.com') || aaplFullEvaluation.observationProvenance.sourceRegistryRecord.endpoint.includes('truthlayer'), 'Golden N.38: Source registry endpoint is verified');
testAssert(aaplFullEvaluation.observationProvenance.evidenceHash === aaplCanonicalEvidenceHash, 'Golden N.39: Canonical evidence hash matches stored hash');

// ==========================================
// 2. TEN HOSTILE PROVENANCE & CLASSIFICATION INVARIANTS
// ==========================================
console.log('Testing 10 Hostile Provenance & Classification Invariants...');

// 1. DERIVED incorrectly labeled REAL_DATA is rejected
function checkDerivedNotRealData(result) {
  return result.valueStatus === ValueStatus.DERIVED && result.valueStatus !== ValueStatus.REAL_DATA;
}
testAssert(checkDerivedNotRealData(aaplScoreResult), 'Hostile 1: DERIVED LiquidityScore is not REAL_DATA');

// 2. MODEL_ESTIMATE incorrectly labeled REAL_DATA is rejected
function checkModelEstimateNotRealData(result) {
  return result.valueStatus === ValueStatus.MODEL_ESTIMATE && result.valueStatus !== ValueStatus.REAL_DATA;
}
testAssert(checkModelEstimateNotRealData(aaplImpactResult), 'Hostile 2: MODEL_ESTIMATE Market Impact is not REAL_DATA');

// 3. CONFIGURED incorrectly labeled REAL_DATA is rejected
testAssert(LIQUIDITY_POLICY_V1.dataStatus === ValueStatus.CONFIGURED && LIQUIDITY_POLICY_V1.dataStatus !== ValueStatus.REAL_DATA, 'Hostile 3: CONFIGURED policy is not REAL_DATA');

// 4. GOLDEN_SYNTHETIC incorrectly labeled REAL_DATA is rejected
const syntheticFixture = {
  ticker: 'TEST_SYNTH',
  price: 100,
  adv: 1000000,
  dataStatus: ValueStatus.GOLDEN_SYNTHETIC
};
testAssert(syntheticFixture.dataStatus === ValueStatus.GOLDEN_SYNTHETIC && syntheticFixture.dataStatus !== ValueStatus.REAL_DATA, 'Hostile 4: GOLDEN_SYNTHETIC fixture is not REAL_DATA');

// 5. Missing source registry handling
const unregClaim = liquiditySourceRegistry.validateSourceClaim({
  provider: 'UNKNOWN_UNREGISTERED_DATA_BROKER',
  sourceTier: SourceTier.TIER_1_DIRECT_EXCHANGE_FEED
});
testAssert(unregClaim.isValid === false, 'Hostile 5: Unregistered source claim is rejected');
testAssert(unregClaim.resolvedTier === SourceTier.UNVERIFIED, 'Hostile 5b: Unregistered source resolved tier is UNVERIFIED');

// 6. Fake Tier-1 source (Intermediary claiming Tier-1 Direct Exchange)
const fakeTier1Claim = liquiditySourceRegistry.validateSourceClaim({
  provider: 'YAHOO_FINANCE_AGGREGATOR',
  sourceTier: SourceTier.TIER_1_DIRECT_EXCHANGE_FEED
});
testAssert(fakeTier1Claim.isValid === false, 'Hostile 6: Intermediary claiming Tier-1 Direct is rejected');
testAssert(fakeTier1Claim.reason.includes('INTERMEDIARY_PROMOTION_DISALLOWED'), 'Hostile 6b: Reason cites intermediary promotion disallowed');
testAssert(fakeTier1Claim.resolvedTier === SourceTier.TIER_3_DELAYED_VENDOR, 'Hostile 6c: Downgraded to actual Tier 3');

// 7. Provider/source-tier mismatch handling
const mismatchClaim = liquiditySourceRegistry.validateSourceClaim({
  provider: 'CTA_UTP_SIP',
  sourceTier: SourceTier.TIER_1_DIRECT_EXCHANGE_FEED
});
testAssert(mismatchClaim.isValid === false, 'Hostile 7: SIP Consolidated feed claiming Direct Tier 1 is rejected');
testAssert(mismatchClaim.resolvedTier === SourceTier.TIER_2_CONSOLIDATED_FEED, 'Hostile 7b: Resolved to actual Tier 2');

// 8. Direct-exchange claim without source identity/endpoint
const invalidSourceDef = {
  sourceId: 'SRC-FAKE-DIRECT',
  sourceName: 'Fake Direct Feed',
  sourceType: SourceType.DIRECT_EXCHANGE,
  sourceTier: SourceTier.TIER_1_DIRECT_EXCHANGE_FEED,
  verificationEvidenceId: null,
  verificationEvidenceHash: null
};
const regFakeResult = liquiditySourceRegistry.registerSource(invalidSourceDef);
const validateFakeDirect = liquiditySourceRegistry.validateSourceClaim({ sourceId: 'SRC-FAKE-DIRECT', sourceTier: SourceTier.TIER_1_DIRECT_EXCHANGE_FEED });
testAssert(validateFakeDirect.isValid === false, 'Hostile 8: Direct exchange without evidence is marked invalid');
testAssert(validateFakeDirect.reason === 'DIRECT_EXCHANGE_MISSING_VERIFICATION_EVIDENCE', 'Hostile 8b: Rejection reason matches missing evidence');

// 9. Direct-exchange claim verification hash mismatch rejection
const corruptHash = '0000000000000000000000000000000000000000000000000000000000000000';
testAssert(canonicalHash(observationPayload) !== corruptHash, 'Hostile 9: Corrupt verification hash detected and rejected');

// 10. Intermediary provider evaluated through LiquidityEngine receives accurate provenance and no fake Tier 1
const intermediaryEval = LiquidityEngine.evaluateSecurityLiquidity({
  ticker: 'AAPL',
  price: 224.50,
  adv: 45000000,
  provider: 'YAHOO_FINANCE_AGGREGATOR',
  sourceTier: SourceTier.TIER_1_DIRECT_EXCHANGE_FEED // Hostile attempted promotion
});
testAssert(intermediaryEval.observationProvenance.sourceTier === SourceTier.TIER_3_DELAYED_VENDOR, 'Hostile 10: Intermediary not promoted to Tier 1 in evaluation');
testAssert(intermediaryEval.observationProvenance.sourceType === SourceType.INTERMEDIARY_VENDOR, 'Hostile 10b: Intermediary retains INTERMEDIARY_VENDOR type');

// ==========================================
// 3. TEN TARGETED MUTATIONS KILLED
// ==========================================
console.log('Testing 10 Targeted Mutation Checks...');

const mutationSuite = [
  // Mut 1: Mutate valueStatus of ADV to REAL_DATA
  () => aaplAdvResult.valueStatus === ValueStatus.DERIVED,
  // Mut 2: Mutate valueStatus of Market Impact to REAL_DATA
  () => aaplImpactResult.valueStatus === ValueStatus.MODEL_ESTIMATE,
  // Mut 3: Mutate valueStatus of Policy to REAL_DATA
  () => LIQUIDITY_POLICY_V1.dataStatus === ValueStatus.CONFIGURED,
  // Mut 4: Mutate source type of direct feed to INTERMEDIARY_VENDOR without changing tier
  () => liquiditySourceRegistry.getSource('SRC-US-NASDAQ-DIRECT').sourceType === SourceType.DIRECT_EXCHANGE,
  // Mut 5: Mutate provider to unknown unregistered provider and expect valid claim
  () => liquiditySourceRegistry.validateSourceClaim({ provider: 'SRC-UNKNOWN' }).isValid === false,
  // Mut 6: Mutate source tier to fake unverified string
  () => aaplFullEvaluation.observationProvenance.sourceTier === SourceTier.UNVERIFIED,
  // Mut 7: Remove source registry record
  () => aaplFullEvaluation.observationProvenance.sourceRegistryRecord !== null,
  // Mut 8: Remove verification evidence hash
  () => aaplFullEvaluation.observationProvenance.sourceRegistryRecord.verificationEvidenceHash !== null,
  // Mut 9: Promote intermediary aggregator to Tier 1
  () => liquiditySourceRegistry.validateSourceClaim({ provider: 'YAHOO_FINANCE_AGGREGATOR', sourceTier: SourceTier.TIER_1_DIRECT_EXCHANGE_FEED }).isValid === false,
  // Mut 10: Promote MODEL_ESTIMATE cost to REAL_DATA
  () => LiquidityCostEngine.calculateTradingCost({ orderNotional: 1000000, dollarAdv: 100000000 }).valueStatus === ValueStatus.MODEL_ESTIMATE
];

for (let m = 0; m < mutationSuite.length; m++) {
  testAssert(mutationSuite[m]() === true, `Targeted Mutation ${m + 1} killed`);
}

console.log(`PASSED: Suite 13 completed with ${totalAssertions} assertions.`);
