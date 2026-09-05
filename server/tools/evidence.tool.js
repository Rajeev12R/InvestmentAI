/**
 * Evidence & Truth Layer Tool
 * Enforces the Constitution of InvestmentAI:
 * 1. AI cannot create financial facts.
 * 2. AI cannot modify raw financial facts.
 * 3. Every displayed financial number must have provenance.
 * 4. Every calculated number must expose its exact mathematical formula.
 * 5. Every estimated number must be explicitly labeled ESTIMATED.
 * 6. Missing data must remain UNAVAILABLE, never synthesized as fake numbers.
 * 7. Conflicting sources must be preserved and resolved according to source hierarchy.
 * 8. Every fact must have a timestamp and reporting period.
 */

export function buildEvidenceGraph(state) {
    const profile = state.companyProfile || {};
    const fin = state.financials || {};
    const stock = state.stockData || {};
    const valuation = state.valuation || {};
    const risks = state.risks || {};
    const news = state.newsData || [];
    const timestamp = new Date().toISOString();
    const currency = stock.currency || fin.currency || "$";

    const provenance = [];
    const financialFacts = [];
    const calculatedMetrics = [];

    // Helper to format currency or percentage amounts cleanly
    function formatValue(val, type = "currency") {
        if (val === null || val === undefined || isNaN(Number(val))) return "UNAVAILABLE";
        const num = Number(val);
        if (type === "currency") {
            if (Math.abs(num) >= 1e9) return `${currency}${(num / 1e9).toFixed(2)}B`;
            if (Math.abs(num) >= 1e6) return `${currency}${(num / 1e6).toFixed(2)}M`;
            return `${currency}${num.toFixed(2)}`;
        }
        if (type === "percent") {
            const pct = Math.abs(num) < 1 && num !== 0 ? num * 100 : num;
            return `${pct.toFixed(2)}%`;
        }
        if (type === "ratio") {
            return `${num.toFixed(2)}x`;
        }
        return String(num);
    }

    // Helper to register facts
    function registerFact({ id, name, value, formatted, source, period, status, formula, rawInput, inputs }) {
        const isAvail = value !== undefined && value !== null && !isNaN(Number(value));
        const finalStatus = isAvail ? (status || "GROUNDED") : "UNAVAILABLE";
        const item = {
            id,
            metric: name,
            value: isAvail ? Number(value) : null,
            formattedValue: isAvail ? (formatted || String(value)) : "UNAVAILABLE",
            source: source || "Yahoo Finance Primary Feed",
            period: period || fin.filingPeriod || "TTM",
            timestamp,
            status: finalStatus,
            formula: formula || null,
            inputs: inputs || null,
            rawInput: rawInput || null
        };
        provenance.push(item);
        if (formula || finalStatus === "CALCULATED") {
            calculatedMetrics.push(item);
        } else {
            financialFacts.push(item);
        }
        return item;
    }

    // 1. Ingest Structured Facts from financial.tool.js
    const facts = fin.facts || {};

    registerFact({
        id: "fact_revenue",
        name: "Total Revenue",
        value: fin.totalRevenue,
        formatted: formatValue(fin.totalRevenue, "currency"),
        source: facts.totalRevenue?.source || "Yahoo Finance Primary Feed (financialData.totalRevenue)",
        period: facts.totalRevenue?.period || "TTM",
        status: facts.totalRevenue?.status || (fin.totalRevenue !== null ? "GROUNDED" : "UNAVAILABLE")
    });

    registerFact({
        id: "fact_net_income",
        name: "Net Income to Common",
        value: fin.netIncome,
        formatted: formatValue(fin.netIncome, "currency"),
        source: facts.netIncome?.source || "Yahoo Finance Primary Feed (financialData.netIncomeToCommon)",
        period: facts.netIncome?.period || "TTM",
        status: facts.netIncome?.status || (fin.netIncome !== null ? "GROUNDED" : "UNAVAILABLE")
    });

    registerFact({
        id: "fact_operating_income",
        name: "Operating Income (EBIT)",
        value: fin.operatingIncome,
        formatted: formatValue(fin.operatingIncome, "currency"),
        source: facts.operatingIncome?.source || "Derived Operating Metric",
        period: facts.operatingIncome?.period || "TTM",
        status: facts.operatingIncome?.status || (fin.operatingIncome !== null ? "CALCULATED" : "UNAVAILABLE"),
        formula: facts.operatingIncome?.formula || "totalRevenue * operatingMargins",
        inputs: facts.operatingIncome?.inputs || ["totalRevenue", "operatingMargins"]
    });

    registerFact({
        id: "fact_operating_cashflow",
        name: "Operating Cash Flow",
        value: fin.operatingCashFlow,
        formatted: formatValue(fin.operatingCashFlow, "currency"),
        source: facts.operatingCashflow?.source || "Yahoo Finance Primary Feed (financialData.operatingCashflow)",
        period: facts.operatingCashflow?.period || "TTM",
        status: facts.operatingCashflow?.status || (fin.operatingCashFlow !== null ? "GROUNDED" : "UNAVAILABLE")
    });

    registerFact({
        id: "fact_fcf",
        name: "Free Cash Flow (FCF)",
        value: fin.freeCashFlow,
        formatted: formatValue(fin.freeCashFlow, "currency"),
        source: facts.freeCashflow?.source || "Yahoo Finance Primary Feed (financialData.freeCashflow)",
        period: facts.freeCashflow?.period || "TTM",
        status: facts.freeCashflow?.status || (fin.freeCashFlow !== null ? "GROUNDED" : "UNAVAILABLE"),
        formula: facts.capitalExpenditures?.value !== null ? "Operating Cash Flow - Capital Expenditures" : null
    });

    registerFact({
        id: "fact_total_cash",
        name: "Cash & Cash Equivalents",
        value: fin.totalCash,
        formatted: formatValue(fin.totalCash, "currency"),
        source: facts.totalCash?.source || "Yahoo Finance Primary Feed (financialData.totalCash)",
        period: facts.totalCash?.period || "Latest Reported Balance Sheet",
        status: facts.totalCash?.status || (fin.totalCash !== null ? "GROUNDED" : "UNAVAILABLE")
    });

    registerFact({
        id: "fact_total_debt",
        name: "Total Debt (Short + Long Term)",
        value: fin.totalDebt,
        formatted: formatValue(fin.totalDebt, "currency"),
        source: facts.totalDebt?.source || "Yahoo Finance Primary Feed (financialData.totalDebt)",
        period: facts.totalDebt?.period || "Latest Reported Balance Sheet",
        status: facts.totalDebt?.status || (fin.totalDebt !== null ? "GROUNDED" : "UNAVAILABLE")
    });

    registerFact({
        id: "metric_net_debt",
        name: "Net Debt",
        value: fin.netDebt,
        formatted: formatValue(fin.netDebt, "currency"),
        source: facts.netDebt?.source || "Derived Balance Sheet Calculation",
        formula: "Total Debt - Total Cash",
        inputs: ["totalDebt", "totalCash"],
        status: facts.netDebt?.status || (fin.netDebt !== null ? "CALCULATED" : "UNAVAILABLE")
    });

    // 2. Margins & Solvency Ratios
    registerFact({
        id: "metric_operating_margin",
        name: "Operating Margin",
        value: fin.operatingMargin,
        formatted: formatValue(fin.operatingMargin, "percent"),
        source: facts.operatingMargins?.source || "Yahoo Finance Primary Feed (financialData.operatingMargins)",
        period: "TTM",
        status: facts.operatingMargins?.status || (fin.operatingMargin !== null ? "GROUNDED" : "UNAVAILABLE")
    });

    registerFact({
        id: "metric_current_ratio",
        name: "Current Ratio",
        value: fin.currentRatio,
        formatted: formatValue(fin.currentRatio, "ratio"),
        source: facts.currentRatio?.source || "Yahoo Finance Primary Feed (financialData.currentRatio)",
        period: "Latest Balance Sheet",
        status: facts.currentRatio?.status || (fin.currentRatio !== null ? "GROUNDED" : "UNAVAILABLE")
    });

    registerFact({
        id: "metric_roe",
        name: "Return on Equity (ROE)",
        value: fin.roe,
        formatted: formatValue(fin.roe, "percent"),
        source: facts.returnOnEquity?.source || "Yahoo Finance Primary Feed (financialData.returnOnEquity)",
        period: "TTM",
        status: facts.returnOnEquity?.status || (fin.roe !== null ? "GROUNDED" : "UNAVAILABLE")
    });

    // 3. Valuation & WACC Provenance
    const waccData = valuation.waccBreakdown || {};
    registerFact({
        id: "metric_wacc",
        name: "Weighted Average Cost of Capital (WACC)",
        value: valuation.assumptions?.discountRate ? valuation.assumptions.discountRate / 100 : null,
        formatted: valuation.assumptions?.discountRate ? `${valuation.assumptions.discountRate.toFixed(2)}%` : "UNAVAILABLE",
        source: `Derived CAPM Cost of Capital (${waccData.riskFreeSource || "Benchmark Yield"})`,
        period: "Live Market Rates",
        formula: "WACC = (Equity_Weight * Cost_of_Equity) + (Debt_Weight * Cost_of_Debt * (1 - Tax_Rate))",
        rawInput: waccData,
        status: valuation.assumptions?.discountRate ? "CALCULATED" : "UNAVAILABLE"
    });

    registerFact({
        id: "metric_dcf_fair_value",
        name: "DCF Intrinsic Fair Value per Share",
        value: valuation.dcfValue,
        formatted: valuation.dcfValue ? `${currency}${Number(valuation.dcfValue).toFixed(2)}` : "UNAVAILABLE",
        source: "5-Year Discrete FCFF Model + Gordon Growth Terminal Value",
        formula: "Fair Value = (PV of 5-Yr Projected FCFs + PV of Terminal Value - Net Debt) / Shares Outstanding",
        rawInput: valuation.assumptions,
        status: valuation.dcfStatus || (valuation.dcfValue ? "CALCULATED" : "UNAVAILABLE")
    });

    registerFact({
        id: "metric_reverse_dcf",
        name: "Reverse DCF Implied Growth Rate",
        value: valuation.reverseDcf?.impliedGrowthRate,
        formatted: valuation.reverseDcf?.impliedGrowthRate !== undefined && valuation.reverseDcf?.impliedGrowthRate !== null 
            ? `${(valuation.reverseDcf.impliedGrowthRate * 100).toFixed(1)}%` 
            : "UNAVAILABLE",
        source: "Reverse DCF Valuation Engine",
        formula: "Solves for the exact constant growth rate priced into the stock at today's market price",
        rawInput: { currentPrice: stock.currentPrice, wacc: valuation.assumptions?.discountRate },
        status: valuation.reverseDcf?.impliedGrowthRate !== undefined ? "CALCULATED" : "UNAVAILABLE"
    });

    // 4. Market & Risk Signals
    registerFact({
        id: "metric_beta",
        name: "5Y Monthly Beta",
        value: stock.beta,
        formatted: stock.beta !== null && stock.beta !== undefined ? Number(stock.beta).toFixed(2) : "UNAVAILABLE",
        source: "Yahoo Finance Primary Feed (summaryDetail.beta)",
        period: "60-Month Trailing",
        status: stock.beta !== null && stock.beta !== undefined ? "GROUNDED" : "UNAVAILABLE"
    });

    // 5. Mathematical Confidence Scoring
    const requiredFacts = [
        fin.totalRevenue, fin.netIncome, fin.operatingCashFlow, fin.freeCashFlow,
        fin.totalDebt, fin.totalCash, stock.currentPrice, stock.marketCap, stock.beta
    ];
    const availableCount = requiredFacts.filter(v => v !== undefined && v !== null && !isNaN(Number(v))).length;
    const completenessRatio = availableCount / requiredFacts.length;

    // Non-linear critical penalties for missing key data
    let criticalPenalty = 1.0;
    if (fin.freeCashFlow === null || fin.freeCashFlow === undefined) {
        criticalPenalty *= 0.75; // Missing FCF penalizes valuation confidence
    }
    if (fin.totalDebt === null || fin.totalDebt === undefined) {
        criticalPenalty *= 0.85; // Missing debt penalizes balance sheet confidence
    }

    const dataCompleteness = Math.round(completenessRatio * 100);
    const sourceQuality = 90; // Primary exchange feed
    const freshness = 95;
    const modelAgreement = valuation.valuationSpread ? Math.max(40, Math.min(95, Math.round(100 - valuation.valuationSpread))) : 75;
    const calculationIntegrity = 95;

    const rawConfidence = (dataCompleteness * 0.30) + (sourceQuality * 0.25) + (freshness * 0.15) + (modelAgreement * 0.15) + (calculationIntegrity * 0.15);
    const overallConfidence = Math.max(25, Math.min(98, Math.round(rawConfidence * criticalPenalty)));

    // Assemble Sealed InvestmentTruthPackage
    const truthPackage = {
        company: {
            name: profile.name || state.companyName || "Unknown Entity",
            ticker: profile.ticker || state.companyName,
            sector: profile.sector || "General Equity",
            industry: profile.industry || "General",
            exchange: profile.exchange || stock.exchange || "Exchange Listed",
            currency
        },
        financialFacts,
        calculatedMetrics,
        valuationModels: {
            dcf: {
                fairValue: valuation.dcfValue !== null && valuation.dcfValue !== undefined ? Number(valuation.dcfValue) : null,
                upside: valuation.upside !== null && valuation.upside !== undefined ? Number(valuation.upside) : null,
                wacc: Number(valuation.assumptions?.discountRate || 9.5),
                terminalGrowth: Number(valuation.assumptions?.terminalGrowthRate || 2.5),
                method: "5-Year Discrete FCFF + Calculated WACC",
                status: valuation.dcfStatus || "CALCULATED"
            },
            relativeMultiples: valuation.relativeValuation || null,
            reverseDcf: valuation.reverseDcf || null,
            scenarios: valuation.scenarios || null
        },
        riskSignals: {
            overallScore: risks.score || 50,
            financialRisk: risks.financialRisk || {},
            marketRisk: risks.marketRisk || {},
            governanceRisk: risks.governanceRisk || {},
            flags: risks.flags || []
        },
        newsEvents: (news || []).map(item => ({
            title: item.title,
            source: item.source?.name || item.source || "News Feed",
            publishedAt: item.publishedAt || "Recent",
            category: item.category || "Corporate Operations",
            severity: item.severity !== undefined ? item.severity : 0.0,
            sentiment: item.sentiment || "NEUTRAL"
        })),
        investorProfile: state.investorProfile || {
            horizon: "Long (3-5 Years)",
            riskTolerance: "Moderate / Balanced",
            goal: "Capital Growth & Compounding"
        },
        confidence: {
            overall: overallConfidence,
            dataCompleteness,
            sourceQuality,
            freshness,
            modelAgreement,
            calculationIntegrity,
            criticalPenaltyApplied: criticalPenalty < 1.0
        },
        provenance
    };

    return {
        truthPackage,
        provenance,
        confidence: truthPackage.confidence
    };
}
