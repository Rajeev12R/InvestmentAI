/**
 * Deterministic Drawdown Intelligence Engine — Phase 12
 * Evaluates current, max, duration, recovery periods, and emits state transitions for Attention Engine.
 */

import { AnalyticsStatus, DrawdownEvent } from './portfolioAnalytics.types.js';

export class DrawdownEngine {
    constructor() {}

    /**
     * Analyzes cumulative portfolio value series to extract complete drawdown dynamics.
     */
    analyzeDrawdownSeries(valueSeries = []) {
        if (!Array.isArray(valueSeries) || valueSeries.length < 2) {
            return {
                status: AnalyticsStatus.UNAVAILABLE,
                error: 'INSUFFICIENT_DATA: At least 2 valuation data points required',
                drawdownAnalysis: null
            };
        }

        let peak = valueSeries[0].value;
        let peakDate = valueSeries[0].date;
        let peakIndex = 0;

        let maxDrawdown = 0;
        let maxPeakDate = peakDate;
        let maxTroughDate = peakDate;
        let maxRecoveryDate = null;

        const allDrawdowns = [];
        let inDrawdown = false;
        let currentDrawdownObj = null;

        for (let i = 0; i < valueSeries.length; i++) {
            const pt = valueSeries[i];
            const val = pt.value;
            const date = pt.date;

            if (val >= peak) {
                if (inDrawdown && currentDrawdownObj) {
                    currentDrawdownObj.recoveryDate = date;
                    currentDrawdownObj.recoveryIndex = i;
                    currentDrawdownObj.totalDurationDays = (new Date(date) - new Date(currentDrawdownObj.peakDate)) / (1000 * 60 * 60 * 24);
                    currentDrawdownObj.status = 'RECOVERED';
                    allDrawdowns.push({ ...currentDrawdownObj });
                    inDrawdown = false;
                    currentDrawdownObj = null;
                }
                peak = val;
                peakDate = date;
                peakIndex = i;
            } else {
                const currentDD = (peak - val) / peak;
                if (!inDrawdown) {
                    inDrawdown = true;
                    currentDrawdownObj = {
                        peakDate,
                        peakValue: peak,
                        troughDate: date,
                        troughValue: val,
                        maxDepth: currentDD,
                        status: 'IN_PROGRESS'
                    };
                } else if (currentDrawdownObj) {
                    if (currentDD > currentDrawdownObj.maxDepth) {
                        currentDrawdownObj.maxDepth = currentDD;
                        currentDrawdownObj.troughDate = date;
                        currentDrawdownObj.troughValue = val;
                    }
                }

                if (currentDD > maxDrawdown) {
                    maxDrawdown = currentDD;
                    maxPeakDate = peakDate;
                    maxTroughDate = date;
                }
            }
        }

        if (inDrawdown && currentDrawdownObj) {
            currentDrawdownObj.totalDurationDays = (new Date(valueSeries[valueSeries.length - 1].date) - new Date(currentDrawdownObj.peakDate)) / (1000 * 60 * 60 * 24);
            allDrawdowns.push({ ...currentDrawdownObj });
        }

        // Current state
        const lastPt = valueSeries[valueSeries.length - 1];
        const currentDrawdown = peak > 0 ? (peak - lastPt.value) / peak : 0;
        let stateEvent = DrawdownEvent.RECOVERY;

        if (currentDrawdown === 0) {
            stateEvent = DrawdownEvent.NEW_HIGH;
        } else if (currentDrawdown > 0 && !inDrawdown) {
            stateEvent = DrawdownEvent.NEW_DRAWDOWN;
        } else if (currentDrawdown >= maxDrawdown && maxDrawdown > 0) {
            stateEvent = DrawdownEvent.DEEPENING_DRAWDOWN;
        } else if (currentDrawdown > 0) {
            stateEvent = DrawdownEvent.DEEPENING_DRAWDOWN;
        }

        const isMaterial = currentDrawdown > 0.05 || maxDrawdown > 0.10;

        return {
            status: AnalyticsStatus.PASS,
            currentDrawdown,
            currentDrawdownPercentage: currentDrawdown * 100,
            maxDrawdown,
            maxDrawdownPercentage: maxDrawdown * 100,
            maxDrawdownPeakDate: maxPeakDate,
            maxDrawdownTroughDate: maxTroughDate,
            currentPeakDate: peakDate,
            currentPeakValue: peak,
            latestValue: lastPt.value,
            stateEvent,
            isMaterial,
            attentionEventTriggered: isMaterial,
            drawdownCount: allDrawdowns.length,
            historicalDrawdowns: allDrawdowns
        };
    }
}

export const drawdownEngine = new DrawdownEngine();
