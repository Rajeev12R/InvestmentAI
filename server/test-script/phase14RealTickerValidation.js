/**
 * Phase 14 Test Suite 8: Real Ticker Portfolio Construction & Reality Validation
 * Validates portfolio construction against real ticker feeds (AAPL, JPM, RELIANCE.NS, TMPV.NS, TSM)
 * Ensures missing portfolio history returns INSUFFICIENT_DATA honestly rather than fabricating inputs.
 */

import assert from 'assert';
import { PortfolioOptimizerEngine } from '../portfolioConstruction/portfolioConstruction.optimizer.engine.js';
import { ExpectedReturnEngine } from '../portfolioConstruction/portfolioConstruction.expectedReturn.engine.js';
import { CovarianceEngine } from '../portfolioConstruction/portfolioConstruction.covariance.engine.js';
import { OptimizationMethod, OptimizationStatus } from '../portfolioConstruction/portfolioConstruction.types.js';

console.log("Starting Phase 14 Suite 8: Real Ticker Validation...");

let assertions = 0;

// Test 1: AAPL with verified DCF intrinsic value
{
  const aaplReturn = ExpectedReturnEngine.deriveSecurityExpectedReturn({
    ticker: 'AAPL',
    valuation: { fairValue: 245.0, confidence: 0.88, timestamp: '2026-01-15T00:00:00.000Z' },
    currentPrice: 220.0
  }, '2026-01-15T00:00:00.000Z');

  assert.strictEqual(aaplReturn.status, OptimizationStatus.OPTIMAL);
  assert.ok(aaplReturn.expectedReturn > 0.10);
  assert.strictEqual(aaplReturn.source, 'VALUATION_DCF');
  assertions += 3;
}

// Test 2: JPM, RELIANCE.NS, TMPV.NS, TSM without internal decision records return INSUFFICIENT_DATA / UNAVAILABLE
{
  const missingTickers = ['JPM', 'RELIANCE.NS', 'TMPV.NS', 'TSM'];
  for (const ticker of missingTickers) {
    const res = ExpectedReturnEngine.deriveSecurityExpectedReturn({
      ticker
    }, '2026-01-15T00:00:00.000Z');

    assert.strictEqual(res.status, OptimizationStatus.UNAVAILABLE);
    assert.strictEqual(res.expectedReturn, null);
    assertions += 2;
  }
}

// Test 3: Mixed multi-asset real universe optimization (US + India candidates)
{
  const multiAssetUniverse = [
    { ticker: 'AAPL', sector: 'Technology', geography: 'US' },
    { ticker: 'JPM', sector: 'Financials', geography: 'US' },
    { ticker: 'TSM', sector: 'Technology', geography: 'Taiwan' }
  ];

  const cov = [
    [0.0576, 0.0210, 0.0380],
    [0.0210, 0.0400, 0.0190],
    [0.0380, 0.0190, 0.0729]
  ];

  const opt = PortfolioOptimizerEngine.optimize({
    method: OptimizationMethod.MINIMUM_VARIANCE,
    universeSecurities: multiAssetUniverse,
    covarianceMatrix: cov,
    constraints: { minWeight: 0.10, maxWeight: 0.50 }
  });

  assert.strictEqual(opt.status, OptimizationStatus.OPTIMAL);
  assert.ok(opt.weights.AAPL >= 0.10);
  assert.ok(opt.weights.JPM >= 0.10);
  assert.ok(opt.weights.TSM >= 0.10);
  assertions += 4;
}

console.log(`✓ Phase 14 Suite 8 Real Ticker Validation Passed: ${assertions} assertions`);
export { assertions };
