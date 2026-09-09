/**
 * @file phase7PortfolioIntelligenceTests.js
 * Test suite for Phase 7 Portfolio Intelligence & Multi-Asset Exposure.
 * Tests concentration (Top 1, Top 3, Top 5), HHI, sector exposure, N_eff,
 * correlation clustering, and multi-period portfolio drift.
 */

import assert from 'assert';
import { calculatePortfolioExposure } from '../portfolioIntelligence/exposure.engine.js';
import { calculatePortfolioStateChange } from '../portfolioIntelligence/portfolioChange.engine.js';
import { generatePortfolioAlerts } from '../portfolioIntelligence/portfolioAlerts.engine.js';
import { buildPortfolioDailyState } from '../portfolioIntelligence/portfolioIntelligence.engine.js';
import { ConcentrationLevel, CorrelationLevel, validatePortfolioDailyState } from '../portfolioIntelligence/portfolioIntelligence.types.js';

console.log('================================================================');
console.log('INVESTMENTAI — PHASE 7 PORTFOLIO INTELLIGENCE TEST SUITE');
console.log('================================================================\n');

let passCount = 0;

function it(desc, fn) {
  try {
    fn();
    passCount++;
    console.log(`  ✓ ${desc}`);
  } catch (err) {
    console.error(`  ✗ ${desc}`);
    console.error(err);
    process.exit(1);
  }
}

// 1. Concentration & Exposure Calculations
it('1. Exposure Engine: Computes Top 1, Top 3, Top 5 weights correctly', () => {
  const holdings = [
    { ticker: 'AAPL', weight: 0.40, sector: 'Technology' },
    { ticker: 'MSFT', weight: 0.25, sector: 'Technology' },
    { ticker: 'JPM', weight: 0.15, sector: 'Financials' },
    { ticker: 'GOOGL', weight: 0.10, sector: 'Technology' },
    { ticker: 'NVDA', weight: 0.10, sector: 'Technology' }
  ];

  const exp = calculatePortfolioExposure(holdings);
  assert.strictEqual(exp.top1Weight, 0.40);
  assert.strictEqual(exp.top3Weight, 0.80);
  assert.strictEqual(exp.top5Weight, 1.00);
});

it('2. Exposure Engine: Computes HHI and flags HIGH concentration when single position > 35%', () => {
  const holdings = [
    { ticker: 'AAPL', weight: 0.40, sector: 'Technology' },
    { ticker: 'JPM', weight: 0.30, sector: 'Financials' },
    { ticker: 'RELIANCE.NS', weight: 0.30, sector: 'Energy' }
  ];

  const exp = calculatePortfolioExposure(holdings);
  // HHI = 40^2 + 30^2 + 30^2 = 1600 + 900 + 900 = 3400
  assert.strictEqual(exp.hhi, 3400);
  assert.strictEqual(exp.concentrationLevel, ConcentrationLevel.HIGH);
});

it('3. Exposure Engine: Computes N_eff (effective independent bets)', () => {
  const equalHoldings = Array.from({ length: 10 }, (_, i) => ({
    ticker: `ASSET_${i + 1}`,
    weight: 0.10
  }));

  const exp = calculatePortfolioExposure(equalHoldings);
  // N_eff = 1 / (10 * 0.10^2) = 1 / (10 * 0.01) = 1 / 0.1 = 10.0
  assert.strictEqual(exp.nEff, 10.0);
  assert.strictEqual(exp.concentrationLevel, ConcentrationLevel.LOW);
});

it('4. Exposure Engine: Computes sector distribution percentages accurately', () => {
  const holdings = [
    { ticker: 'AAPL', weight: 0.50, sector: 'Technology' },
    { ticker: 'MSFT', weight: 0.20, sector: 'Technology' },
    { ticker: 'JPM', weight: 0.30, sector: 'Financials' }
  ];

  const exp = calculatePortfolioExposure(holdings);
  assert.strictEqual(exp.sectorExposure['Technology'], 0.70);
  assert.strictEqual(exp.sectorExposure['Financials'], 0.30);
});

