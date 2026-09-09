/**
 * server/macro/macro.config.js
 * 
 * Phase 22: Configuration & Canonical Materiality Thresholds
 */

export const MACRO_CONFIG = Object.freeze({
  ENGINE_VERSION: '22.0.0',
  SCHEMA_VERSION: '22.0.0',
  
  // Rate Shock Thresholds
  RATE_SHOCK_MATERIAL_BPS: 50,       // 50 bps change is material
  RATE_SHOCK_SEVERE_BPS: 100,        // 100 bps change is severe
  YIELD_CURVE_INVERSION_BPS: 0,      // 10Y - 2Y <= 0 bps is inverted
  
  // Inflation Shock Thresholds
  INFLATION_MOM_MATERIAL_PCT: 0.003, // 0.3% MoM
  INFLATION_YOY_MATERIAL_PCT: 0.005, // 0.5% YoY drift
  INFLATION_ELEVATED_PCT: 0.030,     // > 3.0% YoY is elevated
  
  // Credit Spread Thresholds
  CREDIT_SPREAD_WIDENING_BPS: 75,    // 75 bps OAS widening signals stress
  CREDIT_SPREAD_SEVERE_BPS: 150,     // 150 bps OAS widening is acute stress
  
  // FX Shock Thresholds
  FX_SHOCK_MATERIAL_PCT: 0.03,       // 3.0% move is material
  FX_SHOCK_SEVERE_PCT: 0.05,         // 5.0% move is severe
  
  // Commodity Shock Thresholds
  COMMODITY_SHOCK_MATERIAL_PCT: 0.05, // 5.0% move is material
  COMMODITY_SHOCK_SEVERE_PCT: 0.15,   // 15.0% move is severe
  
  // Attention Score Contributions
  ATTENTION_REGIME_CHANGE_SCORE: 65,
  ATTENTION_RATE_SHOCK_SCORE: 50,
  ATTENTION_INFLATION_SHOCK_SCORE: 45,
  ATTENTION_CREDIT_STRESS_SCORE: 70,
  ATTENTION_CURVE_INVERSION_SCORE: 55,
  ATTENTION_FX_SHOCK_SCORE: 35,
  ATTENTION_COMMODITY_SHOCK_SCORE: 40
});

export const MacroConfig = MACRO_CONFIG;
