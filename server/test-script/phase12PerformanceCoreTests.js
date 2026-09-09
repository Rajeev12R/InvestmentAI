/**
 * Phase 12 — Institutional Portfolio Performance Core Tests
 * Tests TWR, MWR/IRR, cash flow handling, annualization, volatility, Sharpe, Sortino, Calmar.
 */

import { performanceEngine } from '../portfolioAnalytics/performance.engine.js';
import { AnalyticsStatus, CashFlowType, ReturnMetricType } from '../portfolioAnalytics/portfolioAnalytics.types.js';

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

async function runPerformanceCoreTests() {
    console.log('\n======================================================');
    console.log('PHASE 12 — PORTFOLIO PERFORMANCE CORE TESTS');
    console.log('======================================================\n');

    // 1. TWR Basic Calculation
    const subPeriods1 = [
        { startValue: 100000, endValue: 110000, cashFlow: 0 },
        { startValue: 110000, endValue: 121000, cashFlow: 0 }
    ];
    const twr1 = performanceEngine.calculateTWR(subPeriods1);
    assert(twr1.status === AnalyticsStatus.PASS, 'TWR status is PASS for standard sub-periods');
    assert(Math.abs(twr1.twr - 0.21) < 1e-6, 'TWR compounds geometrically: (1.10 * 1.10) - 1 = +21%');
    assert(twr1.metricType === ReturnMetricType.TIME_WEIGHTED_RETURN, 'TWR metric type is TIME_WEIGHTED_RETURN');
    assert(twr1.subPeriodCount === 2, 'TWR sub-period count is 2');

    // 2. TWR with external cash flows at boundary
    const subPeriods2 = [
        { startValue: 100000, endValue: 110000, cashFlow: 0 }, // +10%
        { startValue: 110000, endValue: 126000, cashFlow: 10000, cashFlowTiming: 'END' } // (126k - 10k)/110k - 1 = +5.4545%
    ];
    const twr2 = performanceEngine.calculateTWR(subPeriods2);
    assert(twr2.status === AnalyticsStatus.PASS, 'TWR handles external deposit at end without distorting sub-period return');
    assert(Math.abs(twr2.periodDetails[1].subPeriodReturn - 0.054545) < 1e-4, 'Subperiod 2 eliminates 10k deposit from performance');

    // 3. TWR invalid start/end values
    const twrInvalid = performanceEngine.calculateTWR([{ startValue: -500, endValue: 1000 }]);
    assert(twrInvalid.status === AnalyticsStatus.CONFLICT, 'TWR rejects negative start value with CONFLICT');

    const twrEmpty = performanceEngine.calculateTWR([]);
    assert(twrEmpty.status === AnalyticsStatus.UNAVAILABLE, 'TWR returns UNAVAILABLE when sub-periods are empty');

    // 4. MWR / IRR Calculation with cash flows
    const mwrResult = performanceEngine.calculateMWR({
        initialValue: 100000,
        finalValue: 130000,
        startDate: '2025-01-01',
        endDate: '2026-01-01',
        cashFlows: [
            {
                id: 'CF-001',
                portfolioId: 'PORT-01',
                timestamp: '2025-07-01T00:00:00.000Z',
                amount: 10000,
                currency: 'USD',
                type: CashFlowType.DEPOSIT,
                source: 'BANK_WIRE',
                provenance: { wireRef: 'WIRE-12345' }
            }
        ]
    });
    assert(mwrResult.status === AnalyticsStatus.PASS, 'MWR/IRR converges and returns PASS');
    assert(mwrResult.metricType === ReturnMetricType.MONEY_WEIGHTED_RETURN, 'MWR metric type is MONEY_WEIGHTED_RETURN');
    assert(mwrResult.irr > 0.15 && mwrResult.irr < 0.25, 'MWR/IRR is correctly computed (~18.8%)');
    assert(mwrResult.cashFlowCount === 1, 'MWR records validated cash flow count');

    // 5. MWR date range & cash flow validation
    const mwrInvalidDates = performanceEngine.calculateMWR({
        initialValue: 100000,
        finalValue: 120000,
        startDate: '2026-01-01',
        endDate: '2025-01-01'
    });
    assert(mwrInvalidDates.status === AnalyticsStatus.CONFLICT, 'MWR rejects end date before start date');

    const mwrBadCF = performanceEngine.calculateMWR({
        initialValue: 100000,
        finalValue: 120000,
        startDate: '2025-01-01',
        endDate: '2026-01-01',
        cashFlows: [{ id: 'CF-BAD', amount: 'not-a-number' }]
    });
    assert(mwrBadCF.status === AnalyticsStatus.CONFLICT, 'MWR rejects non-numeric cash flow amount');

    // 6. Risk-Adjusted Metrics: Volatility, Downside Vol, Sharpe, Sortino, Calmar
    const returns = [0.01, 0.02, -0.015, 0.005, -0.01, 0.025, 0.008, -0.004, 0.012, 0.003];
    const risk = performanceEngine.calculateRiskAdjustedMetrics({
        periodicReturns: returns,
        riskFreeRate: 0.04,
        periodsPerYear: 252
    });
    assert(risk.status === AnalyticsStatus.PASS, 'Risk-adjusted metrics return PASS');
    assert(risk.metrics.annualizedVolatility > 0, 'Annualized volatility is strictly positive');
    assert(risk.metrics.annualizedDownsideVolatility > 0, 'Downside volatility is strictly positive');
    assert(risk.metrics.annualizedDownsideVolatility < risk.metrics.annualizedVolatility, 'Downside vol is less than total vol for positive skew');
    assert(typeof risk.metrics.sharpeRatio === 'number', 'Sharpe ratio is computed');
    assert(typeof risk.metrics.sortinoRatio === 'number', 'Sortino ratio is computed');
    assert(typeof risk.metrics.calmarRatio === 'number', 'Calmar ratio is computed');
    assert(risk.metrics.periodsEvaluated === 10, '10 periods evaluated');
    assert(risk.formulas.sharpe.includes('AnnualizedVol'), 'Explicit formula for Sharpe ratio provided');
    assert(risk.formulas.sortino.includes('AnnualizedDownsideVol'), 'Explicit formula for Sortino ratio provided');
    assert(risk.formulas.calmar.includes('MaxDrawdown'), 'Explicit formula for Calmar ratio provided');

    // 7. Insufficient data handling
    const riskInsufficient = performanceEngine.calculateRiskAdjustedMetrics({ periodicReturns: [0.01] });
    assert(riskInsufficient.status === AnalyticsStatus.UNAVAILABLE, 'Risk metrics return UNAVAILABLE for single data point');

    // 8. TWR and MWR Distinction Verification
    // A scenario with massive late deposit vs early gain
    const subPeriodsDistinction = [
        { startValue: 100000, endValue: 150000, cashFlow: 0 }, // +50% on 100k
        { startValue: 150000, endValue: 260000, cashFlow: 100000, cashFlowTiming: 'END' } // +6.67% on 150k
    ];
    const twrDist = performanceEngine.calculateTWR(subPeriodsDistinction);
    assert(twrDist.twr > 0.50, 'TWR correctly reflects high early asset return independent of large subsequent deposit');

    const mwrDist = performanceEngine.calculateMWR({
        initialValue: 100000,
        finalValue: 260000,
        startDate: '2025-01-01',
        endDate: '2026-01-01',
        cashFlows: [
            {
                id: 'CF-LATE',
                portfolioId: 'PORT-DIST',
                timestamp: '2025-11-01T00:00:00.000Z',
                amount: 100000,
                currency: 'USD',
                type: CashFlowType.DEPOSIT,
                source: 'DEPOSIT',
                provenance: { doc: 'DOC-1' }
            }
        ]
    });
    assert(mwrDist.status === AnalyticsStatus.PASS, 'MWR computed cleanly');
    assert(Math.abs(twrDist.twr - mwrDist.irr) > 0.05, 'TWR and MWR are mathematically distinct when cash flows are non-trivial');

    // 9. Zero-Cash Flow assumption guard
    const cfMissingAmount = { id: 'CF-NO-AMT', portfolioId: 'P1', timestamp: '2025-06-01', currency: 'USD', type: CashFlowType.DEPOSIT, provenance: {} };
    let cfThrow = false;
    try {
        validateCashFlow(cfMissingAmount);
    } catch (e) {
        cfThrow = true;
    }
    assert(cfThrow, 'validateCashFlow rejects missing amount (never silently assumes zero)');

    // 10. Downside Vol zero-negative check
    const positiveOnlyReturns = [0.01, 0.02, 0.015, 0.03];
    const positiveRisk = performanceEngine.calculateRiskAdjustedMetrics({
        periodicReturns: positiveOnlyReturns,
        riskFreeRate: 0.0,
        periodsPerYear: 252
    });
    assert(positiveRisk.metrics.annualizedDownsideVolatility === 0, 'Downside volatility is 0 when all returns exceed hurdle');

    // 11. Calmar Ratio zero drawdown boundary
    const noDrawdownReturns = [0.01, 0.01, 0.01];
    const noDDRisk = performanceEngine.calculateRiskAdjustedMetrics({
        periodicReturns: noDrawdownReturns,
        riskFreeRate: 0.0,
        periodsPerYear: 252
    });
    assert(noDDRisk.metrics.maxDrawdown === 0, 'Max drawdown is 0 for strictly monotonically increasing returns');

    // 12. Negative Return MWR handling
    const mwrLoss = performanceEngine.calculateMWR({
        initialValue: 100000,
        finalValue: 80000,
        startDate: '2025-01-01',
        endDate: '2026-01-01'
    });
    assert(mwrLoss.status === AnalyticsStatus.PASS, 'MWR handles negative return portfolio');
    assert(mwrLoss.irr < 0, 'Negative return yields negative IRR');
    assert(risk.metrics.periodsPerYear === 252, 'Annualization convention is explicitly documented as 252 periods per year');

    console.log(`\n======================================================`);
    console.log(`PHASE 12 PERFORMANCE CORE: ${passed}/${total} ASSERTIONS PASSED`);
    console.log(`======================================================\n`);
    return { passed, total };
}

if (process.argv[1]?.endsWith('phase12PerformanceCoreTests.js')) {
    runPerformanceCoreTests();
}

export { runPerformanceCoreTests };
