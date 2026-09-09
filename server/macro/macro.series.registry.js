/**
 * server/macro/macro.series.registry.js
 * 
 * Phase 22: Global Institutional Macro Series Catalog & Metadata
 */

import { MacroMetricCategory, MacroSourceTier } from './macro.types.js';

export const INSTITUTIONAL_MACRO_SERIES = Object.freeze({
  // Growth
  US_GDP_REAL_QOQ: {
    seriesId: 'US_GDP_REAL_QOQ',
    name: 'US Real GDP QoQ Annualized',
    category: MacroMetricCategory.GROWTH,
    jurisdiction: 'US',
    frequency: 'QUARTERLY',
    unit: 'PERCENT',
    sourceTier: MacroSourceTier.TIER_1_CENTRAL_BANK_GOV_STATS,
    sourceName: 'Bureau of Economic Analysis (BEA)'
  },
  US_INDUSTRIAL_PRODUCTION_MOM: {
    seriesId: 'US_INDUSTRIAL_PRODUCTION_MOM',
    name: 'US Industrial Production Index MoM',
    category: MacroMetricCategory.GROWTH,
    jurisdiction: 'US',
    frequency: 'MONTHLY',
    unit: 'PERCENT',
    sourceTier: MacroSourceTier.TIER_1_CENTRAL_BANK_GOV_STATS,
    sourceName: 'Federal Reserve Board'
  },
  US_ISM_MANUFACTURING_PMI: {
    seriesId: 'US_ISM_MANUFACTURING_PMI',
    name: 'US ISM Manufacturing PMI',
    category: MacroMetricCategory.GROWTH,
    jurisdiction: 'US',
    frequency: 'MONTHLY',
    unit: 'INDEX_POINTS',
    sourceTier: MacroSourceTier.TIER_3_INSTITUTIONAL_CONSENSUS,
    sourceName: 'Institute for Supply Management (ISM)'
  },

  // Inflation
  US_CPI_YOY: {
    seriesId: 'US_CPI_YOY',
    name: 'US Headline CPI YoY',
    category: MacroMetricCategory.INFLATION,
    jurisdiction: 'US',
    frequency: 'MONTHLY',
    unit: 'PERCENT',
    sourceTier: MacroSourceTier.TIER_1_CENTRAL_BANK_GOV_STATS,
    sourceName: 'Bureau of Labor Statistics (BLS)'
  },
  US_CORE_CPI_YOY: {
    seriesId: 'US_CORE_CPI_YOY',
    name: 'US Core CPI (Ex Food & Energy) YoY',
    category: MacroMetricCategory.INFLATION,
    jurisdiction: 'US',
    frequency: 'MONTHLY',
    unit: 'PERCENT',
    sourceTier: MacroSourceTier.TIER_1_CENTRAL_BANK_GOV_STATS,
    sourceName: 'Bureau of Labor Statistics (BLS)'
  },
  US_CORE_PCE_YOY: {
    seriesId: 'US_CORE_PCE_YOY',
    name: 'US Core PCE Price Index YoY',
    category: MacroMetricCategory.INFLATION,
    jurisdiction: 'US',
    frequency: 'MONTHLY',
    unit: 'PERCENT',
    sourceTier: MacroSourceTier.TIER_1_CENTRAL_BANK_GOV_STATS,
    sourceName: 'Bureau of Economic Analysis (BEA)'
  },

  // Rates & Yield Curve
  US_FED_FUNDS_RATE: {
    seriesId: 'US_FED_FUNDS_RATE',
    name: 'Federal Funds Target Rate Upper Limit',
    category: MacroMetricCategory.RATES,
    jurisdiction: 'US',
    frequency: 'DAILY',
    unit: 'PERCENT',
    sourceTier: MacroSourceTier.TIER_1_CENTRAL_BANK_GOV_STATS,
    sourceName: 'Federal Reserve Board'
  },
  US_TREASURY_2Y_YIELD: {
    seriesId: 'US_TREASURY_2Y_YIELD',
    name: 'US 2-Year Treasury Constant Maturity Yield',
    category: MacroMetricCategory.RATES,
    jurisdiction: 'US',
    frequency: 'DAILY',
    unit: 'PERCENT',
    sourceTier: MacroSourceTier.TIER_1_CENTRAL_BANK_GOV_STATS,
    sourceName: 'US Department of the Treasury'
  },
  US_TREASURY_10Y_YIELD: {
    seriesId: 'US_TREASURY_10Y_YIELD',
    name: 'US 10-Year Treasury Constant Maturity Yield',
    category: MacroMetricCategory.RATES,
    jurisdiction: 'US',
    frequency: 'DAILY',
    unit: 'PERCENT',
    sourceTier: MacroSourceTier.TIER_1_CENTRAL_BANK_GOV_STATS,
    sourceName: 'US Department of the Treasury'
  },
  US_TREASURY_30Y_YIELD: {
    seriesId: 'US_TREASURY_30Y_YIELD',
    name: 'US 30-Year Treasury Constant Maturity Yield',
    category: MacroMetricCategory.RATES,
    jurisdiction: 'US',
    frequency: 'DAILY',
    unit: 'PERCENT',
    sourceTier: MacroSourceTier.TIER_1_CENTRAL_BANK_GOV_STATS,
    sourceName: 'US Department of the Treasury'
  },

  // Credit
  US_HY_OPTION_ADJUSTED_SPREAD: {
    seriesId: 'US_HY_OPTION_ADJUSTED_SPREAD',
    name: 'US High Yield Option-Adjusted Spread (OAS)',
    category: MacroMetricCategory.CREDIT,
    jurisdiction: 'US',
    frequency: 'DAILY',
    unit: 'BPS',
    sourceTier: MacroSourceTier.TIER_2_EXCHANGE_INDEX_PROVIDER,
    sourceName: 'ICE BofA US High Yield Index'
  },
  US_IG_OPTION_ADJUSTED_SPREAD: {
    seriesId: 'US_IG_OPTION_ADJUSTED_SPREAD',
    name: 'US Investment Grade Option-Adjusted Spread (OAS)',
    category: MacroMetricCategory.CREDIT,
    jurisdiction: 'US',
    frequency: 'DAILY',
    unit: 'BPS',
    sourceTier: MacroSourceTier.TIER_2_EXCHANGE_INDEX_PROVIDER,
    sourceName: 'ICE BofA US Corporate Index'
  },

  // FX
  FX_DXY_INDEX: {
    seriesId: 'FX_DXY_INDEX',
    name: 'US Dollar Index (DXY)',
    category: MacroMetricCategory.FX,
    jurisdiction: 'GLOBAL',
    frequency: 'DAILY',
    unit: 'INDEX_POINTS',
    sourceTier: MacroSourceTier.TIER_2_EXCHANGE_INDEX_PROVIDER,
    sourceName: 'Intercontinental Exchange (ICE)'
  },
  FX_EUR_USD: {
    seriesId: 'FX_EUR_USD',
    name: 'EUR / USD Spot Rate',
    category: MacroMetricCategory.FX,
    jurisdiction: 'GLOBAL',
    frequency: 'DAILY',
    unit: 'RATIO',
    sourceTier: MacroSourceTier.TIER_2_EXCHANGE_INDEX_PROVIDER,
    sourceName: 'European Central Bank / FX Spot'
  },

  // Commodities
  COMMODITY_BRENT_CRUDE: {
    seriesId: 'COMMODITY_BRENT_CRUDE',
    name: 'Brent Crude Oil Spot / Front Month',
    category: MacroMetricCategory.COMMODITIES,
    jurisdiction: 'GLOBAL',
    frequency: 'DAILY',
    unit: 'USD_PER_BARREL',
    sourceTier: MacroSourceTier.TIER_2_EXCHANGE_INDEX_PROVIDER,
    sourceName: 'ICE Futures Europe'
  },
  COMMODITY_GOLD_SPOT: {
    seriesId: 'COMMODITY_GOLD_SPOT',
    name: 'Gold Spot USD/Troy Ounce',
    category: MacroMetricCategory.COMMODITIES,
    jurisdiction: 'GLOBAL',
    frequency: 'DAILY',
    unit: 'USD_PER_OUNCE',
    sourceTier: MacroSourceTier.TIER_2_EXCHANGE_INDEX_PROVIDER,
    sourceName: 'LBMA Gold Price'
  },

  // Liquidity
  US_FED_TOTAL_ASSETS: {
    seriesId: 'US_FED_TOTAL_ASSETS',
    name: 'Federal Reserve Total Assets (Balance Sheet)',
    category: MacroMetricCategory.LIQUIDITY,
    jurisdiction: 'US',
    frequency: 'WEEKLY',
    unit: 'MILLIONS_USD',
    sourceTier: MacroSourceTier.TIER_1_CENTRAL_BANK_GOV_STATS,
    sourceName: 'Federal Reserve H.4.1 Release'
  }
});

