import { exposureStore } from './exposure.store.js';
import { ExposureAggregationEngine } from './exposure.aggregation.engine.js';
import { ExposureFactorEngine } from './exposure.factor.engine.js';
import { ExposureRiskDecompositionEngine } from './exposure.risk.decomposition.engine.js';
import { ExposureCommonDriverEngine } from './exposure.common.driver.engine.js';
import { ExposureMacroScenarioEngine } from './exposure.macro.scenario.engine.js';
import { ExposureComplianceLimitsEngine } from './exposure.compliance.limits.engine.js';
import { ExposureChangeEngine } from './exposure.change.engine.js';
import { ExposurePackageBuilder } from './exposure.package.js';

/**
 * Phase 30 — 14 Read-Only Institutional Copilot Inspection Tools
 */
export const exposureRiskTools = {
  // 1. Inspect Portfolio Exposure
  tool_inspect_portfolio_exposure: async ({ holdings, benchmarkHoldings, baseCurrency }) => {
    return ExposureAggregationEngine.aggregatePortfolioExposure({
      holdings,
      benchmarkHoldings,
      baseCurrency
    });
  },

  // 2. Inspect Factor Exposures
  tool_inspect_factor_exposures: async ({ holdings, benchmarkHoldings }) => {
    return ExposureFactorEngine.calculatePortfolioFactorExposures({
      holdings,
      benchmarkHoldings
    });
  },

  // 3. Inspect Factor Return Decomposition
  tool_inspect_factor_return_decomposition: async ({ portfolioReturn, riskFreeRate, portfolioFactorBetas, factorReturns }) => {
    return ExposureFactorEngine.decomposeFactorReturns({
      portfolioReturn,
      riskFreeRate,
      portfolioFactorBetas,
      factorReturns
    });
  },

  // 4. Inspect Risk Decomposition
  tool_inspect_risk_decomposition: async ({ symbols, weights, covarianceMatrix, periodsPerYear }) => {
    return ExposureRiskDecompositionEngine.decomposeCovarianceRisk({
      symbols,
      weights,
      covarianceMatrix,
      periodsPerYear
    });
  },

  // 5. Inspect Exposure vs Risk Divergence
  tool_inspect_exposure_risk_divergence: async ({ symbols, weights, covarianceMatrix, periodsPerYear }) => {
    const risk = ExposureRiskDecompositionEngine.decomposeCovarianceRisk({
      symbols,
      weights,
      covarianceMatrix,
      periodsPerYear
    });
    return {
      divergences: risk.exposureVsRiskDivergences,
      count: risk.exposureVsRiskDivergences.length
    };
  },

  // 6. Inspect Common Drivers
  tool_inspect_common_drivers: async ({ holdings }) => {
    return ExposureCommonDriverEngine.identifyCommonDrivers({
      holdings
    });
  },

  // 7. Inspect Hidden Concentration
  tool_inspect_hidden_concentration: async ({ holdings, commonDrivers }) => {
    return ExposureCommonDriverEngine.evaluateHiddenConcentration({
      holdings,
      commonDrivers
    });
  },

  // 8. Inspect Benchmark-Relative Exposure
  tool_inspect_benchmark_relative_exposure: async ({ holdings, benchmarkHoldings }) => {
    const exp = ExposureAggregationEngine.aggregatePortfolioExposure({
      holdings,
      benchmarkHoldings
    });
    return {
      activeSectorExposures: exp.activeSectorExposures
    };
  },

  // 9. Inspect Macro Sensitivities
  tool_inspect_macro_sensitivities: async ({ macroBetaSensitivities, tier }) => {
    return ExposureMacroScenarioEngine.evaluateMacroSensitivities({
      macroBetaSensitivities,
      tier
    });
  },

  // 10. Inspect Scenario Sensitivity
  tool_inspect_scenario_sensitivity: async ({ scenarioName, factorShocks, portfolioFactorBetas, liquidityStressDragBps }) => {
    return ExposureMacroScenarioEngine.evaluateScenarioSensitivity({
      scenarioName,
      factorShocks,
      portfolioFactorBetas,
      liquidityStressDragBps
    });
  },

  // 11. Inspect Liquidity Exposure
  tool_inspect_liquidity_exposure: async ({ holdings }) => {
    const exp = ExposureAggregationEngine.aggregatePortfolioExposure({ holdings });
    return exp.liquidityMetrics;
  },

  // 12. Inspect Exposure Limits & Breaches
  tool_inspect_exposure_limits_breaches: async ({ portfolioExposure, limits }) => {
    return ExposureComplianceLimitsEngine.checkExposureLimits({
      portfolioExposure,
      limits
    });
  },

  // 13. Inspect Exposure Changes
  tool_inspect_exposure_changes: async ({ snapshotBefore, snapshotAfter }) => {
    return ExposureChangeEngine.compareSnapshots({
      snapshotBefore,
      snapshotAfter
    });
  },

  // 14. Inspect Sealed Package
  tool_inspect_sealed_package: async ({ packageId, tenantId }) => {
    const pkg = exposureStore.getPackage(packageId, tenantId);
    if (!pkg) {
      return { found: false, packageId };
    }
    const verification = ExposurePackageBuilder.verifyPackage(pkg);
    return {
      found: true,
      package: pkg,
      verification
    };
  }
};
