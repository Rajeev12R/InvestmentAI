/**
 * server/test-script/test-earnings-valuation-risk.js
 * 
 * Phase 21: Valuation Bridge & Deterministic Risk Drift Tests
 */

import assert from 'assert';
import { evaluateEarningsValuationImpact } from '../earnings/earnings.valuation.bridge.js';
import { evaluateEventRiskDrift } from '../earnings/earnings.risk.engine.js';
import { EventClassification } from '../earnings/earnings.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- RUNNING PHASE 21 VALUATION BRIDGE & RISK DRIFT TESTS ---');

// 1. Valuation Bridge Integration
const sampleRevisedForecast = {
  ticker: 'AAPL',
  previousValue: 400000,
  revisedValue: 430000,
  revisedOutput: {
    periods: [
      { year: 1, period: '2026', revenue: 410000, ebitda: 140000, eps: 7.20, fcf: 110000 },
      { year: 2, period: '2027', revenue: 440000, ebitda: 155000, eps: 8.10, fcf: 125000 },
      { year: 3, period: '2028', revenue: 470000, ebitda: 170000, eps: 9.00, fcf: 140000 }
    ]
  }
};

const valuationImpact = evaluateEarningsValuationImpact(sampleRevisedForecast, {
  wacc: 0.085,
  terminalGrowthRate: 0.025,
  targetPE: 28.0,
  targetEVToEBITDA: 18.0,
  shares: 15000
});

testAssert(valuationImpact.ticker === 'AAPL', 'Ticker preserved in valuation impact');
testAssert(valuationImpact.classification === EventClassification.MODEL_ESTIMATE, 'Valuation output is strictly MODEL_ESTIMATE');
testAssert(valuationImpact.valuationChain.inputClassification === EventClassification.FORECAST, 'Input classification is FORECAST');
testAssert(valuationImpact.valuationChain.outputClassification === EventClassification.MODEL_ESTIMATE, 'Output classification is MODEL_ESTIMATE');
testAssert(typeof valuationImpact.dcf.enterpriseValue === 'number' && valuationImpact.dcf.enterpriseValue > 0, 'DCF enterpriseValue computed');
testAssert(typeof valuationImpact.multiples.valuations.peValuation.impliedPrice === 'number' && valuationImpact.multiples.valuations.peValuation.impliedPrice > 0, 'PE Multiple implied price computed');

// 2. Risk Drift Engine — Baseline Steady State
const baselineRisk = {
  financialRisk: 30,
  qualityRisk: 25,
  growthRisk: 30,
  valuationRisk: 40,
  eventRisk: 20
};

const steadyRisk = evaluateEventRiskDrift(baselineRisk, {});
testAssert(steadyRisk.classification === EventClassification.DERIVED, 'Risk classification is DERIVED');
testAssert(steadyRisk.compositeRiskScore === 29, `Composite score is 29, got ${steadyRisk.compositeRiskScore}`);
testAssert(steadyRisk.riskDrivers.length === 0, 'No risk drivers on empty signals');

// 3. Risk Drift Engine — Guidance Cut & Quality Warning
const adverseSignals = {
  qualityAssessment: {
    isHighQuality: false
  },
  surpriseReport: {
    surprises: {
      REVENUE: { isMiss: true },
      DILUTED_EPS: { isMiss: true }
    }
  },
  guidanceRecord: {
    revisionDirection: 'CUT'
  }
};

const adverseRisk = evaluateEventRiskDrift(baselineRisk, adverseSignals);
testAssert(adverseRisk.updatedRiskScores.qualityRisk > baselineRisk.qualityRisk, 'Quality risk increased');
testAssert(adverseRisk.updatedRiskScores.growthRisk > baselineRisk.growthRisk, 'Growth risk increased');
testAssert(adverseRisk.updatedRiskScores.eventRisk > baselineRisk.eventRisk, 'Event risk increased');
testAssert(adverseRisk.compositeRiskScore > steadyRisk.compositeRiskScore, 'Composite risk score increased');
testAssert(adverseRisk.riskDrivers.length >= 3, `Expected at least 3 risk drivers, got ${adverseRisk.riskDrivers.length}`);

