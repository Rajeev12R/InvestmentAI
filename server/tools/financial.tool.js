import { scrapeQuotePage } from "../services/yahooFinance.service.js";

export async function getFinancialData(symbol) {
    try {
        const { quoteSummary } = await scrapeQuotePage(symbol);

        if (!quoteSummary) {
            throw new Error("Failed to load financial statistics");
        }

        const fd = quoteSummary.financialData || {};
        const dks = quoteSummary.defaultKeyStatistics || {};
        const sd = quoteSummary.summaryDetail || {};
        const pr = quoteSummary.price || {};

        const totalRevenue = fd.totalRevenue ?? null;
        const netIncome = fd.netIncomeToCommon ?? null;
        const totalDebt = fd.totalDebt ?? 0;
        const totalCash = fd.totalCash ?? 0;
        const operatingCashFlow = fd.operatingCashflow ?? null;
        const freeCashFlow = fd.freeCashflow ?? null;
        const operatingMargins = fd.operatingMargins ?? null;

        // Derived calculations
        const operatingIncome = operatingMargins !== null && totalRevenue !== null ? totalRevenue * operatingMargins : (fd.ebitda ? fd.ebitda * 0.82 : null);
        const ebitda = fd.ebitda ?? (operatingIncome ? operatingIncome * 1.18 : null);
        const taxRate = 0.22;
        const nopat = operatingIncome !== null ? operatingIncome * (1 - taxRate) : null;
        const investedCapital = (pr.marketCap || 0) + totalDebt - totalCash;
        const roic = nopat !== null && investedCapital > 0 ? (nopat / investedCapital) : null;
        const netDebt = totalDebt - totalCash;
        const debtToEbitda = ebitda && ebitda > 0 ? (totalDebt / ebitda) : null;
        const netDebtToEbitda = ebitda && ebitda > 0 ? (netDebt / ebitda) : null;

        return {
            totalRevenue,
            revenue: totalRevenue,
            revenueGrowth: fd.revenueGrowth ?? null,
            netIncome,
            operatingIncome,
            ebitda,
            nopat,
            operatingMargin: operatingMargins,
            profitMargin: fd.profitMargins ?? null,
            grossMargin: fd.grossMargins ?? null,
            freeCashFlow,
            operatingCashFlow,
            capitalExpenditures: operatingCashFlow && freeCashFlow ? operatingCashFlow - freeCashFlow : null,
            totalCash,
            totalDebt,
            netDebt,
            debtToEbitda,
            netDebtToEbitda,
            currentRatio: fd.currentRatio ?? null,
            quickRatio: fd.quickRatio ?? null,
            marketCap: pr.marketCap ?? null,
            enterpriseValue: dks.enterpriseValue ?? (pr.marketCap ? pr.marketCap + netDebt : null),
            peRatio: sd.trailingPE ?? null,
            trailingPE: sd.trailingPE ?? null,
            forwardPE: sd.forwardPE ?? null,
            priceToBook: dks.priceToBook ?? null,
            enterpriseToEbitda: dks.enterpriseToEbitda ?? (ebitda > 0 && dks.enterpriseValue ? dks.enterpriseValue / ebitda : null),
            eps: dks.trailingEps ?? null,
            roe: fd.returnOnEquity ?? null,
            roa: fd.returnOnAssets ?? null,
            roic,
            dividendYield: sd.dividendYield ?? null,
            currency: pr.currency ?? "USD",
            filingPeriod: "TTM (Trailing Twelve Months)"
        };

    } catch (error) {
        console.error("Financial Tool Error:", error.message);
        throw error;
    }
}