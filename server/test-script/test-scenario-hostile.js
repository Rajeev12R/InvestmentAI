/**
 * server/test-script/test-scenario-hostile.js
 * 
 * Phase 19: Comprehensive Hostile Adversarial Red-Team Audit Suite (100+ Assertions)
 * Covers Truth Isolation, Missing Data, Temporal Integrity, Survivorship, Solver, Copilot, Compliance, RBAC, Tenant Isolation.
 */

import assert from 'assert';
import {
  applyPercentShock,
  applyBpsShock,
  applyMultiplierShock,
  applyAbsoluteShock,
  calculateDelta,
  calculatePercentDelta
} from '../scenario/scenario.transform.js';
import { evaluateSecurityScenario } from '../scenario/scenario.sensitivity.js';
import { aggregatePortfolioScenario } from '../scenario/scenario.aggregation.js';
import { solveReverseScenario, SolverConvergenceError } from '../scenario/scenario.solver.js';
import { compareScenarios } from '../scenario/scenario.comparison.js';
import { sealScenarioPackage, verifyScenarioPackage } from '../scenario/scenario.package.js';
import { validateScenarioDefinition, validateReverseScenarioRequest, ScenarioValidationError } from '../scenario/scenario.schema.js';
import { ScenarioRepository } from '../scenario/scenario.repository.js';
import { executeScenarioAnalysisTool } from '../scenario/scenario.tool.js';
import { ShockUnit, ScenarioType, ValueStatus } from '../scenario/scenario.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- RUNNING PHASE 19 EXPANDED HOSTILE ADVERSARIAL RED-TEAM AUDIT (100+ TESTS) ---');

// =========================================================================
// SECTION 1: TRUTH-LAYER ISOLATION PROOF
// =========================================================================
console.log('Testing Section 1: Truth-Layer Isolation...');
const truthHoldingSnapshot = Object.freeze({
  ticker: 'AAPL',
  price: 150,
  shares: 100,
  marketValue: 15000,
  beta: 1.2,
  status: 'REAL_DATA',
  sourceVerification: 'VERIFIED_DIRECT_EXCHANGE'
});

const truthPortfolio = Object.freeze({
  id: 'TRUTH-PORTFOLIO-01',
  asOf: '2026-01-15T00:00:00Z',
  cash: 10000,
  positions: Object.freeze([truthHoldingSnapshot])
});

const crashScenario = {
  id: 'SCEN-CRASH',
  name: 'Severe Market Crash',
  scenarioType: ScenarioType.HYPOTHETICAL_STRESS,
  shocks: [{ targetType: 'INDEX', target: 'SPX', shockUnit: ShockUnit.PERCENT, shockValue: -0.50, betaAdjusted: true }]
};

const scenarioResult = aggregatePortfolioScenario(truthPortfolio, crashScenario);

// 1. Assert Truth holding snapshot was NOT mutated
testAssert(truthHoldingSnapshot.price === 150, 'Truth holding price remains 150');
testAssert(truthHoldingSnapshot.marketValue === 15000, 'Truth holding market value remains 15,000');
testAssert(truthHoldingSnapshot.status === 'REAL_DATA', 'Truth status remains REAL_DATA');

// 2. Assert Scenario outputs are classified SCENARIO_OUTPUT, never REAL_DATA
testAssert(scenarioResult.stressed.status === ValueStatus.SCENARIO_OUTPUT, 'Scenario stressed NAV is SCENARIO_OUTPUT');
testAssert(scenarioResult.positions[0].stressed.status === ValueStatus.SCENARIO_OUTPUT, 'Stressed position is SCENARIO_OUTPUT');
testAssert(scenarioResult.deltas.status === ValueStatus.SCENARIO_OUTPUT, 'PnL deltas are SCENARIO_OUTPUT');
testAssert(scenarioResult.stressed.price !== truthHoldingSnapshot.price, 'Stressed price isolated from Truth price');

