/**
 * Risk Intelligence Taxonomy & Centralized Threshold Configurations
 * Phase 3 Institutional Risk Layer
 */

import { VALUATION_STATUS } from "../valuation/valuation.types.js";

export const RISK_CATEGORIES = {
    MARKET_RISK: "MARKET_RISK",
    VALUATION_RISK: "VALUATION_RISK",
    FINANCIAL_RISK: "FINANCIAL_RISK",
    LIQUIDITY_RISK: "LIQUIDITY_RISK",
    EARNINGS_QUALITY_RISK: "EARNINGS_QUALITY_RISK",
    GROWTH_RISK: "GROWTH_RISK",
    EVENT_RISK: "EVENT_RISK",
    GOVERNANCE_RISK: "GOVERNANCE_RISK",
    DATA_QUALITY_RISK: "DATA_QUALITY_RISK"
};

export const SEVERITY_LEVELS = {
    LOW: "LOW",
    MODERATE: "MODERATE",
    HIGH: "HIGH",
    CRITICAL: "CRITICAL",
    UNKNOWN: "UNKNOWN"
};

export const RISK_THRESHOLDS = {
    // Financial Leverage & Solvency
    netDebtToEbitda: {
        name: "Net Debt to EBITDA",
        direction: "HIGHER_IS_RISKIER",
        low: 1.5,
        moderate: 2.8,
        high: 4.0,
        critical: 5.5,
        rationale: "Measures years of operating cash flow required to retire net debt obligations.",
        applicableSectors: ["Technology", "Industrials", "Automotive", "Energy", "Consumer", "Healthcare", "Telecom", "Utilities"]
    },
    debtToEquity: {
        name: "Debt to Shareholders Equity",
        direction: "HIGHER_IS_RISKIER",
        low: 0.5,
        moderate: 1.2,
        high: 2.5,
        critical: 4.0,
        rationale: "Gauges balance sheet financial leverage relative to book equity capital.",
        applicableSectors: "ALL"
    },
    interestCoverage: {
        name: "Interest Coverage Ratio (EBIT / Interest)",
        direction: "LOWER_IS_RISKIER",
        critical: 1.5,
        high: 2.5,
        moderate: 4.0,
        low: 6.0,
        rationale: "Determines company's operating margin of safety in servicing debt interest.",
        applicableSectors: "ALL"
    },
    currentRatio: {
        name: "Current Ratio (Current Assets / Current Liabilities)",
        direction: "LOWER_IS_RISKIER",
        critical: 0.85,
        high: 1.05,
        moderate: 1.35,
        low: 1.75,
        rationale: "Evaluates short-term liquidity to satisfy obligations coming due within 12 months.",
        applicableSectors: "ALL"
    },
    quickRatio: {
        name: "Quick Acid-Test Ratio",
        direction: "LOWER_IS_RISKIER",
        critical: 0.60,
        high: 0.85,
        moderate: 1.10,
        low: 1.50,
        rationale: "Evaluates immediate liquid asset coverage excluding inventory.",
        applicableSectors: "ALL"
    },

    // Market & Price Dynamics
    beta: {
        name: "Beta Volatility (5Y Monthly)",
        direction: "HIGHER_IS_RISKIER",
        low: 0.85,
        moderate: 1.15,
        high: 1.45,
        critical: 1.80,
        rationale: "Systematic covariance and sensitivity relative to broad market benchmark.",
        applicableSectors: "ALL"
    },
    drawdown52w: {
        name: "52-Week Maximum Drawdown",
        direction: "LOWER_IS_RISKIER", // More negative is worse
        low: -15.0,
        moderate: -28.0,
        high: -42.0,
        critical: -60.0,
        rationale: "Measures severity of recent peak-to-trough price destruction.",
        applicableSectors: "ALL"
    },

    // Earnings Quality & Cash Flow Realization
    cfoToNetIncome: {
        name: "Operating Cash Flow to Net Income (CFO / NI)",
        direction: "LOWER_IS_RISKIER",
        critical: 0.60,
        high: 0.80,
        moderate: 1.00,
        low: 1.20,
        rationale: "Tests whether accounting net earnings are supported by genuine operational cash inflows.",
        applicableSectors: "ALL"
    },
    fcfConversion: {
        name: "FCF to Net Income Conversion",
        direction: "LOWER_IS_RISKIER",
        critical: 0.40,
        high: 0.65,
        moderate: 0.85,
        low: 1.05,
        rationale: "Tests net income conversion to distributable free cash flow after capital expenditures.",
        applicableSectors: "ALL"
    },

    // Valuation Margin of Safety
    valuationUpside: {
        name: "Model Upside to Current Market Price",
        direction: "LOWER_IS_RISKIER", // More negative upside (overvaluation) is riskier
        critical: -35.0,
        high: -15.0,
        moderate: 0.0,
        low: 20.0,
        rationale: "Degree to which current market price exceeds synthesized fundamental fair value.",
        applicableSectors: "ALL"
    },
    modelDisagreementCV: {
        name: "Valuation Model Dispersion (CV)",
        direction: "HIGHER_IS_RISKIER",
        low: 0.12,
        moderate: 0.22,
        high: 0.35,
        critical: 0.50,
        rationale: "Statistical divergence across independent valuation methodologies.",
        applicableSectors: "ALL"
    }
};
