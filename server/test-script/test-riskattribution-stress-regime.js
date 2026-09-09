/**
 * server/test-script/test-riskattribution-stress-regime.js
 * 
 * Phase 32 — Suite 9: Stress Scenario & Macro Regime Risk Attribution
 */

import { RiskAttributionEngine } from '../riskAttribution/riskAttribution.engine.js';
import { ConfidenceStatus } from '../riskAttribution/riskAttribution.types.js';

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  passed++;
}

console.log('--- SUITE 9: Stress Scenario & Macro Regime Risk Attribution ---');

const symbols = ['EQ_CORE', 'EQ_GROWTH', 'CORP_CREDIT', 'GOVT_BOND'];
const weights = [0.4, 0.2, 0.25, 0.15];
const cov = [
  [0.0324, 0.0250, 0.0120, -0.0020],
  [0.0250, 0.0550, 0.0150, -0.0030],
  [0.0120, 0.0150, 0.0180,  0.0010],
  [-0.0020, -0.0030, 0.0010, 0.0040]
];

const attr = RiskAttributionEngine.runComprehensiveAttribution({
  symbols,
  weights,
  covarianceMatrix: cov,
  periodsPerYear: 252
});

// 1. Stress Scenario Attribution
const stress = attr.stressAttribution;
assert(stress !== null && stress.status === ConfidenceStatus.SCENARIO, 'Stress attribution status is SCENARIO');
assert(stress.scenarios.length >= 4, 'Includes at least 4 canonical stress scenarios');

const gfc = stress.scenarios.find(s => s.scenarioId === 'GFC_2008');
assert(gfc !== null, 'GFC_2008 scenario exists');
assert(gfc.stressedVolatility > gfc.baseVolatility, 'Stressed volatility under GFC is strictly higher than base');
assert(gfc.volatilityShift > 0, 'Volatility shift is positive');
assert(gfc.topStressedContributors.length > 0, 'Top stressed contributors identified');

const covid = stress.scenarios.find(s => s.scenarioId === 'COVID_2020');
assert(covid !== null, 'COVID_2020 scenario exists');
assert(covid.stressedVolatility > gfc.baseVolatility, 'Covid shock produces stressed volatility');

// 2. Regime Risk Attribution
const regime = attr.regimeAttribution;
assert(regime !== null && regime.status === ConfidenceStatus.SCENARIO, 'Regime attribution status is SCENARIO');
assert(regime.regimes.length >= 5, 'Includes at least 5 macro regimes');

const crisisRegime = regime.regimes.find(r => r.regimeKey === 'CRISIS_DISLOCATION');
assert(crisisRegime !== null, 'Crisis dislocation regime exists');
assert(crisisRegime.conditionedVolatility > attr.portfolioMetrics.portfolioVolatility, 'Crisis conditioned vol exceeds base vol');
assert(crisisRegime.volatilityDelta > 0, 'Crisis volatility delta is positive');

const bullRegime = regime.regimes.find(r => r.regimeKey === 'BULL_EXPANSION');
assert(bullRegime !== null, 'Bull expansion regime exists');
assert(bullRegime.conditionedVolatility < attr.portfolioMetrics.portfolioVolatility, 'Bull regime conditioned vol is lower than base vol');

console.log(`PASSED: ${passed}`);