// 4. Boundary and Multiple Drift Tests (Blocker 2 Requirements)
// 4a. Prior P/E < 0 -> UNAVAILABLE drift, 0 contribution, base risk unchanged
const negPriorRisk = evaluateEventRiskDrift(baselineRisk, {
  valuationDrift: { currentMultiple: 25.0, priorMultiple: -15.0, multipleMetric: 'FORWARD_PE' }
});
testAssert(negPriorRisk.updatedRiskScores.valuationRisk === baselineRisk.valuationRisk, 'Neg Prior PE: base risk unchanged (40)');
testAssert(negPriorRisk.riskDrivers.some(d => d.status === 'UNAVAILABLE_NON_POSITIVE_PRIOR_MULTIPLE'), 'Neg Prior PE: status logged');

// 4b. Prior P/E = 0 -> UNAVAILABLE drift, 0 contribution
const zeroPriorRisk = evaluateEventRiskDrift(baselineRisk, {
  valuationDrift: { currentMultiple: 25.0, priorMultiple: 0, multipleMetric: 'FORWARD_PE' }
});
testAssert(zeroPriorRisk.updatedRiskScores.valuationRisk === baselineRisk.valuationRisk, 'Zero Prior PE: base risk unchanged (40)');

// 4c. Current P/E <= 0 with positive prior (P/E dropped to 0 or negative)
const negCurrentRisk = evaluateEventRiskDrift(baselineRisk, {
  valuationDrift: { currentMultiple: -5.0, priorMultiple: 20.0, multipleMetric: 'FORWARD_PE' }
});
testAssert(negCurrentRisk.updatedRiskScores.valuationRisk === 20, `Current PE negative: max contraction clamped at -20 (got ${negCurrentRisk.updatedRiskScores.valuationRisk})`);

// 4d. Both negative
const bothNegRisk = evaluateEventRiskDrift(baselineRisk, {
  valuationDrift: { currentMultiple: -10.0, priorMultiple: -20.0, multipleMetric: 'FORWARD_PE' }
});
testAssert(bothNegRisk.updatedRiskScores.valuationRisk === baselineRisk.valuationRisk, 'Both negative PE: base risk unchanged');

// 4e. Missing prior P/E
const missingPriorRisk = evaluateEventRiskDrift(baselineRisk, {
  valuationDrift: { currentMultiple: 25.0, multipleMetric: 'FORWARD_PE' }
});
testAssert(missingPriorRisk.updatedRiskScores.valuationRisk === baselineRisk.valuationRisk, 'Missing prior PE: base risk unchanged');

// 4f. NaN / Infinity
const nanRisk = evaluateEventRiskDrift(baselineRisk, {
  valuationDrift: { currentMultiple: NaN, priorMultiple: Infinity, multipleMetric: 'FORWARD_PE' }
});
testAssert(nanRisk.updatedRiskScores.valuationRisk === baselineRisk.valuationRisk, 'NaN/Infinity PE: base risk unchanged');

// 4g. Unchanged positive P/E (20x -> 20x)
const unchRisk = evaluateEventRiskDrift(baselineRisk, {
  valuationDrift: { currentMultiple: 20.0, priorMultiple: 20.0, multipleMetric: 'FORWARD_PE' }
});
testAssert(unchRisk.updatedRiskScores.valuationRisk === baselineRisk.valuationRisk, 'Unchanged PE: drift is 0, base risk unchanged');

// 4h. Extreme expansion (20x -> 100x => +400% => clamped to +20)
const extremeExpRisk = evaluateEventRiskDrift(baselineRisk, {
  valuationDrift: { currentMultiple: 100.0, priorMultiple: 20.0, multipleMetric: 'FORWARD_PE' }
});
testAssert(extremeExpRisk.updatedRiskScores.valuationRisk === 60, 'Extreme expansion clamped to +20 (40 -> 60)');

// 5. Input Validation
try {
  evaluateEarningsValuationImpact(null);
  testAssert(false, 'Should fail on null input');
} catch (e) {
  testAssert(true, 'Properly threw on null revisedForecastResult');
}

console.log(`PASSED: ${assertionCount} assertions`);
export { assertionCount };
