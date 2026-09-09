/**
 * Phase 12 — Institutional Attribution, Brinson & Benchmark Intelligence Tests
 * Tests position-level contribution, reconciliation, sector aggregation, Brinson decomposition, and benchmark comparative statistics.
 */

import { attributionEngine } from '../portfolioAnalytics/attribution.engine.js';
import { benchmarkEngine } from '../portfolioAnalytics/benchmark.engine.js';
import { AnalyticsStatus, AttributionEffect } from '../portfolioAnalytics/portfolioAnalytics.types.js';

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

async function runAttributionBrinsonTests() {
    console.log('\n======================================================');
    console.log('PHASE 12 — ATTRIBUTION, BRINSON & BENCHMARK TESTS');
    console.log('======================================================\n');

    // 1. Position Contribution Calculation
    const holdings1 = [
        { ticker: 'AAPL', beginningValue: 50000, endingValue: 55000, dividend: 500, fxReturn: 0, sector: 'Technology', geography: 'US', evidenceId: 'EVID-AAPL' },
        { ticker: 'MSFT', beginningValue: 30000, endingValue: 33000, dividend: 300, fxReturn: 0, sector: 'Technology', geography: 'US', evidenceId: 'EVID-MSFT' },
        { ticker: 'JNJ', beginningValue: 20000, endingValue: 20400, dividend: 200, fxReturn: 0, sector: 'Healthcare', geography: 'US', evidenceId: 'EVID-JNJ' }
    ];
    const attr1 = attributionEngine.calculatePositionAttribution({
        holdings: holdings1,
        cashBeginning: 0,
        cashEnding: 0
    });

    assert(attr1.status === AnalyticsStatus.PASS, 'Position attribution returns PASS for clean portfolio');
    assert(attr1.positions.length === 3, 'Calculates attribution for all 3 positions');
    assert(Math.abs(attr1.positions[0].beginningWeight - 0.50) < 1e-4, 'AAPL beginning weight is 50%');
    assert(Math.abs(attr1.positions[1].beginningWeight - 0.30) < 1e-4, 'MSFT beginning weight is 30%');
    assert(Math.abs(attr1.positions[2].beginningWeight - 0.20) < 1e-4, 'JNJ beginning weight is 20%');
    assert(attr1.positions[0].totalContribution > 0, 'AAPL total contribution is positive');
    assert(attr1.positions[0].dividendContribution > 0, 'AAPL dividend contribution is isolated');

    // 2. Strict Mathematical Reconciliation
    const totalBeginning = 100000;
    const totalEnding = 55000 + 33000 + 20400; // 108400 -> +8.4%
    assert(Math.abs(attr1.calculatedPortfolioReturn - 0.084) < 1e-4, 'Calculated portfolio return is +8.4%');
    assert(Math.abs(attr1.sumOfContributions - 0.084) < 1e-4, 'Sum of contributions equals portfolio return exactly');
    assert(attr1.reconciliationDiff < 0.0001, 'Reconciliation difference is zero (<0.01 bps)');

    // 3. Forced Reconciliation Discrepancy -> CONFLICT (No residual plug)
    const attrTampered = attributionEngine.calculatePositionAttribution({
        holdings: holdings1,
        portfolioReturn: 0.1500, // Fabricated external return differing by 6.6%
        tolerance: 0.0005
    });
    assert(attrTampered.status === AnalyticsStatus.CONFLICT, 'Attribution rejects tampered portfolio return with CONFLICT');
    assert(attrTampered.conflictMessage.includes('RECONCILIATION_MISMATCH'), 'Conflict message explicitly cites mismatch');
    assert(attrTampered.conflictMessage.includes('Residual fabrication is strictly forbidden'), 'Forbids residual fabrication');

    // 4. Cash Contribution Integration
    const attrWithCash = attributionEngine.calculatePositionAttribution({
        holdings: holdings1,
        cashBeginning: 10000,
        cashEnding: 10100 // +1% on cash
    });
    assert(attrWithCash.status === AnalyticsStatus.PASS, 'Attribution accommodates explicit cash drag/yield');
    assert(attrWithCash.cashContribution.beginningWeight > 0, 'Cash beginning weight recorded');
    assert(attrWithCash.cashContribution.totalContribution > 0, 'Cash contribution recorded');

    // 5. Multi-dimensional Aggregation (Sector, Industry, Geography)
    const sectorAgg = attributionEngine.aggregateByDimension({
        positionAttributions: attr1.positions,
        dimension: 'sector'
    });
    assert(sectorAgg.status === AnalyticsStatus.PASS, 'Sector aggregation returns PASS');
    assert(sectorAgg.groups.length === 2, '2 sectors aggregated: Technology and Healthcare');
    const techGroup = sectorAgg.groups.find(g => g.dimensionKey === 'Technology');
    assert(Math.abs(techGroup.beginningWeight - 0.80) < 1e-4, 'Technology sector weight is 80%');
    assert(techGroup.evidenceIds.includes('EVID-AAPL'), 'Underlying security evidence IDs preserved in sector rollup');

    // 6. Unknown Sector Preserved (Never inferred by AI)
    const holdingsUnknown = [
        { ticker: 'XYZ', beginningValue: 10000, endingValue: 11000 }
    ];
    const attrUnknown = attributionEngine.calculatePositionAttribution({ holdings: holdingsUnknown });
    const unknownAgg = attributionEngine.aggregateByDimension({
        positionAttributions: attrUnknown.positions,
        dimension: 'sector'
    });
    assert(unknownAgg.groups[0].dimensionKey === 'UNKNOWN', 'Missing sector metadata remains strictly UNKNOWN');

    // 7. Brinson-Fachler Attribution
    const portfolioSectors = [
        { sector: 'Technology', weight: 0.60, return: 0.15 },
        { sector: 'Healthcare', weight: 0.30, return: 0.05 },
        { sector: 'Energy', weight: 0.10, return: -0.02 }
    ];
    const benchmarkSectors = [
        { sector: 'Technology', weight: 0.30, return: 0.12 },
        { sector: 'Healthcare', weight: 0.40, return: 0.06 },
        { sector: 'Energy', weight: 0.30, return: -0.01 }
    ];
    const brinson = attributionEngine.calculateBrinsonAttribution({
        portfolioSectors,
        benchmarkSectors
    });
    assert(brinson.status === AnalyticsStatus.PASS, 'Brinson-Fachler attribution returns PASS');
    assert(typeof brinson.totalAllocationEffect === 'number', 'Total allocation effect is calculated');
    assert(typeof brinson.totalSelectionEffect === 'number', 'Total selection effect is calculated');
    assert(typeof brinson.totalInteractionEffect === 'number', 'Total interaction effect is calculated');
    assert(brinson.sectorEffects.length === 3, '3 sector breakdown effects computed');
    assert(Math.abs(brinson.totalActiveReturn - brinson.sumOfEffects) < 1e-4, 'Active return matches sum of Allocation + Selection + Interaction');

    // 8. Missing Benchmark Sector weights -> UNAVAILABLE
    const brinsonNoBench = attributionEngine.calculateBrinsonAttribution({
        portfolioSectors,
        benchmarkSectors: null
    });
    assert(brinsonNoBench.status === AnalyticsStatus.UNAVAILABLE, 'Brinson returns UNAVAILABLE when benchmark sector data is missing');

    // 9. Benchmark Intelligence Engine
    const pReturns = [0.01, 0.015, -0.008, 0.02, 0.005, -0.012, 0.018, 0.004, 0.011, -0.003];
    const bReturns = [0.008, 0.012, -0.006, 0.015, 0.003, -0.009, 0.014, 0.002, 0.008, -0.002];
    const benchEval = benchmarkEngine.evaluateBenchmarkComparison({
        portfolioReturns: pReturns,
        benchmarkReturns: bReturns,
        benchmarkSymbol: '^GSPC',
        benchmarkName: 'S&P 500'
    });
    assert(benchEval.status === AnalyticsStatus.PASS, 'Benchmark evaluation returns PASS');
    assert(benchEval.metrics.portfolioAnnualizedReturn > benchEval.metrics.benchmarkAnnualizedReturn, 'Portfolio outperformed benchmark');
    assert(benchEval.metrics.activeAnnualizedReturn > 0, 'Active return is positive');
    assert(benchEval.metrics.trackingError > 0, 'Tracking error is positive');
    assert(benchEval.metrics.informationRatio > 0, 'Information ratio is positive');
    assert(benchEval.metrics.beta > 0, 'Beta is positive');
    assert(typeof benchEval.metrics.alpha === 'number', 'Jensen alpha is calculated');
    assert(benchEval.metrics.upsideCapturePct > 0, 'Upside capture percentage is calculated');
    assert(benchEval.classification === 'OUTPERFORMANCE_RELATIVE_TO_BENCHMARK', 'Classification is OUTPERFORMANCE_RELATIVE_TO_BENCHMARK');

    // 10. Absolute vs Relative Performance Distinction
    // Scenario: Portfolio +14%, Benchmark +18% (Underperformance despite positive absolute return)
    const pUnder = [0.01, 0.01, 0.01, 0.01, 0.01]; // +5.1%
    const bOver = [0.02, 0.02, 0.02, 0.02, 0.02];  // +10.4%
    const benchUnder = benchmarkEngine.evaluateBenchmarkComparison({
        portfolioReturns: pUnder,
        benchmarkReturns: bOver
    });
    assert(benchUnder.metrics.activeAnnualizedReturn < 0, 'Active return is negative when lagging benchmark');
    assert(benchUnder.classification === 'UNDERPERFORMANCE_RELATIVE_TO_BENCHMARK', 'Correctly classified as UNDERPERFORMANCE despite positive absolute return');
    assert(benchUnder.interpretation.portfolioAbsolute === 'POSITIVE', 'Portfolio absolute return recognized as positive');
    assert(benchUnder.interpretation.relativeAssessment.includes('UNDERPERFORMANCE'), 'Relative assessment forbids calling +14% outperformance when benchmark is +18%');

    // 11. Invalid return arrays -> UNAVAILABLE
    const benchMismatch = benchmarkEngine.evaluateBenchmarkComparison({
        portfolioReturns: [0.01, 0.02],
        benchmarkReturns: [0.01]
    });
    assert(benchMismatch.status === AnalyticsStatus.UNAVAILABLE, 'Benchmark comparison rejects mismatched array lengths with UNAVAILABLE');

    console.log(`\n======================================================`);
    console.log(`PHASE 12 ATTRIBUTION & BRINSON: ${passed}/${total} ASSERTIONS PASSED`);
    console.log(`======================================================\n`);
    return { passed, total };
}

if (process.argv[1]?.endsWith('phase12AttributionBrinsonTests.js')) {
    runAttributionBrinsonTests();
}

export { runAttributionBrinsonTests };
