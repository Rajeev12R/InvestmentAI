/**
 * @file phase10SourceRegistryTests.js
 * Comprehensive Unit & Integration Tests for Phase 10 Source Registry & Circuit Breakers.
 */

import assert from 'assert';
import { sourceRegistry } from '../connectivity/sourceRegistry.js';
import { CircuitBreaker } from '../connectivity/circuitBreaker.js';
import { CircuitState, SourceTier, SourceCategory, SourceStatus } from '../connectivity/source.types.js';

console.log('================================================================');
console.log('INVESTMENTAI — PHASE 10 SOURCE REGISTRY & CIRCUIT BREAKER SUITE');
console.log('================================================================\n');

let passCount = 0;
function check(cond, msg) {
  assert.ok(cond, msg);
  passCount++;
}
function checkEqual(actual, expected, msg) {
  assert.strictEqual(actual, expected, msg);
  passCount++;
}

async function runTests() {
  console.log('▶ Testing Source Registry Registration & Retrieval...');
  const sec = sourceRegistry.getSource('SRC-SEC-EDGAR');
  check(sec !== null, 'SEC EDGAR source registered');
  checkEqual(sec.tier, SourceTier.TIER_1_PRIMARY, 'SEC EDGAR has TIER_1_PRIMARY authority');
  checkEqual(sec.category, SourceCategory.FILINGS, 'SEC EDGAR categorized as FILINGS');
  checkEqual(sec.capabilities.filings, true, 'SEC EDGAR supports filings capability');
  checkEqual(sec.capabilities.quotes, false, 'SEC EDGAR quotes capability false');

  const nse = sourceRegistry.getSource('SRC-NSE-BSE-INDIA');
  check(nse !== null, 'NSE/BSE India source registered');
  checkEqual(nse.tier, SourceTier.TIER_1_PRIMARY, 'NSE/BSE India has TIER_1_PRIMARY authority');
  checkEqual(nse.jurisdiction, 'IN', 'NSE/BSE India jurisdiction is IN');

  const fred = sourceRegistry.getSource('SRC-FRED-MACRO');
  checkEqual(fred.category, SourceCategory.MACRO, 'FRED categorized as MACRO');
  checkEqual(fred.tier, SourceTier.TIER_2_REGULATED, 'FRED has TIER_2_REGULATED authority');

  const ecb = sourceRegistry.getSource('SRC-ECB-FX');
  checkEqual(ecb.category, SourceCategory.FX, 'ECB categorized as FX');
  checkEqual(ecb.tier, SourceTier.TIER_2_REGULATED, 'ECB has TIER_2_REGULATED authority');

  const gnews = sourceRegistry.getSource('SRC-GNEWS-FEED');
  checkEqual(gnews.category, SourceCategory.NEWS, 'GNews categorized as NEWS');
  checkEqual(gnews.tier, SourceTier.TIER_3_SECONDARY, 'GNews has TIER_3_SECONDARY authority');

  console.log('▶ Testing Institutional Capability Matrix...');
  const matrix = sourceRegistry.getCapabilityMatrix();
  check(Array.isArray(matrix), 'Capability matrix is array');
  check(matrix.length >= 6, 'Capability matrix contains all registered institutional providers');
  const secRow = matrix.find(r => r.id === 'SRC-SEC-EDGAR');
  checkEqual(secRow.capabilities.fundamentals, true, 'Matrix reports fundamentals capability for SEC EDGAR');

  console.log('▶ Testing Provider Health Telemetry...');
  const healthList = sourceRegistry.getSourceHealth();
  check(Array.isArray(healthList), 'Health list is array');
  const yahooHealth = healthList.find(h => h.sourceId === 'SRC-YAHOO-FINANCE');
  checkEqual(yahooHealth.status, SourceStatus.HEALTHY, 'Yahoo Finance health is HEALTHY');
  checkEqual(yahooHealth.circuitBreaker.state, CircuitState.CLOSED, 'Circuit breaker initial state is CLOSED');

  console.log('▶ Testing Circuit Breaker State Machine (CLOSED -> OPEN -> HALF_OPEN -> CLOSED)...');
  const testCb = new CircuitBreaker({
    name: 'UNIT_TEST_PROVIDER',
    failureThreshold: 3,
    cooldownPeriodMs: 50,
    halfOpenSuccessThreshold: 2
  });

  checkEqual(testCb.state, CircuitState.CLOSED, 'Initial circuit state is CLOSED');

  // Successful call in CLOSED state
  const res1 = await testCb.execute(async () => 'OK_1');
  checkEqual(res1, 'OK_1', 'Executed successfully in CLOSED state');

  // Trigger 3 failures to trip breaker to OPEN
  for (let i = 0; i < 3; i++) {
    try {
      await testCb.execute(async () => { throw new Error(`Simulated Error ${i + 1}`); });
    } catch (e) {}
  }

  checkEqual(testCb.state, CircuitState.OPEN, 'Circuit tripped to OPEN after 3 failures');

  // Attempt call in OPEN state (must reject immediately)
  let rejectedInOpen = false;
  try {
    await testCb.execute(async () => 'SHOULD_NOT_RUN');
  } catch (err) {
    rejectedInOpen = true;
    check(err.message.includes('OPEN'), 'Error message indicates circuit is OPEN');
  }
  checkEqual(rejectedInOpen, true, 'Call immediately rejected in OPEN state');

  // Wait for cooldown period (50ms) -> Next call transitions to HALF_OPEN
  await new Promise(r => setTimeout(r, 60));

  // First success in HALF_OPEN
  const resHalf1 = await testCb.execute(async () => 'HALF_OK_1');
  checkEqual(resHalf1, 'HALF_OK_1', 'First success in HALF_OPEN passed');
  checkEqual(testCb.state, CircuitState.HALF_OPEN, 'Circuit is in HALF_OPEN testing recovery');

  // Second success in HALF_OPEN -> resets to CLOSED
  const resHalf2 = await testCb.execute(async () => 'HALF_OK_2');
  checkEqual(resHalf2, 'HALF_OK_2', 'Second success in HALF_OPEN passed');
  checkEqual(testCb.state, CircuitState.CLOSED, 'Circuit successfully recovered and closed');

  console.log('▶ Testing Circuit Breaker Fallback Execution...');
  const fallbackCb = new CircuitBreaker({ name: 'FALLBACK_TEST_CB', failureThreshold: 1, cooldownPeriodMs: 1000 });
  try {
    await fallbackCb.execute(async () => { throw new Error('Primary API Error'); });
  } catch (e) {}

  const fallbackResult = await fallbackCb.execute(
    async () => 'PRIMARY_VAL',
    async (err) => ({ value: 'FALLBACK_EXECUTED', errorCaught: err.message })
  );
  checkEqual(fallbackResult.value, 'FALLBACK_EXECUTED', 'Fallback function executed when circuit is OPEN');

  console.log('\n================================================================');
  console.log(`PHASE 10 SOURCE REGISTRY TEST SUITE COMPLETE: ${passCount} ASSERTIONS PASSED`);
  console.log('================================================================\n');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
