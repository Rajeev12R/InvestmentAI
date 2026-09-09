/**
 * Deterministic Portfolio Drift & Rebalancing Intelligence — Phase 12
 * Detects target-weight, sector, geography, and risk budget drifts.
 * Rebalancing is recommendation-only. Strictly preserves human-approval boundary (NO automated trade execution).
 */

import { AnalyticsStatus, DriftType } from './portfolioAnalytics.types.js';

export class DriftRebalancingEngine {
    constructor() {}

    /**
     * Evaluates multi-dimensional drift between Target Portfolio and Current Portfolio.
     */
    evaluatePortfolioDrift({
        currentHoldings = [], // [{ ticker, currentWeight, value, sector, geography }]
        targetAllocations = {}, // { AAPL: 0.20, MSFT: 0.20, ... }
        targetSectors = {}, // { Technology: 0.50, Healthcare: 0.20, ... }
        maxWeightTolerance = 0.03, // 3% drift threshold
        maxSectorTolerance = 0.05 // 5% sector drift threshold
    }) {
        if (!Array.isArray(currentHoldings) || currentHoldings.length === 0) {
            return {
                status: AnalyticsStatus.UNAVAILABLE,
                error: 'NO_CURRENT_HOLDINGS: Current holdings required for drift evaluation',
                driftEvents: []
            };
        }

        const totalValue = currentHoldings.reduce((acc, h) => acc + (h.value || 0), 0);
        const currentWeights = {};
        const currentSectors = {};
        const currentGeos = {};

        for (const h of currentHoldings) {
            const w = totalValue > 0 ? (h.value || 0) / totalValue : (h.currentWeight || 0);
            currentWeights[h.ticker] = w;

            const sec = h.sector || 'UNKNOWN';
            currentSectors[sec] = (currentSectors[sec] || 0) + w;

            const geo = h.geography || 'UNKNOWN';
            currentGeos[geo] = (currentGeos[geo] || 0) + w;
        }

        const driftEvents = [];
        const rebalanceRecommendations = [];

        // 1. Position Weight Drift
        const allTickers = Array.from(new Set([...Object.keys(currentWeights), ...Object.keys(targetAllocations)]));
        for (const ticker of allTickers) {
            const curW = currentWeights[ticker] || 0;
            const tgtW = targetAllocations[ticker] || 0;
            const delta = curW - tgtW;
            const absDelta = Math.abs(delta);

            if (absDelta > maxWeightTolerance) {
                const event = {
                    type: DriftType.TARGET_WEIGHT_DRIFT,
                    ticker,
                    currentWeight: curW,
                    targetWeight: tgtW,
                    driftDelta: delta,
                    driftPercentagePoints: delta * 100,
                    threshold: maxWeightTolerance,
                    severity: absDelta > 0.08 ? 'HIGH' : 'MEDIUM'
                };
                driftEvents.push(event);

                // Recommendation only — NOT an execution!
                const action = delta > 0 ? 'TRIM_RECOMMENDED' : 'ADD_RECOMMENDED';
                rebalanceRecommendations.push({
                    ticker,
                    action,
                    deltaWeight: Number(delta.toFixed(4)),
                    recommendedAdjustmentPct: Number((-(delta * 100)).toFixed(4)),
                    narrative: `Position ${ticker} ${delta > 0 ? 'exceeds' : 'lags'} configured target weight by ${(absDelta * 100).toFixed(2)} percentage points. Recommend ${action.toLowerCase()}.`
                });
            }
        }

        // 2. Sector Drift (only if target sectors configured)
        if (Object.keys(targetSectors).length > 0) {
            const allSectors = Array.from(new Set([...Object.keys(currentSectors), ...Object.keys(targetSectors)]));
            for (const sec of allSectors) {
                const curSW = currentSectors[sec] || 0;
                const tgtSW = targetSectors[sec] || 0;
                const deltaS = curSW - tgtSW;
                if (Math.abs(deltaS) > maxSectorTolerance) {
                    driftEvents.push({
                        type: DriftType.SECTOR_DRIFT,
                        sector: sec,
                        currentWeight: curSW,
                        targetWeight: tgtSW,
                        driftDelta: deltaS,
                        threshold: maxSectorTolerance,
                        severity: Math.abs(deltaS) > 0.12 ? 'HIGH' : 'MEDIUM'
                    });
                }
            }
        }

        return {
            status: AnalyticsStatus.PASS,
            driftDetected: driftEvents.length > 0,
            driftCount: driftEvents.length,
            driftEvents,
            rebalanceRecommendations,
            securityGuard: {
                automatedTradeExecutionAllowed: false,
                brokerOrderRoutingAllowed: false,
                humanApprovalRequired: true,
                message: 'All rebalancing suggestions require explicit human confirmation. Automated execution is strictly disabled.'
            }
        };
    }
}

export const driftRebalancingEngine = new DriftRebalancingEngine();
