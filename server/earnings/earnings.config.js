/**
 * server/earnings/earnings.config.js
 * 
 * Phase 21: Configuration & Materiality Thresholds
 */

export const EARNINGS_CONFIG = Object.freeze({
  ENGINE_VERSION: '21.1.0',
  SCHEMA_VERSION: '21.0.0',
  EXTRACTION_VERSION: 'v21_extract_strict',
  
  // Surprise materiality thresholds
  REVENUE_SURPRISE_THRESHOLD_PCT: 0.02, // 2.0%
  EPS_SURPRISE_THRESHOLD_PCT: 0.05,     // 5.0%
  MARGIN_SURPRISE_THRESHOLD_BPS: 100,    // 100 bps
  
  // Guidance revision thresholds
  GUIDANCE_MATERIAL_RAISE_PCT: 0.03,    // +3.0%
  GUIDANCE_MATERIAL_CUT_PCT: -0.03,     // -3.0%
  
  // Earnings Quality thresholds
  ACCRUAL_RATIO_WARNING_THRESHOLD: 0.10, // Accruals > 10% of total assets indicates lower quality
  CFO_TO_NET_INCOME_MIN_HEALTHY: 0.80,   // CFO / NI < 0.80 signals low cash conversion
  FCF_TO_NET_INCOME_MIN_HEALTHY: 0.60,
  
  // Receivables Quality Growth Gap Canonical Thresholds
  RECEIVABLES_GAP_BENIGN_THRESHOLD: 0.05,     // gap <= 5%: No anomaly
  RECEIVABLES_GAP_MODERATE_THRESHOLD: 0.25,   // 5% < gap <= 25%: Moderate divergence -> MEDIUM grade
  RECEIVABLES_GAP_SEVERE_THRESHOLD: 0.25,     // gap > 25%: Severe divergence -> LOW grade
  
  // Attention score thresholds
  ATTENTION_MISS_SCORE: 75,
  ATTENTION_GUIDANCE_CUT_SCORE: 85,
  ATTENTION_QUALITY_WARNING_SCORE: 65,
  ATTENTION_BEAT_SCORE: 35
});

export const EarningsConfig = EARNINGS_CONFIG;
