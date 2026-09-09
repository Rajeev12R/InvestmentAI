import { calculateConcentration } from '../portfolio/concentration.engine.js';
import { calculatePairwiseCorrelation, buildCorrelationMatrix } from '../portfolio/correlation.engine.js';
import { evaluateDiversification } from '../portfolio/diversification.engine.js';
import { calculateTargetWeights } from '../portfolio/positionSizing.engine.js';
import { buildPortfolioAnalytics } from '../portfolio/portfolioRisk.engine.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('=== PHASE 3 PORTFOLIO INTELLIGENCE SUITE ===\n');

// Test 1: Concentration Engine - Weights and HHI
console.log('1. Concentration Engine');
const samplePositions = [
  { ticker: 'AAPL', value: 40000, sector: 'Technology' },
  { ticker: 'MSFT', value: 30000, sector: 'Technology' },
  { ticker: 'JNJ', value: 20000, sector: 'Healthcare' },
  { ticker: 'JPM', value: 10000, sector: 'Financials' }
]; // Total = 100,000

const conc = calculateConcentration(samplePositions);
assert(conc.status === 'COMPLETE', 'Concentration calculation succeeded');
assert(conc.totalPortfolioValue === 100000, 'Total portfolio value is 100,000');
assert(conc.positions[0].ticker === 'AAPL' && conc.positions[0].weight === 0.4, 'AAPL weight is 40%');
assert(conc.topHoldings.top1 === 0.4, 'Top 1 holding weight is 0.4');
assert(conc.topHoldings.top3 === 0.9, 'Top 3 holding weight is 0.9 (0.4+0.3+0.2)');

// HHI = 40^2 + 30^2 + 20^2 + 10^2 = 1600 + 900 + 400 + 100 = 3000
assert(conc.hhi === 3000, `HHI is 3000 (actual: ${conc.hhi})`);
assert(conc.concentrationLevel === 'HIGH', 'HHI 3000 is classified as HIGH concentration');
assert(conc.sectorBreakdown[0].sector === 'Technology' && conc.sectorBreakdown[0].weight === 0.7, 'Technology sector weight is 70%');

// Test 2: Correlation Engine
console.log('\n2. Correlation Engine');
const returnsA = [0.01, 0.02, -0.01, 0.03, -0.02, 0.04];
const returnsB = [0.02, 0.04, -0.02, 0.06, -0.04, 0.08]; // Perfect positive correlation r = 1.0
const returnsC = [-0.01, -0.02, 0.01, -0.03, 0.02, -0.04]; // Perfect negative correlation r = -1.0

const corrAB = calculatePairwiseCorrelation(returnsA, returnsB);
assert(corrAB === 1.0, `Correlation A vs B is exactly 1.0 (actual: ${corrAB})`);

const corrAC = calculatePairwiseCorrelation(returnsA, returnsC);
assert(corrAC === -1.0, `Correlation A vs C is exactly -1.0 (actual: ${corrAC})`);

const matrixResult = buildCorrelationMatrix({
  AAPL: returnsA,
  MSFT: returnsB,
  JNJ: returnsC
});
assert(matrixResult.status === 'COMPLETE', 'Correlation matrix build succeeded');
assert(matrixResult.matrix.AAPL.MSFT === 1.0, 'Matrix AAPL-MSFT is 1.0');
assert(matrixResult.matrix.AAPL.JNJ === -1.0, 'Matrix AAPL-JNJ is -1.0');

// Test 3: Diversification Engine
console.log('\n3. Diversification Engine');
const divResult = evaluateDiversification(conc, matrixResult);
// N_eff = 10,000 / 3000 = 3.33
assert(divResult.status === 'COMPLETE', 'Diversification evaluation succeeded');
assert(divResult.effectiveNumberOfBets === 3.33, `Effective bets is 3.33 (actual: ${divResult.effectiveNumberOfBets})`);
assert(divResult.diversificationLevel === 'MODERATE', 'Diversification level is MODERATE for N_eff = 3.33');

// Test 4: Position Sizing Engine - Equal Weight with Cap
console.log('\n4. Position Sizing Engine');
const sizingEq = calculateTargetWeights(samplePositions, { maxPositionCap: 0.35 });
assert(sizingEq.status === 'COMPLETE', 'Target sizing calculation succeeded');
assert(sizingEq.targets.length === 4, 'Target weights computed for all 4 positions');
assert(sizingEq.targets.every(t => t.targetWeight <= 0.3501), 'All target weights respect maxPositionCap of 35%');

// Test 4.2: RISK_PARITY_VOL with missing volatility/beta produces explicit warning
const rpPositions = [
  { ticker: 'AAPL', value: 50000, volatility: 0.20 },
  { ticker: 'MSFT', value: 30000, beta: 1.2 }, // missing volatility, has beta
  { ticker: 'UNKNOWN', value: 20000 } // missing volatility and beta
];
const rpSizing = calculateTargetWeights(rpPositions, { model: 'RISK_PARITY_VOL' });
assert(rpSizing.warnings.length === 2, 'RISK_PARITY_VOL logs warnings for both missing-volatility positions');
assert(rpSizing.warnings.some(w => w.includes('UNKNOWN') && w.includes('benchmark unit risk proxy (1.0)')), 'Explicit warning for missing volatility & beta with 1.0 unit proxy');
assert(rpSizing.warnings.some(w => w.includes('MSFT') && w.includes('systematic beta (1.2)')), 'Explicit warning for missing volatility with beta proxy');
assert(Math.round(rpSizing.targets.reduce((s, t) => s + t.targetWeight, 0) * 100) / 100 === 1.0, 'RISK_PARITY_VOL target weights sum to 1.00');

// Test 4.3: CONVICTION_WEIGHTED with missing conviction score produces explicit warning
const convPositions = [
  { ticker: 'AAPL', value: 50000, convictionScore: 80 },
  { ticker: 'MSFT', value: 50000, convictionScore: null }
];
const convSizing = calculateTargetWeights(convPositions, { model: 'CONVICTION_WEIGHTED' });
assert(convSizing.warnings.length === 1, 'CONVICTION_WEIGHTED logs warning for missing conviction position');
assert(convSizing.warnings.some(w => w.includes('MSFT') && w.includes('baseline median score (50/100)')), 'Explicit warning for missing conviction score with 50/100 baseline');
assert(Math.round(convSizing.targets.reduce((s, t) => s + t.targetWeight, 0) * 100) / 100 === 1.0, 'CONVICTION_WEIGHTED target weights sum to 1.00');

// Test 5: Full Portfolio Analytics Synthesis
console.log('\n5. Consolidated Portfolio Analytics Synthesis');
const analytics = buildPortfolioAnalytics({
  positions: samplePositions,
  returnsMap: { AAPL: returnsA, MSFT: returnsB, JNJ: returnsC }
});
assert(analytics.status === 'COMPLETE', 'Consolidated portfolio analytics status is COMPLETE');
assert(analytics.summary.totalValue === 100000, 'Summary total value is 100,000');
assert(analytics.summary.hhi === 3000, 'Summary HHI is 3000');

console.log(`\n========================================`);
console.log(`Phase 3 Portfolio Tests: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
