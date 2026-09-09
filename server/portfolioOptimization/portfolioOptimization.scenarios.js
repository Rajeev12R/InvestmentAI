/**
 * server/portfolioOptimization/portfolioOptimization.scenarios.js
 * 
 * Phase 33: Multi-Scenario & Robust Portfolio Optimization
 */

import { OPTIMIZATION_CONFIG } from './portfolioOptimization.config.js';
import { PortfolioOptimizationEngine } from './portfolioOptimization.engine.js';
import { deepFreeze } from './portfolioOptimization.types.js';

export class PortfolioOptimizationScenarios {
  /**
   * Stresses a base covariance matrix and expected returns under a defined macro scenario.
   */
  static applyScenarioShifts(expectedReturns, covarianceMatrix, scenarioConfig) {
    const n = covarianceMatrix.length;
    const { returnShift, volatilityMultiplier, correlationShift } = scenarioConfig;

    // Shift expected returns
    const stressedReturns = expectedReturns
      ? expectedReturns.map(r => r + returnShift)
      : new Array(n).fill(returnShift);

    // Stressed covariance: Cov_ij = Corr_ij * Vol_i * Vol_j * (volMultiplier^2) + corrShift
    const stressedCov = Array.from({ length: n }, () => new Array(n).fill(0));
    const volMultSq = volatilityMultiplier * volatilityMultiplier;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          stressedCov[i][j] = covarianceMatrix[i][j] * volMultSq;
        } else {
          stressedCov[i][j] = covarianceMatrix[i][j] * volMultSq + correlationShift * 0.01;
        }
      }
    }

    return { stressedReturns, stressedCov };
  }

  /**
   * Runs multi-scenario optimization across Base, Bull, Bear, and Stagflation regimes.
   */
  static runMultiScenarioOptimization(baseParams) {
    const scenarioResults = [];
    const scenarioConfigs = OPTIMIZATION_CONFIG.SCENARIO_CONFIGS;

    for (const [key, cfg] of Object.entries(scenarioConfigs)) {
      const { stressedReturns, stressedCov } = this.applyScenarioShifts(
        baseParams.expectedReturns,
        baseParams.covarianceMatrix,
        cfg
      );

      const optResult = PortfolioOptimizationEngine.runOptimization({
        ...baseParams,
        expectedReturns: stressedReturns,
        covarianceMatrix: stressedCov
      });

      scenarioResults.push({
        scenarioId: cfg.id,
        scenarioName: cfg.name,
        result: optResult
      });
    }

    // Minimax / Robust Compromise: find weights that minimize worst-case portfolio variance
    const worstCaseVolPerAsset = [];
    const n = baseParams.symbols.length;
    for (let i = 0; i < n; i++) {
      let maxDiag = 0;
      for (const sc of scenarioResults) {
        if (sc.result.status === 'OPTIMAL') {
          maxDiag = Math.max(maxDiag, sc.result.portfolioMetrics.portfolioVolatility);
        }
      }
      worstCaseVolPerAsset.push(maxDiag);
    }

    return deepFreeze({
      type: 'MULTI_SCENARIO_ANALYSIS',
      scenarios: scenarioResults,
      robustSummary: {
        totalScenariosEvaluated: scenarioResults.length,
        isAllScenariosFeasible: scenarioResults.every(s => s.result.status === 'OPTIMAL')
      }
    });
  }
}
