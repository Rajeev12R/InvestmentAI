/**
 * Portfolio Analytics Types & Constants
 * Phase 3 Institutional Portfolio Intelligence Layer
 */

import { VALUATION_STATUS } from "../valuation/valuation.types.js";

export const DIVERSIFICATION_LEVELS = {
    HIGHLY_CONCENTRATED: "HIGHLY_CONCENTRATED",
    MODERATELY_CONCENTRATED: "MODERATELY_CONCENTRATED",
    WELL_DIVERSIFIED: "WELL_DIVERSIFIED",
    OVER_DIVERSIFIED: "OVER_DIVERSIFIED",
    POOR: "POOR",
    MODERATE: "MODERATE",
    STRONG: "STRONG",
    UNKNOWN: "UNKNOWN"
};

export const SIZING_MODELS = {
    EQUAL_WEIGHT: "EQUAL_WEIGHT",
    RISK_PARITY_VOL: "RISK_PARITY_VOL",
    CONVICTION_WEIGHTED: "CONVICTION_WEIGHTED",
    MAX_CAP_CONSTRAINED: "MAX_CAP_CONSTRAINED",
    SECTOR_CAPPED: "SECTOR_CAPPED"
};

export const POSITION_SIZING_MODELS = SIZING_MODELS;

export const HERFINDAHL_THRESHOLDS = {
    LOW: 1500,        // HHI < 1500 -> Low concentration / Diversified
    MODERATE: 2500,   // 1500 <= HHI < 2500 -> Moderate concentration
    HIGH: 2500        // HHI >= 2500 -> High concentration
};

export const CONCENTRATION_THRESHOLDS = {
    MAX_SINGLE_POSITION: 0.20,      // 20% max single position
    MAX_TOP3_CONCENTRATION: 0.50,   // 50% max top 3 holdings
    MAX_SECTOR_CONCENTRATION: 0.35  // 35% max sector exposure
};

export const DEFAULT_PORTFOLIO_CONSTRAINTS = {
    maxPositionWeight: 0.20,
    maxSectorWeight: 0.35,
    minPositionsForHHI: 2
};

// ============================================================================
// Phase 36: Institutional Portfolio Operating System Types & Enums
// ============================================================================

export const PortfolioStatus = Object.freeze({
    DRAFT: "DRAFT",
    ACTIVE: "ACTIVE",
    PAUSED: "PAUSED",
    CLOSED: "CLOSED",
    ARCHIVED: "ARCHIVED"
});

export const PortfolioType = Object.freeze({
    EQUITY: "EQUITY",
    MULTI_ASSET: "MULTI_ASSET",
    FIXED_INCOME: "FIXED_INCOME",
    QUANTITATIVE: "QUANTITATIVE",
    CUSTOM: "CUSTOM"
});

export const StrategyType = Object.freeze({
    GROWTH: "GROWTH",
    VALUE: "VALUE",
    CORE_MOMENTUM: "CORE_MOMENTUM",
    MARKET_NEUTRAL: "MARKET_NEUTRAL",
    INCOME: "INCOME",
    MULTI_STRATEGY: "MULTI_STRATEGY",
    CUSTOM: "CUSTOM"
});

export const DataFreshness = Object.freeze({
    FRESH: "FRESH",
    STALE: "STALE",
    UNAVAILABLE: "UNAVAILABLE",
    PARTIAL: "PARTIAL"
});

export const DEFAULT_PORTFOLIO_MANDATE = Object.freeze({
    investmentObjective: "Long-term capital appreciation with rigorous downside risk constraints",
    benchmark: "^GSPC",
    benchmarkName: "S&P 500 Index",
    baseCurrency: "USD",
    targetReturn: 0.10, // 10% annual target
    riskTargetVolatility: 0.15, // 15% annualized volatility target
    maxSinglePositionWeight: 0.20, // 20% max single holding
    maxSectorWeight: 0.35, // 35% max sector exposure
    maxGeographicWeight: 0.70, // 70% max US exposure
    maxAnnualTurnover: 0.50, // 50% max turnover
    minLiquidityBufferPct: 0.02, // 2% minimum cash buffer
    esgScreeningRequired: false,
    trackingErrorLimit: 0.05 // 5% max tracking error
});

