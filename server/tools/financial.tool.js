import { scrapeQuotePage } from "../services/yahooFinance.service.js";

/**
 * Standard Source Hierarchy for Truth Layer Invariant 7
 */
export const SOURCE_HIERARCHY = {
    REGULATORY_FILING: 1,
    COMPANY_IR_DISCLOSURE: 2,
    EXCHANGE_DATA: 3,
    AGGREGATED_FINANCIAL_DATA: 4,
    NEWS_PROVIDER: 5,
    DERIVED_CALCULATION: 6,
    ESTIMATE: 7
};

/**
 * Normalizes primary financial data into Canonical Fact Representations.
 * Invariants:
 * 1. Missing ≠ 0. Missing data is null and status is UNAVAILABLE.
 * 2. Source is honestly labeled as Yahoo Finance / Aggregated Financial Data.
 * 3. Exact formulas and input dependencies are exposed.
 * 4. No undocumented heuristics or silent number-clamping.
 */
export async function getFinancialData(symbol) {
    try {
        const { quoteSummary } = await scrapeQuotePage(symbol);

        if (!quoteSummary) {
            throw new Error(`Failed to load financial statistics for ${symbol}`);
        }

        const fd = quoteSummary.financialData || {};
        const dks = quoteSummary.defaultKeyStatistics || {};
        const sd = quoteSummary.summaryDetail || {};
        const pr = quoteSummary.price || {};
        const retrievedAt = new Date().toISOString();

        // Helper to construct a canonical Fact object
        function buildFact({ id, value, status, sourceId, formula = null, inputs = null, assumption = null, periodType = "TTM" }) {
            const isAvail = value !== undefined && value !== null && !isNaN(Number(value));
            const factStatus = isAvail ? status : "UNAVAILABLE";

            let sourceObj;
            if (factStatus === "CALCULATED") {
                sourceObj = {
                    provider: "InvestmentAI Deterministic Engine",
                    sourceType: "DERIVED_CALCULATION",
                    sourceId: formula || "Deterministic Formula",
                    hierarchyRank: SOURCE_HIERARCHY.DERIVED_CALCULATION
                };
            } else if (factStatus === "ESTIMATED") {
                sourceObj = {
                    provider: "InvestmentAI Estimation Engine",
                    sourceType: "ESTIMATE",
                    sourceId: assumption || "Explicit Estimation Assumption",
                    hierarchyRank: SOURCE_HIERARCHY.ESTIMATE
                };
            } else if (factStatus === "GROUNDED") {
                sourceObj = {
                    provider: "Yahoo Finance",
                    sourceType: "AGGREGATED_FINANCIAL_DATA",
                    sourceId: sourceId || "quoteSummary",
                    hierarchyRank: SOURCE_HIERARCHY.AGGREGATED_FINANCIAL_DATA
                };
            } else {
                sourceObj = {
                    provider: "Yahoo Finance",
                    sourceType: "AGGREGATED_FINANCIAL_DATA",
                    sourceId: sourceId || "quoteSummary",
                    hierarchyRank: SOURCE_HIERARCHY.AGGREGATED_FINANCIAL_DATA
                };
            }

            return {
                id,
                value: isAvail ? Number(value) : null,
                status: factStatus,
                source: sourceObj,
                retrievedAt,
                period: {
                    type: periodType,
                    startDate: null,
                    endDate: null
                },
                formula,
                inputs,
                assumption
            };
        }

        const facts = {};

        // 1. Primary Grounded Facts from Data Feed
        facts["financial.totalRevenue"] = buildFact({
            id: "financial.totalRevenue",
            value: fd.totalRevenue,
            status: "GROUNDED",
            sourceId: "financialData.totalRevenue"
        });

        facts["financial.revenueGrowth"] = buildFact({
            id: "financial.revenueGrowth",
            value: fd.revenueGrowth,
            status: "GROUNDED",
            sourceId: "financialData.revenueGrowth"
        });

        facts["financial.netIncome"] = buildFact({
            id: "financial.netIncome",
            value: fd.netIncomeToCommon,
            status: "GROUNDED",
            sourceId: "financialData.netIncomeToCommon"
        });

        facts["financial.operatingMargins"] = buildFact({
            id: "financial.operatingMargins",
            value: fd.operatingMargins,
            status: "GROUNDED",
            sourceId: "financialData.operatingMargins"
        });

        facts["financial.profitMargins"] = buildFact({
            id: "financial.profitMargins",
            value: fd.profitMargins,
            status: "GROUNDED",
            sourceId: "financialData.profitMargins"
        });

        facts["financial.grossMargins"] = buildFact({
            id: "financial.grossMargins",
            value: fd.grossMargins,
            status: "GROUNDED",
            sourceId: "financialData.grossMargins"
        });

        facts["financial.operatingCashFlow"] = buildFact({
            id: "financial.operatingCashFlow",
            value: fd.operatingCashflow,
            status: "GROUNDED",
            sourceId: "financialData.operatingCashflow"
        });

        facts["financial.freeCashFlow"] = buildFact({
            id: "financial.freeCashFlow",
            value: fd.freeCashflow,
            status: "GROUNDED",
            sourceId: "financialData.freeCashflow"
        });

        facts["financial.totalDebt"] = buildFact({
            id: "financial.totalDebt",
            value: fd.totalDebt,
            status: "GROUNDED",
            sourceId: "financialData.totalDebt",
            periodType: "LATEST_BALANCE_SHEET"
        });

        facts["financial.totalCash"] = buildFact({
            id: "financial.totalCash",
            value: fd.totalCash,
            status: "GROUNDED",
            sourceId: "financialData.totalCash",
            periodType: "LATEST_BALANCE_SHEET"
        });

        facts["financial.currentRatio"] = buildFact({
            id: "financial.currentRatio",
            value: fd.currentRatio,
            status: "GROUNDED",
            sourceId: "financialData.currentRatio",
            periodType: "LATEST_BALANCE_SHEET"
        });

        facts["financial.quickRatio"] = buildFact({
            id: "financial.quickRatio",
            value: fd.quickRatio,
            status: "GROUNDED",
            sourceId: "financialData.quickRatio",
            periodType: "LATEST_BALANCE_SHEET"
        });

        facts["financial.ebitda"] = buildFact({
            id: "financial.ebitda",
            value: fd.ebitda,
            status: "GROUNDED",
            sourceId: "financialData.ebitda"
        });

        facts["financial.returnOnEquity"] = buildFact({
            id: "financial.returnOnEquity",
            value: fd.returnOnEquity,
            status: "GROUNDED",
            sourceId: "financialData.returnOnEquity"
        });

        facts["financial.returnOnAssets"] = buildFact({
            id: "financial.returnOnAssets",
            value: fd.returnOnAssets,
            status: "GROUNDED",
            sourceId: "financialData.returnOnAssets"
        });

        facts["financial.marketCap"] = buildFact({
            id: "financial.marketCap",
            value: pr.marketCap,
            status: "GROUNDED",
            sourceId: "price.marketCap",
            periodType: "REALTIME"
        });

        facts["financial.enterpriseValue"] = buildFact({
            id: "financial.enterpriseValue",
            value: dks.enterpriseValue,
            status: "GROUNDED",
            sourceId: "defaultKeyStatistics.enterpriseValue",
            periodType: "REALTIME"
        });

        facts["financial.trailingPE"] = buildFact({
            id: "financial.trailingPE",
            value: sd.trailingPE,
            status: "GROUNDED",
            sourceId: "summaryDetail.trailingPE"
        });

        facts["financial.forwardPE"] = buildFact({
            id: "financial.forwardPE",
            value: sd.forwardPE,
            status: "GROUNDED",
            sourceId: "summaryDetail.forwardPE"
        });

        facts["financial.priceToBook"] = buildFact({
            id: "financial.priceToBook",
            value: dks.priceToBook,
            status: "GROUNDED",
            sourceId: "defaultKeyStatistics.priceToBook"
        });

        facts["financial.trailingEps"] = buildFact({
            id: "financial.trailingEps",
            value: dks.trailingEps,
            status: "GROUNDED",
            sourceId: "defaultKeyStatistics.trailingEps"
        });

        facts["financial.dividendYield"] = buildFact({
            id: "financial.dividendYield",
            value: sd.dividendYield,
            status: "GROUNDED",
            sourceId: "summaryDetail.dividendYield"
        });

        // 2. Deterministic CALCULATED Facts
        // Operating Income (EBIT) = totalRevenue * operatingMargins
        let opIncomeVal = null;
        let opIncomeStatus = "UNAVAILABLE";
        const revFact = facts["financial.totalRevenue"];
        const opMarginFact = facts["financial.operatingMargins"];

        if (revFact.value !== null && opMarginFact.value !== null) {
            opIncomeVal = revFact.value * opMarginFact.value;
            opIncomeStatus = "CALCULATED";
        }
        facts["financial.operatingIncome"] = buildFact({
            id: "financial.operatingIncome",
            value: opIncomeVal,
            status: opIncomeStatus,
            formula: "totalRevenue * operatingMargin",
            inputs: ["financial.totalRevenue", "financial.operatingMargins"]
        });

        // Net Debt = totalDebt - totalCash (ONLY valid if BOTH exist)
        let netDebtVal = null;
        let netDebtStatus = "UNAVAILABLE";
        const debtFact = facts["financial.totalDebt"];
        const cashFact = facts["financial.totalCash"];

        if (debtFact.value !== null && cashFact.value !== null) {
            netDebtVal = debtFact.value - cashFact.value;
            netDebtStatus = "CALCULATED";
        }
        facts["financial.netDebt"] = buildFact({
            id: "financial.netDebt",
            value: netDebtVal,
            status: netDebtStatus,
            formula: "totalDebt - totalCash",
            inputs: ["financial.totalDebt", "financial.totalCash"],
            periodType: "LATEST_BALANCE_SHEET"
        });

        // Capital Expenditures = operatingCashFlow - freeCashFlow (exact mathematical difference)
        let capexVal = null;
        let capexStatus = "UNAVAILABLE";
        const ocfFact = facts["financial.operatingCashFlow"];
        const fcfFact = facts["financial.freeCashFlow"];

        if (ocfFact.value !== null && fcfFact.value !== null) {
            capexVal = ocfFact.value - fcfFact.value;
            capexStatus = "CALCULATED";
        }
        facts["financial.capitalExpenditures"] = buildFact({
            id: "financial.capitalExpenditures",
            value: capexVal,
            status: capexStatus,
            formula: "operatingCashFlow - freeCashFlow",
            inputs: ["financial.operatingCashFlow", "financial.freeCashFlow"]
        });

        // Debt to EBITDA
        let debtToEbitdaVal = null;
        let debtToEbitdaStatus = "UNAVAILABLE";
        const ebitdaFact = facts["financial.ebitda"];

        if (debtFact.value !== null && ebitdaFact.value !== null && ebitdaFact.value > 0) {
            debtToEbitdaVal = debtFact.value / ebitdaFact.value;
            debtToEbitdaStatus = "CALCULATED";
        }
        facts["financial.debtToEbitda"] = buildFact({
            id: "financial.debtToEbitda",
            value: debtToEbitdaVal,
            status: debtToEbitdaStatus,
            formula: "totalDebt / ebitda",
            inputs: ["financial.totalDebt", "financial.ebitda"]
        });

        // Net Debt to EBITDA
        let netDebtToEbitdaVal = null;
        let netDebtToEbitdaStatus = "UNAVAILABLE";
        const netDebtFact = facts["financial.netDebt"];

        if (netDebtFact.value !== null && ebitdaFact.value !== null && ebitdaFact.value > 0) {
            netDebtToEbitdaVal = netDebtFact.value / ebitdaFact.value;
            netDebtToEbitdaStatus = "CALCULATED";
        }
        facts["financial.netDebtToEbitda"] = buildFact({
            id: "financial.netDebtToEbitda",
            value: netDebtToEbitdaVal,
            status: netDebtToEbitdaStatus,
            formula: "netDebt / ebitda",
            inputs: ["financial.netDebt", "financial.ebitda"]
        });

        // ROIC (Return on Invested Capital)
        // Explicitly labeled as ESTIMATED because it uses an assumed 22% statutory corporate tax rate benchmark
        let roicVal = null;
        let roicStatus = "UNAVAILABLE";
        const mktCapFact = facts["financial.marketCap"];
        const opIncFact = facts["financial.operatingIncome"];

        if (opIncFact.value !== null && mktCapFact.value !== null && netDebtFact.value !== null) {
            const investedCapital = mktCapFact.value + netDebtFact.value;
            if (investedCapital > 0) {
                const nopatEstimated = opIncFact.value * (1 - 0.22);
                roicVal = nopatEstimated / investedCapital;
                roicStatus = "ESTIMATED";
            }
        }
        facts["financial.roic"] = buildFact({
            id: "financial.roic",
            value: roicVal,
            status: roicStatus,
            formula: "(financial.operatingIncome * (1 - estimatedTaxRate)) / (financial.marketCap + financial.netDebt)",
            inputs: ["financial.operatingIncome", "financial.marketCap", "financial.netDebt"],
            assumption: "Assumes standard 22% corporate tax rate benchmark for NOPAT derivation"
        });

        // Return authoritative Fact Registry alongside backward-compatible numerical accessors
        return {
            // Backward-compatible numerical accessors (null if unavailable)
            totalRevenue: facts["financial.totalRevenue"].value,
            revenue: facts["financial.totalRevenue"].value,
            revenueGrowth: facts["financial.revenueGrowth"].value,
            netIncome: facts["financial.netIncome"].value,
            operatingIncome: facts["financial.operatingIncome"].value,
            ebitda: facts["financial.ebitda"].value,
            operatingMargin: facts["financial.operatingMargins"].value,
            profitMargin: facts["financial.profitMargins"].value,
            grossMargin: facts["financial.grossMargins"].value,
            freeCashFlow: facts["financial.freeCashFlow"].value,
            operatingCashFlow: facts["financial.operatingCashFlow"].value,
            capitalExpenditures: facts["financial.capitalExpenditures"].value,
            totalCash: facts["financial.totalCash"].value,
            totalDebt: facts["financial.totalDebt"].value,
            netDebt: facts["financial.netDebt"].value,
            debtToEbitda: facts["financial.debtToEbitda"].value,
            netDebtToEbitda: facts["financial.netDebtToEbitda"].value,
            currentRatio: facts["financial.currentRatio"].value,
            quickRatio: facts["financial.quickRatio"].value,
            marketCap: facts["financial.marketCap"].value,
            enterpriseValue: facts["financial.enterpriseValue"].value,
            peRatio: facts["financial.trailingPE"].value,
            trailingPE: facts["financial.trailingPE"].value,
            forwardPE: facts["financial.forwardPE"].value,
            priceToBook: facts["financial.priceToBook"].value,
            eps: facts["financial.trailingEps"].value,
            roe: facts["financial.returnOnEquity"].value,
            roa: facts["financial.returnOnAssets"].value,
            roic: facts["financial.roic"].value,
            dividendYield: facts["financial.dividendYield"].value,
            currency: pr.currency || "USD",
            filingPeriod: "TTM (Trailing Twelve Months)",

            // Authoritative Canonical Facts Registry
            facts
        };

    } catch (error) {
        console.error("Financial Tool Error:", error.message);
        throw error;
    }
}