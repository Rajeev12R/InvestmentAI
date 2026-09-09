import assert from 'assert';
import { SignalPortfolioEngine } from '../signalIntelligence/signal.portfolio.engine.js';

let totalAssertions = 0;
function it(desc, fn) {
  try {
    fn();
    totalAssertions++;
  } catch (err) {
    console.error(`FAILED: ${desc}`);
    throw err;
  }
}

console.log('=== Suite 9: Portfolio Signal Fusion & Concentration Risk ===');

it('should aggregate portfolio signals handling long and short positions explicitly', () => {
  const engine = new SignalPortfolioEngine();

  // Long NVDA (+20%, score +0.80), Short XYZ (-10%, score -0.60)
  // Net score = (0.20 * 0.80) + (-0.10 * -0.60) = 0.16 + 0.06 = +0.22
  const holdings = [
    { ticker: 'NVDA', weight: 0.20, compositeScore: 0.80, dominantDriver: 'AI_CAPEX' },
    { ticker: 'XYZ_SHORT', weight: -0.10, compositeScore: -0.60, dominantDriver: 'LEGACY_COMPUTE' }
  ];

  const res = engine.aggregatePortfolioSignals('tenant_01', {
    portfolioId: 'port_ls_01',
    holdings
  });

  assert.strictEqual(res.longExposure, 0.20);
  assert.strictEqual(res.shortExposure, 0.10);
  assert.strictEqual(res.grossExposure, 0.30);
  assert.strictEqual(res.netExposure, 0.10);
  assert.strictEqual(res.netSignalScore, 0.22);
  assert.strictEqual(res.grossSignalScore, 0.22);
});

it('should detect common-driver SignalConcentrationRisk when multiple positions share the same underlying theme', () => {
  const engine = new SignalPortfolioEngine();

  const concentratedHoldings = [
    { ticker: 'NVDA', weight: 0.20, compositeScore: 0.85, dominantDriver: 'AI_CAPEX' },
    { ticker: 'TSM', weight: 0.15, compositeScore: 0.70, dominantDriver: 'AI_CAPEX' },
    { ticker: 'MSFT', weight: 0.15, compositeScore: 0.60, dominantDriver: 'AI_CAPEX' },
    { ticker: 'JNJ', weight: 0.20, compositeScore: 0.10, dominantDriver: 'HEALTHCARE' }
  ];

  const res = engine.aggregatePortfolioSignals('tenant_01', {
    portfolioId: 'port_conc_01',
    holdings: concentratedHoldings
  });

  assert.strictEqual(res.concentrationRisks.length, 1);
  assert.strictEqual(res.concentrationRisks[0].riskType, 'SIGNAL_CONCENTRATION_RISK');
  assert.strictEqual(res.concentrationRisks[0].driver, 'AI_CAPEX');
  assert.strictEqual(res.concentrationRisks[0].driverExposurePct, 0.50);
  assert.strictEqual(res.concentrationRisks[0].affectedPositionsCount, 3);
  assert.strictEqual(res.concentrationRisks[0].severity, 'HIGH');
});

it('should handle empty holdings returning neutral zero state', () => {
  const engine = new SignalPortfolioEngine();

  const empty = engine.aggregatePortfolioSignals('tenant_01', {
    portfolioId: 'port_empty',
    holdings: []
  });

  assert.strictEqual(empty.netSignalScore, 0.0);
  assert.strictEqual(empty.grossExposure, 0.0);
  assert.strictEqual(empty.concentrationRisks.length, 0);
});

console.log(`PASSED: ${totalAssertions} assertions passed.\n`);
