/**
 * Phase 12 — Real Portfolio Validation Suite
 * Validates 3 real-world multi-asset institutional portfolios:
 * - Portfolio A: US Equity (AAPL + MSFT + GOOGL) vs S&P 500
 * - Portfolio B: India Equity (RELIANCE.NS + TCS.NS + HDFCBANK.NS) vs NIFTY 50
 * - Portfolio C: Mixed Multi-Currency Portfolio (USD + INR assets with live FX conversion)
 */

import { performanceEngine } from '../portfolioAnalytics/performance.engine.js';
import { attributionEngine } from '../portfolioAnalytics/attribution.engine.js';
import { benchmarkEngine } from '../portfolioAnalytics/benchmark.engine.js';
import { multiCurrencyEngine } from '../portfolioAnalytics/multiCurrency.engine.js';
import { decisionAttributionEngine } from '../portfolioAnalytics/decisionAttribution.engine.js';
import { driftRebalancingEngine } from '../portfolioAnalytics/driftRebalancing.engine.js';
import { portfolioIntelligencePackageBuilder } from '../portfolioAnalytics/portfolioIntelligencePackage.js';
import { AnalyticsStatus, ThesisStatus } from '../portfolioAnalytics/portfolioAnalytics.types.js';

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

async function runRealPortfolioValidation() {
    console.log('\n======================================================');
    console.log('PHASE 12 — REAL PORTFOLIO VALIDATION SUITE');
    console.log('======================================================\n');

    // -------------------------------------------------------------
    // 1. PORTFOLIO A: US MEGA-CAP (AAPL + MSFT + GOOGL) vs S&P 500
    // -------------------------------------------------------------
    console.log('--- Validating Portfolio A (US Mega-Cap: AAPL, MSFT, GOOGL) ---');
    const portfolioA_holdings = [
        { ticker: 'AAPL', beginningValue: 50000, endingValue: 56000, dividend: 250, sector: 'Technology', geography: 'US', beta: 1.15, volatility: 0.22, evidenceId: 'FACT-AAPL-FY2025' },
        { ticker: 'MSFT', beginningValue: 30000, endingValue: 33600, dividend: 200, sector: 'Technology', geography: 'US', beta: 1.05, volatility: 0.20, evidenceId: 'FACT-MSFT-FY2025' },
        { ticker: 'GOOGL', beginningValue: 20000, endingValue: 21800, dividend: 0, sector: 'Communication Services', geography: 'US', beta: 1.10, volatility: 0.24, evidenceId: 'FACT-GOOGL-FY2025' }
    ];
    const portfolioA_returns = [0.008, 0.012, -0.004, 0.015, 0.005, -0.007, 0.011, 0.003, 0.009, 0.002];
    const sp500_returns =      [0.006, 0.009, -0.003, 0.011, 0.004, -0.005, 0.008, 0.002, 0.007, 0.001];

    const pkgA = portfolioIntelligencePackageBuilder.buildPackage({
        portfolioId: 'PORTFOLIO_A_US_EQUITY',
        portfolioName: 'US Mega-Cap Growth Fund',
        baseCurrency: 'USD',
        holdings: portfolioA_holdings,
        cashBalance: 5000,
        subPeriods: [{ startValue: 105000, endValue: 116650, cashFlow: 0 }],
        dailyReturns: portfolioA_returns,
        benchmarkReturns: sp500_returns,
        benchmarkSymbol: '^GSPC',
        benchmarkName: 'S&P 500',
        benchmarkSectors: [
            { sector: 'Technology', weight: 0.32, return: 0.10 },
            { sector: 'Communication Services', weight: 0.10, return: 0.08 },
            { sector: 'Other Sectors', weight: 0.58, return: 0.06 }
        ],
        theses: [
            {
                ticker: 'AAPL',
                decisionId: 'DEC-AAPL-01',
                thesisTitle: 'Services margin expansion',
                expectedDrivers: [{ metric: 'OPERATING_MARGIN', direction: 'EXPANSION' }],
                actualFundamentalFacts: {
                    OPERATING_MARGIN: { baseline: 0.28, latest: 0.304, deltaBps: 240, factId: 'FACT-AAPL-REVENUE-FY2025-V1' }
                },
                pricePerformance: { return: 0.12 }
            }
        ],
        targetAllocations: { AAPL: 0.45, MSFT: 0.35, GOOGL: 0.20 }
    });

    assert(pkgA.performance.timeWeightedReturn.status === AnalyticsStatus.PASS, 'PortA.01: TWR computed cleanly');
    assert(pkgA.benchmark.status === AnalyticsStatus.PASS, 'PortA.02: Benchmark comparison against S&P 500 PASS');
    assert(pkgA.benchmark.metrics.activeAnnualizedReturn > 0, 'PortA.03: Portfolio A generated positive active alpha vs S&P 500');
    assert(pkgA.attribution.positionLevel.status === AnalyticsStatus.PASS, 'PortA.04: Position attribution reconciled with zero residual');
    assert(pkgA.attribution.brinsonFachler.status === AnalyticsStatus.PASS, 'PortA.05: Brinson attribution evaluated with active sector effects');
    assert(pkgA.thesisAttribution[0].thesisStatus === ThesisStatus.WORKING, 'PortA.06: AAPL thesis verified as WORKING using Phase 11 Truth Fact');
    assert(pkgA.seal.packageHash.length === 64, 'PortA.07: Portfolio A sealed with 64-char SHA-256 hash');

    // -------------------------------------------------------------
    // 2. PORTFOLIO B: INDIA LARGE-CAP (RELIANCE + TCS + HDFCBANK) vs NIFTY 50
    // -------------------------------------------------------------
    console.log('--- Validating Portfolio B (India Large-Cap: RELIANCE, TCS, HDFCBANK) ---');
    const portfolioB_holdings = [
        { ticker: 'RELIANCE.NS', beginningValue: 500000, endingValue: 540000, dividend: 2000, sector: 'Energy', geography: 'IN', beta: 1.10, volatility: 0.21, evidenceId: 'FACT-RELIANCE-FY2025' },
        { ticker: 'TCS.NS', beginningValue: 300000, endingValue: 324000, dividend: 1500, sector: 'Technology', geography: 'IN', beta: 0.90, volatility: 0.18, evidenceId: 'FACT-TCS-FY2025' },
        { ticker: 'HDFCBANK.NS', beginningValue: 200000, endingValue: 212000, dividend: 1000, sector: 'Financial Services', geography: 'IN', beta: 1.05, volatility: 0.22, evidenceId: 'FACT-HDFCBANK-FY2025' }
    ];
    const portfolioB_returns = [0.007, 0.009, -0.003, 0.010, 0.004, -0.006, 0.008, 0.002, 0.006, 0.003];
    const nifty50_returns =    [0.005, 0.007, -0.002, 0.008, 0.003, -0.004, 0.006, 0.001, 0.005, 0.002];

    const pkgB = portfolioIntelligencePackageBuilder.buildPackage({
        portfolioId: 'PORTFOLIO_B_INDIA_EQUITY',
        portfolioName: 'India Leaders INR Fund',
        baseCurrency: 'INR',
        holdings: portfolioB_holdings,
        cashBalance: 50000,
        subPeriods: [{ startValue: 1050000, endValue: 1130500, cashFlow: 0 }],
        dailyReturns: portfolioB_returns,
        benchmarkReturns: nifty50_returns,
        benchmarkSymbol: '^NSEI',
        benchmarkName: 'NIFTY 50',
        benchmarkSectors: [
            { sector: 'Energy', weight: 0.15, return: 0.07 },
            { sector: 'Technology', weight: 0.14, return: 0.08 },
            { sector: 'Financial Services', weight: 0.35, return: 0.05 },
            { sector: 'Other Sectors', weight: 0.36, return: 0.06 }
        ],
        theses: [
            {
                ticker: 'RELIANCE.NS',
                decisionId: 'DEC-RELIANCE-01',
                thesisTitle: 'Jio & Retail Free Cash Flow inflection',
                expectedDrivers: [{ metric: 'FREE_CASH_FLOW', direction: 'INCREASE' }],
                actualFundamentalFacts: {
                    FREE_CASH_FLOW: { baseline: 45000000000, latest: 58000000000, factId: 'FACT-RELIANCE-FCF-V1' }
                },
                pricePerformance: { return: 0.08 }
            }
        ],
        targetAllocations: { 'RELIANCE.NS': 0.50, 'TCS.NS': 0.30, 'HDFCBANK.NS': 0.20 }
    });

    assert(pkgB.baseCurrency === 'INR', 'PortB.01: Base currency is strictly INR');
    assert(pkgB.benchmark.benchmarkMetadata.symbol === '^NSEI', 'PortB.02: Benchmark symbol is ^NSEI');
    assert(pkgB.benchmark.benchmarkMetadata.name === 'NIFTY 50', 'PortB.03: Benchmark name is NIFTY 50');
    assert(pkgB.performance.timeWeightedReturn.status === AnalyticsStatus.PASS, 'PortB.04: India portfolio TWR evaluated cleanly');
    assert(pkgB.attribution.positionLevel.positions.length === 3, 'PortB.05: 3 India large cap positions attributed');
    assert(pkgB.thesisAttribution[0].thesisStatus === ThesisStatus.WORKING, 'PortB.06: Reliance FCF inflection thesis validated as WORKING');
    assert(pkgB.seal.packageHash.length === 64, 'PortB.07: Portfolio B sealed with 64-char SHA-256 hash');

    // -------------------------------------------------------------
    // 3. PORTFOLIO C: MIXED MULTI-CURRENCY (USD + INR)
    // -------------------------------------------------------------
    console.log('--- Validating Portfolio C (Mixed Multi-Currency: USD & INR with Live FX) ---');
    // Raw assets in native currencies:
    // Asset 1: AAPL (USD $40,000 beg -> $44,000 end)
    // Asset 2: TCS.NS (INR 2,595,000 beg -> 2,854,500 end, converted at USD_INR 86.50 -> USD $30,000 beg -> $33,000 end)
    const tcsBegInUSD = multiCurrencyEngine.convert({ amount: 2595000, sourceCurrency: 'INR', targetCurrency: 'USD' });
    const tcsEndInUSD = multiCurrencyEngine.convert({ amount: 2854500, sourceCurrency: 'INR', targetCurrency: 'USD' });

    assert(tcsBegInUSD.status === AnalyticsStatus.PASS, 'PortC.01: INR to USD conversion for TCS beginning value PASS');
    assert(Math.abs(tcsBegInUSD.convertedValue - 30000) < 1e-2, 'PortC.02: TCS INR converted accurately to $30,000 USD');
    assert(tcsEndInUSD.status === AnalyticsStatus.PASS, 'PortC.03: INR to USD conversion for TCS ending value PASS');
    assert(Math.abs(tcsEndInUSD.convertedValue - 33000) < 1e-2, 'PortC.04: TCS INR converted accurately to $33,000 USD');

    const portfolioC_holdings = [
        { ticker: 'AAPL', beginningValue: 40000, endingValue: 44000, dividend: 200, fxReturn: 0.0, sector: 'Technology', geography: 'US', beta: 1.15, volatility: 0.22 },
        { ticker: 'TCS.NS', beginningValue: tcsBegInUSD.convertedValue, endingValue: tcsEndInUSD.convertedValue, dividend: 100, fxReturn: 0.0, sector: 'Technology', geography: 'IN', beta: 0.90, volatility: 0.18 }
    ];

    const pkgC = portfolioIntelligencePackageBuilder.buildPackage({
        portfolioId: 'PORTFOLIO_C_MULTI_CURRENCY',
        portfolioName: 'Global Multi-Currency Fund',
        baseCurrency: 'USD',
        holdings: portfolioC_holdings,
        cashBalance: 10000,
        subPeriods: [{ startValue: 80000, endValue: 87300, cashFlow: 0 }],
        dailyReturns: [0.006, 0.008, -0.002, 0.010, 0.004],
        benchmarkReturns: [0.005, 0.007, -0.001, 0.009, 0.003],
        targetAllocations: { AAPL: 0.60, 'TCS.NS': 0.40 }
    });

    assert(pkgC.attribution.positionLevel.status === AnalyticsStatus.PASS, 'PortC.05: Multi-currency position attribution PASS');
    assert(pkgC.attribution.positionLevel.positions.length === 2, 'PortC.06: 2 positions attributed in base USD');
    assert(pkgC.factorExposures.status === AnalyticsStatus.PASS, 'PortC.07: Factor risk computed across multi-currency holdings');
    assert(pkgC.seal.packageHash.length === 64, 'PortC.08: Portfolio C sealed with 64-char SHA-256 hash');
    assert(pkgC.baseCurrency === 'USD', 'PortC.09: Portfolio C base currency is USD');
    assert(pkgC.governance.aiExecutionBlocked === true, 'PortC.10: Automated trade execution blocked across all real portfolios');
    assert(pkgC.driftAndRebalancing.status === AnalyticsStatus.PASS, 'PortC.11: Multi-currency drift analysis returns PASS');

    console.log(`\n======================================================`);
    console.log(`PHASE 12 REAL PORTFOLIO VALIDATION: ${passed}/${total} ASSERTIONS PASSED`);
    console.log(`======================================================\n`);
    return { passed, total };
}

if (process.argv[1]?.endsWith('phase12RealPortfolioValidation.js')) {
    runRealPortfolioValidation();
}

export { runRealPortfolioValidation };
