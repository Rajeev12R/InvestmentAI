import { evaluateInvestorFit } from '../decision/investorFit.engine.js';
import { calculateConviction } from '../decision/conviction.engine.js';
import { buildDecisionEvidenceGraph } from '../decision/decisionEvidence.engine.js';
import { makeInvestmentDecision } from '../decision/decision.engine.js';

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

console.log('=== PHASE 3 DECISION & INVESTOR FIT SUITE ===\n');

// Test 1: Undervalued + Low Risk -> BUY
console.log('1. Deterministic Decision Matrix - Clear Buy');
const buyDecision = makeInvestmentDecision({
  valuation: {
    valuationSummary: {
      valuationStatus: 'UNDERVALUED',
      currentPrice: 100,
      compositeFairValue: 140,
      marginOfSafetyPct: 28.5
    },
    modelAgreement: { status: 'COMPLETE', modelsEvaluated: ['DCF', 'RELATIVE'], dispersion: 'LOW' }
  },
  riskProfile: {
    overallRiskLevel: 'LOW',
    criticalFlags: [],
    categoryBreakdowns: {
      DATA_QUALITY: { metrics: { dataCoverageRatio: 0.90 } },
      MARKET: { severity: 'LOW', metrics: { beta: 0.9 } },
      FINANCIAL: { severity: 'LOW', metrics: { netDebtToEbitda: 1.0 } }
    }
  },
  investorProfile: 'BALANCED_VALUE'
});

assert(buyDecision.decision === 'BUY', `Decision is BUY for undervalued asset with low risk (actual: ${buyDecision.decision})`);
assert(buyDecision.convictionLevel === 'HIGH', `Conviction is HIGH with multi-model agreement & high coverage (actual: ${buyDecision.convictionLevel})`);
assert(buyDecision.whatCouldChangeThisDecision.length > 0, 'Falsification triggers populated for BUY decision');

// Test 2: Conflicting Signals: Undervalued + HIGH Risk -> WATCH with Tradeoff
console.log('\n2. Conflicting Signals - Undervalued with High Risk');
const conflictDecision = makeInvestmentDecision({
  valuation: {
    valuationSummary: {
      valuationStatus: 'UNDERVALUED',
      currentPrice: 50,
      compositeFairValue: 80,
      marginOfSafetyPct: 37.5
    },
    modelAgreement: { status: 'COMPLETE', modelsEvaluated: ['DCF'], dispersion: 'MODERATE' }
  },
  riskProfile: {
    overallRiskLevel: 'HIGH',
    criticalFlags: [],
    categoryBreakdowns: {
      DATA_QUALITY: { metrics: { dataCoverageRatio: 0.70 } },
      MARKET: { severity: 'HIGH', metrics: { beta: 1.8 } },
      FINANCIAL: { severity: 'HIGH', metrics: { netDebtToEbitda: 4.5 } }
    }
  },
  investorProfile: 'BALANCED_VALUE'
});

assert(conflictDecision.decision === 'WATCH', `Decision is WATCH when valuation is undervalued but risk is HIGH (actual: ${conflictDecision.decision})`);
assert(conflictDecision.keyTradeoffs.length > 0, 'Explicit tradeoff documented between discount and risk');

// Test 3: Critical Risk Override -> AVOID
console.log('\n3. Critical Risk Override');
const criticalDecision = makeInvestmentDecision({
  valuation: {
    valuationSummary: {
      valuationStatus: 'UNDERVALUED',
      currentPrice: 20,
      compositeFairValue: 50,
      marginOfSafetyPct: 60.0
    }
  },
  riskProfile: {
    overallRiskLevel: 'CRITICAL',
    criticalFlags: ['CRITICAL_LEVERAGE', 'CASH_FLOW_DIVERGENCE'],
    categoryBreakdowns: {}
  },
  investorProfile: 'BALANCED_VALUE'
});

assert(criticalDecision.decision === 'AVOID', `Decision is AVOID when critical risk flags present regardless of valuation (actual: ${criticalDecision.decision})`);

// Test 4: Investor Fit Sensitivity
console.log('\n4. Investor Fit Sensitivity');
const consFit = evaluateInvestorFit({
  investorProfile: 'CONSERVATIVE_INCOME',
  valuation: { valuationSummary: { valuationStatus: 'FAIRLY_VALUED' } },
  riskProfile: {
    overallRiskLevel: 'HIGH',
    categoryBreakdowns: {
      MARKET: { metrics: { beta: 1.6 } },
      FINANCIAL: { metrics: { netDebtToEbitda: 3.5 } }
    }
  }
});
assert(consFit.fitStatus === 'LOW_FIT' || consFit.fitStatus === 'MISALIGNED', 'Conservative profile rejects high risk and elevated beta');
assert(consFit.misalignments.length >= 2, 'Misalignment reasons listed');

// Test 5: Traceable Evidence Graph
console.log('\n5. Evidence Graph Traceability');
const graph = buildDecisionEvidenceGraph({
  decision: 'BUY',
  valuation: {
    valuationSummary: {
      compositeFairValue: 150,
      currentPrice: 110,
      valuationStatus: 'UNDERVALUED',
      marginOfSafetyPct: 26.7
    },
    modelAgreement: { modelsEvaluated: ['DCF', 'RELATIVE'] }
  },
  riskProfile: {
    categoryBreakdowns: {
      FINANCIAL: { severity: 'LOW', metrics: { netDebtToEbitda: 0.8 }, flags: [] }
    }
  },
  financialFacts: {
    freeCashFlow: { value: 100000000, type: 'GROUNDED', source: 'SEC_10K' },
    totalDebt: { value: 20000000, type: 'GROUNDED', source: 'SEC_10K' }
  }
});

assert(graph.length >= 3, `Evidence graph has multiple nodes (actual: ${graph.length})`);
assert(graph.some(n => n.category === 'VALUATION'), 'Valuation evidence node present');
assert(graph.some(n => n.category === 'GROUNDED_FACT'), 'Grounded fact evidence nodes present');

console.log(`\n========================================`);
console.log(`Phase 3 Decision Tests: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
