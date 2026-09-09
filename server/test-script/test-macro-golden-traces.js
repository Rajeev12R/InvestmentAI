/**
 * test-macro-golden-traces.js
 * Suite 12: Deterministic Golden Traces A through J
 */

import assert from 'assert';
import { createMacroStore } from '../macro/macro.store.js';
import { calculateGrowth, calculateSpread, calculateRealRate } from '../macro/macro.derived.engine.js';
import { detectMacroRegime } from '../macro/macro.regime.engine.js';
import { calculateTransmission } from '../macro/macro.crossAsset.engine.js';
import { calculatePortfolioMacroExposure } from '../macro/macro.exposure.engine.js';
import { calculatePortfolioMacroImpact } from '../macro/macro.impact.engine.js';
import { generateMacroValuationAdjustment } from '../macro/macro.valuation.bridge.js';
import { sealMacroPackage, verifyMacroPackage } from '../macro/macro.package.js';
import { MacroEnums } from '../macro/macro.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- Running Suite 12: Golden Cases A–J Traces ---');

// Golden A: Rate Hike Cycle & Yield Curve Inversion
const rate2Y = 4.85;
const rate10Y = 4.10;
const spread10Y2Y = calculateSpread(rate10Y, rate2Y);
testAssert(spread10Y2Y === -0.75, 'Golden A: 10Y-2Y spread is -0.75% (-75 bps inversion)');
testAssert(spread10Y2Y < 0, 'Golden A: Yield curve is inverted');

// Golden B: Disinflation with Resilient Growth (Soft Landing / Goldilocks)
const regimeB = detectMacroRegime({
  gdpGrowthYoY: 2.8,
  cpiYoY: 2.1,
  unemploymentRate: 3.8,
  ratesTrend: 'STABLE'
});
testAssert(regimeB.regime === MacroEnums.MacroRegime.GOLDILOCKS, 'Golden B: Detected GOLDILOCKS');
testAssert(regimeB.confidence >= 0.70, 'Golden B: Confidence >= 0.70');

// Golden C: Stagflation Shock
const regimeC = detectMacroRegime({
  gdpGrowthYoY: -0.5,
  cpiYoY: 6.2,
  unemploymentRate: 5.5,
  ratesTrend: 'RISING'
});
testAssert(regimeC.regime === MacroEnums.MacroRegime.STAGFLATION, 'Golden C: Detected STAGFLATION');
testAssert(regimeC.supportingEvidence.length > 0, 'Golden C: Supporting evidence provided');

// Golden D: Sovereign/Currency Crisis & Capital Flight
const regimeD = detectMacroRegime({
  fxDepreciationYoY: 28.5,
  sovereignSpreadBps: 650,
  fxReservesDepletionPct: -35.0
});
testAssert(regimeD.regime === MacroEnums.MacroRegime.DEVALUATION_CRISIS, 'Golden D: Detected DEVALUATION_CRISIS');

// Golden E: Credit Spread Blowout & Liquidity Crunch
const regimeE = detectMacroRegime({
  highYieldSpreadBps: 820,
  repoStressIndicator: 'HIGH',
  creditGrowthYoY: -3.2
});
testAssert(regimeE.regime === MacroEnums.MacroRegime.CREDIT_CONTRACTION, 'Golden E: Detected CREDIT_CONTRACTION');

// Golden F: Restatement of Inflation (Revision Point-in-Time Trace)
const storeF = createMacroStore();
storeF.ingestObservation({
  tenantId: 'tenant-gold-f',
  seriesId: 'US_CPI_YOY',
  timestamp: '2026-01-01T00:00:00.000Z',
  value: 3.1,
  unit: '%',
  provenance: { sourceId: 'BLS', asOf: '2026-01-15T00:00:00.000Z', verified: true, authority: 'US_BLS' }
});
// Restatement published on Feb 15
storeF.ingestObservation({
  tenantId: 'tenant-gold-f',
  seriesId: 'US_CPI_YOY',
  timestamp: '2026-01-01T00:00:00.000Z',
  value: 3.4, // Revised upwards
  unit: '%',
  provenance: { sourceId: 'BLS', asOf: '2026-02-15T00:00:00.000Z', verified: true, authority: 'US_BLS' }
});

