import { riskForecastRepository } from './riskForecast.repository.js';
import { RiskForecastEngine } from './riskForecast.forecast.engine.js';
import { RiskForecastBudgetEngine } from './riskForecast.budget.engine.js';
import { RiskForecastLimitEngine } from './riskForecast.limit.engine.js';
import { RiskForecastBacktestEngine } from './riskForecast.backtest.engine.js';
import { RiskForecastUncertaintyEngine } from './riskForecast.uncertainty.engine.js';
import { RiskForecastModelRiskEngine } from './riskForecast.modelRisk.engine.js';
import { RiskForecastExplanationDAG } from './riskForecast.explanation.js';
import { RiskForecastPackageBuilder } from './riskForecast.package.js';
import { DataClassification } from './riskForecast.types.js';

/**
 * Phase 31 — 14 Read-Only Institutional Copilot Inspection Tools
 */
export const riskForecastTools = {
  // 1. Get Portfolio Risk Forecast
  tool_get_portfolio_risk_forecast: async ({ symbols, weights, covarianceMatrix, asOf, options, tenantId = 'tenant_default' }) => {
    return RiskForecastEngine.runComprehensiveForecast({
      symbols,
      weights,
      covarianceMatrix,
      asOf: asOf || new Date().toISOString(),
      options
    });
  },

  // 2. Get Risk Budgets and Utilization
  tool_get_risk_budget: async ({ budgets, riskMetrics, tenantId = 'tenant_default' }) => {
    const tenantBudgets = budgets || riskForecastRepository.getBudgets(tenantId);
    return RiskForecastBudgetEngine.evaluatePortfolioBudgets({
      budgets: tenantBudgets,
      riskMetrics
    });
  },

  // 3. Get Risk Contributors (MRC & CRC)
  tool_get_risk_contributors: async ({ symbols, weights, covarianceMatrix, periodsPerYear = 252 }) => {
    const result = RiskForecastEngine.runComprehensiveForecast({
      symbols,
      weights,
      covarianceMatrix,
      asOf: new Date().toISOString(),
      options: { periodsPerYear }
    });
    return {
      portfolioVolatility: result.portfolioVolatility,
      marginalRiskDecomposition: result.marginalRiskDecomposition
    };
  },

  // 4. Get Tail Risk (VaR, Expected Shortfall, Drawdown)
  tool_get_tail_risk: async ({ symbols, weights, covarianceMatrix, portfolioReturns, confidence = 0.95, asOf }) => {
    const result = RiskForecastEngine.runComprehensiveForecast({
      symbols,
      weights,
      covarianceMatrix,
      portfolioReturns,
      confidence,
      asOf: asOf || new Date().toISOString()
    });
    return {
      horizons: result.horizons,
      status: DataClassification.DERIVED
    };
  },

  // 5. Get Risk Limit Utilization
  tool_get_risk_limit_utilization: async ({ limits, riskValues }) => {
    return RiskForecastLimitEngine.evaluateLimits({ limits, riskValues });
  },

  // 6. Compare Risk Forecasts (Realized vs Forecasted vs Prior)
  tool_compare_risk_forecasts: async ({ forecastVolatility, realizedVolatility, sampleSize }) => {
    return RiskForecastBacktestEngine.evaluateVolatilityForecast({
      forecastVolatility,
      realizedVolatility,
      sampleSize
    });
  },

  // 7. Get Risk Model Health
  tool_get_risk_model_health: async ({ observationCount, assetCount, covarianceQuality }) => {
    return RiskForecastModelRiskEngine.evaluateModelHealth({
      observationCount,
      assetCount,
      covarianceQuality,
      asOfCutoff: new Date().toISOString()
    });
  },

  // 8. Get Risk Forecast Explanation DAG
  tool_get_risk_forecast_explanation: async ({ portfolioSnapshotId, forecastResult, budgetEvaluation }) => {
    return RiskForecastExplanationDAG.buildForecastExplanationDAG({
      portfolioSnapshotId,
      forecastResult,
      budgetEvaluation
    });
  },

  // 9. Get Multi-Horizon Risk (1D, 5D, 20D, 60D, 252D)
  tool_get_multi_horizon_risk: async ({ symbols, weights, covarianceMatrix, asOf }) => {
    const res = RiskForecastEngine.runComprehensiveForecast({
      symbols,
      weights,
      covarianceMatrix,
      asOf: asOf || new Date().toISOString()
    });
    return res.horizons;
  },

  // 10. Get Factor Risk Forecast
  tool_get_factor_risk_forecast: async ({ symbols, weights, covarianceMatrix, factorExposures, factorCovarianceMatrix, asOf }) => {
    const res = RiskForecastEngine.runComprehensiveForecast({
      symbols,
      weights,
      covarianceMatrix,
      factorExposures,
      factorCovarianceMatrix,
      asOf: asOf || new Date().toISOString()
    });
    return res.factorRiskContribution;
  },

  // 11. Get Breach Probability
  tool_get_breach_probability: async ({ metric, currentValue, threshold, forecastVolatility, horizonDays, sampleSize }) => {
    return RiskForecastLimitEngine.calculateBreachProbability({
      metric,
      currentValue,
      threshold,
      forecastVolatility,
      horizonDays,
      sampleSize
    });
  },

  // 12. Get Forecast Backtest & Exception Evaluation
  tool_get_forecast_backtest: async ({ realizedReturns, varThresholdPercent, confidence }) => {
    return RiskForecastBacktestEngine.backtestVaRExceptions({
      realizedReturns,
      varThresholdPercent,
      confidence
    });
  },

  // 13. Get Sealed Risk Package
  tool_get_sealed_risk_package: async ({ packageId, tenantId = 'tenant_default' }) => {
    return riskForecastRepository.getPackage(packageId, tenantId);
  },

  // 14. Verify Risk Package Integrity
  tool_verify_risk_package_integrity: async ({ sealedPackage }) => {
    return RiskForecastPackageBuilder.verifyPackage(sealedPackage);
  }
};