export function getMacroSeriesMetadata(seriesId) {
  return INSTITUTIONAL_MACRO_SERIES[seriesId] || null;
}

export const MacroSeriesCatalog = {
  ...INSTITUTIONAL_MACRO_SERIES,
  US_FED_FUNDS_TARGET_UPPER: {
    seriesId: 'US_FED_FUNDS_TARGET_UPPER',
    name: 'Federal Funds Target Rate Upper Limit',
    category: 'RATES',
    unit: '%'
  },
  US_10Y_YIELD: {
    seriesId: 'US_10Y_YIELD',
    name: 'US 10-Year Treasury Yield',
    category: 'RATES',
    unit: '%'
  },
  US_2Y_YIELD: {
    seriesId: 'US_2Y_YIELD',
    name: 'US 2-Year Treasury Yield',
    category: 'RATES',
    unit: '%'
  }
};

export const MacroSeriesRegistry = {
  getSeries(seriesId) {
    if (MacroSeriesCatalog[seriesId]) {
      return MacroSeriesCatalog[seriesId];
    }
    return INSTITUTIONAL_MACRO_SERIES[seriesId] || null;
  },
  getSeriesByCategory(category) {
    return Object.values(MacroSeriesCatalog).filter(s => s.category === category);
  },
  getAllSeries() {
    return Object.values(MacroSeriesCatalog);
  }
};

