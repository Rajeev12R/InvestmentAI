export class PortfolioSignalAttributionEngine {
  /**
   * Aggregate and analyze signal exposures and concentration risks at the portfolio level.
   */
  evaluatePortfolioSignalAttribution({
    portfolioId = 'PORTFOLIO_DEFAULT',
    holdings = [], // [ { ticker, weight, dominantSignal, signalScore, signalDirection, correlatedGroup } ]
    signalCorrelations = {} // { [group1_group2]: correlation }
  }) {
    let grossExposure = 0;
    let netExposure = 0;
    let longExposure = 0;
    let shortExposure = 0;

    const signalFamilyWeights = {};
    const groupWeights = {};

    for (const h of holdings) {
      const w = h.weight || 0;
      const absW = Math.abs(w);
      grossExposure += absW;
      netExposure += w;

      if (w > 0) longExposure += w;
      else shortExposure += Math.abs(w);

      const family = h.dominantSignal || 'UNCLASSIFIED';
      signalFamilyWeights[family] = (signalFamilyWeights[family] || 0) + w;

      const group = h.correlatedGroup || family;
      groupWeights[group] = (groupWeights[group] || 0) + absW;
    }

    // Herfindahl-Hirschman Index (HHI) for signal concentration
    let hhi = 0;
    const concentrationRisks = [];
    for (const [group, weight] of Object.entries(groupWeights)) {
      const share = grossExposure > 0 ? weight / grossExposure : 0;
      hhi += share * share;

      if (share > 0.30) {
        concentrationRisks.push({
          group,
          weightShare: parseFloat(share.toFixed(4)),
          riskLevel: share > 0.50 ? 'CRITICAL' : 'HIGH',
          reason: `Signal group ${group} accounts for ${(share * 100).toFixed(1)}% of portfolio gross exposure`
        });
      }
    }

    // Signal conflict analysis (e.g. opposing signals among correlated holdings)
    let conflictDrag = 0;
    for (let i = 0; i < holdings.length; i++) {
      for (let j = i + 1; j < holdings.length; j++) {
        const h1 = holdings[i];
        const h2 = holdings[j];
        if (h1.correlatedGroup && h1.correlatedGroup === h2.correlatedGroup) {
          if (Math.sign(h1.signalScore || 0) !== Math.sign(h2.signalScore || 0) && (h1.signalScore !== 0 && h2.signalScore !== 0)) {
            conflictDrag += Math.min(Math.abs(h1.weight || 0), Math.abs(h2.weight || 0)) * 0.05;
          }
        }
      }
    }

    // Diversification benefit (1.0 = full diversification, 0.0 = completely concentrated)
    const diversificationBenefit = parseFloat((1.0 - Math.min(1.0, hhi)).toFixed(4));

    return {
      portfolioId,
      holdingsCount: holdings.length,
      grossExposure: parseFloat(grossExposure.toFixed(4)),
      netExposure: parseFloat(netExposure.toFixed(4)),
      longExposure: parseFloat(longExposure.toFixed(4)),
      shortExposure: parseFloat(shortExposure.toFixed(4)),
      signalConcentrationHHI: parseFloat(hhi.toFixed(4)),
      diversificationBenefit,
      conflictDrag: parseFloat(conflictDrag.toFixed(4)),
      concentrationRisks,
      signalFamilyWeights
    };
  }
}

export const defaultPortfolioAttributionEngine = new PortfolioSignalAttributionEngine();
