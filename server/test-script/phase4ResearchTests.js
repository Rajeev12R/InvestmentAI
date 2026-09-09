import { buildEvidenceIndex } from '../research/researchEvidence.engine.js';
import { validateClaims } from '../research/claimValidator.engine.js';
import { buildInvestmentThesis } from '../research/thesis.engine.js';
import { identifyCatalysts } from '../research/catalyst.engine.js';
import { generateThesisBreakers } from '../research/thesisBreaker.engine.js';
import { analyzeEarningsQuality } from '../research/earnings.engine.js';
import { interpretValuation } from '../research/valuationInterpretation.engine.js';
import { researchCache } from '../research/researchCache.js';
import { executeResearch } from '../research/research.engine.js';
import { STATEMENT_TYPES, RESEARCH_QUESTION_TYPES, CATALYST_TYPES, THESIS_BREAKER_SEVERITY, AI_CONFIDENCE_LEVELS } from '../research/research.types.js';
import { buildEvidenceGraph } from '../tools/evidence.tool.js';
import { calculateValuation } from '../tools/valuation.tool.js';

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

console.log('=== PHASE 4 RESEARCH INTELLIGENCE ENGINE SUITE ===\n');

import { getFinancialData } from '../tools/financial.tool.js';

// 1. Setup realistic sealed Truth Package with production financial facts
const aaplFin = await getFinancialData('AAPL');

const mockStock = {
  currentPrice: 250.0,
  sharesOutstanding: 15200000000,
  marketCap: 3800000000000,
  beta: 1.12,
  fiftyTwoWeekHigh: 260.0,
  fiftyTwoWeekLow: 165.0,
  currency: 'USD'
};

const mockValuation = calculateValuation({
  financials: aaplFin,
  stockData: mockStock,
  companyProfile: { ticker: 'AAPL', name: 'Apple Inc.', sector: 'Technology' }
});

const mockEvidenceState = {
  companyProfile: { ticker: 'AAPL', name: 'Apple Inc.', sector: 'Technology', industry: 'Consumer Electronics', currency: 'USD' },
  stockData: mockStock,
  financials: aaplFin,
  valuation: mockValuation,
  risks: {
    overallRiskLevel: 'LOW',
    overallScore: 24,
    criticalFlags: [],
    financialRisk: { debtToEbitda: 0.57 }
  },
  competitors: [{ ticker: 'MSFT' }, { ticker: 'GOOGL' }],
  newsData: [{ title: 'Apple expands services ecosystem with new product launch', sentiment: 'POSITIVE', severity: 0.5 }],
  investorProfile: { horizon: 'Long (3-5 Years)', riskTolerance: 'Moderate / Balanced', goal: 'Capital Growth' }
};

const truthResult = buildEvidenceGraph(mockEvidenceState);
const mockTruthPackage = truthResult.truthPackage;

// ==========================================
// 1. Evidence Indexer Tests
// ==========================================
console.log('1. Research Evidence Indexer & Provenance Binding');
const evidenceIndex = buildEvidenceIndex(mockTruthPackage);

assert(evidenceIndex !== null && typeof evidenceIndex === 'object', 'Evidence index successfully created');
assert(evidenceIndex.has('financial.totalRevenue'), 'financial.totalRevenue index entry exists');
assert(evidenceIndex.has('valuation.dcf'), 'valuation.dcf index entry exists');
assert(evidenceIndex.has('risk.overall'), 'risk.overall index entry exists');

const revFact = evidenceIndex.get('financial.totalRevenue');
assert(revFact && revFact.value === aaplFin.facts['financial.totalRevenue'].value, 'Resolved financial.totalRevenue matches exact revenue in Truth Package');
assert(revFact && revFact.statementType === STATEMENT_TYPES.FACT, 'StatementType is canonical FACT');

const nonExistentFact = evidenceIndex.get('NON_EXISTENT_KEY_999');
assert(nonExistentFact === null, 'Resolving non-existent fact safely returns null');

const allIds = evidenceIndex.getAllEvidenceIds();
assert(Array.isArray(allIds) && allIds.length >= 5, `Evidence index exposes all ${allIds.length} grounded fact IDs`);

// ==========================================
// 2. Claim Validator Tests
// ==========================================
console.log('\n2. Claim Validator & Evidence Verification');

const claimsToTest = [
  {
    claim: 'Apple generated $391.04B in total revenue.',
    statementType: STATEMENT_TYPES.FACT,
    evidenceIds: ['financial.totalRevenue']
  },
  {
    claim: 'Company has unrecorded off-balance-sheet debt of $900B.',
    statementType: STATEMENT_TYPES.FACT,
    evidenceIds: ['FAKE_EVIDENCE_ID_123']
  }
];

