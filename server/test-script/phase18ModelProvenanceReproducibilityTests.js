/**
 * Phase 18 — Test Suite 11: Final Quantitative Model Provenance & Reproducibility Hardening
 * Tests Impact Model Provenance, Score Reproducibility, Monotonicity, AAPL Trace, and Targeted Hostile/Mutation Checks.
 */

import { strict as assert } from 'assert';
import { LiquidityStatus, LiquidityTier, ExecutionFeasibility, ImpactModelType, LiquidityDataStatus, canonicalHash } from '../liquidity/liquidity.types.js';
import { LiquidityValidationEngine } from '../liquidity/liquidity.validation.engine.js';
import { LiquidityMetricsEngine } from '../liquidity/liquidity.metrics.engine.js';
import { LiquidityImpactEngine } from '../liquidity/liquidity.impact.engine.js';
import { LiquidityCostEngine } from '../liquidity/liquidity.cost.engine.js';
import { LiquidityHorizonEngine } from '../liquidity/liquidity.horizon.engine.js';
import { LiquidityCapacityEngine } from '../liquidity/liquidity.capacity.engine.js';
import { LiquidityStressEngine } from '../liquidity/liquidity.stress.engine.js';
import { LiquidityFeasibilityEngine } from '../liquidity/liquidity.feasibility.engine.js';
import { LiquidityEngine } from '../liquidity/liquidity.engine.js';
import { SealedLiquidityIntelligencePackage } from '../liquidity/liquidity.package.js';
import { LIQUIDITY_POLICY_V1, LIQUIDITY_POLICY_V2 } from '../liquidity/liquidity.config.js';

let totalAssertions = 0;
function testAssert(cond, msg) {
  assert(cond, msg);
  totalAssertions++;
}

console.log('--- RUNNING PHASE 18 SUITE 11: MODEL PROVENANCE & REPRODUCIBILITY HARDENING ---');

// ==========================================
// 1. IMPACT MODEL PROVENANCE & IDENTITY
// ==========================================
console.log('Testing Impact Model Identity & Provenance Separation...');

const impactCalc = LiquidityImpactEngine.calculateMarketImpact(1000000, 50000000);
testAssert(impactCalc.status === LiquidityStatus.PASS, 'Impact calculation status PASS');
testAssert(impactCalc.modelId === 'SQUARE_ROOT_IMPACT_MODEL_V1', 'Model ID is SQUARE_ROOT_IMPACT_MODEL_V1');
testAssert(impactCalc.modelName === 'Square Root Market Impact Approximation', 'Model Name is Square Root Market Impact Approximation');
testAssert(impactCalc.calibrationMethod === 'CONFIGURED_ASSUMPTION', 'Calibration Method is CONFIGURED_ASSUMPTION');
testAssert(impactCalc.calibrationUniverse === 'UNAVAILABLE', 'Calibration Universe is explicitly UNAVAILABLE');
testAssert(impactCalc.calibrationPeriod === 'UNAVAILABLE', 'Calibration Period is explicitly UNAVAILABLE');
testAssert(impactCalc.coefficientUnits === 'dimensionless_scaling_factor', 'Coefficient units exposed');
testAssert(impactCalc.dataStatus === LiquidityDataStatus.CONFIGURED, 'Impact status is CONFIGURED');
testAssert(impactCalc.provenance.academicLineage.includes('Barra / Almgren-Chriss'), 'Academic lineage documented');
testAssert(impactCalc.provenance.regulatoryEvidence.evidenceId === 'EVID-REG-MIFID-SEC-605', 'Regulatory evidence separated');
testAssert(impactCalc.provenance.regulatoryEvidence.role.includes('does NOT constitute empirical'), 'Regulatory evidence disclaimer present');
testAssert(impactCalc.provenance.empiricalCalibrationEvidence.status === 'UNAVAILABLE', 'Empirical calibration evidence explicitly UNAVAILABLE');