it('5. Exposure Engine: Detects high pairwise correlation clusters (r >= 0.80)', () => {
  const tickers = ['AAPL', 'MSFT', 'GOOGL', 'JPM'];
  const corrMatrix = [
    [1.00, 0.88, 0.82, 0.25],
    [0.88, 1.00, 0.85, 0.20],
    [0.82, 0.85, 1.00, 0.30],
    [0.25, 0.20, 0.30, 1.00]
  ];
  const holdings = tickers.map(t => ({ ticker: t, weight: 0.25 }));

  const exp = calculatePortfolioExposure(holdings, corrMatrix, tickers);
  assert.strictEqual(exp.correlationClusters.length, 1);
  assert.strictEqual(exp.correlationClusters[0].pairs.length, 3); // (AAPL-MSFT, AAPL-GOOGL, MSFT-GOOGL)
  assert.strictEqual(exp.correlationLevel, CorrelationLevel.HIGH);
});

// 2. Multi-Period State Drift Engine
it('6. State Change: Distinguishes percentage points (pp) from percentage change', () => {
  const stateT0 = {
    holdings: [{ ticker: 'AAPL', weight: 0.20 }, { ticker: 'JPM', weight: 0.80 }],
    exposureMetrics: { sectorExposure: { Technology: 0.20, Financials: 0.80 }, top1Weight: 0.80, hhi: 6800, nEff: 1.47 }
  };
  const stateT1 = {
    holdings: [{ ticker: 'AAPL', weight: 0.35 }, { ticker: 'JPM', weight: 0.65 }],
    exposureMetrics: { sectorExposure: { Technology: 0.35, Financials: 0.65 }, top1Weight: 0.65, hhi: 5450, nEff: 1.83 }
  };

  const drift = calculatePortfolioStateChange(stateT0, stateT1);
  assert.strictEqual(drift.hasDrift, true);

  const aaplDrift = drift.allocationDrift.find(d => d.ticker === 'AAPL');
  assert.strictEqual(aaplDrift.percentagePointDiff, 15.0); // +15 percentage points
  assert.strictEqual(aaplDrift.pctChange, 75.0); // +75% increase relative to base weight
});

it('7. State Change: Detects decision distribution shifts', () => {
  const stateT0 = {
    holdings: [
      { ticker: 'AAPL', weight: 0.5, decision: 'BUY' },
      { ticker: 'JPM', weight: 0.5, decision: 'BUY' }
    ]
  };
  const stateT1 = {
    holdings: [
      { ticker: 'AAPL', weight: 0.5, decision: 'WATCH' },
      { ticker: 'JPM', weight: 0.5, decision: 'AVOID' }
    ]
  };

  const drift = calculatePortfolioStateChange(stateT0, stateT1);
  assert.strictEqual(drift.decisionDistributionDrift.t0.BUY, 2);
  assert.strictEqual(drift.decisionDistributionDrift.t1.BUY, 0);
  assert.strictEqual(drift.decisionDistributionDrift.t1.WATCH, 1);
  assert.strictEqual(drift.decisionDistributionDrift.t1.AVOID, 1);
  assert.ok(drift.decisionDistributionDrift.changedCount >= 2);
});

// 3. Portfolio Alerts
it('8. Portfolio Alerts: Generates deterministic alerts for concentration & correlation', () => {
  const exp = {
    top1Weight: 0.45,
    top3Weight: 0.75,
    hhi: 3600,
    nEff: 1.6,
    holdingsCount: 5,
    correlationClusters: [{
      clusterName: 'High Correlation Cluster',
      pairs: [{ tickerA: 'AAPL', tickerB: 'MSFT', correlation: 0.90 }],
      severity: 'HIGH'
    }],
    correlationLevel: 'HIGH'
  };

  const alerts = generatePortfolioAlerts(exp);
  assert.ok(alerts.length >= 3);
  assert.ok(alerts.some(a => a.type === 'PORTFOLIO_CONCENTRATION'));
  assert.ok(alerts.some(a => a.type === 'CORRELATION_RISK'));
  assert.ok(alerts.some(a => a.type === 'DIVERSIFICATION_DEFICIT'));
});

// 4. Sealed Daily State
it('9. Daily State Sealing: Creates immutable state snapshot with SHA-256 seal', () => {
  const state = buildPortfolioDailyState({
    workspaceId: 'INSTITUTIONAL_ALPHA',
    totalValue: 1000000,
    holdings: [
      { ticker: 'AAPL', weight: 0.4, value: 400000, sector: 'Technology', decision: 'BUY', riskLevel: 'MODERATE' },
      { ticker: 'JPM', weight: 0.3, value: 300000, sector: 'Financials', decision: 'HOLD', riskLevel: 'LOW' },
      { ticker: 'RELIANCE.NS', weight: 0.3, value: 300000, sector: 'Energy', decision: 'BUY', riskLevel: 'MODERATE' }
    ]
  });

  assert.strictEqual(state.isSealed, true);
  assert.ok(state.stateHash);
  assert.strictEqual(state.stateHash.length, 64);
  assert.strictEqual(state.totalValue, 1000000);
  assert.strictEqual(state.holdingsCount, 3);
  assert.ok(state.exposureMetrics);
});

