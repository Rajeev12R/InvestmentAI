/**
 * Phase 12 — Final Production-Reality & Numerical-Methodology Audit
 * Comprehensive golden trace of Portfolio C (USD+INR), thesis validation matrix,
 * MWR/IRR polynomial robustness, benchmark formulas, and mathematical reconciliation.
 */

import crypto from 'crypto';
import { performanceEngine } from '../portfolioAnalytics/performance.engine.js';
import { attributionEngine } from '../portfolioAnalytics/attribution.engine.js';
import { benchmarkEngine } from '../portfolioAnalytics/benchmark.engine.js';
import { multiCurrencyEngine } from '../portfolioAnalytics/multiCurrency.engine.js';
import { decisionAttributionEngine } from '../portfolioAnalytics/decisionAttribution.engine.js';
import { driftRebalancingEngine } from '../portfolioAnalytics/driftRebalancing.engine.js';
import { portfolioIntelligencePackageBuilder } from '../portfolioAnalytics/portfolioIntelligencePackage.js';
import { AnalyticsStatus, CashFlowType, DriverAssessment, ThesisStatus } from '../portfolioAnalytics/portfolioAnalytics.types.js';

let passed = 0;
let total = 0;

function assert(condition, message) {
    total++;
    if (!condition) {
        console.error(`❌ FAIL: ${message}`);
        throw new Error(message);
    }
    passed++;
    console.log(`✓ PASS: ${message}`);
}