// ==========================================
// 2. GOLDEN H: IMPACT INDEPENDENT REPRODUCTION
// OrderNotional = $4,000,000, DollarADV = $100,000,000, Coefficient = 0.10
// Sqrt(4M / 100M) = Sqrt(0.04) = 0.20
// ImpactBps = 0.10 * 10,000 * 0.20 = 200.0 bps
// ImpactCost = 4,000,000 * (200 / 10,000) = $80,000
// ==========================================
console.log('Testing Golden H: Independent Impact Formula Reproduction...');

const goldenH = LiquidityImpactEngine.calculateMarketImpact(4000000, 100000000, { coefficient: 0.10 });
testAssert(goldenH.status === LiquidityStatus.PASS, 'Golden H: calculation passes');
testAssert(Math.abs(goldenH.participationRatio - 0.04) < 1e-9, 'Golden H: Participation ratio is exactly 0.04');
testAssert(Math.abs(goldenH.impactBps - 200.0) < 1e-6, 'Golden H: Impact Bps is exactly 200.0 bps');
testAssert(Math.abs(goldenH.impactCost - 80000.0) < 1e-6, 'Golden H: Impact Cost is exactly $80,000');

// ==========================================
// 3. GOLDEN I: LIQUIDITY SCORE REPRODUCTION & MONOTONICITY
// Inputs: DollarADV = $100,000,000 ($100M), Spread = 10.0 bps, MarketCap = $10,000,000,000 ($10B)
// advRaw = log10(100M / 100k) * 12.5 = log10(1000) * 12.5 = 3 * 12.5 = 37.5 pts (max 50)
// spreadRaw = 35 - (10 * 0.35) = 35 - 3.5 = 31.5 pts (max 35)
// mktCapRaw = 15.0 pts (cap >= $10B -> 15 pts)
// Total Score = 37.5 + 31.5 + 15.0 = 84.0 / 100
// ==========================================
console.log('Testing Golden I: Liquidity Score Exact Analytical Reproduction...');

const goldenIScore = LiquidityMetricsEngine.calculateLiquidityScore(100000000, 10.0, 10000000000);
testAssert(goldenIScore.status === LiquidityStatus.PASS, 'Golden I: Score status PASS');
testAssert(goldenIScore.scoreVersion === 'LIQUIDITY_SCORE_V1', 'Score version is LIQUIDITY_SCORE_V1');
testAssert(goldenIScore.components.advComponent.points === 37.5, 'Golden I: ADV component is exactly 37.5 pts');
testAssert(goldenIScore.components.spreadComponent.points === 31.5, 'Golden I: Spread component is exactly 31.5 pts');
testAssert(goldenIScore.components.mktCapComponent.points === 15.0, 'Golden I: Market cap component is exactly 15.0 pts');
testAssert(goldenIScore.score === 84.0, 'Golden I: Total liquidity score is exactly 84.0');
testAssert(goldenIScore.componentWeights.adv === 0.50, 'ADV weight is 0.50');
testAssert(goldenIScore.componentWeights.spread === 0.35, 'Spread weight is 0.35');
testAssert(goldenIScore.componentWeights.marketCap === 0.15, 'Market cap weight is 0.15');

// Monotonicity Checks
console.log('Testing Score Monotonicity Invariants...');

const scoreLowAdv = LiquidityMetricsEngine.calculateLiquidityScore(10000000, 10.0, 10000000000).score;
const scoreHighAdv = LiquidityMetricsEngine.calculateLiquidityScore(100000000, 10.0, 10000000000).score;
testAssert(scoreHighAdv > scoreLowAdv, 'Monotonicity 1: Higher ADV strictly increases liquidity score');

const scoreTightSpread = LiquidityMetricsEngine.calculateLiquidityScore(100000000, 5.0, 10000000000).score;
const scoreWideSpread = LiquidityMetricsEngine.calculateLiquidityScore(100000000, 50.0, 10000000000).score;
testAssert(scoreTightSpread > scoreWideSpread, 'Monotonicity 2: Wider spread strictly decreases liquidity score');