it('10. Daily State Sealing: Throws on invalid payload structure', () => {
  assert.throws(() => {
    buildPortfolioDailyState({ totalValue: 'one million' }); // invalid totalValue
  });
});

it('11. Exposure Engine: Handles empty holdings array without error', () => {
  const exp = calculatePortfolioExposure([]);
  assert.strictEqual(exp.holdingsCount, 0);
  assert.strictEqual(exp.hhi, 0);
  assert.strictEqual(exp.nEff, 0);
  assert.strictEqual(exp.concentrationLevel, ConcentrationLevel.LOW);
});

it('12. Exposure Engine: Handles single holding (100% concentration)', () => {
  const exp = calculatePortfolioExposure([{ ticker: 'AAPL', weight: 1.0, sector: 'Technology' }]);
  assert.strictEqual(exp.top1Weight, 1.0);
  assert.strictEqual(exp.hhi, 10000); // 100^2 = 10000
  assert.strictEqual(exp.nEff, 1.0);
  assert.strictEqual(exp.concentrationLevel, ConcentrationLevel.HIGH);
});

it('13. Exposure Engine: Normalizes raw unnormalized holding weights', () => {
  const rawHoldings = [
    { ticker: 'AAPL', weight: 50 },
    { ticker: 'JPM', weight: 50 }
  ];
  const exp = calculatePortfolioExposure(rawHoldings);
  assert.strictEqual(exp.top1Weight, 0.50);
  assert.strictEqual(exp.hhi, 5000);
});

it('14. State Change: Detects sector drift >= 1.0 percentage points', () => {
  const stateT0 = { exposureMetrics: { sectorExposure: { Technology: 0.40, Healthcare: 0.60 } } };
  const stateT1 = { exposureMetrics: { sectorExposure: { Technology: 0.55, Healthcare: 0.45 } } };
  const drift = calculatePortfolioStateChange(stateT0, stateT1);
  assert.ok(drift.sectorDrift['Technology']);
  assert.strictEqual(drift.sectorDrift['Technology'].percentagePointDiff, 15.0);
});

it('15. State Change: Ignores micro-allocation drift (< 0.5 pp)', () => {
  const stateT0 = { holdings: [{ ticker: 'AAPL', weight: 0.50 }] };
  const stateT1 = { holdings: [{ ticker: 'AAPL', weight: 0.502 }] };
  const drift = calculatePortfolioStateChange(stateT0, stateT1);
  assert.strictEqual(drift.allocationDrift.length, 0);
});

it('16. Portfolio Alerts: Emits no alerts on fully diversified uncorrelated portfolio', () => {
  const exp = {
    top1Weight: 0.10,
    top3Weight: 0.30,
    hhi: 1000,
    nEff: 10.0,
    holdingsCount: 10,
    correlationClusters: [],
    correlationLevel: 'LOW'
  };
  const alerts = generatePortfolioAlerts(exp);
  assert.strictEqual(alerts.length, 0);
});

it('17. Daily State: Recomputes HHI accurately across 4 distinct holdings', () => {
  const state = buildPortfolioDailyState({
    workspaceId: 'TEST-HHI-4',
    totalValue: 100000,
    holdings: [
      { ticker: 'A', weight: 0.4, value: 40000 },
      { ticker: 'B', weight: 0.3, value: 30000 },
      { ticker: 'C', weight: 0.2, value: 20000 },
      { ticker: 'D', weight: 0.1, value: 10000 }
    ]
  });
  // 40^2 + 30^2 + 20^2 + 10^2 = 1600 + 900 + 400 + 100 = 3000
  assert.strictEqual(state.exposureMetrics.hhi, 3000);
});

