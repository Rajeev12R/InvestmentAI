import { VALUATION_STATUS, createCalculatedResult, createUnavailableResult } from "./valuation.types.js";
import { calculateWACC, calculateFCFFDCF, generateSensitivityGrid } from "./dcf.engine.js";
import { calculateRelativeValuation } from "./multiples.engine.js";
import { solveReverseDCF } from "./reverseDcf.engine.js";
import { calculateScenarioValuation } from "./scenario.engine.js";
import { calculateModelAgreement } from "./modelAgreement.engine.js";
import { classifySector } from "./sector.classifier.js";

/**
 * Institutional Modular Valuation Engine
 * Synthesizes DCF, Relative Multiples, Reverse DCF, Scenarios, and Sensitivity Grids.
 * Calculates deterministic model agreement and evidence-based valuation confidence.
 */
export function executeValuationPipeline(state) {
    const fin = state.financials || {};
    const stock = state.stockData || {};
    const profile = state.companyProfile || {};
    const competitors = state.competitors || {};
    const timestamp = new Date().toISOString();

    const ticker = String(profile.ticker || stock.symbol || state.companyName || "").toUpperCase();
    const sector = profile.sector || fin.sector || "";
    const industry = profile.industry || fin.industry || "";
    const currentPrice = stock.currentPrice !== null && stock.currentPrice !== undefined && Number(stock.currentPrice) > 0
        ? Number(stock.currentPrice)
        : null;
    const marketCap = fin.marketCap !== null && fin.marketCap !== undefined && Number(fin.marketCap) > 0
        ? Number(fin.marketCap)
        : (currentPrice && stock.sharesOutstanding ? currentPrice * stock.sharesOutstanding : null);
    const sharesOutstanding = stock.sharesOutstanding !== null && stock.sharesOutstanding !== undefined && Number(stock.sharesOutstanding) > 0
        ? Number(stock.sharesOutstanding)
        : null;
    const beta = stock.beta !== null && stock.beta !== undefined && !isNaN(Number(stock.beta))
        ? Number(stock.beta)
        : null;
    const freeCashFlow = fin.freeCashFlow !== null && fin.freeCashFlow !== undefined && !isNaN(Number(fin.freeCashFlow))
        ? Number(fin.freeCashFlow)
        : null;
    const totalDebt = fin.totalDebt !== null && fin.totalDebt !== undefined && !isNaN(Number(fin.totalDebt))
        ? Number(fin.totalDebt)
        : null;
    const totalCash = fin.totalCash !== null && fin.totalCash !== undefined && !isNaN(Number(fin.totalCash))
        ? Number(fin.totalCash)
        : null;
    const eps = fin.trailingEps !== null && fin.trailingEps !== undefined && !isNaN(Number(fin.trailingEps))
        ? Number(fin.trailingEps)
        : null;
    const ebitda = fin.ebitda !== null && fin.ebitda !== undefined && !isNaN(Number(fin.ebitda))
        ? Number(fin.ebitda)
        : null;
    const totalRevenue = fin.totalRevenue !== null && fin.totalRevenue !== undefined && !isNaN(Number(fin.totalRevenue))
        ? Number(fin.totalRevenue)
        : null;
    const bookValuePerShare = fin.priceToBook && currentPrice
        ? Number((currentPrice / Number(fin.priceToBook)).toFixed(2))
        : null;
    const peers = competitors.primaryCompetitors || (Array.isArray(competitors) ? competitors : []);

    // 1. Sector Classification
    const sectorClassification = classifySector({ sector, industry }, ticker);

    // 2. WACC Engine
    const waccResult = calculateWACC({
        ticker,
        beta,
        marketCap,
        totalDebt
    });

    // 3. DCF Engine
    const dcfResult = calculateFCFFDCF({
        ticker,
        currentPrice,
        sharesOutstanding,
        freeCashFlow,
        totalRevenue,
        revenueGrowth: fin.revenueGrowth,
        operatingMargin: fin.operatingMargin,
        totalDebt,
        totalCash,
        waccObj: waccResult
    });

    // 4. Relative Multiples Engine (Phase 2B Sector & Multiple Intelligence)
    const relativeResult = calculateRelativeValuation({
        ticker,
        sector,
        industry,
        currentPrice,
        eps,
        ebitda,
        revenue: totalRevenue,
        totalDebt,
        totalCash,
        sharesOutstanding,
        bookValuePerShare,
        operatingMargin: fin.operatingMargin,
        ebitMargin: fin.ebitMargin,
        netMargin: fin.profitMargins,
        revenueGrowth: fin.revenueGrowth,
        roe: fin.returnOnEquity,
        roic: fin.returnOnAssets,
        peers
    });

    // 5. Reverse DCF Engine
    const reverseDcfResult = solveReverseDCF({
        currentPrice,
        sharesOutstanding,
        freeCashFlow,
        totalDebt,
        totalCash,
        waccObj: waccResult
    });

    // 6. Scenario Engine
    const scenarioResult = calculateScenarioValuation({
        ticker,
        currentPrice,
        sharesOutstanding,
        freeCashFlow,
        totalRevenue,
        revenueGrowth: fin.revenueGrowth,
        operatingMargin: fin.operatingMargin,
        totalDebt,
        totalCash,
        waccObj: waccResult
    });

    // 7. Sensitivity Table
    const sensitivityGrid = generateSensitivityGrid({
        baseWacc: waccResult.metadata?.wacc || null,
        baseTerminalGrowth: dcfResult.metadata?.terminalGrowthPercent ? dcfResult.metadata.terminalGrowthPercent / 100 : 0.025,
        freeCashFlow,
        sharesOutstanding,
        netDebt: (totalDebt !== null && totalCash !== null) ? (totalDebt - totalCash) : null,
        revenueGrowth: fin.revenueGrowth
    });

    // 8. Deterministic Model Agreement & Valuation Range Synthesis
    const agreementEval = calculateModelAgreement({
        DCF: dcfResult,
        RelativeValuation: relativeResult
    });

    const validModelTargets = [];
    if (dcfResult.status === VALUATION_STATUS.CALCULATED && dcfResult.metadata?.fairValue) {
        validModelTargets.push({ name: "DCF Model", fairValue: dcfResult.metadata.fairValue, weight: 0.60 });
    }
    if (relativeResult.status === VALUATION_STATUS.CALCULATED && relativeResult.metadata?.fairValue) {
        validModelTargets.push({ name: "Relative Multiples", fairValue: relativeResult.metadata.fairValue, weight: 0.40 });
    }

    let synthesizedFairValue = null;
    let valuationRange = null;
    let synthesisBreakdown = null;

    if (validModelTargets.length >= 2) {
        const values = validModelTargets.map(m => m.fairValue);
        const totalWeight = validModelTargets.reduce((a, b) => a + b.weight, 0);
        synthesizedFairValue = Number((validModelTargets.reduce((a, b) => a + (b.fairValue * b.weight), 0) / totalWeight).toFixed(2));

        const lowVal = Math.min(...values, scenarioResult.metadata?.scenarios?.bear?.fairValue || Math.min(...values));
        const highVal = Math.max(...values, scenarioResult.metadata?.scenarios?.bull?.fairValue || Math.max(...values));
        valuationRange = {
            low: Number(lowVal.toFixed(2)),
            midpoint: synthesizedFairValue,
            high: Number(highVal.toFixed(2))
        };

        synthesisBreakdown = {
            validModelCount: validModelTargets.length,
            modelStatus: "MULTI_MODEL",
            modelsEvaluated: validModelTargets.map(m => ({
                name: m.name,
                fairValue: m.fairValue,
                rawWeight: m.weight,
                normalizedWeight: Number((m.weight / totalWeight).toFixed(4)),
                contribution: Number((m.fairValue * (m.weight / totalWeight)).toFixed(2))
            })),
            formula: validModelTargets.map(m => `${m.name} (${m.fairValue}) × ${(m.weight / totalWeight * 100).toFixed(0)}%`).join(" + "),
            synthesizedFairValue
        };
    } else if (validModelTargets.length === 1) {
        synthesizedFairValue = validModelTargets[0].fairValue;
        valuationRange = {
            low: scenarioResult.metadata?.scenarios?.bear?.fairValue || synthesizedFairValue,
            midpoint: synthesizedFairValue,
            high: scenarioResult.metadata?.scenarios?.bull?.fairValue || synthesizedFairValue
        };
        synthesisBreakdown = {
            validModelCount: 1,
            modelStatus: "SINGLE_MODEL",
            modelsEvaluated: [{
                name: validModelTargets[0].name,
                fairValue: validModelTargets[0].fairValue,
                rawWeight: 1.0,
                normalizedWeight: 1.0,
                contribution: validModelTargets[0].fairValue
            }],
            formula: `${validModelTargets[0].name} (100%)`,
            synthesizedFairValue
        };
    } else {
        synthesisBreakdown = {
            validModelCount: 0,
            modelStatus: "NO_MODELS",
            modelsEvaluated: [],
            formula: "UNAVAILABLE",
            synthesizedFairValue: null
        };
    }

    const upsidePotential = synthesizedFairValue !== null && currentPrice
        ? Number((((synthesizedFairValue - currentPrice) / currentPrice) * 100).toFixed(2))
        : null;

    const marginOfSafety = synthesizedFairValue !== null && currentPrice && synthesizedFairValue > 0
        ? Number((((synthesizedFairValue - currentPrice) / synthesizedFairValue) * 100).toFixed(2))
        : null;

    let valuationRating = "UNAVAILABLE";
    if (upsidePotential !== null) {
        if (upsidePotential > 15) valuationRating = "UNDERVALUED";
        else if (upsidePotential < -12) valuationRating = "OVERVALUED";
        else valuationRating = "FAIRLY VALUED";
    }

    // 9. Evidence-Based Valuation Confidence Score
    let valuationConfidence = null;
    let confidenceLevel = "UNAVAILABLE";

    if (synthesizedFairValue !== null) {
        let confidencePoints = 0;
        // Grounded Core Financial Evidence (up to 40 pts)
        if (freeCashFlow !== null && freeCashFlow > 0) confidencePoints += 20;
        if (totalDebt !== null && totalCash !== null) confidencePoints += 10;
        if (sharesOutstanding !== null && sharesOutstanding > 0) confidencePoints += 10;

        // WACC & Market Provenance (up to 20 pts)
        if (beta !== null) confidencePoints += 10;
        if (waccResult.status === VALUATION_STATUS.CALCULATED) confidencePoints += 10;

        // Model Validation & Convergence (up to 30 pts)
        if (dcfResult.status === VALUATION_STATUS.CALCULATED) confidencePoints += 15;
        if (relativeResult.status === VALUATION_STATUS.CALCULATED) confidencePoints += 15;
        if (agreementEval && agreementEval.coefficientOfVariation !== null && agreementEval.coefficientOfVariation <= 0.20) {
            confidencePoints += 10;
        }

        valuationConfidence = Math.max(30, Math.min(95, confidencePoints));
        confidenceLevel = valuationConfidence >= 75 ? "HIGH" : valuationConfidence >= 55 ? "MODERATE" : "LOW";
    }

    return {
        status: synthesizedFairValue !== null ? VALUATION_STATUS.CALCULATED : VALUATION_STATUS.UNAVAILABLE,
        currentPrice,
        fairValuePriceTarget: synthesizedFairValue,
        dcfValue: dcfResult.metadata?.fairValue ?? null,
        upsidePotential,
        marginOfSafety,
        valuationRating,
        dcfStatus: dcfResult.status,
        valuationConfidence,
        confidence: {
            score: valuationConfidence,
            level: confidenceLevel,
            status: valuationConfidence !== null ? VALUATION_STATUS.CALCULATED : VALUATION_STATUS.UNAVAILABLE
        },

        dcf: {
            fairValue: dcfResult.metadata?.fairValue ?? null,
            status: dcfResult.status,
            reason: dcfResult.reason || null,
            upside: dcfResult.metadata?.upsidePotential ?? null,
            upsidePotential: dcfResult.metadata?.upsidePotential ?? null,
            marginOfSafety: dcfResult.metadata?.marginOfSafety ?? null,
            wacc: waccResult.metadata?.waccPercent ?? null,
            terminalGrowth: dcfResult.metadata?.terminalGrowthPercent ?? null,
            pvExplicitForecast: dcfResult.metadata?.pvExplicitForecast ?? null,
            terminalValue: dcfResult.metadata?.terminalValue ?? null,
            enterpriseValue: dcfResult.metadata?.enterpriseValue ?? null,
            equityValue: dcfResult.metadata?.equityValue ?? null,
            netDebt: dcfResult.metadata?.netDebt ?? null,
            sharesOutstanding: dcfResult.metadata?.sharesOutstanding ?? null,
            forecast: dcfResult.metadata?.forecast ?? [],
            method: "5-Year Discrete FCFF Model"
        },

        waccBreakdown: {
            calculatedWacc: waccResult.metadata?.waccPercent ?? null,
            status: waccResult.status,
            riskFreeRate: waccResult.metadata?.riskFreeRate ?? null,
            riskFreeSource: waccResult.metadata?.riskFreeSource ?? "UNAVAILABLE",
            effectiveDate: waccResult.metadata?.effectiveDate ?? "2026 Sovereign Benchmark",
            equityRiskPremium: waccResult.metadata?.equityRiskPremium ?? 5.5,
            costOfEquity: waccResult.metadata?.costOfEquity ?? null,
            costOfDebt: waccResult.metadata?.costOfDebt ?? null,
            equityWeight: waccResult.metadata?.equityWeight ?? null,
            debtWeight: waccResult.metadata?.debtWeight ?? null,
            beta: waccResult.metadata?.beta ?? null,
            retrievedAt: timestamp
        },

        relativeValuation: {
            fairValue: relativeResult.metadata?.fairValue ?? null,
            status: relativeResult.status,
            reason: relativeResult.reason || null,
            upside: relativeResult.metadata?.upsidePotential ?? null,
            peerCount: relativeResult.metadata?.peerCount ?? 0,
            sectorClassification: sectorClassification.canonicalSector,
            rawSector: sectorClassification.rawSector,
            rawIndustry: sectorClassification.rawIndustry,
            framework: relativeResult.metadata?.framework ?? sectorClassification.framework,
            peers: relativeResult.metadata?.peers ?? [],
            excludedPeers: relativeResult.metadata?.excludedPeers ?? [],
            outlierAudit: relativeResult.metadata?.outlierAudit ?? [],
            distributions: relativeResult.metadata?.distributions ?? {},
            zScores: relativeResult.metadata?.zScores ?? {},
            ranges: relativeResult.metadata?.ranges ?? null,
            methods: relativeResult.metadata?.methods ?? {},
            models: relativeResult.metadata?.models ?? {}
        },

        reverseDcf: {
            impliedGrowthRate: reverseDcfResult.metadata?.impliedGrowthRate ?? null,
            impliedGrowthPercent: reverseDcfResult.metadata?.impliedGrowthPercent ?? null,
            marketPrice: currentPrice,
            status: reverseDcfResult.status,
            reason: reverseDcfResult.reason || null,
            method: reverseDcfResult.metadata?.method ?? "Exact Bisection Root Solver",
            expectationAnalysis: reverseDcfResult.metadata?.expectationAnalysis ?? null
        },

        scenarios: scenarioResult.metadata?.scenarios ?? null,
        sensitivityGrid,
        valuationRange,
        modelAgreement: agreementEval,
        synthesisBreakdown,

        assumptions: {
            discountRate: waccResult.metadata?.waccPercent ?? null,
            terminalGrowthRate: dcfResult.metadata?.terminalGrowthPercent ?? 2.5,
            freeCashFlow: freeCashFlow !== null ? Math.round(freeCashFlow) : null,
            sharesOutstanding: sharesOutstanding !== null ? Math.round(sharesOutstanding) : null,
            totalCash: totalCash !== null ? Math.round(totalCash) : null,
            totalDebt: totalDebt !== null ? Math.round(totalDebt) : null
        },
        projectedFCF: dcfResult.metadata?.forecast ?? []
    };
}
