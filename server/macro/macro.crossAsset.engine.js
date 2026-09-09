/**
 * server/macro/macro.crossAsset.engine.js
 * 
 * Phase 22: Cross-Asset Transmission & Relationship Engine
 * Evaluates deterministic transmission across 12 institutional asset-class channels.
 */

import { MacroClassification, deepFreeze } from './macro.types.js';

export const CROSS_ASSET_CHANNELS = Object.freeze({
  RATES_TO_BONDS: {
    ruleId: 'XASSET-01-RATES-BONDS',
    channel: 'RATES_TO_BONDS',
    description: 'Yield change transmission to fixed-income bond valuation via duration',
    formula: 'PriceChangePct = -1 * ModifiedDuration * YieldChangePct',
    elasticity: -1.0,
    sourceRationale: 'Bond pricing duration calculus'
  },
  RATES_TO_GROWTH_EQUITIES: {
    ruleId: 'XASSET-02-RATES-GROWTH-EQUITY',
    channel: 'RATES_TO_GROWTH_EQUITIES',
    description: 'Discount rate expansion compresses high-multiple long-duration growth stocks',
    formula: 'MultipleContractionPct = -1 * EquityDuration * RateChangePct',
    elasticity: -1.8,
    sourceRationale: 'DCF terminal value discount rate elasticity'
  },
  RATES_TO_BANKS: {
    ruleId: 'XASSET-03-RATES-BANKS',
    channel: 'RATES_TO_BANKS',
    description: 'Steeper yield curve and higher policy rate expands bank Net Interest Margin (NIM)',
    formula: 'NIMDeltaBps = 0.25 * PolicyRateDeltaBps + 0.15 * CurveSlopeDeltaBps',
    elasticity: 0.35,
    sourceRationale: 'Asset-liability maturity transformation spread'
  },
  USD_TO_COMMODITIES: {
    ruleId: 'XASSET-04-USD-COMMODITIES',
    channel: 'USD_TO_COMMODITIES',
    description: 'USD currency strengthening exerts inverse pricing pressure on dollar-denominated commodities',
    formula: 'CommodityPriceDeltaPct = -0.75 * DXYDeltaPct',
    elasticity: -0.75,
    sourceRationale: 'Global dollar purchasing power parity'
  },
  USD_TO_EMERGING_MARKETS: {
    ruleId: 'XASSET-05-USD-EM',
    channel: 'USD_TO_EMERGING_MARKETS',
    description: 'Dollar strength tightens offshore dollar liquidity and sovereign/corporate debt burdens',
    formula: 'EMEquityDeltaPct = -1.2 * DXYDeltaPct',
    elasticity: -1.2,
    sourceRationale: 'External dollar debt servicing and capital outflows'
  },
  OIL_TO_ENERGY: {
    ruleId: 'XASSET-06-OIL-ENERGY',
    channel: 'OIL_TO_ENERGY',
    description: 'Crude oil price shocks transmit directly to upstream energy sector operating cash flow',
    formula: 'EnergyEbitdaDeltaPct = 0.85 * OilPriceDeltaPct',
    elasticity: 0.85,
    sourceRationale: 'Upstream exploration & production revenue realization'
  },
  OIL_TO_AIRLINES: {
    ruleId: 'XASSET-07-OIL-AIRLINES',
    channel: 'OIL_TO_AIRLINES',
    description: 'Jet fuel input cost surge compresses transport and airline operating margins',
    formula: 'AirlinesMarginDeltaBps = -250 * OilPriceDeltaPct',
    elasticity: -0.60,
    sourceRationale: 'Fuel represents 25-35% of airline operating expense'
  },
  CREDIT_TO_EQUITY_RISK: {
    ruleId: 'XASSET-08-CREDIT-EQUITY',
    channel: 'CREDIT_TO_EQUITY_RISK',
    description: 'High yield credit spread widening increases corporate default risk premia and equity risk',
    formula: 'EquityRiskScoreDelta = clamp(round(SpreadWideningBps / 10), 0, 25)',
    elasticity: 0.10,
    sourceRationale: 'Merton structural model: equity as call option on firm assets'
  },
  INFLATION_TO_MARGINS: {
    ruleId: 'XASSET-09-INFLATION-MARGINS',
    channel: 'INFLATION_TO_MARGINS',
    description: 'Input cost inflation compresses margins for firms with low pricing power',
    formula: 'MarginDeltaBps = (PricingPowerBeta - 1.0) * InflationDeltaBps',
    elasticity: -0.40,
    sourceRationale: 'Cost-pass-through friction'
  },
  GROWTH_TO_CYCLICALS: {
    ruleId: 'XASSET-10-GROWTH-CYCLICALS',
    channel: 'GROWTH_TO_CYCLICALS',
    description: 'GDP acceleration disproportionately lifts cyclical industrials and consumer discretionary',
    formula: 'CyclicalRevenueDeltaPct = 1.6 * RealGDPDeltaPct',
    elasticity: 1.6,
    sourceRationale: 'Operating leverage and economic sensitivity'
  },
  RISK_OFF_TO_SAFE_HAVENS: {
    ruleId: 'XASSET-11-RISK-OFF-SAFE-HAVENS',
    channel: 'RISK_OFF_TO_SAFE_HAVENS',
    description: 'Risk-off flight to safety drives capital into gold and sovereign government bonds',
    formula: 'GoldPriceDeltaPct = 0.5 * RiskAversionIndexDelta',
    elasticity: 0.50,
    sourceRationale: 'Flight to quality / reserve currency asset preservation'
  },
  LIQUIDITY_TO_EQUITY_MULTIPLES: {
    ruleId: 'XASSET-12-LIQUIDITY-MULTIPLES',
    channel: 'LIQUIDITY_TO_EQUITY_MULTIPLES',
    description: 'Central bank balance sheet expansion increases liquidity and broad market valuation multiples',
    formula: 'PEExpansionDelta = 0.05 * BalanceSheetExpansionPct',
    elasticity: 0.40,
    sourceRationale: 'Global liquidity transmission to financial asset inflation'
  }
});

