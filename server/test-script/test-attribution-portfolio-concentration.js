import assert from 'assert';
import { PortfolioSignalAttributionEngine } from '../alphaAttribution/attribution.portfolio.engine.js';

let passed = 0;
function it(desc, fn) {
  try {
    fn();
    passed++;
  } catch (err) {
    console.error(`FAILED: ${desc}`);
    throw err;
  }
}

console.log('=== Suite 10: Portfolio Signal Concentration & Conflict Drag ===');

it('Compute gross and net signal exposures with concentration HHI', () => {
  const engine = new PortfolioSignalAttributionEngine();

  const holdings = [
    { ticker: 'NVDA', weight: 0.20, dominantSignal: 'AI_GROWTH', correlatedGroup: 'TECH_AI', signalScore: 0.8 },
    { ticker: 'MSFT', weight: 0.20, dominantSignal: 'AI_GROWTH', correlatedGroup: 'TECH_AI', signalScore: 0.7 },
    { ticker: 'AAPL', weight: 0.10, dominantSignal: 'QUALITY', correlatedGroup: 'MEGA_CAP', signalScore: 0.5 },
    { ticker: 'XOM', weight: -0.10, dominantSignal: 'VALUE', correlatedGroup: 'ENERGY', signalScore: -0.4 }
  ];

  const res = engine.evaluatePortfolioSignalAttribution({
    portfolioId: 'port_long_short',
    holdings
  });

  assert.strictEqual(res.grossExposure, 0.60); // 0.20 + 0.20 + 0.10 + 0.10
  assert.strictEqual(res.netExposure, 0.40); // 0.20 + 0.20 + 0.10 - 0.10
  assert.strictEqual(res.longExposure, 0.50);
  assert.strictEqual(res.shortExposure, 0.10);
  assert.strictEqual(res.concentrationRisks.length, 1);
  assert.strictEqual(res.concentrationRisks[0].group, 'TECH_AI'); // 0.40 / 0.60 = 66.7% share
  assert.strictEqual(res.concentrationRisks[0].riskLevel, 'CRITICAL');
});

it('Quantify signal conflict drag across opposing positions in same correlated group', () => {
  const engine = new PortfolioSignalAttributionEngine();

  const holdings = [
    { ticker: 'CO_A', weight: 0.15, dominantSignal: 'MOMENTUM', correlatedGroup: 'SEMIS', signalScore: 0.9 },
    { ticker: 'CO_B', weight: 0.15, dominantSignal: 'VALUATION', correlatedGroup: 'SEMIS', signalScore: -0.8 }
  ];

  const res = engine.evaluatePortfolioSignalAttribution({
    portfolioId: 'port_conflict',
    holdings
  });

  assert.ok(res.conflictDrag > 0);
  assert.strictEqual(res.conflictDrag, 0.0075); // 0.15 * 0.05 = 0.0075
});

console.log(`PASSED: ${passed} assertions passed.\n`);
