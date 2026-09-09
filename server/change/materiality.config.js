import { CHANGE_CATEGORIES, MATERIALITY_LEVELS } from './change.types.js';

/**
 * Centralized, Auditable Materiality Thresholds Configuration.
 * Every threshold defines percentage or transition rules and reasons.
 */
export const MATERIALITY_CONFIG = {
  [CHANGE_CATEGORIES.PRICE]: {
    thresholdPct: 5.0,
    criticalThresholdPct: 20.0,
    type: 'HEURISTIC',
    reason: 'Price movement > 5% alters entry/exit margin of safety.'
  },
  [CHANGE_CATEGORIES.REVENUE]: {
    thresholdPct: 5.0,
    criticalThresholdPct: 15.0,
    type: 'INSTITUTIONAL_STANDARD',
    reason: 'Revenue variance > 5% indicates acceleration or slowing in top-line demand.'
  },
  [CHANGE_CATEGORIES.EARNINGS]: {
    thresholdPct: 8.0,
    criticalThresholdPct: 20.0,
    type: 'INSTITUTIONAL_STANDARD',
    reason: 'Net income variance > 8% alters EPS trajectory.'
  },
  [CHANGE_CATEGORIES.FREE_CASH_FLOW]: {
    thresholdPct: 10.0,
    criticalThresholdPct: 25.0,
    type: 'INSTITUTIONAL_STANDARD',
    reason: 'FCF variance > 10% materially impacts discounted cash flow valuation.'
  },
  [CHANGE_CATEGORIES.MARGINS]: {
    thresholdBps: 150, // 1.5%
    criticalThresholdBps: 300,
    type: 'INSTITUTIONAL_STANDARD',
    reason: 'Margin contraction > 150 bps indicates pricing pressure or cost inflation.'
  },
  [CHANGE_CATEGORIES.DEBT]: {
    thresholdPct: 10.0,
    criticalThresholdPct: 30.0,
    type: 'INSTITUTIONAL_STANDARD',
    reason: 'Debt increase > 10% elevates balance sheet leverage risk.'
  },
  [CHANGE_CATEGORIES.CASH]: {
    thresholdPct: 15.0,
    criticalThresholdPct: 35.0,
    type: 'HEURISTIC',
    reason: 'Cash depletion > 15% reduces liquidity buffer.'
  },
  [CHANGE_CATEGORIES.LEVERAGE]: {
    thresholdDelta: 0.5, // e.g. Debt/EBITDA increase of 0.5x
    criticalThresholdDelta: 1.5,
    type: 'INSTITUTIONAL_STANDARD',
    reason: 'Debt/EBITDA expansion of 0.5x significantly impairs solvency resilience.'
  },
  [CHANGE_CATEGORIES.VALUATION]: {
    thresholdPct: 8.0,
    criticalThresholdPct: 20.0,
    type: 'INSTITUTIONAL_STANDARD',
    reason: 'DCF / Composite Fair Value shift > 8% changes intrinsic value thesis.'
  },
  [CHANGE_CATEGORIES.RISK]: {
    transitionRequired: true,
    type: 'DETERMINISTIC_MATRIX',
    reason: 'Any category transition (e.g. LOW -> MEDIUM or MEDIUM -> HIGH) is inherently material.'
  },
  [CHANGE_CATEGORIES.DECISION]: {
    transitionRequired: true,
    type: 'DETERMINISTIC_MATRIX',
    reason: 'Any decision change (e.g. BUY -> HOLD or WATCH -> AVOID) is critical.'
  },
  [CHANGE_CATEGORIES.REVERSE_DCF]: {
    thresholdDeltaPct: 2.0, // e.g. 200 bps shift in implied growth
    criticalThresholdDeltaPct: 5.0,
    type: 'INSTITUTIONAL_STANDARD',
    reason: 'Shift of > 2.0% in market-implied growth expectation alters hurdles.'
  }
};

/**
 * Evaluates materiality for a numerical or transition change.
 */
