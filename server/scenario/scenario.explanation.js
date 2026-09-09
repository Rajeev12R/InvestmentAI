/**
 * server/scenario/scenario.explanation.js
 * 
 * Phase 19: Deterministic Scenario Explanation & Copilot Synthesizer
 * Produces structured institutional explanations of stress test results with strict classification boundaries.
 */

/**
 * Generates deterministic structured explanation from scenario results
 */
export function generateScenarioExplanation(scenarioResult) {
  if (!scenarioResult || !scenarioResult.baseline || !scenarioResult.stressed) {
    throw new TypeError('Invalid scenarioResult object');
  }

  const scenarioName = scenarioResult.scenarioName || scenarioResult.scenarioId || 'Hypothetical Scenario';
  const baselineNav = scenarioResult.baseline.nav;
  const stressedNav = scenarioResult.stressed.nav;
  const pnlDollar = scenarioResult.deltas.pnlDollar;
  const pnlPercent = scenarioResult.deltas.pnlPercent;

  const isLoss = pnlDollar < 0;
  const pnlSignStr = isLoss ? '-' : '+';
  const absDollar = Math.abs(pnlDollar).toLocaleString('en-US', { style: 'currency', currency: scenarioResult.baseCurrency || 'USD' });
  const absPercent = (Math.abs(pnlPercent) * 100).toFixed(2);

  // Executive summary narrative
  const summary = `Under the hypothetical scenario "${scenarioName}", the portfolio NAV changes from ` +
    `$${baselineNav.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to ` +
    `$${stressedNav.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, ` +
    `representing a ${isLoss ? 'drawdown' : 'gain'} of ${absDollar} (${pnlSignStr}${absPercent}%).`;

  // Top vulnerability drivers
  const topLosers = scenarioResult.topLosers || [];
  const primaryVulnerability = topLosers.length > 0 ? topLosers[0] : null;

  const driverNotes = [];
  if (primaryVulnerability) {
    driverNotes.push(
      `Primary vulnerability driver: ${primaryVulnerability.ticker} with a stressed drawdown of ${(primaryVulnerability.pnlPercent * 100).toFixed(2)}% ($${Math.abs(primaryVulnerability.pnlDollar).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}).`
    );
  }

  // Sector attribution summary
  if (Array.isArray(scenarioResult.sectorAttribution) && scenarioResult.sectorAttribution.length > 0) {
    const worstSector = [...scenarioResult.sectorAttribution].sort((a, b) => a.pnlDollar - b.pnlDollar)[0];
    if (worstSector && worstSector.pnlDollar < 0) {
      driverNotes.push(
        `Sector exposure impact: "${worstSector.sector}" suffered largest dollar loss of $${Math.abs(worstSector.pnlDollar).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${(worstSector.contributionToNavPercent * 100).toFixed(2)}% portfolio NAV contribution).`
      );
    }
  }

  // Tax & Liquidity caveats if present
  const integrationCaveats = [];
  if (scenarioResult.taxAnalysis) {
    integrationCaveats.push(
      `After-tax stressed NAV is estimated at $${scenarioResult.taxAnalysis.afterAfterTaxStressedNav !== undefined ? scenarioResult.taxAnalysis.afterAfterTaxStressedNav.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : scenarioResult.taxAnalysis.afterTaxStressedNav.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} with tax shield/drag shift of $${scenarioResult.taxAnalysis.taxShieldOrDragDelta.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`
    );
  }
  if (scenarioResult.liquidityAnalysis) {
    integrationCaveats.push(
      `Stressed liquidation cost increases by $${scenarioResult.liquidityAnalysis.stressedLiquidityCostIncreaseDollar.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} under widened spreads and reduced ADV.`
    );
  }

  return {
    scenarioId: scenarioResult.scenarioId,
    scenarioName,
    executiveSummary: summary,
    primaryVulnerability,
    driverNotes,
    integrationCaveats,
    classificationNotice: 'HYPOTHETICAL SIMULATION — SCENARIO_OUTPUT. Not historical or observed Truth Layer facts.',
    generatedAt: new Date().toISOString()
  };
}
