import { BREAKER_MONITOR_STATUS } from './change.types.js';

/**
 * Monitors and evaluates status of thesis breakers between previous and current snapshots.
 */
export function monitorThesisBreakers(previousSnapshot, currentSnapshot) {
  if (!currentSnapshot) {
    return [];
  }

  const breakers = currentSnapshot.thesisBreakerState || [];
  const monitored = [];

  const currFin = currentSnapshot.financialState || {};
  const prevFin = previousSnapshot?.financialState || {};

  const currPrice = currentSnapshot.marketState?.currentPrice;
  const dcfVal = currentSnapshot.valuationState?.dcfFairValue;

  for (const breaker of breakers) {
    let status = BREAKER_MONITOR_STATUS.NOT_TRIGGERED;
    let detail = '';

    // Operating margin contraction breaker
    if (breaker.direction === 'CONTRACTION_BELOW_THRESHOLD') {
      const margin = typeof currFin.operatingMargin === 'number'
        ? currFin.operatingMargin * (Math.abs(currFin.operatingMargin) < 1 ? 100 : 1)
        : null;
      const thresholdNum = parseFloat(breaker.threshold);

      if (margin !== null && !isNaN(thresholdNum)) {
        if (margin <= thresholdNum) {
          status = BREAKER_MONITOR_STATUS.TRIGGERED;
          detail = `Current operating margin (${margin.toFixed(1)}%) breached trigger threshold (${thresholdNum}%).`;
        } else if (margin <= thresholdNum + 1.5) {
          status = BREAKER_MONITOR_STATUS.APPROACHING;
          detail = `Operating margin (${margin.toFixed(1)}%) is approaching trigger threshold (${thresholdNum}%).`;
        } else {
          status = BREAKER_MONITOR_STATUS.NOT_TRIGGERED;
          detail = `Operating margin (${margin.toFixed(1)}%) comfortably exceeds trigger threshold (${thresholdNum}%).`;
        }
      }
    }
    // Leverage spike breaker
    else if (breaker.direction === 'EXPANSION_ABOVE_THRESHOLD') {
      const leverage = typeof currFin.debtToEbitda === 'number' ? currFin.debtToEbitda : null;
      const thresholdNum = parseFloat(breaker.threshold);

      if (leverage !== null && !isNaN(thresholdNum)) {
        if (leverage >= thresholdNum) {
          status = BREAKER_MONITOR_STATUS.TRIGGERED;
          detail = `Net Debt / EBITDA (${leverage.toFixed(2)}x) breached critical trigger threshold (${thresholdNum}x).`;
        } else if (leverage >= thresholdNum - 0.5) {
          status = BREAKER_MONITOR_STATUS.APPROACHING;
          detail = `Net Debt / EBITDA (${leverage.toFixed(2)}x) is nearing critical trigger threshold (${thresholdNum}x).`;
        } else {
          status = BREAKER_MONITOR_STATUS.NOT_TRIGGERED;
          detail = `Leverage (${leverage.toFixed(2)}x) remains within safe bounds.`;
        }
      }
    }
    // Valuation crossover breaker
    else if (breaker.direction === 'PRICE_CROSSOVER') {
      if (typeof currPrice === 'number' && typeof dcfVal === 'number' && dcfVal > 0) {
        if (currPrice >= dcfVal * 1.05) {
          status = BREAKER_MONITOR_STATUS.TRIGGERED;
          detail = `Market price ($${currPrice}) exceeds intrinsic fair value ($${dcfVal}), eliminating margin of safety.`;
        } else if (currPrice >= dcfVal * 0.95) {
          status = BREAKER_MONITOR_STATUS.APPROACHING;
          detail = `Market price ($${currPrice}) is within 5% of intrinsic fair value ($${dcfVal}).`;
        } else {
          status = BREAKER_MONITOR_STATUS.NOT_TRIGGERED;
          detail = `Market price ($${currPrice}) offers adequate margin of safety against DCF fair value ($${dcfVal}).`;
        }
      }
    }

    // Check if previously triggered but now resolved
    if (previousSnapshot && previousSnapshot.thesisBreakerState) {
      const prevBreaker = previousSnapshot.thesisBreakerState.find(b => b.trigger === breaker.trigger);
      if (prevBreaker && prevBreaker.status === BREAKER_MONITOR_STATUS.TRIGGERED && status === BREAKER_MONITOR_STATUS.NOT_TRIGGERED) {
        status = BREAKER_MONITOR_STATUS.RESOLVED;
        detail = `Previously triggered breaker has been resolved by operational/valuation improvement.`;
      }
    }

    monitored.push({
      ...breaker,
      status,
      detail,
      evaluatedAt: new Date().toISOString()
    });
  }

  return monitored;
}
