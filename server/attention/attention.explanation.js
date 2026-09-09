/**
 * @file attention.explanation.js
 * Deterministic explanation engine for Phase 7 Attention Intelligence.
 * Generates evidence-backed structured explanations without LLM inference.
 */

/**
 * Builds deterministic whyMatters, whatChanged, and whatInvalidates explanations.
 * @param {Object} item
 * @returns {{ whyMatters: string[], whatChanged: string[], whatInvalidates: string[] }}
 */
export function generateAttentionExplanation(item) {
  const whyMatters = [];
  const whatChanged = [];
  const whatInvalidates = [];

  // 1. Decision Change Explanation
  if (item.previousDecision && item.currentDecision && item.previousDecision !== item.currentDecision) {
    whyMatters.push(`Deterministic investment decision shifted from ${item.previousDecision} to ${item.currentDecision}.`);
    whatChanged.push(`Decision changed from ${item.previousDecision} to ${item.currentDecision}.`);
    whatInvalidates.push(`Reversal of driving metric triggers or upgrade in conviction/MOS back to ${item.previousDecision} thresholds.`);
  }

  // 2. Valuation Drift Explanation
  if (item.metrics?.valuationDriftPct !== undefined) {
    const drift = item.metrics.valuationDriftPct;
    const sign = drift > 0 ? '+' : '';
    const dir = drift > 0 ? 'increased' : 'decreased';
    whyMatters.push(`Fair value / DCF estimate ${dir} by ${sign}${drift.toFixed(1)}%, altering the margin of safety.`);
    whatChanged.push(`Valuation estimate drifted ${sign}${drift.toFixed(1)}% between snapshots.`);
    whatInvalidates.push(`Fundamental revision restoring cash flow projections or revised discount rate.`);
  }

  // 3. Risk Escalation Explanation
  if (item.metrics?.riskDriftSeverity) {
    whyMatters.push(`Institutional risk profile escalated: ${item.metrics.riskDriftSeverity}.`);
    whatChanged.push(`Risk indicators shifted to ${item.metrics.riskDriftSeverity}.`);
    whatInvalidates.push(`De-leveraging, margin stabilization, or resolution of underlying governance/liquidity flags.`);
  }

  // 4. Thesis Breaker Explanation
  if (item.thesisBreakerStatus === 'TRIGGERED') {
    whyMatters.push(`A core investment thesis-breaker condition was deterministically triggered.`);
    whatChanged.push(`Thesis-breaker condition breached critical falsification boundary.`);
    whatInvalidates.push(`Verified recovery of the breached metric above the minimum required thesis threshold.`);
  } else if (item.thesisBreakerStatus === 'APPROACHING') {
    whyMatters.push(`Underlying operating metrics are approaching the designated thesis-breaker threshold.`);
    whatChanged.push(`Operating buffer toward thesis falsification threshold has narrowed.`);
    whatInvalidates.push(`Stabilization or expansion of operating buffer away from breaker boundary.`);
  }

  // 5. Portfolio Concentration / Correlation
  if (item.category === 'PORTFOLIO_CONCENTRATION') {
    whyMatters.push(`Single-position or top-holding concentration exceeds institutional diversification limits.`);
    whatChanged.push(`Portfolio weight reached ${((item.metrics?.portfolioWeight || 0) * 100).toFixed(1)}%.`);
    whatInvalidates.push(`Position rebalancing or capital deployment reducing individual concentration below threshold.`);
  } else if (item.category === 'CORRELATION_RISK') {
    whyMatters.push(`Excessive pairwise correlation detected across portfolio holdings.`);
    whatChanged.push(`Cluster correlation exceeds 0.80 across multiple holdings.`);
    whatInvalidates.push(`Asset diversification into uncorrelated sectors/factors.`);
  }

  // 6. External Event Explanation
  if (item.eventIds && item.eventIds.length > 0) {
    whatChanged.push(`Verified external event (${item.eventIds.join(', ')}) ingested and confirmed in Truth snapshot.`);
  }

  // Fallbacks if lists are empty
  if (whyMatters.length === 0) {
    whyMatters.push(`Deterministic signal triggered in category ${item.category || 'GENERAL'}.`);
  }
  if (whatChanged.length === 0) {
    whatChanged.push(`State transition detected in snapshot ${item.snapshotId || item.packageHash || 'CURRENT'}.`);
  }
  if (whatInvalidates.length === 0) {
    whatInvalidates.push(`Subsequent verified data update restoring baseline parameter state.`);
  }

  return {
    whyMatters,
    whatChanged,
    whatInvalidates
  };
}