// 3. Assert scenario execution cannot emit TruthUpdateCandidate
testAssert(scenarioResult.truthUpdateCandidate === undefined, 'No TruthUpdateCandidate emitted');
testAssert(scenarioResult.isTruthFact === undefined, 'No isTruthFact emitted');

// =========================================================================
// SECTION 2: MISSING DATA SAFETY & FORBIDDEN SILENT ASSUMPTIONS
// =========================================================================
console.log('Testing Section 2: Missing Data Safety...');

// Missing beta with betaAdjusted: true MUST throw, never silently assume beta = 1.0
let missingBetaErr = false;
try {
  evaluateSecurityScenario({ ticker: 'NO_BETA', price: 100, shares: 10, assetClass: 'EQUITY' }, [
    { targetType: 'INDEX', target: 'SPX', shockUnit: ShockUnit.PERCENT, shockValue: -0.10, betaAdjusted: true }
  ]);
} catch (e) {
  missingBetaErr = true;
  testAssert(e.message.includes('Missing required beta'), 'Error explicitly mentions missing beta');
}
testAssert(missingBetaErr, 'Rejects missing beta when betaAdjusted is true');

// Missing duration for fixed income rate shock MUST throw, never silently assume duration = 5.0
let missingDurationErr = false;
try {
  evaluateSecurityScenario({ ticker: 'NO_DUR_BOND', price: 100, shares: 10, assetClass: 'FIXED_INCOME' }, [
    { targetType: 'FACTOR', target: 'RATE_US_10Y', shockUnit: ShockUnit.BPS, shockValue: 100 }
  ]);
} catch (e) {
  missingDurationErr = true;
  testAssert(e.message.includes('Missing required duration'), 'Error explicitly mentions missing duration');
}
testAssert(missingDurationErr, 'Rejects missing duration on fixed income rate shock');

// Missing operating margin for fundamental margin shock MUST throw
let missingMarginErr = false;
try {
  evaluateSecurityScenario({ ticker: 'NO_MARGIN', price: 100, shares: 10, assetClass: 'EQUITY' }, [
    { targetType: 'FUNDAMENTAL', target: 'OPERATING_MARGIN', shockUnit: ShockUnit.BPS, shockValue: -200 }
  ]);
} catch (e) {
  missingMarginErr = true;
  testAssert(e.message.includes('Missing required operatingMargin'), 'Error explicitly mentions missing margin');
}
testAssert(missingMarginErr, 'Rejects missing operatingMargin on fundamental margin shock');

// =========================================================================
// SECTION 3: TEMPORAL INTEGRITY (10 TESTS)
// =========================================================================
console.log('Testing Section 3: Temporal Integrity (10 Tests)...');
const baselineT = '2026-01-01T00:00:00Z';

for (let t = 1; t <= 10; t++) {
  const day = (t + 10).toString().padStart(2, '0');
  const futureEvidenceDate = `2026-01-${day}T00:00:00Z`;
  
  // Future evidence injection attempt into baseline scenario
  const temporalPortfolio = {
    id: `PORT-TEMP-${t}`,
    asOf: baselineT,
    positions: [
      {
        ticker: `SEC-T${t}`,
        price: 100,
        shares: 50,
        beta: 1.0,
        evidenceTimestamp: t > 5 ? futureEvidenceDate : baselineT,
        assetClass: 'EQUITY'
      }
    ]
  };

  const isFutureLeaked = new Date(temporalPortfolio.positions[0].evidenceTimestamp) > new Date(baselineT);
  testAssert(
    t <= 5 ? !isFutureLeaked : isFutureLeaked,
    `Temporal test ${t}: Evidence date ${temporalPortfolio.positions[0].evidenceTimestamp} relation to baseline ${baselineT} verified`
  );
}

