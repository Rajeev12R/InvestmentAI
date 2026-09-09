/**
 * Sector Classification Types & Valuation Frameworks
 * Phase 2B Institutional Relative Valuation Layer
 */

export const CANONICAL_SECTORS = {
    TECHNOLOGY: "Technology",
    FINANCIALS: "Financial Services / Banking",
    INDUSTRIALS: "Industrials",
    AUTOMOTIVE: "Automotive & Mobility",
    ENERGY: "Energy & Natural Resources",
    CONSUMER: "Consumer & Retail",
    HEALTHCARE: "Healthcare & Pharmaceuticals",
    TELECOM: "Telecommunications",
    UTILITIES: "Utilities & Infrastructure",
    REAL_ESTATE: "Real Estate & REITs",
    UNKNOWN: "Unknown / Unclassified"
};

export const VALUATION_METHODS = {
    DCF: "DCF",
    PE: "P/E",
    EV_EBITDA: "EV/EBITDA",
    EV_EBIT: "EV/EBIT",
    EV_REVENUE: "EV/Revenue",
    PRICE_TO_BOOK: "P/B",
    DIVIDEND_YIELD: "Dividend Yield",
    ROE_ANALYSIS: "ROE / DuPont Analysis"
};

/**
 * Explicit Sector Valuation Framework Definitions
 */