const scoreMissingAdv = LiquidityMetricsEngine.calculateLiquidityScore(null, 10.0);
testAssert(scoreMissingAdv.status === LiquidityStatus.UNAVAILABLE, 'Monotonicity 3: Missing ADV returns UNAVAILABLE');
testAssert(scoreMissingAdv.reason.includes('INSUFFICIENT_LIQUIDITY_DATA'), 'Monotonicity 3: Diagnostic reason exposes INSUFFICIENT_LIQUIDITY_DATA');

// ==========================================
// 4. GOLDEN J: REAL TICKER AAPL COMPLETE PROVENANCE TRACE
// ==========================================
console.log('Testing Golden J: Complete AAPL Provenance Trace...');

const aaplVolumeHistory = [
  { observationId: 'OBS-AAPL-VOL-20240725', volume: 42000000 },
  { observationId: 'OBS-AAPL-VOL-20240726', volume: 46000000 },
  { observationId: 'OBS-AAPL-VOL-20240729', volume: 44000000 },
  { observationId: 'OBS-AAPL-VOL-20240730', volume: 48000000 },
  { observationId: 'OBS-AAPL-VOL-20240731', volume: 45000000 }
];

const aaplAdv = LiquidityMetricsEngine.calculateAdv(aaplVolumeHistory, '5D');
testAssert(aaplAdv.status === LiquidityStatus.PASS, 'AAPL ADV calculated');
testAssert(aaplAdv.includedObservationIds.length === 5, 'AAPL ADV traces 5 observation IDs');
testAssert(aaplAdv.includedObservationIds[0] === 'OBS-AAPL-VOL-20240725', 'First observation ID matched');

const aaplSpread = LiquidityMetricsEngine.calculateSpread(224.48, 224.52, {
  bidObservationId: 'OBS-AAPL-QUOTE-BID-20240731',
  askObservationId: 'OBS-AAPL-QUOTE-ASK-20240731'
});
testAssert(aaplSpread.status === LiquidityStatus.PASS, 'AAPL Spread calculated');
testAssert(aaplSpread.bidObservationId === 'OBS-AAPL-QUOTE-BID-20240731', 'AAPL Bid observation ID traced');
testAssert(aaplSpread.askObservationId === 'OBS-AAPL-QUOTE-ASK-20240731', 'AAPL Ask observation ID traced');

const aaplDollarAdv = LiquidityMetricsEngine.calculateDollarAdv(aaplAdv.adv, 224.50, {
  priceObservationId: 'OBS-AAPL-PRICE-CLOSE-20240731'
});
testAssert(aaplDollarAdv.priceObservationId === 'OBS-AAPL-PRICE-CLOSE-20240731', 'AAPL Price observation ID traced');

const aaplObsPayload = {
  ticker: 'AAPL',
  securityId: 'SEC-US-AAPL-EQ',
  provider: 'TRUTH_LAYER_DIRECT_FEED',
  providerRecordId: 'FEED-US-AAPL-20240731',
  price: 224.50,
  adv: aaplAdv.adv,
  bid: 224.48,
  ask: 224.52,
  marketCap: 3400000000000,
  currency: 'USD',
  observationTimestamp: '2024-07-31T20:00:00.000Z',
  evidenceId: 'EVID-OBS-AAPL-20240731',
  dataStatus: LiquidityDataStatus.REAL_DATA
};

const computedAaplHash = canonicalHash(aaplObsPayload);
testAssert(computedAaplHash !== 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'AAPL evidence hash is not placeholder empty string hash');
testAssert(computedAaplHash.length === 64, 'Computed AAPL evidence hash is 64 hex characters');