// As-of Jan 31 -> should get initial 3.1%
const obsJan = storeF.getPointInTime('tenant-gold-f', 'US_CPI_YOY', '2026-01-01T00:00:00.000Z', '2026-01-31T23:59:59.000Z');
testAssert(obsJan.value === 3.1, 'Golden F: Point-in-Time Jan 31 query returns original 3.1%');

// As-of Feb 28 -> should get revised 3.4%
const obsFeb = storeF.getPointInTime('tenant-gold-f', 'US_CPI_YOY', '2026-01-01T00:00:00.000Z', '2026-02-28T23:59:59.000Z');
testAssert(obsFeb.value === 3.4, 'Golden F: Point-in-Time Feb 28 query returns revised 3.4%');

// Golden G: Mixed Signal
const regimeG = detectMacroRegime({
  cpiYoY: 4.8, // High inflation
  unemploymentRate: 3.6, // Strong labor
  manufacturingPmi: 46.2 // Contracting activity
});
testAssert(regimeG.confidence < 0.95, 'Golden G: Mixed signals produce lower certainty');
testAssert(regimeG.contradictingEvidence.length > 0, 'Golden G: Contradicting evidence documented');

// Golden H: Cross-Asset Transmission Shock (Oil -> Inflation -> Rates -> DCF WACC -> Equity)
const oilShock = 0.20; // +20% Oil surge
const oilToCpiTrans = calculateTransmission(MacroEnums.TransmissionChannel.COMMODITY_TO_INFLATION, oilShock);
testAssert(oilToCpiTrans.channel === MacroEnums.TransmissionChannel.COMMODITY_TO_INFLATION, 'Golden H: Channel verified');
testAssert(oilToCpiTrans.transmittedShock > 0, 'Golden H: Oil surge inflates CPI expectation');

const baselineDCF = { ticker: 'AIRLINE_A', costOfEquity: 0.10, costOfDebt: 0.05, wacc: 0.08, equityValuePerShare: 50.0 };
const valAdj = generateMacroValuationAdjustment(baselineDCF, { riskFreeRate: 0.05, inflationRate: 0.04 });
testAssert(valAdj.adjustedEquityValuePerShare < 50.0, 'Golden H: Equity value compresses under macro rate shock');

// Golden I: Portfolio Long/Short Gross vs Net Macro Risk Attribution
const portPositions = [
  { ticker: 'TECH_LONG', marketValue: 1000000, sensitivities: { RATES: -1.5 } },
  { ticker: 'CYCLICAL_SHORT', marketValue: -400000, sensitivities: { RATES: 0.8 } }
];
const portExpI = calculatePortfolioMacroExposure(portPositions);
testAssert(portExpI.grossPortfolioValue === 1400000, 'Golden I: Gross value is 1.4M');
testAssert(portExpI.netPortfolioValue === 600000, 'Golden I: Net value is 600k');

const portImpactI = calculatePortfolioMacroImpact({ positions: portPositions }, {
  factor: MacroEnums.MacroFactorType.RATES,
  shockMagnitude: 0.50
});
testAssert(portImpactI.classification === 'MODEL_ESTIMATE', 'Golden I: Impact tagged as MODEL_ESTIMATE');
testAssert(portImpactI.totalEstimatedDollarImpact !== 0, 'Golden I: Net dollar impact calculated');

// Golden J: Cryptographic Package Sealing, Verification, & Tamper Detection
const pkgJ = sealMacroPackage({
  tenantId: 'tenant-audit-j',
  asOfDate: '2026-06-30T00:00:00.000Z',
  regime: MacroEnums.MacroRegime.RECESSION,
  metrics: { GDP_YOY: -1.2 }
}, 'compliance-officer-9');
const verifyJ1 = verifyMacroPackage(pkgJ);
testAssert(verifyJ1.isValid === true, 'Golden J: Valid package signature verified');

const tamperedJ = { ...pkgJ, payload: { ...pkgJ.payload, regime: MacroEnums.MacroRegime.EARLY_CYCLE_RECOVERY } };
const verifyJ2 = verifyMacroPackage(tamperedJ);
testAssert(verifyJ2.isValid === false, 'Golden J: Tampered package detected and rejected');

console.log(`[PASS] Suite 12 Macro Golden Traces A-J passed: ${assertionCount} assertions`);
export default { assertionCount };
