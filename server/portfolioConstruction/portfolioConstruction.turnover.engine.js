/**
 * Deterministic Turnover Engine for Phase 14
 */
export class TurnoverEngine {
  /**
   * Calculate portfolio turnover between current and target weights.
   * OneWayTurnover = 0.5 * sum(|w_target - w_current|)
   * TwoWayTurnover = sum(|w_target - w_current|)
   */
  static calculateTurnover(currentWeights = {}, targetWeights = {}) {
    const allTickers = Array.from(new Set([...Object.keys(currentWeights), ...Object.keys(targetWeights)]));

    let totalAbsoluteDelta = 0;
    let buyDelta = 0;
    let sellDelta = 0;
    const deltas = [];

    for (const ticker of allTickers) {
      const current = currentWeights[ticker] || 0;
      const target = targetWeights[ticker] || 0;
      const delta = target - current;
      const absDelta = Math.abs(delta);

      totalAbsoluteDelta += absDelta;
      if (delta > 0) {
        buyDelta += delta;
      } else {
        sellDelta += absDelta;
      }

      deltas.push({
        ticker,
        currentWeight: Number(current.toFixed(6)),
        targetWeight: Number(target.toFixed(6)),
        delta: Number(delta.toFixed(6)),
        absoluteDelta: Number(absDelta.toFixed(6)),
        action: delta > 1e-4 ? "BUY" : delta < -1e-4 ? "SELL" : "HOLD"
      });
    }

    const oneWayTurnover = totalAbsoluteDelta / 2.0;
    const twoWayTurnover = totalAbsoluteDelta;

    return {
      oneWayTurnover: Number(oneWayTurnover.toFixed(6)),
      twoWayTurnover: Number(twoWayTurnover.toFixed(6)),
      buySideTurnover: Number(buyDelta.toFixed(6)),
      sellSideTurnover: Number(sellDelta.toFixed(6)),
      tradeCount: deltas.filter(d => d.action !== "HOLD").length,
      positionDeltas: deltas
    };
  }
}