it('18. Daily State: Attaches previous state drift report when supplied', () => {
  const s0 = buildPortfolioDailyState({
    workspaceId: 'WS-DRIFT',
    totalValue: 100000,
    holdings: [{ ticker: 'AAPL', weight: 0.2, value: 20000 }, { ticker: 'JPM', weight: 0.8, value: 80000 }]
  });
  const s1 = buildPortfolioDailyState({
    workspaceId: 'WS-DRIFT',
    totalValue: 100000,
    holdings: [{ ticker: 'AAPL', weight: 0.5, value: 50000 }, { ticker: 'JPM', weight: 0.5, value: 50000 }],
    previousState: s0
  });

  assert.ok(s1.driftReport);
  assert.strictEqual(s1.driftReport.hasDrift, true);
  assert.ok(s1.driftReport.allocationDrift.length >= 2);
});

it('19. Daily State: State hash changes when holding weights shift', () => {
  const s0 = buildPortfolioDailyState({
    workspaceId: 'WS-HASH',
    totalValue: 100000,
    holdings: [{ ticker: 'AAPL', weight: 0.5, value: 50000 }]
  });
  const s1 = buildPortfolioDailyState({
    workspaceId: 'WS-HASH',
    totalValue: 100000,
    holdings: [{ ticker: 'AAPL', weight: 0.6, value: 60000 }]
  });
  assert.notStrictEqual(s0.stateHash, s1.stateHash);
});

it('20. Daily State: Validates and enforces holdings array presence', () => {
  assert.throws(() => {
    buildPortfolioDailyState({ holdings: null });
  });
});

it('21. Exposure Engine: Handles 5-asset correlation matrix without error', () => {
  const tickers = ['A', 'B', 'C', 'D', 'E'];
  const corr = [
    [1.0, 0.2, 0.3, 0.1, 0.2],
    [0.2, 1.0, 0.4, 0.3, 0.1],
    [0.3, 0.4, 1.0, 0.2, 0.1],
    [0.1, 0.3, 0.2, 1.0, 0.5],
    [0.2, 0.1, 0.1, 0.5, 1.0]
  ];
  const holdings = tickers.map(t => ({ ticker: t, weight: 0.2 }));
  const exp = calculatePortfolioExposure(holdings, corr, tickers);
  assert.strictEqual(exp.correlationLevel, CorrelationLevel.LOW);
  assert.strictEqual(exp.correlationClusters.length, 0);
});

it('22. Exposure Engine: Classifies MODERATE correlation when avg correlation >= 0.40', () => {
  const tickers = ['A', 'B'];
  const corr = [[1.0, 0.5], [0.5, 1.0]];
  const holdings = tickers.map(t => ({ ticker: t, weight: 0.5 }));
  const exp = calculatePortfolioExposure(holdings, corr, tickers);
  assert.strictEqual(exp.correlationLevel, CorrelationLevel.MODERATE);
});

it('23. Exposure Engine: Treats null correlation matrix gracefully', () => {
  const holdings = [{ ticker: 'AAPL', weight: 0.5 }, { ticker: 'MSFT', weight: 0.5 }];
  const exp = calculatePortfolioExposure(holdings, null, null);
  assert.strictEqual(exp.correlationClusters.length, 0);
  assert.strictEqual(exp.correlationLevel, CorrelationLevel.LOW);
});

it('24. State Change: Returns hasDrift = false when states are null or undefined', () => {
  const drift = calculatePortfolioStateChange(null, null);
  assert.strictEqual(drift.hasDrift, false);
  assert.strictEqual(drift.allocationDrift.length, 0);
});

it('25. State Change: Handles newly added ticker in T1', () => {
  const s0 = { holdings: [{ ticker: 'AAPL', weight: 1.0 }] };
  const s1 = { holdings: [{ ticker: 'AAPL', weight: 0.7 }, { ticker: 'NVDA', weight: 0.3 }] };
  const drift = calculatePortfolioStateChange(s0, s1);
  assert.strictEqual(drift.hasDrift, true);
  const nvda = drift.allocationDrift.find(d => d.ticker === 'NVDA');
  assert.ok(nvda);
  assert.strictEqual(nvda.percentagePointDiff, 30.0);
  assert.strictEqual(nvda.weightT0, 0);
});

it('26. State Change: Handles removed ticker in T1', () => {
  const s0 = { holdings: [{ ticker: 'AAPL', weight: 0.6 }, { ticker: 'JPM', weight: 0.4 }] };
  const s1 = { holdings: [{ ticker: 'AAPL', weight: 1.0 }] };
  const drift = calculatePortfolioStateChange(s0, s1);
  const jpm = drift.allocationDrift.find(d => d.ticker === 'JPM');
  assert.ok(jpm);
  assert.strictEqual(jpm.percentagePointDiff, -40.0);
});

