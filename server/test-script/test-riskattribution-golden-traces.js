/**
 * server/test-script/test-riskattribution-golden-traces.js
 * 
 * Phase 32 — Suite 13: 20 Quantitative Golden Archetypes A–T Certification
 */

import { RiskAttributionCertificationGenerator } from '../riskAttribution/golden/riskAttribution.certification.generator.js';
import { GOLDEN_ATTRIBUTION_FIXTURES } from '../riskAttribution/golden/riskAttribution.golden.fixtures.js';
import { RiskAttributionGoldenReference } from '../riskAttribution/golden/riskAttribution.golden.reference.js';
import { RiskAttributionEngine } from '../riskAttribution/riskAttribution.engine.js';

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  passed++;
}

console.log('--- SUITE 13: 20 Quantitative Golden Archetypes A–T Certification ---');

// 1. Machine-Generated Certification (20/20 Archetypes)
const cert = RiskAttributionCertificationGenerator.generateCertification();
assert(cert.totalArchetypes === 20, 'Certification contains exactly 20 Golden archetypes');
assert(cert.passedCount === 20, 'All 20 Golden archetypes passed certification');
assert(cert.failedCount === 0, 'Zero failures in machine-generated golden certification');

// Explicit assertion per archetype for audit reporting
for (const rec of cert.records) {
  assert(rec.status === 'PASS', `Golden archetype ${rec.archetypeId} certified: ${rec.description}`);
}

// 2. Deep Dive Checks on Canonical Archetypes

// Golden A: Two-Asset MRC Analytical Precision
const fixA = GOLDEN_ATTRIBUTION_FIXTURES.GOLDEN_A;
const refMRCA = RiskAttributionGoldenReference.refMRC(fixA.weights, fixA.covarianceMatrix, fixA.periodsPerYear);
assert(Math.abs(refMRCA[0] - (fixA.expected.mrc1Period * Math.sqrt(252))) < 1e-6, 'Golden A: Reference MRC matches exact hand calculation');

// Golden B: Two-Asset CRC Analytical Precision
const fixB = GOLDEN_ATTRIBUTION_FIXTURES.GOLDEN_B;
const refCRCB = RiskAttributionGoldenReference.refCRC(fixB.weights, fixB.covarianceMatrix, fixB.periodsPerYear);
assert(Math.abs(refCRCB[0] - (fixB.expected.crc1Period * Math.sqrt(252))) < 1e-6, 'Golden B: Reference CRC matches exact hand calculation');

// Golden D: Multi-Asset Euler Verification
const fixD = GOLDEN_ATTRIBUTION_FIXTURES.GOLDEN_D;
const prodD = RiskAttributionEngine.runComprehensiveAttribution({
  symbols: fixD.symbols,
  weights: fixD.weights,
  covarianceMatrix: fixD.covarianceMatrix,
  periodsPerYear: fixD.periodsPerYear
});
assert(prodD.reconciliation.isReconciled === true, 'Golden D: Multi-Asset Euler Theorem strictly holds');

// Golden I & J: Factor Decomposition Reference Integrity
const fixI = GOLDEN_ATTRIBUTION_FIXTURES.GOLDEN_I;
const refFactI = RiskAttributionGoldenReference.refFactorDecomposition(fixI.weights, fixI.symbols, fixI.factorExposures, fixI.periodsPerYear);
assert(refFactI.systematicVariance > 0 && refFactI.idiosyncraticVariance > 0, 'Golden I: Reference systematic and idiosyncratic variances are positive');

// Golden O: Tail Risk Parametric Component VaR & ES Analytical Precision
const fixO = GOLDEN_ATTRIBUTION_FIXTURES.GOLDEN_O;
const refCVaRO = RiskAttributionGoldenReference.refComponentVaR(fixO.weights, fixO.covarianceMatrix, fixO.confidence, fixO.periodsPerYear);
const refCESO = RiskAttributionGoldenReference.refComponentExpectedShortfall(fixO.weights, fixO.covarianceMatrix, fixO.confidence, fixO.periodsPerYear);
const diffCVaR = Math.abs(refCVaRO[0] - fixO.expected.componentVaR[0]) + Math.abs(refCVaRO[1] - fixO.expected.componentVaR[1]);
const diffCES = Math.abs(refCESO[0] - fixO.expected.componentExpectedShortfall[0]) + Math.abs(refCESO[1] - fixO.expected.componentExpectedShortfall[1]);
assert(diffCVaR < 1e-6 && diffCES < 1e-6, 'Golden O: Reference Component VaR and Component ES match exact canonical values');

// 3. Fixture Mutation Anti-Cheating Invariant
const mutatedWeights = [...fixA.weights];
mutatedWeights[0] = 0.999;
const mutatedMRC = RiskAttributionGoldenReference.refMRC(mutatedWeights, fixA.covarianceMatrix, fixA.periodsPerYear);
assert(mutatedMRC[0] !== refMRCA[0], 'Anti-Cheating: Altering weights strictly alters reference calculation');

console.log(`PASSED: ${passed}`);
