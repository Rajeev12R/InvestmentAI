/**
 * Phase 12 — Multi-Currency & Drift Rebalancing Intelligence Tests
 * Tests multi-currency conversions (USD, INR, EUR), strict non-default FX, stale FX alerts,
 * target weight drift, sector drift, and rebalancing human-approval guards.
 */

import { multiCurrencyEngine } from '../portfolioAnalytics/multiCurrency.engine.js';
import { driftRebalancingEngine } from '../portfolioAnalytics/driftRebalancing.engine.js';
import { AnalyticsStatus, DriftType } from '../portfolioAnalytics/portfolioAnalytics.types.js';

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

async function runMultiCurrencyDriftTests() {
    console.log('\n======================================================');
    console.log('PHASE 12 — MULTI-CURRENCY & DRIFT REBALANCING TESTS');
    console.log('======================================================\n');

    // 1. Same Currency Identity
    const sameCurr = multiCurrencyEngine.convert({
        amount: 10000,
        sourceCurrency: 'USD',
        targetCurrency: 'USD'
    });
    assert(sameCurr.status === AnalyticsStatus.PASS, 'Same currency conversion returns PASS');
    assert(sameCurr.fxRate === 1.0, 'Same currency fxRate is 1.0');
    assert(sameCurr.convertedValue === 10000, 'Same currency value is unchanged');
    assert(sameCurr.fxSource === 'SAME_CURRENCY_IDENTITY', 'Source is SAME_CURRENCY_IDENTITY');

    // 2. USD to INR Conversion
    const usdToInr = multiCurrencyEngine.convert({
        amount: 1000,
        sourceCurrency: 'USD',
        targetCurrency: 'INR'
    });
    assert(usdToInr.status === AnalyticsStatus.PASS, 'USD to INR returns PASS');
    assert(usdToInr.fxRate === 86.50, 'USD_INR rate is 86.50');
    assert(usdToInr.convertedValue === 86500, '1000 USD converts to 86,500 INR');
    assert(usdToInr.formula.includes('ConvertedValue = SourceValue * 86.5'), 'Explicit formula exposed');
    assert(usdToInr.fxSource === 'ECB_FED_ORCHESTRATOR', 'Provenance source exposed');

    // 3. INR to USD Inverse Conversion
    const inrToUsd = multiCurrencyEngine.convert({
        amount: 86500,
        sourceCurrency: 'INR',
        targetCurrency: 'USD'
    });
    assert(inrToUsd.status === AnalyticsStatus.PASS, 'INR to USD returns PASS');
    assert(Math.abs(inrToUsd.convertedValue - 1000) < 1e-4, '86,500 INR converts back to 1000 USD');

    // 4. EUR to USD Conversion
    const eurToUsd = multiCurrencyEngine.convert({
        amount: 1000,
        sourceCurrency: 'EUR',
        targetCurrency: 'USD'
    });
    assert(eurToUsd.status === AnalyticsStatus.PASS, 'EUR to USD returns PASS');
    assert(eurToUsd.convertedValue === 1085, '1000 EUR converts to 1,085 USD');

    // 5. CRITICAL INVARIANT: Missing FX Rate MUST Return UNAVAILABLE (Never fallback to 1.0)
    const unknownFx = multiCurrencyEngine.convert({
        amount: 5000,
        sourceCurrency: 'BRL', // Brazilian Real (unsupported without live rate)
        targetCurrency: 'USD'
    });
    assert(unknownFx.status === AnalyticsStatus.UNAVAILABLE, 'Unsupported currency pair returns UNAVAILABLE');
    assert(unknownFx.convertedValue === null, 'Converted value is null when FX rate is missing');
    assert(unknownFx.error.includes('MISSING_FX_RATE'), 'Error explicitly states MISSING_FX_RATE');

    // 6. Stale FX Detection
    const staleFx = multiCurrencyEngine.convert({
        amount: 1000,
        sourceCurrency: 'USD',
        targetCurrency: 'INR',
        timestamp: '2026-04-01T00:00:00.000Z' // > 150 days from rate date
    });
    assert(staleFx.status === AnalyticsStatus.WARNING, 'Stale FX timestamp returns WARNING');
    assert(staleFx.warning.includes('STALE_FX_RATE'), 'Warning identifies stale rate');

    // 7. Missing Parameters Handling
    const missingParams = multiCurrencyEngine.convert({ amount: 100 });
    assert(missingParams.status === AnalyticsStatus.UNAVAILABLE, 'Missing target currency returns UNAVAILABLE');

    const nonNumericAmt = multiCurrencyEngine.convert({ amount: 'invalid', sourceCurrency: 'USD', targetCurrency: 'INR' });
    assert(nonNumericAmt.status === AnalyticsStatus.CONFLICT, 'Non-numeric amount returns CONFLICT');

    // 8. Portfolio Drift Intelligence — Position Weight Drift
    const currentHoldings = [
        { ticker: 'AAPL', currentWeight: 0.38, value: 38000, sector: 'Technology', geography: 'US' },
        { ticker: 'MSFT', currentWeight: 0.22, value: 22000, sector: 'Technology', geography: 'US' },
        { ticker: 'GOOGL', currentWeight: 0.40, value: 40000, sector: 'Communication Services', geography: 'US' }
    ];
    const targetAllocations = {
        AAPL: 0.30, // Drift = +8% (> 3% threshold)
        MSFT: 0.30, // Drift = -8% (> 3% threshold)
        GOOGL: 0.40 // Drift = 0%
    };
    const targetSectors = {
        Technology: 0.60,
        'Communication Services': 0.40
    };

    const driftResult = driftRebalancingEngine.evaluatePortfolioDrift({
        currentHoldings,
        targetAllocations,
        targetSectors,
        maxWeightTolerance: 0.03
    });

    assert(driftResult.status === AnalyticsStatus.PASS, 'Drift analysis returns PASS');
    assert(driftResult.driftDetected === true, 'Drift successfully detected');
    assert(driftResult.driftCount === 2, '2 position weight drift events detected (AAPL & MSFT)');
    
    const aaplDrift = driftResult.driftEvents.find(e => e.ticker === 'AAPL');
    assert(aaplDrift.type === DriftType.TARGET_WEIGHT_DRIFT, 'AAPL event type is TARGET_WEIGHT_DRIFT');
    assert(Math.abs(aaplDrift.driftPercentagePoints - 8.0) < 1e-4, 'AAPL drifted by +8.0 percentage points');
    assert(aaplDrift.severity === 'HIGH', '8% drift classified as HIGH severity');

    // 9. Rebalancing Recommendations (Recommendation ONLY)
    assert(driftResult.rebalanceRecommendations.length === 2, '2 rebalancing recommendations generated');
    const aaplRec = driftResult.rebalanceRecommendations.find(r => r.ticker === 'AAPL');
    assert(aaplRec.action === 'TRIM_RECOMMENDED', 'AAPL action is TRIM_RECOMMENDED');
    assert(Math.abs(aaplRec.recommendedAdjustmentPct - (-8.0)) < 1e-4, 'Recommended adjustment is -8.0%');

    // 10. CRITICAL INVARIANT: Security Guard Blocks Automated Execution
    assert(driftResult.securityGuard.automatedTradeExecutionAllowed === false, 'Automated trade execution is strictly FALSE');
    assert(driftResult.securityGuard.brokerOrderRoutingAllowed === false, 'Broker order routing is strictly FALSE');
    assert(driftResult.securityGuard.humanApprovalRequired === true, 'Human approval is strictly REQUIRED');
    assert(driftResult.securityGuard.message.includes('Automated execution is strictly disabled'), 'Explicit security notice provided');

    // 11. Sector Drift Detection
    const sectorDriftHoldings = [
        { ticker: 'AAPL', currentWeight: 0.80, value: 80000, sector: 'Technology' },
        { ticker: 'JNJ', currentWeight: 0.20, value: 20000, sector: 'Healthcare' }
    ];
    const secDriftResult = driftRebalancingEngine.evaluatePortfolioDrift({
        currentHoldings: sectorDriftHoldings,
        targetAllocations: { AAPL: 0.50, JNJ: 0.50 },
        targetSectors: { Technology: 0.50, Healthcare: 0.50 },
        maxSectorTolerance: 0.05
    });
    assert(secDriftResult.driftEvents.some(e => e.type === DriftType.SECTOR_DRIFT), 'Sector drift detected when Technology is 80% vs 50% target');

    // 12. Clean Portfolio with No Drift
    const cleanHoldings = [
        { ticker: 'AAPL', currentWeight: 0.50, value: 50000, sector: 'Technology' },
        { ticker: 'MSFT', currentWeight: 0.50, value: 50000, sector: 'Technology' }
    ];
    const cleanDrift = driftRebalancingEngine.evaluatePortfolioDrift({
        currentHoldings: cleanHoldings,
        targetAllocations: { AAPL: 0.50, MSFT: 0.50 }
    });
    assert(cleanDrift.driftDetected === false, 'No drift detected for perfectly balanced portfolio');
    assert(cleanDrift.driftCount === 0, 'Drift count is 0');
    assert(cleanDrift.rebalanceRecommendations.length === 0, 'No rebalancing recommendations needed');

    // 13. Empty holdings validation
    const emptyDrift = driftRebalancingEngine.evaluatePortfolioDrift({ currentHoldings: [] });
    assert(emptyDrift.status === AnalyticsStatus.UNAVAILABLE, 'Empty holdings returns UNAVAILABLE');

    console.log(`\n======================================================`);
    console.log(`PHASE 12 MULTI-CURRENCY & DRIFT: ${passed}/${total} ASSERTIONS PASSED`);
    console.log(`======================================================\n`);
    return { passed, total };
}

if (process.argv[1]?.endsWith('phase12MultiCurrencyDriftTests.js')) {
    runMultiCurrencyDriftTests();
}

export { runMultiCurrencyDriftTests };
