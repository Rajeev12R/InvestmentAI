/**
 * server/earnings/earnings.explanation.js
 * 
 * Phase 21: Deterministic Corporate Event Explanation Generator
 * Generates audit-ready markdown summaries of earnings releases, surprises, guidance, and forecast deltas.
 */

export function generateEarningsExplanation(eventRecord = {}, surpriseReport, guidanceRecord, forecastRevision, impactClassification) {
  const ticker = (eventRecord?.securityId || 'UNKNOWN').toUpperCase();
  const period = (eventRecord?.reportingPeriod || 'UNKNOWN').toUpperCase();

  const lines = [];
  lines.push(`### Corporate Event Intelligence: ${ticker} (${period})`);
  lines.push(`- **Event Type**: ${eventRecord?.eventType || 'N/A'}`);
  lines.push(`- **Publication Timestamp**: ${eventRecord?.publicationTimestamp || 'N/A'}`);
  lines.push(`- **Overall Impact**: **${impactClassification?.impactCategory || 'UNKNOWN'}** (${impactClassification?.rationale || ''})`);

  if (surpriseReport?.surprises) {
    lines.push('\n#### Reported Results vs Consensus');
    for (const [m, s] of Object.entries(surpriseReport.surprises)) {
      if (s && s.direction !== 'UNKNOWN') {
        const pctStr = typeof s.percentageSurprise === 'number' ? ` (${(s.percentageSurprise * 100).toFixed(2)}%)` : '';
        lines.push(`- **${m}**: Reported \`${s.actualValue}\` vs Consensus \`${s.consensusValue}\` -> **${s.direction}** by \`${s.absoluteSurprise}\`${pctStr}`);
      }
    }
  }

  if (guidanceRecord) {
    lines.push('\n#### Forward Guidance Update');
    const rangeStr = guidanceRecord.low !== null && guidanceRecord.high !== null 
      ? `[\$${guidanceRecord.low} - \$${guidanceRecord.high}] (Midpoint: \$${guidanceRecord.midpoint})` 
      : `\$${guidanceRecord.pointEstimate}`;
    lines.push(`- **Guidance Range**: ${rangeStr}`);
    lines.push(`- **Revision Direction**: **${guidanceRecord.revisionDirection}**`);
  }

  if (forecastRevision) {
    lines.push('\n#### Event-Driven Forecast Revision');
    lines.push(`- **Prior Forecast**: \`${forecastRevision.previousValue}\` -> **Revised Forecast**: \`${forecastRevision.revisedValue}\` (\`${forecastRevision.deltaPercent >= 0 ? '+' : ''}${(forecastRevision.deltaPercent * 100).toFixed(2)}%\`)`);
    lines.push('- **Causality Attribution**:');
    for (const c of (forecastRevision.revisionCausality || [])) {
      lines.push(`  - *${c.driver}*: ${c.causality} (${c.evidence})`);
    }
  }

  return lines.join('\n');
}
