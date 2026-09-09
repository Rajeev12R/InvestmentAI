/**
 * Portfolio Analytics Express Routes — Phase 12
 * Authenticated endpoints for deterministic portfolio analytics, attribution, benchmark intelligence, and sealed packages.
 */

import express from 'express';
import { portfolioIntelligencePackageBuilder } from '../portfolioAnalytics/portfolioIntelligencePackage.js';
import { performanceEngine } from '../portfolioAnalytics/performance.engine.js';
import { attributionEngine } from '../portfolioAnalytics/attribution.engine.js';
import { benchmarkEngine } from '../portfolioAnalytics/benchmark.engine.js';
import { decisionAttributionEngine } from '../portfolioAnalytics/decisionAttribution.engine.js';
import { driftRebalancingEngine } from '../portfolioAnalytics/driftRebalancing.engine.js';
import { multiCurrencyEngine } from '../portfolioAnalytics/multiCurrency.engine.js';

const router = express.Router();

// Mock store / cache for demo & evaluation
const portfolioStore = new Map();

/**
 * Helper to get or create demo portfolio data
 */
function getDemoPortfolioData(portfolioId) {
    if (portfolioStore.has(portfolioId)) {
        return portfolioStore.get(portfolioId);
    }
    const demoData = {
        portfolioId,
        portfolioName: `Institutional Fund (${portfolioId})`,
        baseCurrency: 'USD',
        holdings: [
            { ticker: 'AAPL', securityName: 'Apple Inc.', beginningValue: 40000, endingValue: 44000, dividend: 200, sector: 'Technology', geography: 'US', beta: 1.15, volatility: 0.22 },
            { ticker: 'MSFT', securityName: 'Microsoft Corp.', beginningValue: 35000, endingValue: 38500, dividend: 150, sector: 'Technology', geography: 'US', beta: 1.05, volatility: 0.20 },
            { ticker: 'GOOGL', securityName: 'Alphabet Inc.', beginningValue: 25000, endingValue: 27000, dividend: 0, sector: 'Communication Services', geography: 'US', beta: 1.10, volatility: 0.24 }
        ],
        cashBalance: 5000,
        subPeriods: [
            { startValue: 100000, endValue: 104500, cashFlow: 0 },
            { startValue: 104500, endValue: 109500, cashFlow: 0 }
        ],
        dailyReturns: [0.005, 0.008, -0.003, 0.012, 0.004, -0.006, 0.009, 0.002, 0.007, 0.001],
        benchmarkReturns: [0.004, 0.006, -0.002, 0.009, 0.003, -0.004, 0.007, 0.001, 0.005, 0.002],
        benchmarkSymbol: '^GSPC',
        benchmarkName: 'S&P 500',
        benchmarkSectors: [
            { sector: 'Technology', weight: 0.32, return: 0.08 },
            { sector: 'Communication Services', weight: 0.10, return: 0.06 }
        ],
        theses: [
            {
                ticker: 'AAPL',
                decisionId: 'DEC-AAPL-01',
                thesisTitle: 'Services margin expansion & AI monetization',
                expectedDrivers: [{ metric: 'OPERATING_MARGIN', direction: 'EXPANSION', minDeltaBps: 100 }],
                actualFundamentalFacts: {
                    OPERATING_MARGIN: { baseline: 0.28, latest: 0.304, deltaBps: 240, factId: 'FACT-AAPL-MARGIN-FY2025' }
                },
                pricePerformance: { return: 0.10, durationDays: 90 }
            }
        ],
        targetAllocations: { AAPL: 0.35, MSFT: 0.35, GOOGL: 0.25 },
        targetSectors: { Technology: 0.70, 'Communication Services': 0.25 }
    };
    portfolioStore.set(portfolioId, demoData);
    return demoData;
}

/**
 * GET /api/portfolio-analytics/:portfolioId/performance
 */
router.get('/:portfolioId/performance', (req, res) => {
    try {
        const { portfolioId } = req.params;
        const data = getDemoPortfolioData(portfolioId);
        const twr = performanceEngine.calculateTWR(data.subPeriods);
        const risk = performanceEngine.calculateRiskAdjustedMetrics({ periodicReturns: data.dailyReturns });
        res.json({
            portfolioId,
            timeWeightedReturn: twr,
            riskAdjustedMetrics: risk
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/portfolio-analytics/:portfolioId/attribution
 */
router.get('/:portfolioId/attribution', (req, res) => {
    try {
        const { portfolioId } = req.params;
        const data = getDemoPortfolioData(portfolioId);
        const positionAttr = attributionEngine.calculatePositionAttribution({
            holdings: data.holdings,
            cashBeginning: data.cashBalance,
            cashEnding: data.cashBalance
        });
        const sectorAttr = attributionEngine.aggregateByDimension({
            positionAttributions: positionAttr.positions || [],
            dimension: 'sector'
        });
        res.json({
            portfolioId,
            positionAttribution: positionAttr,
            sectorAttribution: sectorAttr
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/portfolio-analytics/:portfolioId/benchmark
 */
router.get('/:portfolioId/benchmark', (req, res) => {
    try {
        const { portfolioId } = req.params;
        const data = getDemoPortfolioData(portfolioId);
        const bench = benchmarkEngine.evaluateBenchmarkComparison({
            portfolioReturns: data.dailyReturns,
            benchmarkReturns: data.benchmarkReturns,
            benchmarkSymbol: data.benchmarkSymbol,
            benchmarkName: data.benchmarkName
        });
        res.json({
            portfolioId,
            benchmarkComparison: bench
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/portfolio-analytics/:portfolioId/thesis
 */
router.get('/:portfolioId/thesis', (req, res) => {
    try {
        const { portfolioId } = req.params;
        const data = getDemoPortfolioData(portfolioId);
        const thesisResults = data.theses.map(th => decisionAttributionEngine.evaluateHoldingThesis(th));
        res.json({
            portfolioId,
            thesisEvaluations: thesisResults
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/portfolio-analytics/:portfolioId/drift
 */
router.get('/:portfolioId/drift', (req, res) => {
    try {
        const { portfolioId } = req.params;
        const data = getDemoPortfolioData(portfolioId);
        const drift = driftRebalancingEngine.evaluatePortfolioDrift({
            currentHoldings: data.holdings,
            targetAllocations: data.targetAllocations,
            targetSectors: data.targetSectors
        });
        res.json({
            portfolioId,
            driftAnalysis: drift
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/portfolio-analytics/:portfolioId/package
 */
router.get('/:portfolioId/package', (req, res) => {
    try {
        const { portfolioId } = req.params;
        const data = getDemoPortfolioData(portfolioId);
        const sealedPkg = portfolioIntelligencePackageBuilder.buildPackage(data);
        res.json(sealedPkg);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/portfolio-analytics/evaluate
 */
router.post('/evaluate', (req, res) => {
    try {
        const payload = req.body || {};
        if (payload.portfolioId) {
            portfolioStore.set(payload.portfolioId, payload);
        }
        const sealedPkg = portfolioIntelligencePackageBuilder.buildPackage(payload);
        res.json(sealedPkg);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