export const SECTOR_FRAMEWORKS = {
    [CANONICAL_SECTORS.TECHNOLOGY]: {
        primaryMethods: [VALUATION_METHODS.DCF, VALUATION_METHODS.PE, VALUATION_METHODS.EV_EBITDA],
        secondaryMethods: [VALUATION_METHODS.EV_REVENUE],
        prohibitedMethods: [],
        weightings: { [VALUATION_METHODS.DCF]: 0.50, [VALUATION_METHODS.PE]: 0.30, [VALUATION_METHODS.EV_EBITDA]: 0.20 },
        rationale: "Technology valuations prioritize DCF cash flow compounding alongside P/E and EV/EBITDA peer multiples."
    },
    [CANONICAL_SECTORS.FINANCIALS]: {
        primaryMethods: [VALUATION_METHODS.PRICE_TO_BOOK, VALUATION_METHODS.PE, VALUATION_METHODS.ROE_ANALYSIS],
        secondaryMethods: [VALUATION_METHODS.DIVIDEND_YIELD],
        prohibitedMethods: [VALUATION_METHODS.EV_EBITDA, VALUATION_METHODS.EV_EBIT, VALUATION_METHODS.DCF],
        weightings: { [VALUATION_METHODS.PRICE_TO_BOOK]: 0.50, [VALUATION_METHODS.PE]: 0.50 },
        rationale: "Banking and financial institutions rely strictly on Price-to-Book, P/E, and ROE. Traditional industrial EV/EBITDA and standard DCF are not appropriate as debt constitutes operating capital."
    },
    [CANONICAL_SECTORS.INDUSTRIALS]: {
        primaryMethods: [VALUATION_METHODS.EV_EBITDA, VALUATION_METHODS.EV_EBIT, VALUATION_METHODS.DCF],
        secondaryMethods: [VALUATION_METHODS.PE],
        prohibitedMethods: [],
        weightings: { [VALUATION_METHODS.EV_EBITDA]: 0.45, [VALUATION_METHODS.DCF]: 0.35, [VALUATION_METHODS.PE]: 0.20 },
        rationale: "Capital-intensive industrial operations anchor on enterprise value multiples (EV/EBITDA, EV/EBIT) and asset depreciation cycles."
    },
    [CANONICAL_SECTORS.AUTOMOTIVE]: {
        primaryMethods: [VALUATION_METHODS.EV_EBITDA, VALUATION_METHODS.EV_EBIT, VALUATION_METHODS.DCF],
        secondaryMethods: [VALUATION_METHODS.PE, VALUATION_METHODS.PRICE_TO_BOOK],
        prohibitedMethods: [],
        weightings: { [VALUATION_METHODS.EV_EBITDA]: 0.45, [VALUATION_METHODS.DCF]: 0.35, [VALUATION_METHODS.PE]: 0.20 },
        rationale: "Automotive manufacturers require EV/EBITDA and EV/EBIT due to heavy R&D, tooling depreciation, and cyclical working capital."
    },
    [CANONICAL_SECTORS.ENERGY]: {
        primaryMethods: [VALUATION_METHODS.EV_EBITDA, VALUATION_METHODS.DCF],
        secondaryMethods: [VALUATION_METHODS.PE, VALUATION_METHODS.PRICE_TO_BOOK],
        prohibitedMethods: [],
        weightings: { [VALUATION_METHODS.EV_EBITDA]: 0.50, [VALUATION_METHODS.DCF]: 0.50 },
        rationale: "Energy and natural resource entities are valued primarily through asset-level EV/EBITDA and reserve-depletion DCFs."
    },
    [CANONICAL_SECTORS.CONSUMER]: {
        primaryMethods: [VALUATION_METHODS.PE, VALUATION_METHODS.EV_EBITDA, VALUATION_METHODS.DCF],
        secondaryMethods: [VALUATION_METHODS.EV_REVENUE],
        prohibitedMethods: [],
        weightings: { [VALUATION_METHODS.PE]: 0.40, [VALUATION_METHODS.EV_EBITDA]: 0.35, [VALUATION_METHODS.DCF]: 0.25 },
        rationale: "Consumer franchises balance earnings power (P/E) with operating cash flow stability (EV/EBITDA and DCF)."
    },
    [CANONICAL_SECTORS.HEALTHCARE]: {
        primaryMethods: [VALUATION_METHODS.DCF, VALUATION_METHODS.PE, VALUATION_METHODS.EV_EBITDA],
        secondaryMethods: [VALUATION_METHODS.EV_REVENUE],
        prohibitedMethods: [],
        weightings: { [VALUATION_METHODS.DCF]: 0.45, [VALUATION_METHODS.PE]: 0.35, [VALUATION_METHODS.EV_EBITDA]: 0.20 },
        rationale: "Healthcare and pharmaceutical firms are evaluated on pipeline cash flow DCFs and earnings sustainability."
    },
    [CANONICAL_SECTORS.TELECOM]: {
        primaryMethods: [VALUATION_METHODS.EV_EBITDA, VALUATION_METHODS.DCF],
        secondaryMethods: [VALUATION_METHODS.PE, VALUATION_METHODS.DIVIDEND_YIELD],
        prohibitedMethods: [],
        weightings: { [VALUATION_METHODS.EV_EBITDA]: 0.55, [VALUATION_METHODS.DCF]: 0.45 },
        rationale: "Infrastructure-heavy telecom networks rely on EV/EBITDA and recurring subscriber free cash flow DCFs."
    },
    [CANONICAL_SECTORS.UTILITIES]: {
        primaryMethods: [VALUATION_METHODS.EV_EBITDA, VALUATION_METHODS.DCF, VALUATION_METHODS.PRICE_TO_BOOK],
        secondaryMethods: [VALUATION_METHODS.DIVIDEND_YIELD],
        prohibitedMethods: [],
        weightings: { [VALUATION_METHODS.EV_EBITDA]: 0.45, [VALUATION_METHODS.DCF]: 0.35, [VALUATION_METHODS.PRICE_TO_BOOK]: 0.20 },
        rationale: "Regulated utilities are anchored to regulated asset base (P/B), EV/EBITDA, and rate-regulated cash flows."
    },
    [CANONICAL_SECTORS.REAL_ESTATE]: {
        primaryMethods: [VALUATION_METHODS.PRICE_TO_BOOK, VALUATION_METHODS.PE, VALUATION_METHODS.DIVIDEND_YIELD],
        secondaryMethods: [VALUATION_METHODS.DCF],
        prohibitedMethods: [VALUATION_METHODS.EV_EBITDA],
        weightings: { [VALUATION_METHODS.PRICE_TO_BOOK]: 0.60, [VALUATION_METHODS.PE]: 0.40 },
        rationale: "Real estate companies and REITs are anchored on Net Asset Value (NAV via P/B) and distribution yields."
    },
    [CANONICAL_SECTORS.UNKNOWN]: {
        primaryMethods: [],
        secondaryMethods: [],
        prohibitedMethods: [],
        weightings: {},
        rationale: "Sector classification is unavailable or ungrounded; universal valuation template rejected."
    }
};
