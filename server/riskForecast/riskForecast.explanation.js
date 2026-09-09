import { DataClassification } from './riskForecast.types.js';

/**
 * Phase 31 — Deterministic Explanation DAG Engine
 */
export class RiskForecastExplanationDAG {
  /**
   * Build Explanation DAG for a Portfolio Risk Forecast
   */
  static buildForecastExplanationDAG({
    portfolioSnapshotId,
    forecastResult,
    budgetEvaluation = null,
    limitEvaluation = null
  }) {
    const nodes = [];
    const edges = [];

    // Root Node: Portfolio Risk Forecast
    const rootId = `NODE_ROOT_FORECAST_${portfolioSnapshotId}`;
    nodes.push({
      id: rootId,
      label: 'Portfolio Risk Forecast',
      type: 'FORECAST_ROOT',
      value: forecastResult?.portfolioVolatility,
      unit: '% Annualized Volatility',
      classification: DataClassification.FORECAST
    });

    // Covariance Engine Node
    const covId = `NODE_COVARIANCE_${portfolioSnapshotId}`;
    nodes.push({
      id: covId,
      label: 'Covariance Matrix Estimation',
      type: 'COVARIANCE_ENGINE',
      quality: forecastResult?.covarianceQuality,
      repairApplied: forecastResult?.repairApplied,
      classification: DataClassification.DERIVED
    });
    edges.push({ from: rootId, to: covId, relationship: 'DERIVED_FROM_COVARIANCE' });

    // Marginal Security Contributors Nodes
    if (forecastResult?.marginalRiskDecomposition?.assetContributions) {
      for (const contrib of forecastResult.marginalRiskDecomposition.assetContributions) {
        const assetNodeId = `NODE_ASSET_RISK_${contrib.symbol}`;
        nodes.push({
          id: assetNodeId,
          label: `Component Risk: ${contrib.symbol}`,
          type: 'SECURITY_COMPONENT_RISK',
          symbol: contrib.symbol,
          weight: contrib.weight,
          componentRiskContribution: contrib.componentRiskContribution,
          percentageRiskContribution: contrib.percentageRiskContributionPercent,
          classification: DataClassification.DERIVED
        });
        edges.push({ from: covId, to: assetNodeId, relationship: 'CONTRIBUTED_BY_SECURITY' });
      }
    }

    // Factor Risk Nodes
    if (forecastResult?.factorRiskContribution?.factorContributions) {
      const factorRootId = `NODE_FACTOR_RISK_ROOT_${portfolioSnapshotId}`;
      nodes.push({
        id: factorRootId,
        label: 'Systematic Factor Risk Decomposition',
        type: 'FACTOR_RISK_ROOT',
        factorVolatility: forecastResult.factorRiskContribution.factorVolatility,
        residualVolatility: forecastResult.factorRiskContribution.residualVolatility,
        classification: DataClassification.DERIVED
      });
      edges.push({ from: rootId, to: factorRootId, relationship: 'DECOMPOSED_BY_FACTORS' });

      for (const fContrib of forecastResult.factorRiskContribution.factorContributions) {
        const fNodeId = `NODE_FACTOR_${fContrib.factor}`;
        nodes.push({
          id: fNodeId,
          label: `Factor: ${fContrib.factor}`,
          type: 'FACTOR_RISK_COMPONENT',
          factor: fContrib.factor,
          beta: fContrib.beta,
          componentContribution: fContrib.componentContribution,
          classification: DataClassification.DERIVED
        });
        edges.push({ from: factorRootId, to: fNodeId, relationship: 'FACTOR_COMPONENT' });
      }
    }

    // Multi-Horizon sqrt(h) Scaling & Linear Variance Assumption Nodes
    const horizonNodeId = `NODE_HORIZON_SCALING_${portfolioSnapshotId}`;
    nodes.push({
      id: horizonNodeId,
      label: 'Multi-Horizon Forecast (1D to 252D)',
      type: 'HORIZON_SCALING_ENGINE',
      method: 'SQRT_TIME_SCALING',
      classification: DataClassification.MODEL_ESTIMATE
    });
    edges.push({ from: rootId, to: horizonNodeId, relationship: 'SCALED_ACROSS_HORIZONS' });

    const horizonAssumpId = `NODE_ASSUMPTION_SQRT_H_${portfolioSnapshotId}`;
    nodes.push({
      id: horizonAssumpId,
      label: 'Assumption: Linear Variance Scaling with Time',
      type: 'MODEL_ASSUMPTION',
      text: 'Variance scales linearly with horizon (sqrt(h) scaling); assumes stationary independent return increments.',
      classification: DataClassification.ASSUMPTION
    });
    edges.push({ from: horizonNodeId, to: horizonAssumpId, relationship: 'GOVERNED_BY_ASSUMPTION' });

    // Parametric VaR Normality Assumption Node
    const varAssumpId = `NODE_ASSUMPTION_NORMALITY_${portfolioSnapshotId}`;
    nodes.push({
      id: varAssumpId,
      label: 'Assumption: Gaussian Return Normality (Parametric VaR)',
      type: 'MODEL_ASSUMPTION',
      text: 'Parametric VaR assumes returns follow a Gaussian normal distribution with constant parameters.',
      classification: DataClassification.ASSUMPTION
    });
    edges.push({ from: rootId, to: varAssumpId, relationship: 'GOVERNED_BY_ASSUMPTION' });

    // Covariance Repair Node (if repair was applied)
    if (forecastResult?.repairApplied) {
      const repairNodeId = `NODE_COV_REPAIR_${portfolioSnapshotId}`;
      nodes.push({
        id: repairNodeId,
        label: `Covariance Regularization: ${forecastResult.repairMethod}`,
        type: 'COVARIANCE_REPAIR_AUDIT',
        method: forecastResult.repairMethod,
        classification: DataClassification.DERIVED
      });
      edges.push({ from: covId, to: repairNodeId, relationship: 'REGULARIZED_VIA_REPAIR' });
    }

    // Risk Budget Breach Nodes (if any)
    if (budgetEvaluation?.evaluations) {
      for (const bEval of budgetEvaluation.evaluations) {
        if (bEval.isBreached || bEval.overallStatus === 'RED' || bEval.overallStatus === 'AMBER') {
          const bNodeId = `NODE_BUDGET_BREACH_${bEval.budgetId}`;
          nodes.push({
            id: bNodeId,
            label: `Risk Budget Alert: ${bEval.metric} (${bEval.overallStatus})`,
            type: 'RISK_BUDGET_ALERT',
            metric: bEval.metric,
            limit: bEval.limit,
            utilizationPercent: bEval.current?.utilizationPercent,
            classification: DataClassification.DERIVED
          });
          edges.push({ from: rootId, to: bNodeId, relationship: 'CONSUMES_RISK_BUDGET' });
        }
      }
    }

    return {
      portfolioSnapshotId,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      nodes,
      edges,
      isAcyclic: true,
      classification: DataClassification.DERIVED
    };
  }
}