const validationResult = validateClaims({ claims: claimsToTest, evidenceIndex });
assert(validationResult !== null, 'Claim validation returned result');
assert(validationResult.validClaims.length === 2, 'Validated claims processed');
assert(validationResult.validClaims[0].evidenceIds.includes('financial.totalRevenue'), 'Valid claim retains verified evidence IDs');
assert(validationResult.validClaims[0].hasUnverifiedReferences === false, 'Valid claim marked as fully verified');
assert(validationResult.validClaims[1].hasUnverifiedReferences === true, 'Claim with fake ID flagged with unverified references');
assert(validationResult.warnings.length > 0, 'Warning logged for missing evidence ID');

// ==========================================
// 3. Investment Thesis Engine Tests
// ==========================================
console.log('\n3. Deterministic Investment Thesis Generation');
const thesis = buildInvestmentThesis(mockTruthPackage);

assert(thesis !== null, 'Thesis object generated');
assert(typeof thesis.bullCase === 'string' && thesis.bullCase.length > 0, 'Bull case formulated');
assert(typeof thesis.baseCase === 'string' && thesis.baseCase.length > 0, 'Base case formulated');
assert(typeof thesis.bearCase === 'string' && thesis.bearCase.length > 0, 'Bear case formulated');
assert(Array.isArray(thesis.keyDrivers) && thesis.keyDrivers.length > 0, 'Key drivers generated');
assert(thesis.keyDrivers.every(d => d.evidenceIds.length > 0), 'Every key driver has grounded evidence IDs');
assert(thesis.scenarios && thesis.scenarios.base !== undefined, 'Scenarios mapped from valuation models');

// ==========================================
// 4. Catalyst Engine Tests
// ==========================================
console.log('\n4. Grounded Catalyst Identification Engine');
const catalysts = identifyCatalysts(mockTruthPackage);

assert(Array.isArray(catalysts) && catalysts.length > 0, 'Catalysts list successfully generated');
const catalystTypes = catalysts.map(c => c.type);
assert(catalystTypes.includes(CATALYST_TYPES.VALUATION) || catalystTypes.includes(CATALYST_TYPES.MARGIN) || catalystTypes.includes(CATALYST_TYPES.EVENT), 'Identified valid catalyst categories');
assert(catalysts.every(c => typeof c.description === 'string' && c.description.length > 0), 'Every catalyst has descriptive insight');
assert(catalysts.every(c => c.timeHorizon && c.expectedDirection), 'Every catalyst defines time horizon and direction');

// ==========================================
// 5. Thesis Breaker Engine Tests
// ==========================================
console.log('\n5. Quantifiable Thesis Breakers & Falsification Triggers');
const breakers = generateThesisBreakers(mockTruthPackage);

assert(Array.isArray(breakers) && breakers.length > 0, 'Thesis breakers list generated');
const hasMarginBreaker = breakers.some(b => b.trigger.toLowerCase().includes('margin'));
assert(hasMarginBreaker, 'Operating margin deterioration trigger present');
const hasLeverageBreaker = breakers.some(b => b.trigger.toLowerCase().includes('leverage'));
assert(hasLeverageBreaker, 'Balance sheet leverage spike trigger present');
assert(breakers.every(b => b.severity && (b.severity === THESIS_BREAKER_SEVERITY.HIGH || b.severity === THESIS_BREAKER_SEVERITY.CRITICAL || b.severity === THESIS_BREAKER_SEVERITY.MODERATE)), 'Breaker severities conform to canonical schema');
assert(breakers.every(b => b.evidenceIds.length > 0), 'Every thesis breaker is tied to verifiable evidence IDs');

// ==========================================
// 6. Earnings Quality & Cash Flow Intelligence Tests
// ==========================================
console.log('\n6. Earnings Quality & Accruals Intelligence');
const earningsIntel = analyzeEarningsQuality(mockTruthPackage);

assert(earningsIntel !== null, 'Earnings quality analysis generated');
if (earningsIntel.metrics.cfoToNetIncome !== null) {
  assert(typeof earningsIntel.metrics.cfoToNetIncome === 'number', 'Operating cash flow conversion calculated (CFO / Net Income)');
} else {
  assert(earningsIntel.metrics.cfoToNetIncome === null, 'CFO conversion safely null when Net Income is unavailable (no synthetic default)');
}
assert(typeof earningsIntel.qualityGrade === 'string', `Earnings quality grade assigned: ${earningsIntel.qualityGrade}`);

