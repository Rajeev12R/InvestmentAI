import assert from 'assert';
import { SignalFusionEngine } from '../signalIntelligence/signal.fusion.engine.js';
import { DivergenceType, SignalType } from '../signalIntelligence/signal.types.js';

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

console.log('=== Suite 6: Signal Interactions & Divergence Detection ===');

it('should detect Valuation vs Fundamentals divergence (Cheap valuation contradicted by deteriorating fundamentals)', () => {
  const engine = new SignalFusionEngine();

  const signals = [
    { inputId: 's_val_cheap', signalType: SignalType.VALUATION_SIGNAL, normalizedValue: 0.65 },
    { inputId: 's_fund_deteriorating', signalType: SignalType.FUNDAMENTAL_SIGNAL, normalizedValue: -0.45 }
  ];

  const divs = engine.detectDivergences(signals);
  assert.strictEqual(divs.length, 1);
  assert.strictEqual(divs[0].divergenceType, DivergenceType.VALUATION_VS_FUNDAMENTALS);
  assert.strictEqual(divs[0].severity, 'HIGH');
  assert.strictEqual(divs[0].observedDifference > 1.0, true);
});

it('should detect Earnings vs Alternative Data divergence (Reported growth vs weak alternative demand data)', () => {
  const engine = new SignalFusionEngine();

  const signals = [
    { inputId: 's_earn_strong', signalType: SignalType.EARNINGS_SIGNAL, normalizedValue: 0.50 },
    { inputId: 's_alt_weak', signalType: SignalType.ALTERNATIVE_DATA_SIGNAL, normalizedValue: -0.40 }
  ];

  const divs = engine.detectDivergences(signals);
  assert.strictEqual(divs.length, 1);
  assert.strictEqual(divs[0].divergenceType, DivergenceType.EARNINGS_VS_ALTERNATIVE_DATA);
  assert.strictEqual(divs[0].severity, 'MEDIUM');
});

it('should detect Macro vs Company Specific divergence (Company acceleration against broader macro slowdown)', () => {
  const engine = new SignalFusionEngine();

  const signals = [
    { inputId: 's_macro_recession', signalType: SignalType.MACRO_SIGNAL, normalizedValue: -0.60 },
    { inputId: 's_growth_rapid', signalType: SignalType.GROWTH_SIGNAL, normalizedValue: 0.70 }
  ];

  const divs = engine.detectDivergences(signals);
  assert.strictEqual(divs.length, 1);
  assert.strictEqual(divs[0].divergenceType, DivergenceType.MACRO_VS_COMPANY);
  assert.strictEqual(divs[0].observedDifference > 1.0, true);
});

console.log(`PASSED: ${totalAssertions} assertions passed.\n`);