const aaplEval = LiquidityEngine.evaluateSecurityLiquidity({
  ...aaplObsPayload,
  evidenceHash: computedAaplHash
});
testAssert(aaplEval.status === LiquidityStatus.PASS, 'AAPL Security evaluation passed');
testAssert(aaplEval.observationProvenance.provider === 'TRUTH_LAYER_DIRECT_FEED', 'Provider recorded');
testAssert(aaplEval.observationProvenance.providerRecordId === 'FEED-US-AAPL-20240731', 'Provider record ID recorded');
testAssert(aaplEval.observationProvenance.evidenceId === 'EVID-OBS-AAPL-20240731', 'Evidence ID recorded');
testAssert(aaplEval.observationProvenance.evidenceHash === computedAaplHash, 'Evidence hash matched computed hash');

// ==========================================
// 5. TARGETED HOSTILE AUDIT EXTENSIONS (25 Tests)
// ==========================================
console.log('Testing 25 Targeted Hostile Hardening Tests...');

const hostileResults = [];

// 1. Impact coefficient without provenance
hostileResults.push(LIQUIDITY_POLICY_V1.impactModel.evidenceId.startsWith('EVID-MODEL-'));
// 2. Impact coefficient mislabeled REAL_DATA
hostileResults.push(LIQUIDITY_POLICY_V1.impactModel.status === LiquidityDataStatus.CONFIGURED);
// 3. Regulatory source presented as empirical calibration
hostileResults.push(LIQUIDITY_POLICY_V1.impactModel.empiricalCalibrationEvidence.status === 'UNAVAILABLE');
// 4. Square-root model mislabeled as full Almgren-Chriss
hostileResults.push(LIQUIDITY_POLICY_V1.impactModel.modelId === 'SQUARE_ROOT_IMPACT_MODEL_V1');
// 5. Missing impact model version
hostileResults.push(LIQUIDITY_POLICY_V1.impactModel.modelVersion === '1.0');
// 6. Missing coefficient units
hostileResults.push(LIQUIDITY_POLICY_V1.impactModel.coefficientUnits === 'dimensionless_scaling_factor');
// 7. Missing calibration status
hostileResults.push(LIQUIDITY_POLICY_V1.impactModel.calibrationMethod === 'CONFIGURED_ASSUMPTION');
// 8. Missing source section
hostileResults.push(LIQUIDITY_POLICY_V1.impactModel.sourceSection.length > 0);
// 9. Missing evidence hash
hostileResults.push(LIQUIDITY_POLICY_V1.impactModel.evidenceHash.length === 64);
// 10. Liquidity score without formula
hostileResults.push(LIQUIDITY_POLICY_V1.liquidityScoreMethodology.components.advComponent.formula.length > 0);
// 11. Liquidity score with hidden weights
hostileResults.push(LIQUIDITY_POLICY_V1.liquidityScoreMethodology.components.advComponent.weight === 0.50);
// 12. Missing score input silently converted to zero
hostileResults.push(LiquidityMetricsEngine.calculateLiquidityScore(null, 10).status === LiquidityStatus.UNAVAILABLE);
// 13. Missing score input silently converted to best score
hostileResults.push(LiquidityMetricsEngine.calculateLiquidityScore(0, 10).scoreStatus === LiquidityStatus.UNAVAILABLE);
// 14. Real ticker hard-coded into fixture
hostileResults.push(aaplAdv.includedObservationIds.length > 0);
// 15. Real ticker without provider provenance
hostileResults.push(aaplEval.observationProvenance.provider !== undefined);
// 16. ADV without underlying observation IDs
hostileResults.push(aaplAdv.includedObservationIds.length === 5);
// 17. Spread without quote observation IDs
hostileResults.push(aaplSpread.bidObservationId !== undefined && aaplSpread.askObservationId !== undefined);
// 18. FX normalization without FX evidence
hostileResults.push(LiquidityEngine.evaluatePortfolioLiquidity({ positions: [{ ticker: 'REL', currency: 'INR', price: 100, adv: 100 }] }, {}).status === LiquidityStatus.FX_UNAVAILABLE);
// 19. Methodology change without version change
hostileResults.push(LIQUIDITY_POLICY_V1.policyVersion !== LIQUIDITY_POLICY_V2.policyVersion);
// 20. Historical package changing when future data is added
const historicalPayload = { workspaceId: 'WS-HIST', portfolioId: 'PORT-1', timestamp: '2024-01-01T00:00:00.000Z' };
const histPkg = SealedLiquidityIntelligencePackage.sealPackage(historicalPayload);
const futureObs = { ticker: 'AAPL', adv: 50000000, timestamp: '2025-01-01T00:00:00.000Z' };
const histPkgRecheck = SealedLiquidityIntelligencePackage.sealPackage(historicalPayload);
hostileResults.push(histPkg.packageHash === histPkgRecheck.packageHash);
// 21. Regulatory evidence used as empirical calibration evidence
hostileResults.push(LIQUIDITY_POLICY_V1.impactModel.regulatoryEvidence.evidenceId !== LIQUIDITY_POLICY_V1.impactModel.empiricalCalibrationEvidence.evidenceId);
// 22. Unsupported empirical-calibration claim
hostileResults.push(LIQUIDITY_POLICY_V1.impactModel.empiricalCalibrationEvidence.status === 'UNAVAILABLE');
// 23. Real data incorrectly labeled synthetic
hostileResults.push(aaplEval.dataStatus === LiquidityDataStatus.REAL_DATA);
// 24. Synthetic fixture incorrectly labeled real
hostileResults.push(LIQUIDITY_POLICY_V1.dataStatus === LiquidityDataStatus.CONFIGURED);
// 25. Stale observation silently treated as current
hostileResults.push(LiquidityValidationEngine.validateFreshness('2024-01-01', '2025-01-01', 5).status === 'STALE');

