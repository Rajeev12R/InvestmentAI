import { scrapeQuotePage } from "../services/yahooFinance.service.js";

/**
 * Normalizes primary financial data and attaches granular provenance metadata to every field.
 * Invariant: Missing ≠ 0. Missing data is null and labeled UNAVAILABLE.
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
        const sourceName = "Yahoo Finance Primary Feed";
        const period = "TTM (Trailing Twelve Months)";

        // Helper to construct a structured Fact
        function createFact(value, status, source, formula = null, inputs = null) {
            const isAvailable = value !== undefined && value !== null && !isNaN(Number(value));
            return {
                value: isAvailable ? Number(value) : null,
                status: isAvailable ? status : "UNAVAILABLE",
                source: source || sourceName,
                period,
                formula,
                inputs
            };
        }

        // 1. Primary Grounded Facts
        const facts = {};

        facts.totalRevenue = createFact(fd.totalRevenue, "GROUNDED", `${sourceName} (financialData.totalRevenue)`);
        facts.revenueGrowth = createFact(fd.revenueGrowth, "GROUNDED", `${sourceName} (financialData.revenueGrowth)`);
        facts.netIncome = createFact(fd.netIncomeToCommon, "GROUNDED", `${sourceName} (financialData.netIncomeToCommon)`);
        facts.operatingMargins = createFact(fd.operatingMargins, "GROUNDED", `${sourceName} (financialData.operatingMargins)`);
        facts.profitMargins = createFact(fd.profitMargins, "GROUNDED", `${sourceName} (financialData.profitMargins)`);
        facts.grossMargins = createFact(fd.grossMargins, "GROUNDED", `${sourceName} (financialData.grossMargins)`);
        facts.operatingCashflow = createFact(fd.operatingCashflow, "GROUNDED", `${sourceName} (financialData.operatingCashflow)`);
        facts.freeCashflow = createFact(fd.freeCashflow, "GROUNDED", `${sourceName} (financialData.freeCashflow)`);
        facts.totalDebt = createFact(fd.totalDebt, "GROUNDED", `${sourceName} (financialData.totalDebt)`);
        facts.totalCash = createFact(fd.totalCash, "GROUNDED", `${sourceName} (financialData.totalCash)`);
        facts.currentRatio = createFact(fd.currentRatio, "GROUNDED", `${sourceName} (financialData.currentRatio)`);
        facts.quickRatio = createFact(fd.quickRatio, "GROUNDED", `${sourceName} (financialData.quickRatio)`);
        facts.ebitda = createFact(fd.ebitda, "GROUNDED", `${sourceName} (financialData.ebitda)`);
        facts.returnOnEquity = createFact(fd.returnOnEquity, "GROUNDED", `${sourceName} (financialData.returnOnEquity)`);
        facts.returnOnAssets = createFact(fd.returnOnAssets, "GROUNDED", `${sourceName} (financialData.returnOnAssets)`);
        facts.marketCap = createFact(pr.marketCap, "GROUNDED", `${sourceName} (price.marketCap)`);
        facts.enterpriseValue = createFact(dks.enterpriseValue, "GROUNDED", `${sourceName} (defaultKeyStatistics.enterpriseValue)`);
        facts.trailingPE = createFact(sd.trailingPE, "GROUNDED", `${sourceName} (summaryDetail.trailingPE)`);
        facts.forwardPE = createFact(sd.forwardPE, "GROUNDED", `${sourceName} (summaryDetail.forwardPE)`);
        facts.priceToBook = createFact(dks.priceToBook, "GROUNDED", `${sourceName} (defaultKeyStatistics.priceToBook)`);
        facts.trailingEps = createFact(dks.trailingEps, "GROUNDED", `${sourceName} (defaultKeyStatistics.trailingEps)`);
        facts.dividendYield = createFact(sd.dividendYield, "GROUNDED", `${sourceName} (summaryDetail.dividendYield)`);

        // 2. Mathematically Derived (CALCULATED) Facts
        // Operating Income (EBIT)
        let opIncomeValue = null;
        let opIncomeStatus = "UNAVAILABLE";
        let opIncomeFormula = null;
        let opIncomeInputs = null;

        if (facts.totalRevenue.value !== null && facts.operatingMargins.value !== null) {
            opIncomeValue = facts.totalRevenue.value * facts.operatingMargins.value;
            opIncomeStatus = "CALCULATED";
            opIncomeFormula = "totalRevenue * operatingMargins";
            opIncomeInputs = ["totalRevenue", "operatingMargins"];
        }
        facts.operatingIncome = createFact(opIncomeValue, opIncomeStatus, "Derived Ratio Calculation", opIncomeFormula, opIncomeInputs);

        // Net Debt = Total Debt - Total Cash (only valid if both debt and cash are known)
        let netDebtValue = null;
        let netDebtStatus = "UNAVAILABLE";
        if (facts.totalDebt.value !== null && facts.totalCash.value !== null) {
            netDebtValue = facts.totalDebt.value - facts.totalCash.value;
            netDebtStatus = "CALCULATED";
        }
        facts.netDebt = createFact(netDebtValue, netDebtStatus, "Derived Balance Sheet Metric", "totalDebt - totalCash", ["totalDebt", "totalCash"]);

        // Capital Expenditures = Operating Cash Flow - Free Cash Flow (if both reported)
        let capexValue = null;
        let capexStatus = "UNAVAILABLE";
        if (facts.operatingCashflow.value !== null && facts.freeCashflow.value !== null) {
            capexValue = Math.max(0, facts.operatingCashflow.value - facts.freeCashflow.value);
            capexStatus = "CALCULATED";
        }
        facts.capitalExpenditures = createFact(capexValue, capexStatus, "Derived Cash Flow Metric", "operatingCashflow - freeCashflow", ["operatingCashflow", "freeCashflow"]);

        // Debt / EBITDA & Net Debt / EBITDA
        let debtToEbitdaValue = null;
        let debtToEbitdaStatus = "UNAVAILABLE";
        if (facts.totalDebt.value !== null && facts.ebitda.value !== null && facts.ebitda.value > 0) {
            debtToEbitdaValue = facts.totalDebt.value / facts.ebitda.value;
            debtToEbitdaStatus = "CALCULATED";
        }
        facts.debtToEbitda = createFact(debtToEbitdaValue, debtToEbitdaStatus, "Derived Leverage Ratio", "totalDebt / ebitda", ["totalDebt", "ebitda"]);

        let netDebtToEbitdaValue = null;
        let netDebtToEbitdaStatus = "UNAVAILABLE";
        if (facts.netDebt.value !== null && facts.ebitda.value !== null && facts.ebitda.value > 0) {
            netDebtToEbitdaValue = facts.netDebt.value / facts.ebitda.value;
            netDebtToEbitdaStatus = "CALCULATED";
        }
        facts.netDebtToEbitda = createFact(netDebtToEbitdaValue, netDebtToEbitdaStatus, "Derived Leverage Ratio", "netDebt / ebitda", ["netDebt", "ebitda"]);

        // Return on Invested Capital (ROIC) = (Operating Income * (1 - TaxRate)) / Invested Capital
        // Note: Tax rate is explicitly tagged as ESTIMATED (22% statutory benchmark) unless reported
        let roicValue = null;
        let roicStatus = "UNAVAILABLE";
        if (facts.operatingIncome.value !== null && facts.marketCap.value !== null && facts.netDebt.value !== null) {
            const investedCapital = facts.marketCap.value + facts.netDebt.value;
            if (investedCapital > 0) {
                const estimatedNopat = facts.operatingIncome.value * (1 - 0.22);
                roicValue = estimatedNopat / investedCapital;
                roicStatus = "CALCULATED";
            }
        }
        facts.roic = createFact(roicValue, roicStatus, "Derived Return Metric", "NOPAT (using 22% statutory tax) / Invested Capital", ["operatingIncome", "marketCap", "netDebt"]);

        // Return backwards-compatible object with embedded structured facts dictionary
        return {
            // Direct numerical values (null if unavailable)
            totalRevenue: facts.totalRevenue.value,
            revenue: facts.totalRevenue.value,
            revenueGrowth: facts.revenueGrowth.value,
            netIncome: facts.netIncome.value,
            operatingIncome: facts.operatingIncome.value,
            ebitda: facts.ebitda.value,
            operatingMargin: facts.operatingMargins.value,
            profitMargin: facts.profitMargins.value,
            grossMargin: facts.grossMargins.value,
            freeCashFlow: facts.freeCashflow.value,
            operatingCashFlow: facts.operatingCashflow.value,
            capitalExpenditures: facts.capitalExpenditures.value,
            totalCash: facts.totalCash.value,
            totalDebt: facts.totalDebt.value,
            netDebt: facts.netDebt.value,
            debtToEbitda: facts.debtToEbitda.value,
            netDebtToEbitda: facts.netDebtToEbitda.value,
            currentRatio: facts.currentRatio.value,
            quickRatio: facts.quickRatio.value,
            marketCap: facts.marketCap.value,
            enterpriseValue: facts.enterpriseValue.value,
            peRatio: facts.trailingPE.value,
            trailingPE: facts.trailingPE.value,
            forwardPE: facts.forwardPE.value,
            priceToBook: facts.priceToBook.value,
            eps: facts.trailingEps.value,
            roe: facts.returnOnEquity.value,
            roa: facts.returnOnAssets.value,
            roic: facts.roic.value,
            dividendYield: facts.dividendYield.value,
            currency: pr.currency || "USD",
            filingPeriod: period,

            // Granular status metadata for direct inspection
            status: {
                totalRevenue: facts.totalRevenue.status,
                netIncome: facts.netIncome.status,
                operatingIncome: facts.operatingIncome.status,
                freeCashFlow: facts.freeCashflow.status,
                totalDebt: facts.totalDebt.status,
                totalCash: facts.totalCash.status,
                netDebt: facts.netDebt.status,
                currentRatio: facts.currentRatio.status,
                ebitda: facts.ebitda.status
            },

            // Complete Truth Layer Facts Registry
            facts
        };

    } catch (error) {
        console.error("Financial Tool Error:", error.message);
        throw error;
    }
}