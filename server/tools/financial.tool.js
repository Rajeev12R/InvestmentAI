import yahooFinance, { scrapeQuotePage } from "../services/yahooFinance.service.js";

export async function getFinancialData(symbol) {

    try {

        const { quoteSummary } = await scrapeQuotePage(symbol);

        if (!quoteSummary) {
            throw new Error("Failed to load financial statistics");
        }

        return {
            revenue: quoteSummary.financialData?.totalRevenue ?? null,
            revenueGrowth: quoteSummary.financialData?.revenueGrowth ?? null,
            netIncome: quoteSummary.financialData?.netIncomeToCommon ?? null,
            operatingMargin: quoteSummary.financialData?.operatingMargins ?? null,
            profitMargin: quoteSummary.financialData?.profitMargins ?? null,
            freeCashFlow: quoteSummary.financialData?.freeCashflow ?? null,
            totalCash: quoteSummary.financialData?.totalCash ?? null,
            totalDebt: quoteSummary.financialData?.totalDebt ?? null,
            currentRatio: quoteSummary.financialData?.currentRatio ?? null,
            quickRatio: quoteSummary.financialData?.quickRatio ?? null,
            marketCap: quoteSummary.price?.marketCap ?? null,
            enterpriseValue: quoteSummary.defaultKeyStatistics?.enterpriseValue ?? null,
            peRatio: quoteSummary.summaryDetail?.trailingPE ?? null,
            eps: quoteSummary.defaultKeyStatistics?.trailingEps ?? null,
            roe: quoteSummary.financialData?.returnOnEquity ?? null,
            roa: quoteSummary.financialData?.returnOnAssets ?? null,
            dividendYield: quoteSummary.summaryDetail?.dividendYield ?? null,
            currency: quoteSummary.price?.currency ?? null

        };

    } catch (error) {
        console.error("Financial Tool Error:", error.message);
        throw error;
    }

}