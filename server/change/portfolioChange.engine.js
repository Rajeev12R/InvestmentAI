/**
 * Deterministic Portfolio Change Intelligence Engine.
 * Analyzes concentration shifts, sector weights, and diversification changes over time.
 */
export function analyzePortfolioDrift(previousPortfolio, currentPortfolio) {
  if (!previousPortfolio || !currentPortfolio) {
    return {
      hasChanged: false,
      hhiChange: 0,
      diversificationShift: 'STABLE',
      weightChanges: [],
      summary: 'Baseline portfolio state initialized.'
    };
  }

  const prevHoldings = previousPortfolio.holdings || [];
  const currHoldings = currentPortfolio.holdings || [];

  // Compute weights for previous
  const prevTotal = prevHoldings.reduce((sum, h) => sum + (h.quantity * (h.currentPrice || h.averageCost || 1)), 0);
  const currTotal = currHoldings.reduce((sum, h) => sum + (h.quantity * (h.currentPrice || h.averageCost || 1)), 0);

  const prevWeights = {};
  prevHoldings.forEach(h => {
    const val = h.quantity * (h.currentPrice || h.averageCost || 1);
    prevWeights[h.ticker] = prevTotal > 0 ? (val / prevTotal) * 100 : 0;
  });

  const currWeights = {};
  currHoldings.forEach(h => {
    const val = h.quantity * (h.currentPrice || h.averageCost || 1);
    currWeights[h.ticker] = currTotal > 0 ? (val / currTotal) * 100 : 0;
  });

  // Calculate HHI
  const prevHHI = Object.values(prevWeights).reduce((sum, w) => sum + (w * w), 0);
  const currHHI = Object.values(currWeights).reduce((sum, w) => sum + (w * w), 0);
  const hhiDelta = Math.round(currHHI - prevHHI);

  const allTickers = Array.from(new Set([...Object.keys(prevWeights), ...Object.keys(currWeights)]));
  const weightChanges = allTickers.map(ticker => {
    const pw = prevWeights[ticker] || 0;
    const cw = currWeights[ticker] || 0;
    return {
      ticker,
      previousWeightPct: Math.round(pw * 10) / 10,
      currentWeightPct: Math.round(cw * 10) / 10,
      deltaWeightPct: Math.round((cw - pw) * 10) / 10
    };
  });

  let diversificationShift = 'STABLE';
  if (hhiDelta > 300) diversificationShift = 'CONCENTRATING';
  else if (hhiDelta < -300) diversificationShift = 'DIVERSIFYING';

  return {
    hasChanged: Math.abs(hhiDelta) >= 50,
    previousHHI: Math.round(prevHHI),
    currentHHI: Math.round(currHHI),
    hhiDelta,
    diversificationShift,
    weightChanges,
    summary: `Portfolio concentration shifted by ${hhiDelta > 0 ? '+' : ''}${hhiDelta} HHI points (${diversificationShift}).`
  };
}
