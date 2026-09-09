/**
 * Deterministic Institutional Attribution Engine — Phase 12
 * Position-level contribution, sector aggregation, and Brinson-Fachler active decomposition.
 * Strictly reconciles portfolio return without manufacturing residuals.
 */

import { AnalyticsStatus, AttributionEffect } from './portfolioAnalytics.types.js';

export class AttributionEngine {
    constructor() {}

    /**
     * Calculates position-level contribution to total portfolio return.
     * Contribution_i = BeginningWeight_i * (AssetReturn_i + FXReturn_i + DivReturn_i)
     * Reconciles Sum(Contributions) against PortfolioReturn within tolerance.
     */
    calculatePositionAttribution({ holdings = [], cashBeginning = 0, cashEnding = 0, portfolioReturn, tolerance = 0.0005 }) {
        if (!Array.isArray(holdings) || holdings.length === 0) {
            return {
                status: AnalyticsStatus.UNAVAILABLE,
                error: 'NO_HOLDINGS: Position holdings data required for attribution',
                contributions: [],
                positions: []
            };
        }

        let totalBeginningValue = cashBeginning;
        let totalEndingValue = cashEnding;

        for (const h of holdings) {
            totalBeginningValue += (h.beginningValue || 0);
            totalEndingValue += (h.endingValue || 0);
        }

        if (totalBeginningValue <= 0) {
            return {
                status: AnalyticsStatus.CONFLICT,
                error: 'INVALID_PORTFOLIO_VALUE: Total beginning portfolio value must be > 0',
                contributions: [],
                positions: []
            };
        }

        const positionContributions = [];
        let sumContributions = 0;

        for (const h of holdings) {
            const begVal = Number(h.beginningValue || 0);
            const endVal = Number(h.endingValue || 0);
            const begWeight = begVal / totalBeginningValue;
            const endWeight = totalEndingValue > 0 ? endVal / totalEndingValue : 0;

            const priceReturn = begVal > 0 ? (endVal - (h.dividend || 0) - begVal) / begVal : 0;
            const divReturn = begVal > 0 ? (h.dividend || 0) / begVal : 0;
            const fxReturn = Number(h.fxReturn || 0);
            const totalAssetReturn = priceReturn + divReturn + fxReturn;

            const totalContribution = begWeight * totalAssetReturn;
            sumContributions += totalContribution;

            positionContributions.push({
                ticker: h.ticker,
                securityName: h.securityName || h.ticker,
                beginningValue: begVal,
                endingValue: endVal,
                beginningWeight: begWeight,
                endingWeight: endWeight,
                priceReturn,
                dividendContribution: begWeight * divReturn,
                fxContribution: begWeight * fxReturn,
                totalAssetReturn,
                totalContribution,
                portfolioContributionPct: totalContribution * 100,
                sector: h.sector || 'UNKNOWN',
                industry: h.industry || 'UNKNOWN',
                geography: h.geography || 'UNKNOWN',
                assetClass: h.assetClass || 'EQUITY',
                evidenceId: h.evidenceId || `EVID-POS-${h.ticker}`
            });
        }

        // Cash contribution
        const cashBegWeight = cashBeginning / totalBeginningValue;
        const cashReturn = cashBeginning > 0 ? (cashEnding - cashBeginning) / cashBeginning : 0;
        const cashContribution = cashBegWeight * cashReturn;
        sumContributions += cashContribution;

        // Strict reconciliation against portfolioReturn
        const calcPortfolioReturn = typeof portfolioReturn === 'number'
            ? portfolioReturn
            : (totalEndingValue - totalBeginningValue) / totalBeginningValue;

        const diff = Math.abs(calcPortfolioReturn - sumContributions);
        let reconciliationStatus = AnalyticsStatus.PASS;
        let conflictMessage = null;

        if (diff > tolerance) {
            reconciliationStatus = AnalyticsStatus.CONFLICT;
            conflictMessage = `RECONCILIATION_MISMATCH: Sum of contributions (${(sumContributions * 100).toFixed(4)}%) does not match portfolio return (${(calcPortfolioReturn * 100).toFixed(4)}%). Diff = ${(diff * 100).toFixed(4)}% exceeds tolerance ${(tolerance * 100).toFixed(4)}%. Residual fabrication is strictly forbidden.`;
        }

        return {
            status: reconciliationStatus,
            conflictMessage,
            totalBeginningValue,
            totalEndingValue,
            calculatedPortfolioReturn: calcPortfolioReturn,
            sumOfContributions: sumContributions,
            reconciliationDiff: diff,
            cashContribution: {
                beginningWeight: cashBegWeight,
                return: cashReturn,
                totalContribution: cashContribution
            },
            positions: positionContributions
        };
    }

