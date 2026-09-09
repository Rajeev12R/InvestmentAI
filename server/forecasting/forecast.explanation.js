/**
 * server/forecasting/forecast.explanation.js
 * 
 * Phase 20: Deterministic Forecast Explanation & Copilot Synthesizer
 * Generates structured institutional explanations for forward estimates with strict classification bounds.
 */

/**
 * Generates structured explanation from a forecast record.
 */
export function generateForecastExplanation(forecastRecord) {
  if (!forecastRecord || typeof forecastRecord !== 'object') {
    throw new TypeError('Invalid forecastRecord');
  }

  const ticker = forecastRecord.ticker || 'UNKNOWN';
  const metric = forecastRecord.metric || 'METRIC';
  const method = forecastRecord.method;
  const horizon = forecastRecord.horizon || '1Y';
  const val = forecastRecord.value;

  let narrative = '';
  const keyTakeaways = [];

  if (forecastRecord.output?.method === 'FUNDAMENTAL_INTEGRATED') {
    const summary = forecastRecord.output.summary;
    const finalYear = forecastRecord.output.periods[forecastRecord.output.periods.length - 1];
    narrative = `Forward-looking fundamental statement forecast for ${ticker} projects ${horizon} revenue of ` +
      `$${(summary.finalYearRevenue).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ` +
      `(CAGR: ${(summary.revenueCumulativeCAGR * 100).toFixed(2)}%), with projected EPS of $${summary.finalYearEPS.toFixed(2)} and FCF of $${summary.finalYearFCF.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}.`;

    keyTakeaways.push(`Revenue Growth Driver: Projected annual CAGR of ${(summary.revenueCumulativeCAGR * 100).toFixed(2)}% across ${horizon} horizon.`);
    keyTakeaways.push(`Margin & Profitability: Operating margin of ${(finalYear.assumptionsApplied.operatingMargin * 100).toFixed(1)}% yields projected EBIT of $${finalYear.ebit.toLocaleString('en-US', { maximumFractionDigits: 0 })}.`);
  } else {
    narrative = `Forward forecast for ${ticker} ${metric} over horizon ${horizon} using method ${method} is ` +
      `$${val !== null ? val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'}.`;
    keyTakeaways.push(`Method: Generated via deterministic ${method} model.`);
  }

  if (forecastRecord.uncertainty?.lowerBound95 !== undefined) {
    keyTakeaways.push(
      `Statistical 95% Confidence Interval: [$${forecastRecord.uncertainty.lowerBound95.toFixed(2)}, $${forecastRecord.uncertainty.upperBound95.toFixed(2)}] (Margin: ±$${forecastRecord.uncertainty.marginOfError95.toFixed(2)}).`
    );
  }

  return {
    forecastId: forecastRecord.forecastId,
    ticker,
    metric,
    executiveSummary: narrative,
    keyTakeaways,
    qualityRating: forecastRecord.quality?.qualityRating || 'UNRATED',
    classificationNotice: 'FORWARD-LOOKING ESTIMATE — FORECAST. Not historical or observed Truth Layer facts.',
    generatedAt: new Date().toISOString()
  };
}
