import assert from 'assert';
import { ExposureMacroScenarioEngine } from '../exposureRisk/exposure.macro.scenario.engine.js';
import { SensitivityTier } from '../exposureRisk/exposure.types.js';

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

console.log('=== Suite 9: Macro & Phase 19 Scenario Sensitivities ===');

it('Macro factor sensitivity classification', () => {
  const sensitivities = {
    RATES_10Y: -0.45,
    INFLATION_CPI: -0.20,
    CRUDE_OIL: 0.35,
    USD_INDEX: -0.15
  };

  const res = ExposureMacroScenarioEngine.evaluateMacroSensitivities({
    macroBetaSensitivities: sensitivities,
    tier: SensitivityTier.DERIVED
  });

  assert.strictEqual(res.count, 4);
  assert.strictEqual(res.sensitivities.RATES_10Y.sensitivity, -0.45);
  assert.strictEqual(res.sensitivities.RATES_10Y.tier, SensitivityTier.DERIVED);
});

it('Phase 19 Scenario sensitivity stress (Rate shock with liquidity drag)', () => {
  const betas = { MARKET: 1.10, RATES: -3.5, TECH_GROWTH: -0.80 };
  const shocks = { MARKET: -0.05, RATES: 0.02, TECH_GROWTH: -0.10 };

  const res = ExposureMacroScenarioEngine.evaluateScenarioSensitivity({
    scenarioName: 'RATES_SURGE_200BPS',
    factorShocks: shocks,
    portfolioFactorBetas: betas,
    liquidityStressDragBps: 20
  });

  // Factor impact = (1.1*-0.05) + (-3.5*0.02) + (-0.8*-0.10) = -0.055 - 0.070 + 0.080 = -0.045
  // Liquidity drag = 20 / 10000 = 0.002
  // Total impact = -0.045 - 0.002 = -0.047
  assert.strictEqual(res.totalFactorImpact, -0.045);
  assert.strictEqual(res.liquidityDrag, 0.002);
  assert.strictEqual(res.expectedPortfolioImpact, -0.047);
  assert.strictEqual(res.tier, SensitivityTier.SCENARIO_INPUT);
});

console.log(`PASSED: ${passed} assertions passed.\n`);