export class CrossAssetTransmissionEngine {
  /**
   * Computes cross-asset transmission impacts for a given macro shock
   */
  evaluateTransmission(shock = {}) {
    const { metric, shockMagnitude, channelKey } = shock;
    const rule = CROSS_ASSET_CHANNELS[channelKey];

    if (!rule) {
      return deepFreeze({
        isTransmitted: false,
        status: 'UNKNOWN_CHANNEL',
        classification: MacroClassification.CONFIGURED
      });
    }

    if (typeof shockMagnitude !== 'number' || !Number.isFinite(shockMagnitude)) {
      return deepFreeze({
        isTransmitted: false,
        status: 'UNAVAILABLE_NON_NUMERIC_SHOCK',
        rule,
        classification: MacroClassification.CONFIGURED
      });
    }

    const estimatedTransmissionPct = shockMagnitude * rule.elasticity;

    return deepFreeze({
      isTransmitted: true,
      channel: rule.channel,
      ruleId: rule.ruleId,
      description: rule.description,
      inputMetric: metric || 'MACRO_VARIABLE',
      shockMagnitude,
      elasticity: rule.elasticity,
      estimatedTransmissionPct,
      formula: rule.formula,
      sourceRationale: rule.sourceRationale,
      classification: MacroClassification.MODEL_ESTIMATE
    });
  }

  /**
   * Returns full catalog of active transmission rules
   */
  getAllTransmissionRules() {
    return Object.freeze(Object.values(CROSS_ASSET_CHANNELS));
  }
}

export const defaultCrossAssetTransmissionEngine = new CrossAssetTransmissionEngine();

const CHANNEL_ELASTICITIES = {
  RATES_TO_EQUITIES: -1.5,
  RATES_TO_VALUATION_DISCOUNT: 1.0,
  COMMODITY_TO_INFLATION: 0.25,
  COMMODITY_TO_MARGINS: -0.40,
  FX_TO_INFLATION: 0.15,
  FX_TO_EXPORT_COMPETITIVENESS: 0.80,
  CREDIT_TO_EQUITY_VALUATION: -0.60,
  CREDIT_TO_DEFAULT_PROBABILITY: 1.20,
  INFLATION_TO_POLICY_RATES: 0.75,
  GROWTH_TO_EARNINGS: 1.40,
  LIQUIDITY_TO_MULTIPLES: 0.50,
  CURRENCY_CRISIS_TO_SOVEREIGN_SPREAD: 2.00
};

export function calculateTransmission(channel, shockMagnitude) {
  if (typeof shockMagnitude !== 'number' || !Number.isFinite(shockMagnitude) || !channel || !CHANNEL_ELASTICITIES[channel]) {
    return deepFreeze({
      channel: channel || 'UNKNOWN',
      transmittedShock: 0,
      elasticity: 0,
      classification: 'MODEL_ESTIMATE'
    });
  }

  const elasticity = CHANNEL_ELASTICITIES[channel];
  const transmittedShock = shockMagnitude * elasticity;

  return deepFreeze({
    channel,
    shockMagnitude,
    elasticity,
    transmittedShock,
    classification: 'MODEL_ESTIMATE'
  });
}
