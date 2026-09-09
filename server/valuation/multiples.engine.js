import { VALUATION_STATUS, createCalculatedResult, createUnavailableResult } from "./valuation.types.js";
import { classifySector } from "./sector.classifier.js";
import { selectPeers } from "./peerSelection.engine.js";
import { normalizePeerMetrics } from "./peerNormalization.engine.js";
import { calculateZScores } from "./zScore.engine.js";
import { calculateRelativeValuationRanges } from "./relativeValuation.engine.js";
import { VALUATION_METHODS } from "./sector.types.js";

/**
 * Relative Multiples Valuation Engine (Phase 2B Upgrade).
 * Evaluates P/E, EV/EBITDA, P/B, and EV/Revenue against clean peer distributions.
 * Incorporates sector-aware methodology, statistical Z-scores, and 3-point ranges.
 */
export function calculateRelativeValuation({
    ticker = "",
    sector = "",
    industry = "",
    currentPrice = null,
    eps = null,
    ebitda = null,
    revenue = null,
    totalDebt = null,
    totalCash = null,
    sharesOutstanding = null,
    bookValuePerShare = null,
    operatingMargin = null,
    ebitMargin = null,
    netMargin = null,
    revenueGrowth = null,
    roe = null,
    roic = null,
    peers = []
}) {
    const timestamp = new Date().toISOString();
    const cleanTicker = String(ticker || "").toUpperCase().trim();

    // 1. Deterministic Sector Classification
    const sectorClassification = classifySector({ sector, industry }, cleanTicker);
    const framework = sectorClassification.framework;

    // 2. Peer Selection & Validation (Filters ETFs, Indexes, self)
    const peerSelection = selectPeers(
        {
            ticker: cleanTicker,
            sector: sectorClassification.canonicalSector,
            industry
        },
        peers,
        { minPeers: 1 } // Allow calculation with at least 1 valid peer, full stats when >= 2
    );

    if (peerSelection.status === VALUATION_STATUS.UNAVAILABLE || peerSelection.peerCount === 0) {
        return createUnavailableResult({
            name: "Relative Multiples Valuation Model",
            reason: peerSelection.reason || "Insufficient comparable operating company peers found in same industry",
            inputs: ["competitors.primaryCompetitors"]
        });
    }

    // 3. Normalization & Outlier Filtering
    const peerNorm = normalizePeerMetrics(peerSelection.selectedPeers);

    // 4. Statistical Z-Score Benchmarking
    const companyMetrics = {
        pe: eps && currentPrice && eps > 0 ? Number((currentPrice / eps).toFixed(2)) : null,
        evEbitda: null, // Derived below if available
        pb: bookValuePerShare && currentPrice && bookValuePerShare > 0 ? Number((currentPrice / bookValuePerShare).toFixed(2)) : null,
        evRevenue: null,
        revenueGrowth: revenueGrowth !== null && revenueGrowth !== undefined ? Number(revenueGrowth) : null,
        ebitdaMargin: (ebitda !== null && revenue !== null && revenue > 0) ? Number((ebitda / revenue).toFixed(4)) : null,
        ebitMargin: ebitMargin !== null && ebitMargin !== undefined ? Number(ebitMargin) : null,
        netMargin: netMargin !== null && netMargin !== undefined ? Number(netMargin) : null,
        roe: roe !== null && roe !== undefined ? Number(roe) : null,
        roic: roic !== null && roic !== undefined ? Number(roic) : null
    };

    if (currentPrice && sharesOutstanding && totalDebt !== null && totalCash !== null) {
        const ev = (currentPrice * sharesOutstanding) + totalDebt - totalCash;
        if (ebitda && ebitda > 0) companyMetrics.evEbitda = Number((ev / ebitda).toFixed(2));
        if (revenue && revenue > 0) companyMetrics.evRevenue = Number((ev / revenue).toFixed(2));
    }

    const zScores = calculateZScores(companyMetrics, peerNorm.distributions);

    // 5. Valuation Ranges Calculation
    const valuationRanges = calculateRelativeValuationRanges({
        ticker: cleanTicker,
        eps,
        ebitda,
        revenue,
        bookValuePerShare,
        totalDebt,
        totalCash,
        shares: sharesOutstanding,
        framework,
        distributions: peerNorm.distributions
    });

    // 6. Build Method Models for backwards-compatibility and granular inspection
    const models = {};
    const methods = valuationRanges.methods || {};

    if (methods[VALUATION_METHODS.PE]) {
        const peRes = methods[VALUATION_METHODS.PE];
        models.peModel = {
            name: "P/E Relative Model",
            fairValue: peRes.impliedValues?.base ?? null,
            status: peRes.status,
            reason: peRes.reason,
            formula: peRes.formula || "Company EPS * Peer Median P/E",
            inputs: ["financial.trailingEps", "peer.medianPE"],
            companyEPS: eps !== null ? Number(Number(eps).toFixed(2)) : null,
            peerMedianPE: peerNorm.distributions.pe?.median ?? null,
            peerDistribution: peerNorm.distributions.pe || null,
            range: peRes.impliedValues || null
        };
    }

    if (methods[VALUATION_METHODS.EV_EBITDA]) {
        const evRes = methods[VALUATION_METHODS.EV_EBITDA];
        const impliedEV = (ebitda && peerNorm.distributions.evEbitda?.median) ? (ebitda * peerNorm.distributions.evEbitda.median) : null;
        const netDebt = (totalDebt !== null && totalCash !== null) ? (totalDebt - totalCash) : null;
        const equityVal = (impliedEV !== null && netDebt !== null) ? (impliedEV - netDebt) : null;

        models.evEbitdaModel = {
            name: "EV/EBITDA Relative Model",
            fairValue: evRes.impliedValues?.base ?? null,
            status: evRes.status,
            reason: evRes.reason,
            formula: evRes.formula || "(Company EBITDA * Peer Median EV/EBITDA - Net Debt) / Shares Outstanding",
            inputs: ["financial.ebitda", "peer.medianEV_EBITDA", "financial.totalDebt", "financial.totalCash", "market.sharesOutstanding"],
            companyEBITDA: ebitda !== null ? Number(ebitda) : null,
            peerMedianEV_EBITDA: peerNorm.distributions.evEbitda?.median ?? null,
            impliedEV: impliedEV !== null ? Math.round(impliedEV) : null,
            netDebt: netDebt !== null ? Math.round(netDebt) : null,
            equityValue: equityVal !== null ? Math.round(equityVal) : null,
            peerDistribution: peerNorm.distributions.evEbitda || null,
            range: evRes.impliedValues || null
        };
    }

    if (methods[VALUATION_METHODS.PRICE_TO_BOOK]) {
        const pbRes = methods[VALUATION_METHODS.PRICE_TO_BOOK];
        models.pbModel = {
            name: "P/B Relative Model",
            fairValue: pbRes.impliedValues?.base ?? null,
            status: pbRes.status,
            reason: pbRes.reason,
            formula: pbRes.formula || "Company Book Value Per Share * Peer Median P/B",
            inputs: ["financial.priceToBook", "peer.medianPB"],
            companyBVPS: bookValuePerShare !== null ? Number(Number(bookValuePerShare).toFixed(2)) : null,
            peerMedianPB: peerNorm.distributions.pb?.median ?? null,
            peerDistribution: peerNorm.distributions.pb || null,
            range: pbRes.impliedValues || null
        };
    }

    if (methods[VALUATION_METHODS.EV_REVENUE]) {
        const evRevRes = methods[VALUATION_METHODS.EV_REVENUE];
        models.evRevenueModel = {
            name: "EV/Revenue Relative Model",
            fairValue: evRevRes.impliedValues?.base ?? null,
            status: evRevRes.status,
            reason: evRevRes.reason,
            formula: evRevRes.formula || "(Company Revenue * Peer Median EV/Revenue - Net Debt) / Shares Outstanding",
            inputs: ["financial.totalRevenue", "peer.medianEV_Revenue", "financial.totalDebt", "financial.totalCash", "market.sharesOutstanding"],
            companyRevenue: revenue !== null ? Number(revenue) : null,
            peerMedianEV_Revenue: peerNorm.distributions.evRevenue?.median ?? null,
            peerDistribution: peerNorm.distributions.evRevenue || null,
            range: evRevRes.impliedValues || null
        };
    }

    const compositeFairValue = valuationRanges.compositeRange?.base ?? null;
    const price = currentPrice !== null && currentPrice !== undefined && Number(currentPrice) > 0 ? Number(currentPrice) : null;
    const upsidePotential = compositeFairValue !== null && price
        ? Number((((compositeFairValue - price) / price) * 100).toFixed(1))
        : null;

    if (valuationRanges.status === VALUATION_STATUS.UNAVAILABLE || compositeFairValue === null) {
        return createUnavailableResult({
            name: "Relative Multiples Valuation Model",
            reason: valuationRanges.reason || "Unable to compute valid multiple valuations from peer distributions",
            inputs: ["peer.distributions", "financial.facts"]
        });
    }

    return createCalculatedResult({
        name: "Relative Multiples Valuation Model",
        value: compositeFairValue,
        status: VALUATION_STATUS.CALCULATED,
        formula: "Weighted Average of Sector Multiples (P/E, EV/EBITDA, P/B, EV/Revenue)",
        inputs: valuationRanges.validMethods.map(m => `peer.${m}`),
        provenance: {
            provider: "InvestmentAI Phase 2B Relative Valuation Engine",
            sourceType: "DERIVED_CALCULATION",
            retrievedAt: timestamp
        },
        metadata: {
            fairValue: compositeFairValue,
            currentPrice: price,
            upsidePotential,
            peerCount: peerSelection.peerCount,
            peers: peerSelection.selectedPeers,
            excludedPeers: peerSelection.excludedPeers,
            outlierAudit: peerNorm.outlierAudit,
            distributions: peerNorm.distributions,
            zScores,
            ranges: valuationRanges.compositeRange,
            methods: valuationRanges.methods,
            models,
            sectorClassification: sectorClassification.canonicalSector,
            framework
        }
    });
}