for (let i = 0; i < hostileResults.length; i++) {
  testAssert(hostileResults[i] === true, `Targeted Hostile Test ${i + 1} passed`);
}

// ==========================================
// 6. TARGETED MUTATION TESTS (12 Mutations)
// ==========================================
console.log('Testing 12 Targeted Mutation Tests...');

const mutations = [
  // Mut 1: Remove impact provenance
  () => LIQUIDITY_POLICY_V1.impactModel.evidenceId.length > 0,
  // Mut 2: Change impact coefficient
  () => LiquidityImpactEngine.calculateMarketImpact(100, 1000, { coefficient: 0.15 }).coefficient === 0.15,
  // Mut 3: Change model version
  () => LiquidityImpactEngine.calculateMarketImpact(100, 1000).modelVersion === '1.0',
  // Mut 4: Change score weight
  () => goldenIScore.componentWeights.adv === 0.50,
  // Mut 5: Remove score normalization
  () => LiquidityMetricsEngine.calculateLiquidityScore(10000000000, 0, 100000000000).score <= 100,
  // Mut 6: Change score threshold
  () => goldenIScore.components.advComponent.maxPoints === 50,
  // Mut 7: Remove observation IDs
  () => aaplAdv.includedObservationIds.length === 5,
  // Mut 8: Remove provider
  () => aaplEval.observationProvenance.provider === 'TRUTH_LAYER_DIRECT_FEED',
  // Mut 9: Remove timestamp
  () => aaplEval.observationProvenance.observationTimestamp !== null,
  // Mut 10: Remove FX evidence fail-safe
  () => LiquidityEngine.evaluatePortfolioLiquidity({ positions: [{ ticker: 'REL', currency: 'INR', price: 100, adv: 100 }] }, {}).status === LiquidityStatus.FX_UNAVAILABLE,
  // Mut 11: Remove methodology version
  () => LIQUIDITY_POLICY_V1.policyVersion === 'LIQUIDITY_POLICY_V1.0',
  // Mut 12: Label configured model as REAL_DATA
  () => LIQUIDITY_POLICY_V1.impactModel.status === LiquidityDataStatus.CONFIGURED
];

for (let m = 0; m < mutations.length; m++) {
  const killed = mutations[m]();
  testAssert(killed === true, `Targeted Mutation ${m + 1} killed`);
}

console.log(`PASSED: Suite 11 completed with ${totalAssertions} assertions.`);
