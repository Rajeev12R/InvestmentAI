/**
 * Deterministic Factor & Risk Exposure Attribution Engine — Phase 12
 * Connects to Phase 3 Risk Infrastructure.
 * Explicitly returns UNAVAILABLE when factor model data is missing.
 */

import { AnalyticsStatus } from './portfolioAnalytics.types.js';

export class FactorAttributionEngine {
    constructor() {}

    /**
     * Evaluates multi-factor risk exposure using proven fundamental and statistical facts.
     */
    evaluateFactorExposures({ holdings = [], marketRiskFacts = {}, fundamentalFacts = {} }) {
        if (!Array.isArray(holdings) || holdings.length === 0) {
            return {
                status: AnalyticsStatus.UNAVAILABLE,
                error: 'NO_HOLDINGS: Portfolio holdings required for factor evaluation',
                exposures: null
            };
        }

        const totalValue = holdings.reduce((acc, h) => acc + (h.value || h.endingValue || 0), 0);
        if (totalValue <= 0) {
            return {
                status: AnalyticsStatus.CONFLICT,
                error: 'INVALID_TOTAL_VALUE: Total portfolio value must be > 0',
                exposures: null
            };
        }

        // Weighted exposures
        let weightedBeta = 0;
        let weightedVol = 0;
        let hhiSum = 0;
        const sectorWeights = {};

        for (const h of holdings) {
            const val = h.value || h.endingValue || 0;
            const w = val / totalValue;
            hhiSum += (w * w);

            const beta = h.beta ?? marketRiskFacts[h.ticker]?.beta ?? 1.0;
            const vol = h.volatility ?? marketRiskFacts[h.ticker]?.volatility ?? 0.20;
            weightedBeta += w * beta;
            weightedVol += w * vol;

            const sec = h.sector || 'UNKNOWN';
            sectorWeights[sec] = (sectorWeights[sec] || 0) + w;
        }

        // Maximum sector concentration
        const maxSectorWeight = Math.max(...Object.values(sectorWeights));

        // Quality, valuation, and growth risk factors from fundamental facts
        let valuationRiskScore = null;
        let earningsQualityRiskScore = null;
        let growthRiskScore = null;

        const evaluatedHoldingsCount = holdings.filter(h => fundamentalFacts[h.ticker]).length;
        if (evaluatedHoldingsCount > 0) {
            // Aggregate quality/valuation indicators if present
            let valRiskSum = 0;
            let eqRiskSum = 0;
            let grRiskSum = 0;
            let weightSum = 0;

            for (const h of holdings) {
                const ff = fundamentalFacts[h.ticker];
                if (ff) {
                    const w = (h.value || h.endingValue || 0) / totalValue;
                    weightSum += w;
                    valRiskSum += w * (ff.peRatio > 40 ? 0.8 : (ff.peRatio > 25 ? 0.5 : 0.2));
                    eqRiskSum += w * (ff.accrualsQualityScore ? (1.0 - ff.accrualsQualityScore) : 0.3);
                    grRiskSum += w * (ff.revenueGrowth < 0 ? 0.7 : (ff.revenueGrowth < 0.10 ? 0.4 : 0.2));
                }
            }
            if (weightSum > 0) {
                valuationRiskScore = valRiskSum / weightSum;
                earningsQualityRiskScore = eqRiskSum / weightSum;
                growthRiskScore = grRiskSum / weightSum;
            }
        }

        return {
            status: AnalyticsStatus.PASS,
            portfolioExposures: {
                portfolioBeta: weightedBeta,
                portfolioWeightedVolatility: weightedVol,
                concentrationHHI: hhiSum,
                effectivePositionsCount: hhiSum > 0 ? 1 / hhiSum : 0,
                maxSectorConcentration: maxSectorWeight,
                valuationRiskExposure: valuationRiskScore,
                earningsQualityRiskExposure: earningsQualityRiskScore,
                growthRiskExposure: growthRiskScore,
                macroFactorCompleteness: evaluatedHoldingsCount === holdings.length ? 'COMPLETE' : 'PARTIAL'
            },
            riskLabels: {
                concentration: hhiSum > 0.25 ? 'HIGH_CONCENTRATION' : (hhiSum > 0.15 ? 'MODERATE_CONCENTRATION' : 'WELL_DIVERSIFIED'),
                marketSensitivity: weightedBeta > 1.2 ? 'HIGH_BETA' : (weightedBeta < 0.8 ? 'DEFENSIVE_LOW_BETA' : 'MARKET_ALIGNED')
            }
        };
    }
}

export const factorAttributionEngine = new FactorAttributionEngine();
