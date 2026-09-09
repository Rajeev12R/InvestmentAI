import { TurnoverEngine } from "./portfolioConstruction.turnover.engine.js";
import { CovarianceEngine } from "./portfolioConstruction.covariance.engine.js";

/**
 * Deterministic Portfolio Comparison Engine for Phase 14
 */
export class PortfolioComparisonEngine {
  /**
   * Compare Current Portfolio vs Proposed Target Portfolio.
   */
  static compare(currentWeights = {}, targetWeights = {}, universeSecurities = [], covarianceMatrix = null, expectedReturns = {}) {
    const tickers = universeSecurities.map(s => s.ticker);
    const n = tickers.length;

    // Turnover
    const turnover = TurnoverEngine.calculateTurnover(currentWeights, targetWeights);

    // Current vs Proposed arrays
    const curArray = tickers.map(t => currentWeights[t] || 0);
    const tgtArray = tickers.map(t => targetWeights[t] || 0);

    // Expected returns
    let curExpReturn = null;
    let tgtExpReturn = null;
    if (expectedReturns && Object.keys(expectedReturns).length > 0) {
      let curR = 0;
      let tgtR = 0;
      let hasAll = true;

      for (let i = 0; i < n; i++) {
        const t = tickers[i];
        const r = expectedReturns[t]?.expectedReturn ?? expectedReturns[t];
        if (typeof r === "number" && isFinite(r)) {
          curR += curArray[i] * r;
          tgtR += tgtArray[i] * r;
        } else {
          hasAll = false;
        }
      }

      if (hasAll) {
        curExpReturn = Number(curR.toFixed(6));
        tgtExpReturn = Number(tgtR.toFixed(6));
      }
    }

    // Volatilities
    let curVol = null;
    let tgtVol = null;
    let curRiskBudget = null;
    let tgtRiskBudget = null;

    if (covarianceMatrix) {
      curVol = Number(CovarianceEngine.calculatePortfolioVolatility(curArray, covarianceMatrix).toFixed(6));
      tgtVol = Number(CovarianceEngine.calculatePortfolioVolatility(tgtArray, covarianceMatrix).toFixed(6));
      curRiskBudget = CovarianceEngine.calculateRiskContributions(curArray, covarianceMatrix, tickers);
      tgtRiskBudget = CovarianceEngine.calculateRiskContributions(tgtArray, covarianceMatrix, tickers);
    }

    // Diversification HHI & Effective N
    const curHHI = curArray.reduce((acc, w) => acc + w * w, 0);
    const tgtHHI = tgtArray.reduce((acc, w) => acc + w * w, 0);
    const curEffN = curHHI > 0 ? Number((1 / curHHI).toFixed(2)) : 0;
    const tgtEffN = tgtHHI > 0 ? Number((1 / tgtHHI).toFixed(2)) : 0;

    // Sector breakdown
    const sectorMap = {};
    for (const sec of universeSecurities) {
      const s = sec.sector || "UNKNOWN";
      if (!sectorMap[s]) sectorMap[s] = { current: 0, target: 0 };
      sectorMap[s].current += currentWeights[sec.ticker] || 0;
      sectorMap[s].target += targetWeights[sec.ticker] || 0;
    }

    const sectorComparison = Object.entries(sectorMap).map(([sector, data]) => ({
      sector,
      currentWeight: Number(data.current.toFixed(4)),
      targetWeight: Number(data.target.toFixed(4)),
      delta: Number((data.target - data.current).toFixed(4))
    }));

    return {
      turnover,
      summary: {
        currentExpectedReturn: curExpReturn,
        targetExpectedReturn: tgtExpReturn,
        expectedReturnDelta: curExpReturn !== null && tgtExpReturn !== null ? Number((tgtExpReturn - curExpReturn).toFixed(6)) : null,
        currentVolatility: curVol,
        targetVolatility: tgtVol,
        volatilityDelta: curVol !== null && tgtVol !== null ? Number((tgtVol - curVol).toFixed(6)) : null,
        currentHHI: Number(curHHI.toFixed(6)),
        targetHHI: Number(tgtHHI.toFixed(6)),
        currentEffectiveN: curEffN,
        targetEffectiveN: tgtEffN
      },
      sectorComparison,
      positionComparison: turnover.positionDeltas,
      riskBudgetComparison: {
        current: curRiskBudget,
        target: tgtRiskBudget
      }
    };
  }
}
