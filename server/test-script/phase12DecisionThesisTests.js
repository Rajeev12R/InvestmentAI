/**
 * Phase 12 — Decision Attribution, Thesis Tracking & Sealed Package Tests
 * Tests decision attribution, thesis status determination against Phase 11 Truth Facts,
 * drawdown state dynamics, Attention triggers, and immutable SHA-256 sealed packages.
 */

import crypto from 'crypto';
import { decisionAttributionEngine } from '../portfolioAnalytics/decisionAttribution.engine.js';
import { drawdownEngine } from '../portfolioAnalytics/drawdown.engine.js';
import { portfolioIntelligencePackageBuilder } from '../portfolioAnalytics/portfolioIntelligencePackage.js';
import { AnalyticsStatus, DrawdownEvent, DriverAssessment, ThesisStatus } from '../portfolioAnalytics/portfolioAnalytics.types.js';

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

async function runDecisionThesisTests() {
    console.log('\n======================================================');
    console.log('PHASE 12 — DECISION, THESIS & SEALS TESTS');
    console.log('======================================================\n');

    // 1. Thesis Evaluation — WORKING (Empirically Supported Fundamental Drivers)
    const thesisWorking = decisionAttributionEngine.evaluateHoldingThesis({
        ticker: 'AAPL',
        decisionId: 'DEC-AAPL-01',
        thesisTitle: 'Services margin expansion & AI monetization',
        expectedDrivers: [
            { metric: 'OPERATING_MARGIN', direction: 'EXPANSION', minDeltaBps: 100 },
            { metric: 'SERVICES_REVENUE_GROWTH', direction: 'ACCELERATION', minDeltaBps: 200 }
        ],
        actualFundamentalFacts: {
            OPERATING_MARGIN: { baseline: 0.28, latest: 0.304, deltaBps: 240, factId: 'FACT-AAPL-MARGIN-V1' },
            SERVICES_REVENUE_GROWTH: { baseline: 0.12, latest: 0.155, deltaBps: 350, factId: 'FACT-AAPL-SRV-V1' }
        },
        pricePerformance: { return: 0.18, durationDays: 180 }
    });

    assert(thesisWorking.status === AnalyticsStatus.PASS, 'Thesis evaluation returns PASS');
    assert(thesisWorking.thesisStatus === ThesisStatus.WORKING, 'Thesis status is WORKING when all drivers are supported');
    assert(thesisWorking.driverEvaluations.length === 2, '2 driver evaluations produced');
    assert(thesisWorking.driverEvaluations[0].assessment === DriverAssessment.SUPPORTED, 'Operating margin expansion is SUPPORTED');
    assert(thesisWorking.driverEvaluations[0].evidenceFactId === 'FACT-AAPL-MARGIN-V1', 'Driver links to Phase 11 Fact ID');
    assert(thesisWorking.causalAlignment === 'ALIGNED', 'Causal alignment is ALIGNED (fundamentals improved + price rose)');

    // 2. Thesis Evaluation — WEAKENING (Contradicted by Real Facts despite Price Gain)
    // CRITICAL SECURITY INVARIANT: Price increase alone NEVER yields WORKING status
    const thesisWeakening = decisionAttributionEngine.evaluateHoldingThesis({
        ticker: 'SPEC',
        decisionId: 'DEC-SPEC-01',
        thesisTitle: 'Margin expansion and deleveraging',
        expectedDrivers: [
            { metric: 'OPERATING_MARGIN', direction: 'EXPANSION' },
            { metric: 'DEBT_TO_EBITDA', direction: 'DELEVERAGING' }
        ],
        actualFundamentalFacts: {
            OPERATING_MARGIN: { baseline: 0.20, latest: 0.16, deltaBps: -400, factId: 'FACT-SPEC-MARGIN-V1' },
            DEBT_TO_EBITDA: { baseline: 2.5, latest: 3.2, deltaBps: 700, factId: 'FACT-SPEC-DEBT-V1' }
        },
        pricePerformance: { return: 0.35, durationDays: 90 } // Price rose 35%!
    });

    assert(thesisWeakening.thesisStatus === ThesisStatus.WEAKENING, 'Thesis status is WEAKENING despite +35% stock rally because fundamentals deteriorated');
    assert(thesisWeakening.causalAlignment === 'DISCONNECTED_SPECULATIVE_BUBBLE', 'Identified as DISCONNECTED_SPECULATIVE_BUBBLE');
    assert(thesisWeakening.decisionImpactRecommendation === 'RECOMMEND_POSITION_SIZE_REVIEW', 'Recommends position size review');

    // 3. Thesis Evaluation — BROKEN (Breaker Condition Breached)
    const thesisBroken = decisionAttributionEngine.evaluateHoldingThesis({
        ticker: 'TECH_CORP',
        decisionId: 'DEC-TECH-01',
        thesisTitle: 'Hypergrowth Cloud expansion',
        expectedDrivers: [{ metric: 'REVENUE_GROWTH', direction: 'INCREASE' }],
        actualFundamentalFacts: {
            REVENUE_GROWTH: { baseline: 0.30, latest: -0.05, factId: 'FACT-TECH-REV-V1' }
        },
        pricePerformance: { return: -0.25 },
        thesisBreakers: [{ metric: 'REVENUE_GROWTH', threshold: -0.01, breached: true, description: 'Growth turning negative' }]
    });

    assert(thesisBroken.thesisStatus === ThesisStatus.BROKEN, 'Thesis with breached breaker condition is marked BROKEN');
    assert(thesisBroken.decisionImpactRecommendation === 'RECOMMEND_FORMAL_DECISION_REVIEW_EXIT', 'Recommends formal decision review exit for broken thesis');

    // 4. Thesis Evaluation — INSUFFICIENT_DATA
    const thesisNoData = decisionAttributionEngine.evaluateHoldingThesis({
        ticker: 'NEW_IPO',
        decisionId: 'DEC-IPO-01',
        thesisTitle: 'Market disruption',
        expectedDrivers: [{ metric: 'PATENT_APPROVALS', direction: 'INCREASE' }],
        actualFundamentalFacts: {}
    });

    assert(thesisNoData.thesisStatus === ThesisStatus.INSUFFICIENT_DATA, 'Missing facts result in INSUFFICIENT_DATA');
    assert(thesisNoData.driverEvaluations[0].assessment === DriverAssessment.INSUFFICIENT_EVIDENCE, 'Driver assessment is INSUFFICIENT_EVIDENCE');

    // 5. Drawdown Intelligence & State Machine
    const ddSeries = [
        { date: '2026-01-01', value: 100000 },
        { date: '2026-01-02', value: 105000 }, // Peak 105k
        { date: '2026-01-03', value: 98000 },  // Drawdown 6.67%
        { date: '2026-01-04', value: 92000 },  // Max Drawdown 12.38% (Material > 10%)
        { date: '2026-01-05', value: 101000 }, // Recovery in progress
        { date: '2026-01-06', value: 108000 }  // New High! Peak 108k
    ];

    const ddResult = drawdownEngine.analyzeDrawdownSeries(ddSeries);
    assert(ddResult.status === AnalyticsStatus.PASS, 'Drawdown analysis returns PASS');
    assert(Math.abs(ddResult.maxDrawdown - (105000 - 92000) / 105000) < 1e-4, 'Max drawdown correctly calculated as 12.38%');
    assert(ddResult.stateEvent === DrawdownEvent.NEW_HIGH, 'Latest point at 108k triggers NEW_HIGH state transition');
    assert(ddResult.isMaterial === true, '12.38% drawdown flagged as material');
    assert(ddResult.historicalDrawdowns.length === 1, '1 fully resolved historical drawdown tracked');
    assert(ddResult.historicalDrawdowns[0].status === 'RECOVERED', 'Historical drawdown marked as RECOVERED');

    // 6. Drawdown In-Progress
    const ddInProgressSeries = [
        { date: '2026-01-01', value: 100000 },
        { date: '2026-01-02', value: 110000 },
        { date: '2026-01-03', value: 100000 } // -9.09% in progress
    ];
    const ddInProgress = drawdownEngine.analyzeDrawdownSeries(ddInProgressSeries);
    assert(ddInProgress.currentDrawdown > 0, 'Current drawdown is positive');
    assert(ddInProgress.historicalDrawdowns[0].status === 'IN_PROGRESS', 'Unrecovered drawdown marked as IN_PROGRESS');

    // 7. Sealed PortfolioIntelligencePackage Building & Cryptographic Verification
    const sealedPkg = portfolioIntelligencePackageBuilder.buildPackage({
        portfolioId: 'PORT-INSTITUTIONAL-01',
        portfolioName: 'Global Leaders Fund',
        baseCurrency: 'USD',
        holdings: [
            { ticker: 'AAPL', beginningValue: 50000, endingValue: 55000, dividend: 500, sector: 'Technology', geography: 'US', beta: 1.15, volatility: 0.22 },
            { ticker: 'MSFT', beginningValue: 50000, endingValue: 52000, dividend: 400, sector: 'Technology', geography: 'US', beta: 1.05, volatility: 0.20 }
        ],
        cashBalance: 5000,
        subPeriods: [
            { startValue: 105000, endValue: 112000, cashFlow: 0 }
        ],
        dailyReturns: [0.005, 0.008, -0.003, 0.012, 0.004, -0.006, 0.009, 0.002, 0.007, 0.001],
        benchmarkReturns: [0.004, 0.006, -0.002, 0.009, 0.003, -0.004, 0.007, 0.001, 0.005, 0.002],
        theses: [
            {
                ticker: 'AAPL',
                decisionId: 'DEC-AAPL-01',
                thesisTitle: 'Services growth',
                expectedDrivers: [{ metric: 'OPERATING_MARGIN', direction: 'EXPANSION' }],
                actualFundamentalFacts: {
                    OPERATING_MARGIN: { baseline: 0.28, latest: 0.30, deltaBps: 200 }
                },
                pricePerformance: { return: 0.10 }
            }
        ]
    });

    assert(sealedPkg.packageId.startsWith('PIP-PORT-INSTITUTIONAL-01'), 'Package ID conforms to standard schema');
    assert(sealedPkg.seal.algorithm === 'SHA-256', 'Package seal algorithm is SHA-256');
    assert(typeof sealedPkg.seal.packageHash === 'string' && sealedPkg.seal.packageHash.length === 64, 'Valid 64-char SHA-256 package hash');
    assert(sealedPkg.seal.immutable === true, 'Package marked immutable');
    assert(sealedPkg.governance.aiExecutionBlocked === true, 'Governance policy blocks automated AI trade execution');

    // 8. Runtime Immutability Verification (deepFreeze)
    let mutationBlocked = false;
    try {
        sealedPkg.performance.timeWeightedReturn.twr = 0.9999; // Attempt malicious mutation
    } catch (e) {
        mutationBlocked = true;
    }
    assert(mutationBlocked || sealedPkg.performance.timeWeightedReturn.twr !== 0.9999, 'Runtime deepFreeze prevents in-memory mutation of sealed package');

    // 9. Recomputed Hash Integrity Verification
    const payloadWithoutSeal = { ...sealedPkg };
    delete payloadWithoutSeal.seal;
    const recomputedHash = crypto.createHash('sha256').update(JSON.stringify(payloadWithoutSeal)).digest('hex');
    assert(recomputedHash === sealedPkg.seal.packageHash, 'Cryptographic digest is exactly reproducible from raw payload');

    // 10. Multi-Thesis Mixed Status
    const thesisMixed = decisionAttributionEngine.evaluateHoldingThesis({
        ticker: 'MIX_CORP',
        decisionId: 'DEC-MIX-01',
        thesisTitle: 'Dual engine growth',
        expectedDrivers: [
            { metric: 'REV_GROWTH', direction: 'EXPANSION' },
            { metric: 'MARGIN', direction: 'EXPANSION' }
        ],
        actualFundamentalFacts: {
            REV_GROWTH: { baseline: 0.10, latest: 0.15 },
            MARGIN: { baseline: 0.20, latest: 0.18 }
        },
        pricePerformance: { return: 0.05 }
    });
    assert(thesisMixed.thesisStatus === ThesisStatus.MIXED, 'Mixed driver realization results in MIXED thesis status');

    // 11. Additional Decision & Evaluation Invariants
    const thesisPartiallySupported = decisionAttributionEngine.evaluateHoldingThesis({
        ticker: 'SEMI',
        thesisTitle: 'Capacity ramp',
        expectedDrivers: [
            { metric: 'CAPEX', direction: 'INCREASE' },
            { metric: 'FREE_CASH_FLOW', direction: 'INCREASE' }
        ],
        actualFundamentalFacts: {
            CAPEX: { baseline: 100, latest: 120 }
        }
    });
    assert(thesisPartiallySupported.status === AnalyticsStatus.PASS, 'Thesis with partial facts evaluates cleanly');
    assert(thesisPartiallySupported.thesisStatus === ThesisStatus.WORKING, 'Supported driver with pending driver retains WORKING state until contradicted');

    // 12. Missing Ticker/Thesis title validation
    const thesisMissingParams = decisionAttributionEngine.evaluateHoldingThesis({});
    assert(thesisMissingParams.status === AnalyticsStatus.UNAVAILABLE, 'Missing ticker/thesis title returns UNAVAILABLE');

    // 13. Factor Risk Exposure Integration
    assert(sealedPkg.factorExposures.status === AnalyticsStatus.PASS, 'Factor exposures computed in sealed package');
    assert(sealedPkg.factorExposures.portfolioExposures.portfolioBeta > 0, 'Portfolio beta is positive in sealed package');
    assert(sealedPkg.factorExposures.portfolioExposures.concentrationHHI > 0, 'Concentration HHI is positive in sealed package');
    assert(sealedPkg.governance.humanApprovalBoundary === true, 'Governance explicitly flags humanApprovalBoundary: true');

    console.log(`\n======================================================`);
    console.log(`PHASE 12 DECISION, THESIS & SEALS: ${passed}/${total} ASSERTIONS PASSED`);
    console.log(`======================================================\n`);
    return { passed, total };
}

if (process.argv[1]?.endsWith('phase12DecisionThesisTests.js')) {
    runDecisionThesisTests();
}

export { runDecisionThesisTests };