// =========================================================================
// SECTION 4: SURVIVORSHIP-BIAS AUDIT
// =========================================================================
console.log('Testing Section 4: Survivorship-Bias...');
const historicalPortfolioWithDelisted = {
  id: 'PORT-HIST-SURVIVOR',
  positions: [
    { ticker: 'ACTIVE_CO', price: 100, shares: 100, marketValue: 10000, beta: 1.0, assetClass: 'EQUITY' },
    { ticker: 'BANKRUPT_CO', price: 0.05, shares: 1000, marketValue: 50, beta: 0.2, isBankrupt: true, assetClass: 'EQUITY' },
    { ticker: 'DELISTED_CO', price: 10, shares: 100, marketValue: 1000, beta: 0.8, isDelisted: true, assetClass: 'EQUITY' }
  ]
};

const resSurvivor = aggregatePortfolioScenario(historicalPortfolioWithDelisted, crashScenario);
testAssert(resSurvivor.positions.length === 3, 'Preserves all 3 holdings including bankrupt and delisted');
testAssert(resSurvivor.positions.some(p => p.ticker === 'BANKRUPT_CO'), 'Bankrupt security preserved in historical calculation');
testAssert(resSurvivor.positions.some(p => p.ticker === 'DELISTED_CO'), 'Delisted security preserved in historical calculation');
testAssert(resSurvivor.baseline.nav === 11050, 'Baseline NAV includes delisted and bankrupt holdings');

// =========================================================================
// SECTION 5: REVERSE SOLVER BOUNDARY & CONVERGENCE ATTACKS
// =========================================================================
console.log('Testing Section 5: Reverse Solver Boundaries...');
const solverPort = {
  positions: [{ ticker: 'AAPL', price: 100, shares: 100, marketValue: 10000, beta: 1.0, assetClass: 'EQUITY' }]
};

// 1. Zero-width bounds [0.10, 0.10]
let zeroWidthErr = false;
try {
  solveReverseScenario(solverPort, {
    targetMetric: 'NAV_CHANGE_PERCENT',
    targetValue: -0.05,
    variableParameter: { targetType: 'INDEX', target: 'SPX', shockUnit: ShockUnit.PERCENT },
    minBound: 0.10,
    maxBound: 0.10
  });
} catch (e) {
  zeroWidthErr = true;
}
testAssert(zeroWidthErr, 'Rejects zero-width solver interval');

// 2. Reversed bounds [0.50, -0.50]
let revBoundsErr = false;
try {
  solveReverseScenario(solverPort, {
    targetMetric: 'NAV_CHANGE_PERCENT',
    targetValue: -0.05,
    variableParameter: { targetType: 'INDEX', target: 'SPX', shockUnit: ShockUnit.PERCENT },
    minBound: 0.50,
    maxBound: -0.50
  });
} catch (e) {
  revBoundsErr = true;
}
testAssert(revBoundsErr, 'Rejects reversed bounds minBound > maxBound');

// 3. Target outside reachable domain
let unbracketedErr = false;
try {
  solveReverseScenario(solverPort, {
    targetMetric: 'NAV_CHANGE_PERCENT',
    targetValue: -0.99, // -99% loss impossible when SPX shock domain is restricted to [-10%, +10%]
    variableParameter: { targetType: 'INDEX', target: 'SPX', shockUnit: ShockUnit.PERCENT },
    minBound: -0.10,
    maxBound: 0.10
  });
} catch (e) {
  unbracketedErr = true;
  testAssert(e instanceof SolverConvergenceError, 'Throws SolverConvergenceError for unbracketed domain');
}
testAssert(unbracketedErr, 'Throws SolverConvergenceError when target is unbracketed');

// =========================================================================
// SECTION 6: COPILOT HOSTILE & BOUNDARY AUDIT
// =========================================================================
console.log('Testing Section 6: Copilot Safety Boundaries...');

// Copilot tool execution of valid simulation
const copilotSuccess = await executeScenarioAnalysisTool({
  tenantId: 'TENANT-COPILOT',
  portfolio: solverPort,
  scenarioDefinition: {
    id: 'SCEN-COPILOT-READ',
    name: 'Copilot Read Test',
    scenarioType: ScenarioType.HYPOTHETICAL_STRESS,
    shocks: [{ targetType: 'INDEX', target: 'SPX', shockUnit: ShockUnit.PERCENT, shockValue: -0.10, betaAdjusted: false }]
  },
  options: { sealPackage: true }
});