// Test with explicit grounded net income fixture
const groundedPkg = JSON.parse(JSON.stringify(mockTruthPackage));
const niItem = groundedPkg.financialFacts.find(f => f.id === 'financial.netIncome');
if (niItem) {
  niItem.value = 93736000000;
  niItem.status = 'GROUNDED';
} else {
  groundedPkg.financialFacts.push({ id: 'financial.netIncome', value: 93736000000, status: 'GROUNDED' });
}
const cfoItem = groundedPkg.financialFacts.find(f => f.id === 'financial.operatingCashFlow');
if (cfoItem) {
  cfoItem.value = 118264000000;
  cfoItem.status = 'GROUNDED';
} else {
  groundedPkg.financialFacts.push({ id: 'financial.operatingCashFlow', value: 118264000000, status: 'GROUNDED' });
}
const groundedEarnings = analyzeEarningsQuality(groundedPkg);
assert(typeof groundedEarnings.metrics.cfoToNetIncome === 'number', `Grounded CFO conversion calculated (${groundedEarnings.metrics.cfoToNetIncome}x)`);
assert(groundedEarnings.qualityGrade === 'HIGH_QUALITY', `Grounded high quality grade assigned: ${groundedEarnings.qualityGrade}`);

// ==========================================
// 7. Valuation Interpretation Tests
// ==========================================
console.log('\n7. Valuation Expectations & Reverse DCF Interpreter');
const valInterpretation = interpretValuation(mockTruthPackage);

assert(valInterpretation !== null, 'Valuation interpretation generated');
assert(valInterpretation.modelsEvaluated.dcf.status === 'CALCULATED', 'DCF model evaluated and recorded as CALCULATED');
assert(valInterpretation.reverseDcfDiagnostic.includes('Expectation Diagnostic'), 'Reverse DCF diagnostic formulated as an expectations unpacker');
assert(valInterpretation.compositeFairValue !== null, 'Composite fair value present');
assert(valInterpretation.evidenceIds.length >= 2, 'Valuation interpretation anchored in evidence IDs');

// ==========================================
// 8. Research Cache Tests
// ==========================================
console.log('\n8. Package-Hash Aware Research Cache');
const dummyReport = { ticker: 'AAPL', summary: 'AAPL Test Report', status: 'COMPLETE' };
const cacheKey1 = researchCache.generateKey({
  ticker: 'AAPL',
  packageHash: mockTruthPackage.integrity.packageHash,
  question: 'What is the thesis?',
  investorProfile: 'BALANCED_VALUE'
});

researchCache.set(cacheKey1, dummyReport);
const cached = researchCache.get(cacheKey1);
assert(cached !== null && cached.summary === 'AAPL Test Report', 'Cache retrieves report when key matches');

const differentKey = researchCache.generateKey({
  ticker: 'AAPL',
  packageHash: 'different_stale_hash_999',
  question: 'What is the thesis?',
  investorProfile: 'BALANCED_VALUE'
});
const staleResult = researchCache.get(differentKey);
assert(staleResult === null, 'Cache safely misses when packageHash changes (tamper/stale resistance)');

// ==========================================
// 9. End-to-End Research Engine Execution
// ==========================================
console.log('\n9. End-to-End Research Orchestration');

const fullReport = await executeResearch({
  truthPackage: mockTruthPackage,
  researchQuestion: 'Synthesize comprehensive institutional equity research.',
  questionType: RESEARCH_QUESTION_TYPES.FULL_RESEARCH_REPORT,
  investorProfile: 'BALANCED_VALUE'
});

assert(fullReport !== null, 'Full research report generated');
assert(fullReport.status === 'COMPLETE', 'Report status is COMPLETE');
assert(fullReport.packageHash === mockTruthPackage.integrity.packageHash, 'Report bound to Truth Package SHA-256 hash');
assert(typeof fullReport.summary === 'string' && fullReport.summary.length > 0, 'Executive summary populated');
assert(fullReport.thesis && fullReport.thesis.bullCase && fullReport.thesis.baseCase && fullReport.thesis.bearCase, 'Complete 3-scenario thesis populated');
assert(fullReport.catalysts.length > 0, 'Catalysts list populated');
assert(fullReport.thesisBreakers.length > 0, 'Thesis breakers populated');
assert(fullReport.earningsQuality !== null, 'Earnings quality module populated');
assert(fullReport.valuationInterpretation !== null, 'Valuation interpretation populated');
assert(Object.values(AI_CONFIDENCE_LEVELS).includes(fullReport.confidence), `Confidence properly determined (actual: ${fullReport.confidence})`);

console.log(`\n==========================================`);
console.log(`Phase 4 Research Tests Finished: ${passed} passed, ${failed} failed`);
console.log(`==========================================\n`);

if (failed > 0) {
  process.exit(1);
}