it('27. Concentration: Flags MODERATE concentration when top 1 holding >= 20%', () => {
  const holdings = [
    { ticker: 'AAPL', weight: 0.22 },
    { ticker: 'MSFT', weight: 0.15 },
    { ticker: 'JPM', weight: 0.15 },
    { ticker: 'GOOGL', weight: 0.16 },
    { ticker: 'AMZN', weight: 0.16 },
    { ticker: 'META', weight: 0.16 }
  ];
  const exp = calculatePortfolioExposure(holdings);
  assert.strictEqual(exp.concentrationLevel, ConcentrationLevel.MODERATE);
});

it('28. Concentration: Flags MODERATE concentration when top 3 holdings >= 50%', () => {
  const holdings = [
    { ticker: 'A', weight: 0.18 },
    { ticker: 'B', weight: 0.18 },
    { ticker: 'C', weight: 0.18 },
    { ticker: 'D', weight: 0.15 },
    { ticker: 'E', weight: 0.15 },
    { ticker: 'F', weight: 0.16 }
  ];
  const exp = calculatePortfolioExposure(holdings);
  assert.strictEqual(exp.concentrationLevel, ConcentrationLevel.MODERATE);
});

it('29. Portfolio Alerts: Single holding alert triggers if top1 >= 35%', () => {
  const exp = { top1Weight: 0.38, top3Weight: 0.50, hhi: 2000, nEff: 3.5, holdingsCount: 5 };
  const alerts = generatePortfolioAlerts(exp);
  assert.ok(alerts.some(a => a.type === 'PORTFOLIO_CONCENTRATION' && a.title.includes('Single-Position')));
});

it('30. Portfolio Alerts: Top 3 holdings alert triggers if top3 >= 65%', () => {
  const exp = { top1Weight: 0.25, top3Weight: 0.68, hhi: 2200, nEff: 3.0, holdingsCount: 5 };
  const alerts = generatePortfolioAlerts(exp);
  assert.ok(alerts.some(a => a.type === 'PORTFOLIO_CONCENTRATION' && a.title.includes('Top 3')));
});

it('31. Daily State: Reconstructs state with 0 totalValue without crash', () => {
  const state = buildPortfolioDailyState({
    workspaceId: 'ZERO_VAL',
    totalValue: 0,
    holdings: []
  });
  assert.strictEqual(state.totalValue, 0);
  assert.strictEqual(state.holdingsCount, 0);
});

it('32. Daily State: Canonical hash remains stable on re-execution with fixed generatedAt', () => {
  const input = {
    workspaceId: 'FIXED_TIME',
    totalValue: 500000,
    holdings: [{ ticker: 'AAPL', weight: 1.0, value: 500000 }],
    generatedAt: '2026-09-06T00:00:00.000Z'
  };
  const s1 = buildPortfolioDailyState(input);
  const s2 = buildPortfolioDailyState(input);
  assert.strictEqual(s1.stateHash, s2.stateHash);
});

it('33. Exposure: Unassigned sector default is applied if sector is missing', () => {
  const holdings = [{ ticker: 'ABC', weight: 1.0 }];
  const exp = calculatePortfolioExposure(holdings);
  assert.strictEqual(exp.sectorExposure['Unassigned'], 1.0);
});

it('34. State Change: Correctly tallies changed decision counts', () => {
  const s0 = { holdings: [{ ticker: 'AAPL', decision: 'BUY' }] };
  const s1 = { holdings: [{ ticker: 'AAPL', decision: 'AVOID' }] };
  const drift = calculatePortfolioStateChange(s0, s1);
  assert.strictEqual(drift.decisionDistributionDrift.changedCount, 2); // 1 lost BUY, 1 gained AVOID
});

it('35. Types Validation: Rejects missing totalValue in validatePortfolioDailyState', () => {
  const res = validatePortfolioDailyState({ holdings: [], exposureMetrics: {} });
  assert.strictEqual(res.valid, false);
  assert.ok(res.errors.some(e => e.includes('totalValue')));
});

console.log(`\n================================================================`);
console.log(`PHASE 7 PORTFOLIO INTELLIGENCE TESTS: ${passCount} / ${passCount} PASSED`);
console.log(`================================================================\n`);