    /**
     * Aggregates position contributions by dimension: sector, industry, geography, assetClass.
     * Retains underlying security evidence IDs.
     * Missing metadata is explicitly assigned 'UNKNOWN' (never inferred by AI).
     */
    aggregateByDimension({ positionAttributions = [], dimension = 'sector' }) {
        if (!Array.isArray(positionAttributions) || positionAttributions.length === 0) {
            return {
                status: AnalyticsStatus.UNAVAILABLE,
                error: 'NO_POSITIONS: Position attribution records required',
                groups: []
            };
        }

        const validDimensions = ['sector', 'industry', 'geography', 'assetClass'];
        if (!validDimensions.includes(dimension)) {
            return {
                status: AnalyticsStatus.CONFLICT,
                error: `INVALID_DIMENSION: Dimension must be one of: ${validDimensions.join(', ')}`,
                groups: []
            };
        }

        const groups = {};
        for (const p of positionAttributions) {
            const key = p[dimension] || 'UNKNOWN';
            if (!groups[key]) {
                groups[key] = {
                    dimensionKey: key,
                    beginningWeight: 0,
                    endingWeight: 0,
                    beginningValue: 0,
                    endingValue: 0,
                    totalContribution: 0,
                    tickers: [],
                    evidenceIds: []
                };
            }
            groups[key].beginningWeight += (p.beginningWeight || 0);
            groups[key].endingWeight += (p.endingWeight || 0);
            groups[key].beginningValue += (p.beginningValue || 0);
            groups[key].endingValue += (p.endingValue || 0);
            groups[key].totalContribution += (p.totalContribution || 0);
            groups[key].tickers.push(p.ticker);
            if (p.evidenceId) groups[key].evidenceIds.push(p.evidenceId);
        }

        const resultGroups = Object.values(groups).map(g => ({
            ...g,
            portfolioContributionPct: g.totalContribution * 100,
            weightedReturn: g.beginningWeight > 0 ? g.totalContribution / g.beginningWeight : 0
        }));

        return {
            status: AnalyticsStatus.PASS,
            dimension,
            groups: resultGroups
        };
    }

    /**
     * Deterministic Brinson-Fachler Attribution.
     * Alloc_i = (w_p,i - w_b,i) * (R_b,i - R_b)
     * Selec_i = w_b,i * (R_p,i - R_b,i)
     * Inter_i = (w_p,i - w_b,i) * (R_p,i - R_b,i)
     * Total Active Return = Sum(Alloc_i + Selec_i + Inter_i) = R_p - R_b
     */
    calculateBrinsonAttribution({ portfolioSectors = [], benchmarkSectors = [], benchmarkTotalReturn, portfolioTotalReturn }) {
        if (!Array.isArray(portfolioSectors) || portfolioSectors.length === 0) {
            return {
                status: AnalyticsStatus.UNAVAILABLE,
                error: 'MISSING_PORTFOLIO_SECTORS: Portfolio sector breakdown required',
                attribution: null
            };
        }

        if (!Array.isArray(benchmarkSectors) || benchmarkSectors.length === 0) {
            return {
                status: AnalyticsStatus.UNAVAILABLE,
                error: 'MISSING_BENCHMARK_SECTORS: Benchmark sector weights are unavailable. Fabricating benchmark data is forbidden.',
                attribution: null
            };
        }

        const bSectorMap = {};
        for (const bs of benchmarkSectors) {
            bSectorMap[bs.sector] = bs;
        }

        const allSectors = Array.from(new Set([
            ...portfolioSectors.map(s => s.sector),
            ...benchmarkSectors.map(s => s.sector)
        ]));

        const R_b = typeof benchmarkTotalReturn === 'number'
            ? benchmarkTotalReturn
            : benchmarkSectors.reduce((acc, bs) => acc + (bs.weight * bs.return), 0);
        
        const R_p = typeof portfolioTotalReturn === 'number'
            ? portfolioTotalReturn
            : portfolioSectors.reduce((acc, ps) => acc + (ps.weight * ps.return), 0);

        let totalAllocation = 0;
        let totalSelection = 0;
        let totalInteraction = 0;
        const sectorEffects = [];

        for (const sec of allSectors) {
            const pSec = portfolioSectors.find(s => s.sector === sec) || { weight: 0, return: 0 };
            const bSec = bSectorMap[sec] || { weight: 0, return: 0 };

            const w_p = pSec.weight || 0;
            const w_b = bSec.weight || 0;
            const R_pi = pSec.return || 0;
            const R_bi = bSec.return || 0;

            const allocationEffect = (w_p - w_b) * (R_bi - R_b);
            const selectionEffect = w_b * (R_pi - R_bi);
            const interactionEffect = (w_p - w_b) * (R_pi - R_bi);
            const totalSectorEffect = allocationEffect + selectionEffect + interactionEffect;

            totalAllocation += allocationEffect;
            totalSelection += selectionEffect;
            totalInteraction += interactionEffect;

            sectorEffects.push({
                sector: sec,
                portfolioWeight: w_p,
                benchmarkWeight: w_b,
                portfolioReturn: R_pi,
                benchmarkReturn: R_bi,
                allocationEffect,
                selectionEffect,
                interactionEffect,
                totalSectorEffect
            });
        }

        const totalActiveReturn = R_p - R_b;
        const sumEffects = totalAllocation + totalSelection + totalInteraction;
        const diff = Math.abs(totalActiveReturn - sumEffects);

        return {
            status: diff < 0.001 ? AnalyticsStatus.PASS : AnalyticsStatus.WARNING,
            portfolioTotalReturn: R_p,
            benchmarkTotalReturn: R_b,
            totalActiveReturn,
            totalAllocationEffect: totalAllocation,
            totalSelectionEffect: totalSelection,
            totalInteractionEffect: totalInteraction,
            sumOfEffects: sumEffects,
            reconciliationDiff: diff,
            sectorEffects,
            formulas: {
                allocation: '(w_p,i - w_b,i) * (R_b,i - R_b)',
                selection: 'w_b,i * (R_p,i - R_b,i)',
                interaction: '(w_p,i - w_b,i) * (R_p,i - R_b,i)',
                totalActive: 'Total Active Return = Allocation + Selection + Interaction = R_p - R_b'
            }
        };
    }
}

export const attributionEngine = new AttributionEngine();
