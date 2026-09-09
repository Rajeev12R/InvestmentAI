/**
 * Sealed Portfolio Intelligence Package Builder — Phase 12
 * Packages all deterministic portfolio analytics into an immutable, SHA-256 sealed package.
 * AI Copilot strictly consumes this package.
 */

import crypto from 'crypto';
import { deepFreeze } from './portfolioAnalytics.types.js';
import { performanceEngine } from './performance.engine.js';
import { attributionEngine } from './attribution.engine.js';
import { benchmarkEngine } from './benchmark.engine.js';
import { factorAttributionEngine } from './factorAttribution.engine.js';
import { drawdownEngine } from './drawdown.engine.js';
import { decisionAttributionEngine } from './decisionAttribution.engine.js';
import { driftRebalancingEngine } from './driftRebalancing.engine.js';
import { multiCurrencyEngine } from './multiCurrency.engine.js';

export class PortfolioIntelligencePackageBuilder {
    constructor() {}

    /**
     * Builds and seals an immutable PortfolioIntelligencePackage.
     */
    buildPackage({
        portfolioId,
        portfolioName = 'Main Portfolio',
        baseCurrency = 'USD',
        holdings = [],
        cashBalance = 0,
        subPeriods = [],
        dailyReturns = [],
        benchmarkReturns = [],
        benchmarkSymbol = '^GSPC',
        benchmarkName = 'S&P 500',
        benchmarkSectors = [],
        theses = [],
        targetAllocations = {},
        targetSectors = {},
        riskFreeRate = 0.04
    }) {
        const timestamp = new Date().toISOString();
        const packageId = `PIP-${portfolioId || 'PORTFOLIO'}-${Date.now()}`;

        // 1. Performance
        const twrResult = subPeriods.length > 0
            ? performanceEngine.calculateTWR(subPeriods)
            : { status: 'UNAVAILABLE', twr: null };
        
        const riskMetricsResult = dailyReturns.length >= 2
            ? performanceEngine.calculateRiskAdjustedMetrics({ periodicReturns: dailyReturns, riskFreeRate })
            : { status: 'UNAVAILABLE', metrics: null };

        // 2. Attribution
        const positionAttrResult = holdings.length > 0
            ? attributionEngine.calculatePositionAttribution({ holdings, cashBeginning: cashBalance, cashEnding: cashBalance })
            : { status: 'UNAVAILABLE', positions: [] };

        const sectorAttrResult = positionAttrResult.positions?.length > 0
            ? attributionEngine.aggregateByDimension({ positionAttributions: positionAttrResult.positions, dimension: 'sector' })
            : { status: 'UNAVAILABLE', groups: [] };

        // Brinson
        let brinsonResult = { status: 'UNAVAILABLE' };
        if (sectorAttrResult.groups?.length > 0 && benchmarkSectors?.length > 0) {
            const totalEquityValue = sectorAttrResult.groups.reduce((acc, g) => acc + (g.beginningValue || 0), 0);
            const pSectors = sectorAttrResult.groups.map(g => ({
                sector: g.dimensionKey,
                weight: totalEquityValue > 0 ? (g.beginningValue || 0) / totalEquityValue : g.beginningWeight,
                return: g.weightedReturn
            }));
            brinsonResult = attributionEngine.calculateBrinsonAttribution({
                portfolioSectors: pSectors,
                benchmarkSectors
            });
        }

        // 3. Benchmark Comparison
        const benchmarkResult = (dailyReturns.length >= 2 && benchmarkReturns.length === dailyReturns.length)
            ? benchmarkEngine.evaluateBenchmarkComparison({
                portfolioReturns: dailyReturns,
                benchmarkReturns,
                benchmarkSymbol,
                benchmarkName,
                riskFreeRate
            })
            : { status: 'UNAVAILABLE', comparison: null };

        // 4. Factor & Risk Exposures
        const factorResult = holdings.length > 0
            ? factorAttributionEngine.evaluateFactorExposures({ holdings })
            : { status: 'UNAVAILABLE', exposures: null };

        // 5. Drawdowns
        let drawdownResult = { status: 'UNAVAILABLE' };
        if (dailyReturns.length >= 2) {
            let running = 100000;
            const valueSeries = [{ date: '2026-01-01', value: running }];
            for (let i = 0; i < dailyReturns.length; i++) {
                running *= (1 + dailyReturns[i]);
                const d = new Date(Date.parse('2026-01-01') + (i + 1) * 86400000).toISOString().split('T')[0];
                valueSeries.push({ date: d, value: running });
            }
            drawdownResult = drawdownEngine.analyzeDrawdownSeries(valueSeries);
        }

        // 6. Decision & Thesis Evaluations
        const thesisEvaluations = theses.map(th => decisionAttributionEngine.evaluateHoldingThesis(th));

        // 7. Drift & Rebalancing
        const driftResult = holdings.length > 0
            ? driftRebalancingEngine.evaluatePortfolioDrift({ currentHoldings: holdings, targetAllocations, targetSectors })
            : { status: 'UNAVAILABLE' };

        // Assemble raw payload
        const rawPackage = {
            packageId,
            portfolioId: portfolioId || 'PORTFOLIO_DEFAULT',
            portfolioName,
            baseCurrency,
            timestamp,
            governance: {
                deterministicVersion: '1.0.0',
                calculationEngine: 'INVESTMENT_AI_DETERMINISTIC_PORTFOLIO_ENGINE',
                humanApprovalBoundary: true,
                aiExecutionBlocked: true
            },
            performance: {
                timeWeightedReturn: twrResult,
                riskAdjustedMetrics: riskMetricsResult
            },
            attribution: {
                positionLevel: positionAttrResult,
                sectorLevel: sectorAttrResult,
                brinsonFachler: brinsonResult
            },
            benchmark: benchmarkResult,
            factorExposures: factorResult,
            drawdownIntelligence: drawdownResult,
            thesisAttribution: thesisEvaluations,
            driftAndRebalancing: driftResult
        };

        // Compute SHA-256 seal
        const canonicalString = JSON.stringify(rawPackage);
        const packageHash = crypto.createHash('sha256').update(canonicalString).digest('hex');

        const sealedPackage = {
            ...rawPackage,
            seal: {
                algorithm: 'SHA-256',
                packageHash,
                sealedAt: timestamp,
                immutable: true
            }
        };

        // Apply deepFreeze for strict runtime immutability
        return deepFreeze(sealedPackage);
    }
}

export const portfolioIntelligencePackageBuilder = new PortfolioIntelligencePackageBuilder();
