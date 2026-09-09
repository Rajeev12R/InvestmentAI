import { SIZING_MODELS, CONCENTRATION_THRESHOLDS } from './portfolio.types.js';

/**
 * Calculates target position weights and rebalancing deltas.
 *
 * @param {Array<{ ticker: string, value: number, volatility?: number, beta?: number, convictionScore?: number, riskScore?: number }>} positions
 * @param {Object} options - Sizing model options
 * @returns {Object} Target weights and rebalancing suggestions
 */
export function calculateTargetWeights(positions = [], options = {}) {
  const {
    model = SIZING_MODELS.EQUAL_WEIGHT,
    maxPositionCap = CONCENTRATION_THRESHOLDS.MAX_SINGLE_POSITION,
    minPositionFloor = 0.02
  } = options;

  const warnings = [];

  if (!Array.isArray(positions) || positions.length === 0) {
    return {
      status: 'UNAVAILABLE',
      reason: 'No positions provided',
      model,
      targets: [],
      warnings: ['No positions provided for position sizing calculation.']
    };
  }

  const n = positions.length;
  const totalValue = positions.reduce((s, p) => s + (p.value || 0), 0);

  let rawWeights = [];

  if (model === SIZING_MODELS.EQUAL_WEIGHT) {
    const eqWeight = 1 / n;
    rawWeights = positions.map(p => ({ ticker: p.ticker, currentWeight: totalValue > 0 ? p.value / totalValue : 0, rawTarget: eqWeight }));
  } else if (model === SIZING_MODELS.RISK_PARITY_VOL) {
    // Inverse volatility or inverse beta
    const invRisks = positions.map(p => {
      const hasVol = typeof p.volatility === 'number' && p.volatility > 0;
      const hasBeta = typeof p.beta === 'number' && p.beta > 0;

      let risk = 1.0;
      if (hasVol) {
        risk = p.volatility;
      } else if (hasBeta) {
        risk = p.beta;
        warnings.push(`Position ${p.ticker} has unavailable volatility; scaled using systematic beta (${p.beta}) as risk proxy.`);
      } else {
        risk = 1.0;
        warnings.push(`Position ${p.ticker} has unavailable volatility and beta; allocated benchmark unit risk proxy (1.0).`);
      }

      return 1 / risk;
    });
    const sumInv = invRisks.reduce((a, b) => a + b, 0);
    rawWeights = positions.map((p, idx) => ({
      ticker: p.ticker,
      currentWeight: totalValue > 0 ? p.value / totalValue : 0,
      rawTarget: invRisks[idx] / sumInv
    }));
  } else if (model === SIZING_MODELS.CONVICTION_WEIGHTED) {
    // Weight proportional to conviction score (0..100) or defaults to equal
    const scores = positions.map(p => {
      if (p.convictionScore === null || p.convictionScore === undefined) {
        warnings.push(`Position ${p.ticker} has unavailable conviction score; assigned baseline median score (50/100).`);
      }
      return Math.max(10, p.convictionScore ?? 50);
    });
    const sumScore = scores.reduce((a, b) => a + b, 0);
    rawWeights = positions.map((p, idx) => ({
      ticker: p.ticker,
      currentWeight: totalValue > 0 ? p.value / totalValue : 0,
      rawTarget: scores[idx] / sumScore
    }));
  } else {
    // Default equal weight
    const eqWeight = 1 / n;
    rawWeights = positions.map(p => ({ ticker: p.ticker, currentWeight: totalValue > 0 ? p.value / totalValue : 0, rawTarget: eqWeight }));
  }

  // Apply Max Position Cap iteratively
  let cappedWeights = [...rawWeights];
  let excess = 0;
  let iterations = 0;

  do {
    excess = 0;
    let uncappedCount = 0;
    let uncappedSum = 0;

    for (let i = 0; i < cappedWeights.length; i++) {
      if (cappedWeights[i].rawTarget > maxPositionCap) {
        excess += cappedWeights[i].rawTarget - maxPositionCap;
        cappedWeights[i].rawTarget = maxPositionCap;
      } else {
        uncappedCount++;
        uncappedSum += cappedWeights[i].rawTarget;
      }
    }

    if (excess > 0.0001 && uncappedCount > 0 && uncappedSum > 0) {
      for (let i = 0; i < cappedWeights.length; i++) {
        if (cappedWeights[i].rawTarget < maxPositionCap) {
          cappedWeights[i].rawTarget += excess * (cappedWeights[i].rawTarget / uncappedSum);
        }
      }
    }
    iterations++;
  } while (excess > 0.0001 && iterations < 10);

  // Normalize to exactly 1.0 sum
  const finalSum = cappedWeights.reduce((s, p) => s + p.rawTarget, 0);
  const targets = cappedWeights.map(p => {
    const targetWeight = Math.round((p.rawTarget / finalSum) * 10000) / 10000;
    const currentWeight = Math.round(p.currentWeight * 10000) / 10000;
    const deltaWeight = Math.round((targetWeight - currentWeight) * 10000) / 10000;
    const targetValue = Math.round(targetWeight * totalValue);
    const deltaValue = Math.round(deltaWeight * totalValue);

    let action = 'HOLD';
    if (deltaWeight > 0.02) action = 'INCREASE';
    else if (deltaWeight < -0.02) action = 'DECREASE';

    return {
      ticker: p.ticker,
      currentWeight,
      currentWeightPct: Math.round(currentWeight * 10000) / 100,
      targetWeight,
      targetWeightPct: Math.round(targetWeight * 10000) / 100,
      deltaWeight,
      deltaWeightPct: Math.round(deltaWeight * 10000) / 100,
      targetValue,
      deltaValue,
      action
    };
  }).sort((a, b) => b.targetWeight - a.targetWeight);

  return {
    status: 'COMPLETE',
    model,
    maxPositionCap,
    totalPortfolioValue: totalValue,
    targets,
    warnings
  };
}