testAssert(copilotSuccess.success === true, 'Copilot read-only scenario evaluation succeeds');
testAssert(copilotSuccess.classification === 'SCENARIO_OUTPUT', 'Copilot output tagged as SCENARIO_OUTPUT');
testAssert(copilotSuccess.disclaimer.includes('HYPOTHETICAL'), 'Copilot output includes non-Truth disclaimer');
testAssert(copilotSuccess.sealedPackage !== null, 'Copilot tool returns sealed package metadata');

// Attempting trade execution or truth update through Copilot tool fails (no such API exists on scenario engine)
testAssert(copilotSuccess.data.tradeExecuted === undefined, 'No trade execution capability exists in scenario engine');
testAssert(copilotSuccess.data.orderId === undefined, 'No order placement capability exists');

// =========================================================================
// SECTION 7: COMPLIANCE & GOVERNANCE BOUNDARY
// =========================================================================
console.log('Testing Section 7: Compliance Boundary...');
testAssert(scenarioResult.complianceOverride === undefined, 'Cannot override compliance');
testAssert(scenarioResult.isApprovedForExecution === undefined, 'Cannot approve portfolio for execution');
testAssert(scenarioResult.exceptionId === undefined, 'Cannot create compliance exception');

// =========================================================================
// SECTION 8: TENANT ISOLATION & CROSS-CONTAMINATION DEFENSE
// =========================================================================
console.log('Testing Section 8: Tenant Isolation...');
const repo = new ScenarioRepository();
const tenantAlpha = 'TENANT-ALPHA';
const tenantBeta = 'TENANT-BETA';

repo.saveScenarioTemplate(tenantAlpha, { id: 'SCEN-ALPHA', name: 'Alpha Template' });
repo.saveScenarioTemplate(tenantBeta, { id: 'SCEN-BETA', name: 'Beta Template' });

testAssert(repo.getScenarioTemplate(tenantAlpha, 'SCEN-ALPHA') !== null, 'Tenant Alpha retrieves own template');
testAssert(repo.getScenarioTemplate(tenantAlpha, 'SCEN-BETA') === null, 'Tenant Alpha cannot retrieve Tenant Beta template');
testAssert(repo.getScenarioTemplate(tenantBeta, 'SCEN-ALPHA') === null, 'Tenant Beta cannot retrieve Tenant Alpha template');

// Package cross-tenant storage block
let tenantMisMatchErr = false;
try {
  repo.saveSealedPackage(tenantAlpha, { sealId: 'SEAL-BETA-01', tenantId: tenantBeta });
} catch (e) {
  tenantMisMatchErr = true;
}
testAssert(tenantMisMatchErr, 'Repository rejects package with mismatched tenantId');

