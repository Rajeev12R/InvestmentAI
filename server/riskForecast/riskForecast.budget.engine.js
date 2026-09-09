import { BudgetScope, BudgetUtilizationStatus, DataClassification } from './riskForecast.types.js';
import { RiskForecastConfig } from './riskForecast.config.js';
import { RiskForecastSchema } from './riskForecast.schema.js';

/**
 * Phase 31 — Dynamic Risk Budgeting Engine
 */
export class RiskForecastBudgetEngine {
  /**
   * Evaluate a single risk budget utilization
   */
  static evaluateBudgetUtilization({ budget, currentRiskValue, forecastRiskValue, stressRiskValue, config = {} }) {
    RiskForecastSchema.validateRiskBudget(budget);

    const amberThreshold = config.amberThreshold || RiskForecastConfig.BUDGET_THRESHOLDS.AMBER_UTILIZATION;
    const redThreshold = config.redThreshold || RiskForecastConfig.BUDGET_THRESHOLDS.RED_UTILIZATION;

    const computeStatus = (riskVal) => {
      if (typeof riskVal !== 'number' || isNaN(riskVal) || !isFinite(riskVal)) {
        return { value: null, utilization: null, status: BudgetUtilizationStatus.UNAVAILABLE };
      }
      const utilization = riskVal / budget.limit;
      let status = BudgetUtilizationStatus.GREEN;
      if (utilization >= redThreshold) {
        status = BudgetUtilizationStatus.RED;
      } else if (utilization >= amberThreshold) {
        status = BudgetUtilizationStatus.AMBER;
      }
      return {
        value: riskVal,
        utilization,
        utilizationPercent: utilization * 100,
        status,
        isBreached: utilization >= redThreshold
      };
    };

    const currentEval = computeStatus(currentRiskValue);
    const forecastEval = computeStatus(forecastRiskValue);
    const stressEval = computeStatus(stressRiskValue);

    // Primary status is the worst of current and forecast
    let overallStatus = BudgetUtilizationStatus.GREEN;
    if (currentEval.status === BudgetUtilizationStatus.RED || forecastEval.status === BudgetUtilizationStatus.RED) {
      overallStatus = BudgetUtilizationStatus.RED;
    } else if (currentEval.status === BudgetUtilizationStatus.AMBER || forecastEval.status === BudgetUtilizationStatus.AMBER) {
      overallStatus = BudgetUtilizationStatus.AMBER;
    } else if (currentEval.status === BudgetUtilizationStatus.UNAVAILABLE && forecastEval.status === BudgetUtilizationStatus.UNAVAILABLE) {
      overallStatus = BudgetUtilizationStatus.UNAVAILABLE;
    }

    return {
      budgetId: budget.budgetId,
      scope: budget.scope,
      metric: budget.metric,
      limit: budget.limit,
      unit: budget.unit || '%',
      overallStatus,
      current: currentEval,
      forecast: forecastEval,
      stress: stressEval,
      headroom: {
        current: currentEval.value !== null ? Math.max(0, budget.limit - currentEval.value) : null,
        forecast: forecastEval.value !== null ? Math.max(0, budget.limit - forecastEval.value) : null
      },
      authority: budget.authority || 'RISK_COMMITTEE',
      configurationVersion: budget.configurationVersion || RiskForecastConfig.VERSION
    };
  }

  /**
   * Evaluate an institutional suite of risk budgets against portfolio state
   */
  static evaluatePortfolioBudgets({ budgets, riskMetrics, config = {} }) {
    if (!Array.isArray(budgets)) {
      throw new Error('budgets must be an array');
    }

    const evaluations = [];
    let redCount = 0;
    let amberCount = 0;
    let greenCount = 0;
    let unavailableCount = 0;

    for (const b of budgets) {
      // Map metric key from riskMetrics object
      const metricKey = b.metric;
      const currentVal = riskMetrics?.current?.[metricKey] ?? riskMetrics?.[metricKey];
      const forecastVal = riskMetrics?.forecast?.[metricKey];
      const stressVal = riskMetrics?.stress?.[metricKey];

      const res = RiskForecastBudgetEngine.evaluateBudgetUtilization({
        budget: b,
        currentRiskValue: currentVal,
        forecastRiskValue: forecastVal,
        stressRiskValue: stressVal,
        config
      });

      evaluations.push(res);
      if (res.overallStatus === BudgetUtilizationStatus.RED) redCount++;
      else if (res.overallStatus === BudgetUtilizationStatus.AMBER) amberCount++;
      else if (res.overallStatus === BudgetUtilizationStatus.GREEN) greenCount++;
      else unavailableCount++;
    }

    return {
      status: DataClassification.DERIVED,
      budgetCount: budgets.length,
      redCount,
      amberCount,
      greenCount,
      unavailableCount,
      hasBreaches: redCount > 0,
      evaluations
    };
  }
}
