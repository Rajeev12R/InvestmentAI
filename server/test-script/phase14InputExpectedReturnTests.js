/**
 * Phase 14 Test Suite 1: Input Validation & Expected Return Derivation Tests
 */

import assert from 'assert';
import { PortfolioInputValidator } from '../portfolioConstruction/portfolioConstruction.inputValidator.js';
import { ExpectedReturnEngine } from '../portfolioConstruction/portfolioConstruction.expectedReturn.engine.js';
import { ExpectedReturnSource, OptimizationStatus } from '../portfolioConstruction/portfolioConstruction.types.js';

console.log("Starting Phase 14 Suite 1: Input Validation & Expected Return Derivation...");

let assertions = 0;

// Test 1: Null / Empty input validation
{
  const res = PortfolioInputValidator.validate(null);
  assert.strictEqual(res.isValid, false);
  assert.strictEqual(res.status, OptimizationStatus.INVALID_INPUT);
  assertions += 2;
}

// Test 2: Missing required workspaceId and portfolioId
{
  const res = PortfolioInputValidator.validate({ asOf: "2026-09-06T12:00:00.000Z", securities: [{ ticker: "AAPL" }] });
  assert.strictEqual(res.isValid, false);
  assert.ok(res.errors.some(e => e.includes("workspaceId")));
  assert.ok(res.errors.some(e => e.includes("portfolioId")));
  assertions += 3;
}

// Test 3: Future timestamp rejection
{
  const futureAsOf = new Date(Date.now() + 86400000 * 365).toISOString();
  const res = PortfolioInputValidator.validate({
    workspaceId: "WS-1",
    portfolioId: "PORT-1",
    asOf: futureAsOf,
    securities: [{ ticker: "AAPL" }]
  });
  assert.strictEqual(res.isValid, false);
  assert.ok(res.errors.some(e => e.includes("Temporal boundary violation")));
  assertions += 2;
}

// Test 4: Duplicate tickers rejection
{
  const res = PortfolioInputValidator.validate({
    workspaceId: "WS-1",
    portfolioId: "PORT-1",
    asOf: "2026-01-01T00:00:00.000Z",
    securities: [{ ticker: "AAPL" }, { ticker: "AAPL" }]
  });
  assert.strictEqual(res.isValid, false);
  assert.ok(res.errors.some(e => e.includes("Duplicate security ticker")));
  assertions += 2;
}

// Test 5: Negative current weights without shorting allowed
{
  const res = PortfolioInputValidator.validate({
    workspaceId: "WS-1",
    portfolioId: "PORT-1",
    asOf: "2026-01-01T00:00:00.000Z",
    securities: [{ ticker: "AAPL" }, { ticker: "MSFT" }],
    currentWeights: { AAPL: -0.10, MSFT: 1.10 },
    constraints: { allowShorting: false }
  });
  assert.strictEqual(res.isValid, false);
  assert.ok(res.errors.some(e => e.includes("Negative current weight detected")));
  assertions += 2;
}

// Test 6: Valid input passes
{
  const res = PortfolioInputValidator.validate({
    workspaceId: "WS-1",
    portfolioId: "PORT-1",
    asOf: "2026-01-01T00:00:00.000Z",
    securities: [{ ticker: "AAPL" }, { ticker: "MSFT" }],
    currentWeights: { AAPL: 0.50, MSFT: 0.50 }
  });
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.status, OptimizationStatus.FEASIBLE);
  assertions += 2;
}

// Test 7: Expected Return from DCF valuation
{
  const res = ExpectedReturnEngine.deriveSecurityExpectedReturn({
    ticker: "AAPL",
    valuation: { fairValue: 240, confidence: 0.85, timestamp: "2026-01-01T00:00:00.000Z" },
    currentPrice: 200
  }, "2026-01-01T00:00:00.000Z");
  assert.strictEqual(res.status, OptimizationStatus.OPTIMAL);
  assert.strictEqual(res.source, ExpectedReturnSource.VALUATION_DCF);
  assert.strictEqual(res.expectedReturn, 0.20);
  assertions += 3;
}

// Test 8: Future valuation date leakage rejected
{
  const res = ExpectedReturnEngine.deriveSecurityExpectedReturn({
    ticker: "AAPL",
    valuation: { fairValue: 240, timestamp: "2026-06-01T00:00:00.000Z" },
    currentPrice: 200
  }, "2026-01-01T00:00:00.000Z");
  assert.strictEqual(res.status, OptimizationStatus.INVALID_INPUT);
  assert.strictEqual(res.reasonCode, "FUTURE_VALUATION_LEAKAGE");
  assertions += 2;
}

// Test 9: Expected Return from Scenario
{
  const res = ExpectedReturnEngine.deriveSecurityExpectedReturn({
    ticker: "NVDA",
    scenario: {
      cases: [
        { probability: 0.20, targetReturn: -0.10 },
        { probability: 0.50, targetReturn: 0.20 },
        { probability: 0.30, targetReturn: 0.40 }
      ]
    }
  }, "2026-01-01T00:00:00.000Z");
  assert.strictEqual(res.status, OptimizationStatus.OPTIMAL);
  assert.strictEqual(res.source, ExpectedReturnSource.SCENARIO_PROBABILITY_WEIGHTED);
  assert.strictEqual(res.expectedReturn, 0.20); // 0.2*-0.1 + 0.5*0.2 + 0.3*0.4 = -0.02 + 0.10 + 0.12 = 0.20
  assertions += 3;
}

// Test 10: Missing valuation / scenario data explicitly returns UNAVAILABLE
{
  const res = ExpectedReturnEngine.deriveSecurityExpectedReturn({
    ticker: "UNKNOWN_SEC"
  }, "2026-01-01T00:00:00.000Z");
  assert.strictEqual(res.status, OptimizationStatus.UNAVAILABLE);
  assert.strictEqual(res.source, ExpectedReturnSource.UNAVAILABLE);
  assert.strictEqual(res.expectedReturn, null);
  assertions += 3;
}

console.log(`✓ Phase 14 Suite 1 Passed: ${assertions} assertions`);
export { assertions };