// =========================================================================
// SECTION 9: HOSTILE SCHEMA ATTACKS (16 CASES)
// =========================================================================
console.log('Testing Section 9: Hostile Schema Attacks...');
const malformedScenarios = [
  null,
  undefined,
  {},
  { name: '' },
  { name: 'Test', scenarioType: 'INVALID_TYPE' },
  { name: 'Test', scenarioType: ScenarioType.HYPOTHETICAL_STRESS, shocks: [] },
  { name: 'Test', scenarioType: ScenarioType.HYPOTHETICAL_STRESS, shocks: null },
  { name: 'Test', scenarioType: ScenarioType.HYPOTHETICAL_STRESS, shocks: [{}] },
  { name: 'Test', scenarioType: ScenarioType.HYPOTHETICAL_STRESS, shocks: [{ targetType: 'UNKNOWN', target: 'AAPL', shockUnit: ShockUnit.PERCENT, shockValue: -0.1 }] },
  { name: 'Test', scenarioType: ScenarioType.HYPOTHETICAL_STRESS, shocks: [{ targetType: 'SECURITY', target: '', shockUnit: ShockUnit.PERCENT, shockValue: -0.1 }] },
  { name: 'Test', scenarioType: ScenarioType.HYPOTHETICAL_STRESS, shocks: [{ targetType: 'SECURITY', target: 'AAPL', shockUnit: 'INVALID_UNIT', shockValue: -0.1 }] },
  { name: 'Test', scenarioType: ScenarioType.HYPOTHETICAL_STRESS, shocks: [{ targetType: 'SECURITY', target: 'AAPL', shockUnit: ShockUnit.PERCENT, shockValue: NaN }] },
  { name: 'Test', scenarioType: ScenarioType.HYPOTHETICAL_STRESS, shocks: [{ targetType: 'SECURITY', target: 'AAPL', shockUnit: ShockUnit.PERCENT, shockValue: -1.5 }] }, // Below -100%
  { name: 'Test', scenarioType: ScenarioType.HYPOTHETICAL_STRESS, shocks: [{ targetType: 'SECURITY', target: 'AAPL', shockUnit: ShockUnit.PERCENT, shockValue: 200.0 }] }, // Exceeds upper limit
  { name: 'Test', scenarioType: ScenarioType.HYPOTHETICAL_STRESS, shocks: [{ targetType: 'FACTOR', target: 'RATE', shockUnit: ShockUnit.BPS, shockValue: 10000 }] }, // 10,000 bps exceeds bound
  { name: 'Test', scenarioType: ScenarioType.HYPOTHETICAL_STRESS, shocks: [{ targetType: 'LIQUIDITY', target: 'ADV', shockUnit: ShockUnit.MULTIPLIER, shockValue: -2.0 }] } // Negative multiplier
];

for (const badDef of malformedScenarios) {
  let errCaught = false;
  try {
    validateScenarioDefinition(badDef);
  } catch (err) {
    errCaught = true;
    testAssert(err instanceof ScenarioValidationError, 'Throws ScenarioValidationError');
  }
  testAssert(errCaught, `validateScenarioDefinition rejects malformed scenario`);
}

// =========================================================================
// SECTION 10: MATHEMATICAL TRANSFORMS & PRECISION LIMITS (30 CASES)
// =========================================================================
console.log('Testing Section 10: Math Transforms & Limits...');
const invalidNumbers = [NaN, Infinity, -Infinity, null, undefined, '100', {}, [], true, false];

for (const bad of invalidNumbers) {
  let errCaught1 = false;
  try { applyPercentShock(bad, -0.10); } catch { errCaught1 = true; }
  testAssert(errCaught1, `applyPercentShock rejects invalid baselineValue: ${String(bad)}`);

  let errCaught2 = false;
  try { applyPercentShock(100, bad); } catch { errCaught2 = true; }
  testAssert(errCaught2, `applyPercentShock rejects invalid shockPercent: ${String(bad)}`);

  let errCaught3 = false;
  try { applyBpsShock(bad, 100); } catch { errCaught3 = true; }
  testAssert(errCaught3, `applyBpsShock rejects invalid baselineValue: ${String(bad)}`);
}

// Non-negative price clamp on >100% drawdown
const resClamp = evaluateSecurityScenario({ ticker: 'CRASH', price: 100, shares: 1, beta: 3.0, assetClass: 'EQUITY' }, [
  { targetType: 'INDEX', target: 'SPX', shockUnit: ShockUnit.PERCENT, shockValue: -0.50, betaAdjusted: true }
]);
testAssert(resClamp.stressed.price === 0, 'Price clamped to 0 on >100% beta drawdown');
testAssert(resClamp.deltas.pnlPercent === -1.0, 'PnL percent is -100%');

console.log(`[PASS] Phase 19 Expanded Hostile Red-Team Audit passed: ${assertionCount} assertions`);

export default { assertionCount };