export function evaluateMateriality({
  category,
  previousValue,
  currentValue,
  percentageChange = null,
  absoluteChange = null
}) {
  const config = MATERIALITY_CONFIG[category];
  if (!config) {
    return {
      level: MATERIALITY_LEVELS.LOW,
      isMaterial: false,
      threshold: 'DEFAULT',
      reason: 'No dedicated threshold rule; classified as low materiality.',
      isHeuristic: true
    };
  }

  // Risk or Decision transition evaluation
  if (config.transitionRequired) {
    if (previousValue !== currentValue) {
      const isCritical = (category === CHANGE_CATEGORIES.DECISION && currentValue === 'AVOID') ||
                         (category === CHANGE_CATEGORIES.RISK && currentValue === 'CRITICAL');
      return {
        level: isCritical ? MATERIALITY_LEVELS.CRITICAL : MATERIALITY_LEVELS.HIGHLY_MATERIAL,
        isMaterial: true,
        threshold: 'STATE_TRANSITION',
        reason: `${category} transitioned from ${previousValue} to ${currentValue}. ${config.reason}`,
        isHeuristic: config.type === 'HEURISTIC'
      };
    }
    return {
      level: MATERIALITY_LEVELS.NEGLIGIBLE,
      isMaterial: false,
      threshold: 'STATE_TRANSITION',
      reason: 'No state transition detected.',
      isHeuristic: false
    };
  }

  // Margin BPS evaluation
  if (config.thresholdBps && absoluteChange !== null) {
    const bps = Math.abs(absoluteChange * 10000);
    if (bps >= config.criticalThresholdBps) {
      return {
        level: MATERIALITY_LEVELS.CRITICAL,
        isMaterial: true,
        threshold: `${config.criticalThresholdBps} bps`,
        reason: `Margin shifted by ${Math.round(bps)} bps (exceeds critical ${config.criticalThresholdBps} bps).`,
        isHeuristic: config.type === 'HEURISTIC'
      };
    }
    if (bps >= config.thresholdBps) {
      return {
        level: MATERIALITY_LEVELS.MATERIAL,
        isMaterial: true,
        threshold: `${config.thresholdBps} bps`,
        reason: `Margin shifted by ${Math.round(bps)} bps (exceeds material ${config.thresholdBps} bps).`,
        isHeuristic: config.type === 'HEURISTIC'
      };
    }
  }

  // Percentage variance evaluation
  if (config.thresholdPct && percentageChange !== null) {
    const absPct = Math.abs(percentageChange);
    if (config.criticalThresholdPct && absPct >= config.criticalThresholdPct) {
      return {
        level: MATERIALITY_LEVELS.CRITICAL,
        isMaterial: true,
        threshold: `${config.criticalThresholdPct}%`,
        reason: `Variance of ${percentageChange > 0 ? '+' : ''}${percentageChange.toFixed(1)}% exceeds critical threshold (${config.criticalThresholdPct}%).`,
        isHeuristic: config.type === 'HEURISTIC'
      };
    }
    if (absPct >= config.thresholdPct) {
      return {
        level: MATERIALITY_LEVELS.MATERIAL,
        isMaterial: true,
        threshold: `${config.thresholdPct}%`,
        reason: `Variance of ${percentageChange > 0 ? '+' : ''}${percentageChange.toFixed(1)}% exceeds material threshold (${config.thresholdPct}%).`,
        isHeuristic: config.type === 'HEURISTIC'
      };
    }
    return {
      level: absPct >= (config.thresholdPct / 2) ? MATERIALITY_LEVELS.LOW : MATERIALITY_LEVELS.NEGLIGIBLE,
      isMaterial: false,
      threshold: `${config.thresholdPct}%`,
      reason: `Variance of ${percentageChange > 0 ? '+' : ''}${percentageChange.toFixed(1)}% is within standard tolerances.`,
      isHeuristic: config.type === 'HEURISTIC'
    };
  }

  return {
    level: MATERIALITY_LEVELS.LOW,
    isMaterial: false,
    threshold: 'DEFAULT',
    reason: 'Variance did not trigger threshold bounds.',
    isHeuristic: config.type === 'HEURISTIC'
  };
}