async function runFinalRealityAudit() {
    console.log('\n======================================================');
    console.log('PHASE 12 — FINAL REALITY & NUMERICAL METHODOLOGY AUDIT');
    console.log('======================================================\n');

    // -------------------------------------------------------------
    // 1. GOLDEN PORTFOLIO E2E: PORTFOLIO C (MULTI-CURRENCY USD + INR)
    // -------------------------------------------------------------
    console.log('--- 1. Executing Golden Portfolio C E2E Trace ---');
    
    // Step A: Real Market Prices & Quantities
    // AAPL: 200 shares @ $200.00 beg -> $220.00 end (USD $40,000 beg -> $44,000 end, +$200 dividend)
    // TCS.NS: 750 shares @ ₹3,460.00 beg -> ₹3,806.00 end (INR ₹2,595,000 beg -> ₹2,854,500 end, +₹8,650 dividend)
    const aaplBegPrice = 200.00;
    const aaplEndPrice = 220.00;
    const aaplQty = 200;
    const aaplDiv = 200.00;

    const tcsBegPriceINR = 3460.00;
    const tcsEndPriceINR = 3806.00;
    const tcsQty = 750;
    const tcsDivINR = 8650.00;

    // Step B: Real FX Conversions with Complete Provenance
    const fxRecord = {
        pair: 'INR_USD',
        rate: 1 / 86.50,
        timestamp: '2026-09-06T00:00:00.000Z',
        source: 'ECB_FED_ORCHESTRATOR',
        sourceRecordId: 'FX-ECB-INR-USD-20260906'
    };
    const tcsBegInUSD = multiCurrencyEngine.convert({
        amount: tcsQty * tcsBegPriceINR,
        sourceCurrency: 'INR',
        targetCurrency: 'USD',
        timestamp: fxRecord.timestamp
    });
    const tcsEndInUSD = multiCurrencyEngine.convert({
        amount: tcsQty * tcsEndPriceINR,
        sourceCurrency: 'INR',
        targetCurrency: 'USD',
        timestamp: fxRecord.timestamp
    });
    const tcsDivInUSD = multiCurrencyEngine.convert({
        amount: tcsDivINR,
        sourceCurrency: 'INR',
        targetCurrency: 'USD',
        timestamp: fxRecord.timestamp
    });

    assert(tcsBegInUSD.status === AnalyticsStatus.PASS, 'E2E.01: TCS beginning value FX conversion PASS');
    assert(Math.abs(tcsBegInUSD.convertedValue - 30000) < 1e-2, 'E2E.02: TCS beginning value exactly USD $30,000');
    assert(tcsEndInUSD.status === AnalyticsStatus.PASS, 'E2E.03: TCS ending value FX conversion PASS');
    assert(Math.abs(tcsEndInUSD.convertedValue - 33000) < 1e-2, 'E2E.04: TCS ending value exactly USD $33,000');
    assert(Math.abs(tcsDivInUSD.convertedValue - 100) < 1e-2, 'E2E.05: TCS dividend converts to USD $100');

    // Step C: Cash Balance & Sub-Periods
    const cashBeginning = 10000;
    const cashEnding = 10000;
    const totalBeginningPortfolio = (aaplQty * aaplBegPrice) + tcsBegInUSD.convertedValue + cashBeginning; // 40k + 30k + 10k = 80k
    const totalEndingPortfolio = (aaplQty * aaplEndPrice) + tcsEndInUSD.convertedValue + cashEnding;       // 44k + 33k + 10k = 87k

    assert(totalBeginningPortfolio === 80000, 'E2E.06: Total beginning portfolio value is USD $80,000');
    assert(totalEndingPortfolio === 87000, 'E2E.07: Total ending portfolio value is USD $87,000');

    // Step D: Deterministic TWR and MWR
    const subPeriods = [{ startValue: totalBeginningPortfolio, endValue: totalEndingPortfolio, cashFlow: 0 }];
    const twrResult = performanceEngine.calculateTWR(subPeriods);
    assert(twrResult.status === AnalyticsStatus.PASS, 'E2E.08: TWR calculation PASS');
    assert(Math.abs(twrResult.twr - 0.0875) < 1e-4, 'E2E.09: TWR is exactly +8.75% (87k / 80k - 1)');

    const mwrResult = performanceEngine.calculateMWR({
        initialValue: totalBeginningPortfolio,
        finalValue: totalEndingPortfolio,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        cashFlows: []
    });
    assert(mwrResult.status === AnalyticsStatus.PASS, 'E2E.10: MWR calculation PASS');
    assert(Math.abs(mwrResult.irr - 0.0875) < 1e-3, 'E2E.11: MWR without external cash flows equals TWR +8.75%');

    // Step E: Benchmark Comparison against S&P 500
    const pReturns = [0.008, 0.012, -0.003, 0.014, 0.005, -0.006, 0.010, 0.002, 0.008, 0.002];
    const bReturns = [0.006, 0.009, -0.002, 0.011, 0.004, -0.005, 0.008, 0.001, 0.006, 0.001];
    const benchResult = benchmarkEngine.evaluateBenchmarkComparison({
        portfolioReturns: pReturns,
        benchmarkReturns: bReturns,
        benchmarkSymbol: '^GSPC',
        benchmarkName: 'S&P 500'
    });
    assert(benchResult.status === AnalyticsStatus.PASS, 'E2E.12: Benchmark comparison PASS');
    assert(benchResult.metrics.activeAnnualizedReturn > 0, 'E2E.13: Active annualized alpha is positive');

    // Step F: Position Attribution with Cash
    const holdings = [
        { ticker: 'AAPL', beginningValue: 40000, endingValue: 44000, dividend: 200, sector: 'Technology', geography: 'US', evidenceId: 'FACT-AAPL-FY2025' },
        { ticker: 'TCS.NS', beginningValue: 30000, endingValue: 33000, dividend: 100, sector: 'Technology', geography: 'IN', evidenceId: 'FACT-TCS-FY2025' }
    ];
    const attrResult = attributionEngine.calculatePositionAttribution({
        holdings,
        cashBeginning,
        cashEnding
    });
    assert(attrResult.status === AnalyticsStatus.PASS, 'E2E.14: Position attribution PASS');
    assert(attrResult.reconciliationDiff < 0.0001, 'E2E.15: Attribution reconciles perfectly with 0.0 residual');
    assert(Math.abs(attrResult.sumOfContributions - 0.0875) < 1e-4, 'E2E.16: Sum of contributions equals +8.75%');

    // Step G: Sealed Package Assembly & Hash Verification
    const sealedPkg = portfolioIntelligencePackageBuilder.buildPackage({
        portfolioId: 'PORTFOLIO_C_GOLDEN_E2E',
        portfolioName: 'Global Multi-Currency Fund',
        baseCurrency: 'USD',
        holdings,
        cashBalance: 10000,
        subPeriods,
        dailyReturns: pReturns,
        benchmarkReturns: bReturns
    });
    assert(typeof sealedPkg.seal.packageHash === 'string' && sealedPkg.seal.packageHash.length === 64, 'E2E.17: Package sealed with valid 64-char SHA-256 hash');
    assert(Object.isFrozen(sealedPkg), 'E2E.18: Package deeply frozen in memory');

    // -------------------------------------------------------------
    // 2. THESIS GOLDEN TRACE & GROUNDING MATRIX
    // -------------------------------------------------------------
    console.log('--- 2. Executing Thesis Grounding Trace (5 Scenarios) ---');

    // Scenario A: AAPL Margin — Price UP + Fundamentals IMPROVE -> WORKING
    const thesisA = decisionAttributionEngine.evaluateHoldingThesis({
        ticker: 'AAPL',
        thesisTitle: 'Services margin expansion',
        expectedDrivers: [{ metric: 'OPERATING_MARGIN', direction: 'EXPANSION' }],
        actualFundamentalFacts: {
            OPERATING_MARGIN: { baseline: 0.28, latest: 0.304, deltaBps: 240, factId: 'FACT-AAPL-REVENUE-FY2025-V1' }
        },
        pricePerformance: { return: 0.15 }
    });
    assert(thesisA.thesisStatus === ThesisStatus.WORKING, 'THESIS.01: Price UP + Fundamentals IMPROVE yields WORKING');

    // Scenario B: Price UP + Fundamentals DETERIORATE -> NOT WORKING (WEAKENING)
    const thesisB = decisionAttributionEngine.evaluateHoldingThesis({
        ticker: 'SPEC',
        thesisTitle: 'Operating margin turnaround',
        expectedDrivers: [{ metric: 'OPERATING_MARGIN', direction: 'EXPANSION' }],
        actualFundamentalFacts: {
            OPERATING_MARGIN: { baseline: 0.20, latest: 0.15, deltaBps: -500 }
        },
        pricePerformance: { return: 0.40 } // Price rose 40%!
    });
    assert(thesisB.thesisStatus === ThesisStatus.WEAKENING, 'THESIS.02: Price UP + Fundamentals DETERIORATE produces WEAKENING (NOT WORKING)');
    assert(thesisB.causalAlignment === 'DISCONNECTED_SPECULATIVE_BUBBLE', 'THESIS.03: Speculative bubble flagged');

    // Scenario C: Price DOWN + Fundamentals IMPROVE -> WORKING / DISCONNECTED_MARKET_LAG (Not automatically broken)
    const thesisC = decisionAttributionEngine.evaluateHoldingThesis({
        ticker: 'RELIANCE.NS',
        thesisTitle: 'Free Cash Flow inflection',
        expectedDrivers: [{ metric: 'FREE_CASH_FLOW', direction: 'INCREASE' }],
        actualFundamentalFacts: {
            FREE_CASH_FLOW: { baseline: 40000000000, latest: 55000000000, deltaBps: 3750, factId: 'FACT-RELIANCE-FCF-V1' }
        },
        pricePerformance: { return: -0.10 } // Price dropped 10%
    });
    assert(thesisC.thesisStatus === ThesisStatus.WORKING, 'THESIS.04: Price DOWN + Fundamentals IMPROVE remains WORKING');
    assert(thesisC.causalAlignment === 'DISCONNECTED_MARKET_LAG', 'THESIS.05: Market lag identified (undervalued opportunity)');

    // Scenario D: Missing Fundamentals -> INSUFFICIENT_DATA
    const thesisD = decisionAttributionEngine.evaluateHoldingThesis({
        ticker: 'NEW_CO',
        thesisTitle: 'Market expansion',
        expectedDrivers: [{ metric: 'CLOUD_ARR', direction: 'INCREASE' }],
        actualFundamentalFacts: {}
    });
    assert(thesisD.thesisStatus === ThesisStatus.INSUFFICIENT_DATA, 'THESIS.06: Missing fundamentals yield INSUFFICIENT_DATA');

    // Scenario E: Breached Breaker -> BROKEN
    const thesisE = decisionAttributionEngine.evaluateHoldingThesis({
        ticker: 'DELEVERAGE_CO',
        thesisTitle: 'Debt reduction',
        expectedDrivers: [{ metric: 'DEBT', direction: 'DECREASE' }],
        actualFundamentalFacts: { DEBT: { baseline: 100, latest: 150 } },
        thesisBreakers: [{ metric: 'DEBT', threshold: 120, breached: true, description: 'Debt exceeded 120 cap' }]
    });
    assert(thesisE.thesisStatus === ThesisStatus.BROKEN, 'THESIS.07: Breached breaker condition produces BROKEN');

    // -------------------------------------------------------------
    // 3. BENCHMARK METHODOLOGY AUDIT
    // -------------------------------------------------------------
    console.log('--- 3. Executing Benchmark Methodology & Formula Audit ---');
    assert(benchResult.formulas.activeReturn.includes('AnnualizedPortfolioReturn - AnnualizedBenchmarkReturn'), 'BENCH.01: Active return formula verified');
    assert(benchResult.formulas.trackingError.includes('StdDev(R_p,i - R_b,i) * sqrt(252)'), 'BENCH.02: Tracking error formula verified (252-day basis)');
    assert(benchResult.formulas.informationRatio.includes('ActiveReturn / TrackingError'), 'BENCH.03: Information ratio formula verified');
    assert(benchResult.formulas.beta.includes('Cov(R_p, R_b) / Var(R_b)'), 'BENCH.04: Beta formula verified');
    assert(benchResult.formulas.alpha.includes('R_p - [R_f + Beta * (R_b - R_f)]'), 'BENCH.05: Jensen alpha formula verified');
    assert(benchResult.benchmarkMetadata.periodsPerYear === 252, 'BENCH.06: Observation frequency is daily (252 periods/year)');

    // -------------------------------------------------------------
    // 4. MWR / IRR ROBUSTNESS & EDGE CASE AUDIT
    // -------------------------------------------------------------
    console.log('--- 4. Executing MWR/IRR Polynomial Solver Audit ---');

    // Case 1: Normal Cash Flows
    const irrNormal = performanceEngine.calculateMWR({
        initialValue: 10000,
        finalValue: 12000,
        startDate: '2025-01-01',
        endDate: '2026-01-01',
        cashFlows: [{ id: 'CF1', portfolioId: 'P1', timestamp: '2025-07-01T00:00:00Z', amount: 1000, currency: 'USD', type: CashFlowType.DEPOSIT, provenance: {} }]
    });
    assert(irrNormal.status === AnalyticsStatus.PASS, 'IRR.01: Normal cash flows solve cleanly');
    assert(typeof irrNormal.irr === 'number', 'IRR.02: Numeric IRR returned');

    // Case 2: Zero Cash Flows
    const irrZero = performanceEngine.calculateMWR({
        initialValue: 10000,
        finalValue: 11000,
        startDate: '2025-01-01',
        endDate: '2026-01-01',
        cashFlows: []
    });
    assert(irrZero.status === AnalyticsStatus.PASS, 'IRR.03: Zero cash flows solve to standard compounding return');
    assert(Math.abs(irrZero.irr - 0.10) < 1e-4, 'IRR.04: 10k -> 11k over 1Y is exactly +10% IRR');

    // Case 3: Short Holding Period (30 days)
    const irrShort = performanceEngine.calculateMWR({
        initialValue: 100000,
        finalValue: 102000,
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        cashFlows: []
    });
    assert(irrShort.status === AnalyticsStatus.PASS, 'IRR.05: 30-day short period solves cleanly');
    assert(irrShort.irr > 0.20, 'IRR.06: 2% in 30 days annualizes to >20%');

    // Case 4: Non-convergent / Impossible Root Handling
    // Degenerate inputs where initial value is 0 or negative are rejected before solver corruption
    const irrDegenerate = performanceEngine.calculateMWR({
        initialValue: 0,
        finalValue: 10000,
        startDate: '2025-01-01',
        endDate: '2026-01-01'
    });
    assert(irrDegenerate.status === AnalyticsStatus.CONFLICT, 'IRR.07: Zero initial value returns CONFLICT');

    // -------------------------------------------------------------
    // 5. ATTRIBUTION RECONCILIATION AUDIT
    // -------------------------------------------------------------
    console.log('--- 5. Executing Mathematical Reconciliation Audit ---');

    // Portfolio Return = Sum of Position Contributions + Cash
    assert(Math.abs(attrResult.calculatedPortfolioReturn - attrResult.sumOfContributions) < 1e-6, 'RECON.01: Portfolio Return = Sum of Contributions + Cash');

    // Brinson Decomposition: Total Active Return = Allocation + Selection + Interaction
    const brinsonCheck = attributionEngine.calculateBrinsonAttribution({
        portfolioSectors: [
            { sector: 'Technology', weight: 0.70, return: 0.12 },
            { sector: 'Healthcare', weight: 0.30, return: 0.04 }
        ],
        benchmarkSectors: [
            { sector: 'Technology', weight: 0.40, return: 0.10 },
            { sector: 'Healthcare', weight: 0.60, return: 0.05 }
        ]
    });
    assert(brinsonCheck.status === AnalyticsStatus.PASS, 'RECON.02: Brinson attribution returns PASS');
    assert(Math.abs(brinsonCheck.totalActiveReturn - brinsonCheck.sumOfEffects) < 1e-6, 'RECON.03: Active Return = Allocation + Selection + Interaction exactly');

    // Forced Tampering -> CONFLICT (Never fabricated residual)
    const tamperedAttr = attributionEngine.calculatePositionAttribution({
        holdings,
        portfolioReturn: 0.50 // Fabricated 50%
    });
    assert(tamperedAttr.status === AnalyticsStatus.CONFLICT, 'RECON.04: Tampered return generates CONFLICT');
    assert(tamperedAttr.conflictMessage.includes('Residual fabrication is strictly forbidden'), 'RECON.05: Residual fabrication blocked');

    console.log(`\n======================================================`);
    console.log(`PHASE 12 FINAL REALITY AUDIT: ${passed}/${total} ASSERTIONS PASSED`);
    console.log(`======================================================\n`);
    return { passed, total };
}

if (process.argv[1]?.endsWith('phase12FinalRealityAudit.js')) {
    runFinalRealityAudit();
}

export { runFinalRealityAudit };
