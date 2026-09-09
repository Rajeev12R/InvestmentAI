/**
 * Phase 17 — Test Suite 7: Real Ticker Tax Validation
 * Tests AAPL, JPM, RELIANCE.NS, TMPV.NS, TSM with explicit data provenance classification.
 */

import { strict as assert } from 'assert';
import { TaxStatus, DataProvenance } from '../tax/tax.types.js';
import { TaxRuleEngine } from '../tax/tax.rule.engine.js';
import { TaxLotEngine } from '../tax/tax.lot.engine.js';
import { TaxJurisdictionEngine } from '../tax/tax.jurisdiction.js';

let totalAssertions = 0;
function testAssert(cond, msg) {
  assert(cond, msg);
  totalAssertions++;
}

console.log('--- RUNNING PHASE 17 SUITE 7: REAL TICKER TAX VALIDATION (AAPL, JPM, RELIANCE.NS, TMPV.NS, TSM) ---');

const REAL_TICKERS = [
  { symbol: 'AAPL', jurisdiction: 'US', marketPrice: 224.50, currency: 'USD' },
  { symbol: 'JPM', jurisdiction: 'US', marketPrice: 215.30, currency: 'USD' },
  { symbol: 'RELIANCE.NS', jurisdiction: 'IN', marketPrice: 2950.00, currency: 'INR' },
  { symbol: 'TMPV.NS', jurisdiction: 'IN', marketPrice: 985.50, currency: 'INR' },
  { symbol: 'TSM', jurisdiction: 'US', marketPrice: 172.40, currency: 'USD' }
];

for (const ticker of REAL_TICKERS) {
  console.log(`Testing real ticker: ${ticker.symbol} (${ticker.jurisdiction})`);

  // 1. Synthetic tax lot for the ticker with explicit GOLDEN_SYNTHETIC label
  const lotData = {
    lotId: `LOT-${ticker.symbol.replace('.', '_')}-001`,
    securityId: ticker.symbol,
    accountId: `PORT-${ticker.symbol}`,
    acquisitionDate: '2024-02-01T00:00:00.000Z',
    acquisitionPrice: ticker.marketPrice * 0.85, // 15% lower acquisition price
    quantity: 100,
    costBasis: 100 * (ticker.marketPrice * 0.85),
    currency: ticker.currency,
    source: 'GOLDEN_SYNTHETIC_LOT_FIXTURE',
    sourceEvidenceId: `EVID-SYNTH-${ticker.symbol}`
  };

  const lotRes = TaxLotEngine.createTaxLot(lotData, '2024-08-01T00:00:00.000Z');
  testAssert(lotRes.status === TaxStatus.PASS, `Synthetic lot creation succeeds for ${ticker.symbol}`);

  // 2. Run deterministic tax intelligence pipeline
  const sealedPkg = TaxRuleEngine.evaluatePortfolioTax({
    workspaceId: 'WS-REAL-TICKERS',
    portfolioId: `PORT-${ticker.symbol}`,
    asOf: '2024-08-01T00:00:00.000Z',
    jurisdiction: ticker.jurisdiction,
    accountType: 'TAXABLE',
    openLots: [lotRes.lot],
    currentPrices: { [ticker.symbol]: ticker.marketPrice },
    portfolioValue: 100000,
    preTaxTwr: 0.15,
    preTaxMwr: 0.14,
    currentWeights: { [ticker.symbol]: 1.0 },
    targetWeights: { [ticker.symbol]: 0.5 },
    expectedReturns: { [ticker.symbol]: 0.10 },
    volatilities: { [ticker.symbol]: 0.20 },
    constraints: { maxPositionWeight: 1.0 },
    actor: 'SYS_TEST'
  });

  testAssert(sealedPkg.packageHash !== undefined, `Sealed package generated for ${ticker.symbol}`);
  testAssert(sealedPkg.dataProvenance === 'REAL_DATA + GOLDEN_SYNTHETIC TAX LOTS', `Provenance for ${ticker.symbol} is REAL_DATA + GOLDEN_SYNTHETIC TAX LOTS`);
  testAssert(sealedPkg.jurisdiction === ticker.jurisdiction, `Jurisdiction for ${ticker.symbol} matches ${ticker.jurisdiction}`);
  testAssert(sealedPkg.unrealizedGains.totalMarketValue === (100 * ticker.marketPrice), `Market value for ${ticker.symbol} matches price`);
  testAssert(sealedPkg.unrealizedGains.netUnrealizedGainLoss > 0, `Unrealized gain calculated for ${ticker.symbol}`);
}

// Missing lot test (must not fabricate tax)
const missingLotsPkg = TaxRuleEngine.evaluatePortfolioTax({
  workspaceId: 'WS-REAL-TICKERS',
  portfolioId: 'PORT-EMPTY',
  asOf: '2024-06-01T00:00:00.000Z',
  jurisdiction: 'US',
  openLots: [],
  currentPrices: { AAPL: 224.50 }
});
testAssert(missingLotsPkg.taxLots.length === 0, 'Empty lots produces zero tax lots without fabrication');
testAssert(missingLotsPkg.unrealizedGains === null, 'No unrealized gains calculated for empty lots');

console.log(`PASSED: Suite 7 completed with ${totalAssertions} assertions.`);
