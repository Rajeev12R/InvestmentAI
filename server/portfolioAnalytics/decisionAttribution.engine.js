/**
 * Deterministic Decision Attribution & Thesis Performance Tracking — Phase 12
 * Connects decisions to thesis expectations, actual Phase 11 Truth Facts, and realized returns.
 * The system NEVER labels a thesis 'WORKING' merely because stock price increased.
 */

import { AnalyticsStatus, DriverAssessment, ThesisStatus } from './portfolioAnalytics.types.js';

export class DecisionAttributionEngine {
    constructor() {}

    /**
     * Evaluates an individual holding's investment thesis against actual fundamental facts and realized performance.
     */
    evaluateHoldingThesis({
        ticker,
        decisionId,
        thesisTitle,
        expectedDrivers = [], // e.g. [{ metric: 'OPERATING_MARGIN', direction: 'EXPANSION', minDeltaBps: 100 }]
        actualFundamentalFacts = {}, // e.g. { OPERATING_MARGIN: { baseline: 0.28, latest: 0.304, deltaBps: 240, factId: 'FACT-123' } }
        pricePerformance = { return: 0.18, durationDays: 180 },
        thesisBreakers = [] // e.g. [{ metric: 'REVENUE_GROWTH', threshold: -0.05, breached: false }]
    }) {
        if (!ticker || !thesisTitle) {
            return {
                status: AnalyticsStatus.UNAVAILABLE,
                error: 'MISSING_PARAMETERS: Ticker and thesis title are required',
                evaluation: null
            };
        }

        const driverEvaluations = [];
        let supportedDrivers = 0;
        let contradictedDrivers = 0;
        let missingEvidenceDrivers = 0;

        for (const drv of expectedDrivers) {
            const fact = actualFundamentalFacts[drv.metric];
            if (!fact) {
                driverEvaluations.push({
                    driverMetric: drv.metric,
                    expectedDirection: drv.direction,
                    actualChange: null,
                    actualDelta: null,
                    evidenceFactId: 'FACT-UNSPECIFIED',
                    assessment: DriverAssessment.INSUFFICIENT_EVIDENCE,
                    rationale: `No verified fundamental fact found for metric ${drv.metric}`
                });
                missingEvidenceDrivers++;
                continue;
            }

            let isSupported = false;
            let isContradicted = false;
            const delta = fact.latest - fact.baseline;

            if (drv.direction === 'EXPANSION' || drv.direction === 'INCREASE' || drv.direction === 'ACCELERATION') {
                if (delta > 0) isSupported = true;
                else isContradicted = true;
            } else if (drv.direction === 'CONTRACTION' || drv.direction === 'DECREASE' || drv.direction === 'DELEVERAGING') {
                if (delta < 0) isSupported = true;
                else isContradicted = true;
            }

            const assessment = isSupported
                ? DriverAssessment.SUPPORTED
                : (isContradicted ? DriverAssessment.NOT_SUPPORTED : DriverAssessment.PARTIALLY_SUPPORTED);

            if (isSupported) supportedDrivers++;
            if (isContradicted) contradictedDrivers++;

            driverEvaluations.push({
                driverMetric: drv.metric,
                expectedDirection: drv.direction,
                baselineValue: fact.baseline,
                latestValue: fact.latest,
                actualDelta: delta,
                deltaBps: fact.deltaBps ?? (delta * 10000),
                evidenceFactId: fact.factId || 'FACT-UNSPECIFIED',
                assessment,
                rationale: `Expected ${drv.direction}, actual change is ${delta >= 0 ? '+' : ''}${delta.toFixed(4)}`
            });
        }

        // Breaker evaluation
        let breakerTriggered = false;
        const breakerDetails = [];
        for (const brk of thesisBreakers) {
            if (brk.breached) {
                breakerTriggered = true;
                breakerDetails.push({ ...brk, triggered: true });
            }
        }

        // Deterministic Thesis Status Logic:
        // NEVER infer working from price alone!
        let thesisStatus = ThesisStatus.INSUFFICIENT_DATA;
        let statusRationale = '';

        if (breakerTriggered) {
            thesisStatus = ThesisStatus.BROKEN;
            statusRationale = 'Critical thesis breaker conditions were breached';
        } else if (expectedDrivers.length === 0 || missingEvidenceDrivers === expectedDrivers.length) {
            thesisStatus = ThesisStatus.INSUFFICIENT_DATA;
            statusRationale = 'Insufficient fundamental evidence to validate thesis drivers';
        } else if (contradictedDrivers > 0 && supportedDrivers === 0) {
            thesisStatus = ThesisStatus.WEAKENING;
            statusRationale = `Expected drivers contradicted by real fundamental observations (${contradictedDrivers}/${expectedDrivers.length})`;
        } else if (supportedDrivers > 0 && contradictedDrivers > 0) {
            thesisStatus = ThesisStatus.MIXED;
            statusRationale = `Mixed fundamental driver realization: ${supportedDrivers} supported, ${contradictedDrivers} contradicted`;
        } else if (supportedDrivers > 0 && contradictedDrivers === 0 && missingEvidenceDrivers === 0) {
            thesisStatus = ThesisStatus.WORKING;
            statusRationale = `All fundamental drivers supported by empirical facts (${supportedDrivers}/${expectedDrivers.length})`;
        } else if (supportedDrivers > 0) {
            thesisStatus = ThesisStatus.WORKING;
            statusRationale = `${supportedDrivers} driver(s) empirically supported, remainder pending next report`;
        }

        // Causal Alignment Matrix
        const priceReturn = pricePerformance.return || 0;
        let causalAlignment = 'ALIGNED';
        if (thesisStatus === ThesisStatus.WORKING && priceReturn < 0) {
            causalAlignment = 'DISCONNECTED_MARKET_LAG'; // Fundamentals improved but price hasn't reacted yet
        } else if (thesisStatus === ThesisStatus.WEAKENING && priceReturn > 0) {
            causalAlignment = 'DISCONNECTED_SPECULATIVE_BUBBLE'; // Price up despite deteriorating thesis
        }

        return {
            status: AnalyticsStatus.PASS,
            ticker,
            decisionId: decisionId || `DEC-${ticker}-01`,
            thesisTitle,
            thesisStatus,
            statusRationale,
            driverEvaluations,
            breakers: breakerDetails,
            priceReturn,
            causalAlignment,
            decisionImpactRecommendation: thesisStatus === ThesisStatus.BROKEN
                ? 'RECOMMEND_FORMAL_DECISION_REVIEW_EXIT'
                : (thesisStatus === ThesisStatus.WEAKENING ? 'RECOMMEND_POSITION_SIZE_REVIEW' : 'MAINTAIN_THESIS')
        };
    }
}

export const decisionAttributionEngine = new DecisionAttributionEngine();
