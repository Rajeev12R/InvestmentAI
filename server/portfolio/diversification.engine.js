import { DIVERSIFICATION_LEVELS } from './portfolio.types.js';

/**
 * Calculates portfolio diversification metrics based on concentration and correlation data.
 *
 * @param {Object} concentrationResult - Output of calculateConcentration
 * @param {Object} [correlationResult] - Output of buildCorrelationMatrix
 * @returns {Object} Diversification analysis
 */
export function evaluateDiversification(concentrationResult = {}, correlationResult = null) {
  if (!concentrationResult || concentrationResult.status !== 'COMPLETE') {
    return {
      status: 'UNAVAILABLE',
      reason: 'Valid concentration data required',
      effectiveNumberOfBets: null,
      diversificationLevel: DIVERSIFICATION_LEVELS.UNKNOWN,
      sectorCount: 0,
      sectorHHI: null,
      diversificationScore: null
    };
  }

  const { positions = [], sectorBreakdown = [], hhi } = concentrationResult;

  if (positions.length === 0 || !hhi || hhi <= 0) {
    return {
      status: 'UNAVAILABLE',
      reason: 'No positions or invalid HHI',
      effectiveNumberOfBets: null,
      diversificationLevel: DIVERSIFICATION_LEVELS.UNKNOWN,
      sectorCount: 0,
      sectorHHI: null,
      diversificationScore: null
    };
  }

  // Effective number of uncorrelated bets N_eff = 1 / sum(w_i^2)
  // Since HHI = 10,000 * sum(w_i^2), N_eff = 10,000 / HHI
  const effectiveNumberOfBets = Math.round((10000 / hhi) * 100) / 100;

  // Sector HHI
  const sectorHHI = Math.round(
    sectorBreakdown.reduce((sum, s) => {
      const pct = s.weight * 100;
      return sum + (pct * pct);
    }, 0)
  );

  let diversificationLevel = DIVERSIFICATION_LEVELS.MODERATE;
  if (effectiveNumberOfBets < 3.0 || sectorBreakdown.length <= 1) {
    diversificationLevel = DIVERSIFICATION_LEVELS.POOR;
  } else if (effectiveNumberOfBets >= 7.0 && sectorBreakdown.length >= 4) {
    diversificationLevel = DIVERSIFICATION_LEVELS.STRONG;
  }

  // Diversification score 0..100 (derived deterministically from N_eff and sector dispersion)
  // Max score 100 achieved at N_eff >= 10 and >= 5 sectors
  const posScore = Math.min(60, (effectiveNumberOfBets / 10) * 60);
  const sectorScore = Math.min(40, (sectorBreakdown.length / 5) * 40);
  const rawScore = Math.round(posScore + sectorScore);

  let avgCorrelation = null;
  if (correlationResult && correlationResult.averagePairwiseCorrelation !== null && correlationResult.averagePairwiseCorrelation !== undefined) {
    avgCorrelation = correlationResult.averagePairwiseCorrelation;
  }

  return {
    status: 'COMPLETE',
    effectiveNumberOfBets,
    diversificationLevel,
    diversificationScore: rawScore,
    positionCount: positions.length,
    sectorCount: sectorBreakdown.length,
    positionHHI: hhi,
    sectorHHI,
    averagePairwiseCorrelation: avgCorrelation,
    interpretation: diversificationLevel === DIVERSIFICATION_LEVELS.STRONG
      ? 'Well-diversified portfolio across positions and sectors'
      : diversificationLevel === DIVERSIFICATION_LEVELS.MODERATE
      ? 'Moderately concentrated portfolio with acceptable dispersion'
      : 'High concentration risk; portfolio exposed to idiosyncratic shocks'
  };
}
