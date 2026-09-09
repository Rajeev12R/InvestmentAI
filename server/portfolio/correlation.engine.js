/**
 * Calculates Pearson correlation between two return series.
 *
 * @param {Array<number>} seriesA
 * @param {Array<number>} seriesB
 * @param {number} minSamples
 * @returns {number|null} Correlation coefficient in [-1, 1] or null
 */
export function calculatePairwiseCorrelation(seriesA = [], seriesB = [], minSamples = 5) {
  if (!Array.isArray(seriesA) || !Array.isArray(seriesB)) return null;

  const n = Math.min(seriesA.length, seriesB.length);
  if (n < minSamples) return null;

  // Extract valid pairs
  const pairs = [];
  for (let i = 0; i < n; i++) {
    const a = seriesA[i];
    const b = seriesB[i];
    if (typeof a === 'number' && !isNaN(a) && typeof b === 'number' && !isNaN(b)) {
      pairs.push([a, b]);
    }
  }

  if (pairs.length < minSamples) return null;

  const count = pairs.length;
  const meanA = pairs.reduce((sum, p) => sum + p[0], 0) / count;
  const meanB = pairs.reduce((sum, p) => sum + p[1], 0) / count;

  let numerator = 0;
  let denomA = 0;
  let denomB = 0;

  for (let i = 0; i < count; i++) {
    const diffA = pairs[i][0] - meanA;
    const diffB = pairs[i][1] - meanB;
    numerator += diffA * diffB;
    denomA += diffA * diffA;
    denomB += diffB * diffB;
  }

  if (denomA === 0 || denomB === 0) return 0; // zero variance

  const r = numerator / (Math.sqrt(denomA) * Math.sqrt(denomB));
  // Bound to [-1, 1] to avoid float precision overshoot
  return Math.max(-1, Math.min(1, Math.round(r * 10000) / 10000));
}

/**
 * Builds pairwise correlation matrix across a map of return series.
 *
 * @param {Object<string, Array<number>>} returnsMap - Map of ticker -> returns array
 * @param {number} minSamples
 * @returns {Object} Correlation matrix and average pairwise correlation
 */
export function buildCorrelationMatrix(returnsMap = {}, minSamples = 5) {
  const tickers = Object.keys(returnsMap).filter(t => Array.isArray(returnsMap[t]) && returnsMap[t].length > 0);

  if (tickers.length === 0) {
    return {
      status: 'UNAVAILABLE',
      reason: 'No return series provided',
      tickers: [],
      matrix: {},
      averagePairwiseCorrelation: null
    };
  }

  const matrix = {};
  let totalPairwiseCorr = 0;
  let pairCount = 0;

  for (let i = 0; i < tickers.length; i++) {
    const tA = tickers[i];
    matrix[tA] = {};

    for (let j = 0; j < tickers.length; j++) {
      const tB = tickers[j];
      if (i === j) {
        matrix[tA][tB] = 1.0;
      } else if (matrix[tB] && matrix[tB][tA] !== undefined) {
        matrix[tA][tB] = matrix[tB][tA];
      } else {
        const corr = calculatePairwiseCorrelation(returnsMap[tA], returnsMap[tB], minSamples);
        matrix[tA][tB] = corr;
        if (corr !== null) {
          totalPairwiseCorr += corr;
          pairCount++;
        }
      }
    }
  }

  const avgCorr = pairCount > 0 ? Math.round((totalPairwiseCorr / pairCount) * 10000) / 10000 : null;

  return {
    status: pairCount > 0 || tickers.length === 1 ? 'COMPLETE' : 'INSUFFICIENT_DATA',
    tickers,
    matrix,
    averagePairwiseCorrelation: avgCorr,
    evaluatedPairsCount: pairCount
  };
}
