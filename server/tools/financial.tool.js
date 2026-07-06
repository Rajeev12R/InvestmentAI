import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

export async function getFinancialData(symbol) {

    try {

        const summary = await yahooFinance.quoteSummary(symbol, {
            modules: [
                "financialData",
                "defaultKeyStatistics",
                "price",
                "summaryDetail"
            ]
        });

        return {
            revenue: summary.financialData?.totalRevenue ?? null,
            revenueGrowth: summary.financialData?.revenueGrowth ?? null,
            netIncome: summary.financialData?.netIncomeToCommon ?? null,
            operatingMargin: summary.financialData?.operatingMargins ?? null,
            profitMargin: summary.financialData?.profitMargins ?? null,
            freeCashFlow: summary.financialData?.freeCashflow ?? null,
            totalCash: summary.financialData?.totalCash ?? null,
            totalDebt: summary.financialData?.totalDebt ?? null,
            currentRatio: summary.financialData?.currentRatio ?? null,
            quickRatio:summary.financialData?.quickRatio ?? null,
            marketCap: summary.price?.marketCap ?? null,
            enterpriseValue: summary.defaultKeyStatistics?.enterpriseValue ?? null,
            peRatio: summary.summaryDetail?.trailingPE ?? null,
            eps: summary.defaultKeyStatistics?.trailingEps ?? null,
            roe: summary.financialData?.returnOnEquity ?? null,
            roa: summary.financialData?.returnOnAssets ?? null,
            dividendYield: summary.summaryDetail?.dividendYield ?? null,
            currency: summary.price?.currency ?? null

        };

    } catch (error) {
        console.error(error);
        throw error;
    }

}