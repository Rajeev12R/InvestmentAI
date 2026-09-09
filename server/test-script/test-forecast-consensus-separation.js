/**
 * server/test-script/test-forecast-consensus-separation.js
 * 
 * Phase 20: External Consensus Ingestion & Internal Model Separation Unit Tests
 * Validates provenance tiers (SOURCE_DEFINITION, SOURCE_VERIFICATION, CONSENSUS_OBSERVATION, CONSENSUS_DERIVATION),
 * honest vendor classification (UNVERIFIED_SOURCE), and strict separation from internal forecasts.
 */

import assert from 'assert';
import { ConsensusEngine } from '../forecasting/forecast.consensus.engine.js';
import { ForecastClassification } from '../forecasting/forecast.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- RUNNING PHASE 20 CONSENSUS SEPARATION TESTS ---');

const consensusEngine = new ConsensusEngine();

// =========================================================================
// SECTION 1: PROVENANCE TIERS & UNVERIFIED FIXTURE HONESTY
// =========================================================================
console.log('Testing Section 1: Consensus Provenance Tiers...');
const consensusRecord = consensusEngine.recordConsensus({
  ticker: 'AAPL',
  metric: 'EPS',
  period: 'FY2027',
  meanEstimate: 8.50,
  medianEstimate: 8.45,
  highEstimate: 9.20,
  lowEstimate: 7.80,
  analystCount: 38,
  sourceProvider: 'BLOOMBERG_CONSENSUS',
  effectiveAt: '2026-01-15T00:00:00Z'
});

testAssert(consensusRecord.ticker === 'AAPL', 'Consensus ticker is AAPL');
testAssert(consensusRecord.meanEstimate === 8.50, 'Mean estimate is 8.50');
testAssert(consensusRecord.classification === ForecastClassification.DERIVED, 'Consensus is DERIVED, not REAL_DATA');

// Prove 4 explicit provenance components exist:
testAssert(consensusRecord.sourceDefinition !== undefined, 'SOURCE_DEFINITION tier exists');
testAssert(consensusRecord.sourceDefinition.sourceId === 'SRC-CONSENSUS-BLOOMBERG_CONSENSUS', 'sourceId matches');
testAssert(consensusRecord.sourceVerification !== undefined, 'SOURCE_VERIFICATION tier exists');
testAssert(consensusRecord.sourceVerification.verificationStatus === 'UNVERIFIED_SOURCE', 'Offline vendor fixture honestly classified as UNVERIFIED_SOURCE');
testAssert(consensusRecord.consensusObservation !== undefined, 'CONSENSUS_OBSERVATION tier exists');
testAssert(consensusRecord.consensusDerivation !== undefined, 'CONSENSUS_DERIVATION tier exists');
testAssert(consensusRecord.consensusDerivation.dispersionBps > 0, 'Dispersion bps calculated');
testAssert(consensusRecord.consensusDerivation.coefficientOfVariation > 0, 'Coefficient of variation calculated');

// =========================================================================
// SECTION 2: CONSENSUS RETRIEVAL & LOOKUP
// =========================================================================
console.log('Testing Section 2: Consensus Retrieval...');
const retrieved = consensusEngine.getConsensus('AAPL', 'EPS', 'FY2027');
testAssert(retrieved !== null, 'Consensus retrieved successfully');
testAssert(retrieved.analystCount === 38, 'Analyst count matches');

// =========================================================================
// SECTION 3: SEPARATION INVARIANT (INTERNAL != EXTERNAL CONSENSUS)
// =========================================================================
console.log('Testing Section 3: Separation Invariant...');
// 3a. Compare internal model vs external consensus (Internal higher: $9.00 vs $8.50)
const comp1 = consensusEngine.compareInternalVsConsensus(9.00, 'AAPL', 'EPS', 'FY2027');
testAssert(comp1.hasConsensus === true, 'Comparison confirms consensus exists');
testAssert(comp1.internal.value === 9.00, 'Internal value is $9.00');
testAssert(comp1.internal.classification === ForecastClassification.FORECAST, 'Internal is FORECAST');
testAssert(comp1.consensus.classification === ForecastClassification.DERIVED, 'Consensus is DERIVED');
testAssert(Math.abs(comp1.divergence.deltaDollar - 0.50) < 1e-6, 'Divergence delta is +$0.50');
testAssert(comp1.divergence.isAboveConsensus === true, 'Internal is above consensus');
testAssert(comp1.separationRule === 'INTERNAL_FORECAST_AND_CONSENSUS_STRICTLY_SEPARATED_NO_AUTO_BLEND', 'Separation rule enforced');

// 3b. Compare internal model vs external consensus (Internal lower: $8.00 vs $8.50)
const comp2 = consensusEngine.compareInternalVsConsensus(8.00, 'AAPL', 'EPS', 'FY2027');
testAssert(Math.abs(comp2.divergence.deltaDollar - (-0.50)) < 1e-6, 'Divergence delta is -$0.50');
testAssert(comp2.divergence.isAboveConsensus === false, 'Internal is below consensus');

// 3c. Query ticker without consensus returns structured fallback
const compNoConsensus = consensusEngine.compareInternalVsConsensus(50.0, 'UNKNOWN_TICKER', 'EPS', 'FY2027');
testAssert(compNoConsensus.hasConsensus === false, 'Correctly flags missing consensus');
testAssert(compNoConsensus.consensus === null, 'Consensus field is null');

console.log(`[PASS] Phase 20 Consensus Separation tests passed: ${assertionCount} assertions`);

export default { assertionCount };
