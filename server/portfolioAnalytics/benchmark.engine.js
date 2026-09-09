/**
 * Deterministic Benchmark Intelligence Engine — Phase 12
 * Calculates Active Return, Tracking Error, Beta, Alpha, Information Ratio, Up/Down Capture.
 * Strictly distinguishes absolute vs relative performance.
 */

import { AnalyticsStatus } from './portfolioAnalytics.types.js';

export class BenchmarkEngine {
    constructor() {}

    /**
     * Calculates benchmark comparative statistics against periodic return series.
     */
    evaluateBenchmarkComparison({
        portfolioReturns = [],
        benchmarkReturns = [],
        benchmarkSymbol = '^GSPC',
        benchmarkName = 'S&P 500',
        riskFreeRate = 0.04,
        periodsPerYear = 252,
        benchmarkSource = 'YAHOO_FINANCE_VERIFIED'
    }) {
        if (!Array.isArray(portfolioReturns) || !Array.isArray(benchmarkReturns)) {
            return {
                status: AnalyticsStatus.UNAVAILABLE,
                error: 'INVALID_RETURN_ARRAYS: Both portfolio and benchmark return arrays required',
                comparison: null
            };
        }

        if (portfolioReturns.length !== benchmarkReturns.length || portfolioReturns.length < 2) {
            return {
                status: AnalyticsStatus.UNAVAILABLE,
                error: `SERIES_LENGTH_MISMATCH: Portfolio length (${portfolioReturns.length}) must equal benchmark length (${benchmarkReturns.length}) and be >= 2`,
                comparison: null
            };
        }

        const n = portfolioReturns.length;

        // Cumulative & Annualized returns
        const pCompound = portfolioReturns.reduce((acc, r) => acc * (1 + r), 1) - 1;
        const bCompound = benchmarkReturns.reduce((acc, r) => acc * (1 + r), 1) - 1;

        const pMean = portfolioReturns.reduce((acc, r) => acc + r, 0) / n;
        const bMean = benchmarkReturns.reduce((acc, r) => acc + r, 0) / n;

        const pAnnualized = pMean * periodsPerYear;
        const bAnnualized = bMean * periodsPerYear;

        // Active Return (Arithmetic & Geometric)
        const activeAnnualizedReturn = pAnnualized - bAnnualized;
        const cumulativeActiveReturn = pCompound - bCompound;

        // Excess returns differences (Tracking Error)
        const excessDiffs = portfolioReturns.map((r, i) => r - benchmarkReturns[i]);
        const excessMean = excessDiffs.reduce((acc, d) => acc + d, 0) / n;
        const trackingVariance = excessDiffs.reduce((acc, d) => acc + Math.pow(d - excessMean, 2), 0) / (n - 1);
        const trackingError = Math.sqrt(trackingVariance) * Math.sqrt(periodsPerYear);

        // Information Ratio
        const informationRatio = trackingError > 0 ? activeAnnualizedReturn / trackingError : 0;

        // Covariance and Beta
        const bVariance = benchmarkReturns.reduce((acc, r) => acc + Math.pow(r - bMean, 2), 0) / (n - 1);
        const bAnnualizedVol = Math.sqrt(bVariance) * Math.sqrt(periodsPerYear);

        let covariance = 0;
        for (let i = 0; i < n; i++) {
            covariance += (portfolioReturns[i] - pMean) * (benchmarkReturns[i] - bMean);
        }
        covariance /= (n - 1);

        const beta = bVariance > 0 ? covariance / bVariance : 1.0;

        // Jensen's Alpha: Alpha = R_p - [R_f + Beta * (R_b - R_f)]
        const alpha = pAnnualized - (riskFreeRate + beta * (bAnnualized - riskFreeRate));

        // Up & Downside Capture
        const upPeriods = [];
        const downPeriods = [];
        for (let i = 0; i < n; i++) {
            if (benchmarkReturns[i] > 0) {
                upPeriods.push({ p: portfolioReturns[i], b: benchmarkReturns[i] });
            } else if (benchmarkReturns[i] < 0) {
                downPeriods.push({ p: portfolioReturns[i], b: benchmarkReturns[i] });
            }
        }

        const upCapture = upPeriods.length > 0
            ? (upPeriods.reduce((acc, x) => acc + x.p, 0) / upPeriods.reduce((acc, x) => acc + x.b, 0)) * 100
            : null;

        const downCapture = downPeriods.length > 0
            ? (downPeriods.reduce((acc, x) => acc + x.p, 0) / downPeriods.reduce((acc, x) => acc + x.b, 0)) * 100
            : null;

        // Performance Classification (Absolute vs Relative)
        const performanceClassification = activeAnnualizedReturn >= 0
            ? 'OUTPERFORMANCE_RELATIVE_TO_BENCHMARK'
            : 'UNDERPERFORMANCE_RELATIVE_TO_BENCHMARK';

        const interpretation = {
            portfolioAbsolute: pAnnualized >= 0 ? 'POSITIVE' : 'NEGATIVE',
            benchmarkAbsolute: bAnnualized >= 0 ? 'POSITIVE' : 'NEGATIVE',
            relativeAssessment: performanceClassification,
            summaryStatement: `Portfolio returned ${(pAnnualized * 100).toFixed(2)}% vs Benchmark ${(bAnnualized * 100).toFixed(2)}% (Active: ${(activeAnnualizedReturn * 100).toFixed(2)}%). Classified as ${performanceClassification}.`
        };

        return {
            status: AnalyticsStatus.PASS,
            benchmarkMetadata: {
                symbol: benchmarkSymbol,
                name: benchmarkName,
                source: benchmarkSource,
                periodsCount: n,
                periodsPerYear
            },
            metrics: {
                portfolioCumulativeReturn: pCompound,
                benchmarkCumulativeReturn: bCompound,
                portfolioAnnualizedReturn: pAnnualized,
                benchmarkAnnualizedReturn: bAnnualized,
                activeAnnualizedReturn,
                cumulativeActiveReturn,
                trackingError,
                informationRatio,
                beta,
                alpha,
                upsideCapturePct: upCapture,
                downsideCapturePct: downCapture,
                benchmarkAnnualizedVolatility: bAnnualizedVol
            },
            classification: performanceClassification,
            interpretation,
            formulas: {
                activeReturn: 'AnnualizedPortfolioReturn - AnnualizedBenchmarkReturn',
                trackingError: 'StdDev(R_p,i - R_b,i) * sqrt(252)',
                informationRatio: 'ActiveReturn / TrackingError',
                beta: 'Cov(R_p, R_b) / Var(R_b)',
                alpha: 'R_p - [R_f + Beta * (R_b - R_f)]',
                upCapture: 'Sum(R_p,up) / Sum(R_b,up) * 100',
                downCapture: 'Sum(R_p,down) / Sum(R_b,down) * 100'
            }
        };
    }
}

export const benchmarkEngine = new BenchmarkEngine();
