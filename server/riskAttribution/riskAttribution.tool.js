/**
 * server/riskAttribution/riskAttribution.tool.js
 * 
 * Phase 32: Institutional Read-Only Copilot Inspection Tools
 * Provides structured, mathematically reconcilable answers to Copilot without allowing contradictory independent calculations.
 */

import { RiskAttributionEngine } from './riskAttribution.engine.js';
import { RiskAttributionExplanationDAG } from './riskAttribution.explanation.js';
import { RiskAttributionPackageBuilder } from './riskAttribution.package.js';
import { riskAttributionRepository } from './riskAttribution.repository.js';
import { ConfidenceStatus } from './riskAttribution.types.js';

export const riskAttributionTools = {
  // 1. Get Portfolio Risk Attribution
  tool_get_portfolio_risk_attribution: async ({
    symbols,
    weights,
    covarianceMatrix,
    sectors,
    geographies,
    sleeves,
    factorExposures,
    periodsPerYear = 252,
    asOf
  }) => {
    return RiskAttributionEngine.runComprehensiveAttribution({
      symbols,
      weights,
      covarianceMatrix,
      sectors,
      geographies,
      sleeves,
      factorExposures,
      periodsPerYear,
      asOf: asOf || new Date().toISOString()
    });
  },

  // 2. Get Top Risk Contributors (Positions & Sectors)
  tool_get_top_risk_contributors: async ({ symbols, weights, covarianceMatrix, sectors, topN = 3 }) => {
    const attr = RiskAttributionEngine.runComprehensiveAttribution({
      symbols,
      weights,
      covarianceMatrix,
      sectors
    });

    const topPositions = [...attr.positions]
      .sort((a, b) => b.componentRiskContribution - a.componentRiskContribution)
      .slice(0, topN)
      .map(p => ({
        symbol: p.symbol,
        weight: p.weight,
        componentRiskContribution: p.componentRiskContribution,
        percentageRiskContribution: p.percentageRiskContribution,
        percentageRiskContributionPercent: p.percentageRiskContributionPercent,
        sector: p.sector
      }));

    const topSectors = [...attr.sectors.groups]
      .sort((a, b) => b.componentRiskContribution - a.componentRiskContribution)
      .slice(0, topN)
      .map(s => ({
        name: s.name,
        weight: s.weight,
        componentRiskContribution: s.componentRiskContribution,
        percentageRiskContribution: s.percentageRiskContribution,
        percentageRiskContributionPercent: s.percentageRiskContributionPercent
      }));

    return {
      portfolioVolatility: attr.portfolioMetrics.portfolioVolatility,
      topPositions,
      topSectors,
      status: ConfidenceStatus.CALCULATED
    };
  },

  // 3. Explain Risk Drivers (Concentration vs Correlation vs Standalone Volatility)
  tool_explain_risk_driver: async ({ symbols, weights, covarianceMatrix, sectors }) => {
    const attr = RiskAttributionEngine.runComprehensiveAttribution({
      symbols,
      weights,
      covarianceMatrix,
      sectors
    });
    const dag = RiskAttributionExplanationDAG.buildExplanationDAG(attr);

    return {
      narrative: dag.narrative,
      portfolioMetrics: attr.portfolioMetrics,
      concentration: attr.concentrationAttribution,
      correlation: attr.correlationAttribution,
      status: ConfidenceStatus.DERIVED
    };
  },

  // 4. Get Sector Risk Attribution
  tool_get_sector_risk_attribution: async ({ symbols, weights, covarianceMatrix, sectors }) => {
    const attr = RiskAttributionEngine.runComprehensiveAttribution({
      symbols,
      weights,
      covarianceMatrix,
      sectors
    });
    return {
      portfolioVolatility: attr.portfolioMetrics.portfolioVolatility,
      sectors: attr.sectors,
      status: ConfidenceStatus.DERIVED
    };
  },

  // 5. Get Geography Risk Attribution
  tool_get_geography_risk_attribution: async ({ symbols, weights, covarianceMatrix, geographies }) => {
    const attr = RiskAttributionEngine.runComprehensiveAttribution({
      symbols,
      weights,
      covarianceMatrix,
      geographies
    });
    return {
      portfolioVolatility: attr.portfolioMetrics.portfolioVolatility,
      geographies: attr.geographies,
      status: ConfidenceStatus.DERIVED
    };
  },

  // 6. Get Factor Risk Attribution
  tool_get_factor_risk_attribution: async ({ symbols, weights, factorExposures, covarianceMatrix }) => {
    const attr = RiskAttributionEngine.runComprehensiveAttribution({
      symbols,
      weights,
      covarianceMatrix,
      factorExposures
    });
    return {
      factorAttribution: attr.factorAttribution,
      status: ConfidenceStatus.MODEL_BASED
    };
  },

  // 7. Get Concentration vs Correlation Risk
  tool_get_concentration_vs_correlation_risk: async ({ symbols, weights, covarianceMatrix }) => {
    const attr = RiskAttributionEngine.runComprehensiveAttribution({
      symbols,
      weights,
      covarianceMatrix
    });
    return {
      concentration: attr.concentrationAttribution,
      correlation: attr.correlationAttribution,
      status: ConfidenceStatus.CALCULATED
    };
  },

  // 8. Get Stress Scenario Attribution
  tool_get_stress_risk_attribution: async ({ symbols, weights, covarianceMatrix }) => {
    const attr = RiskAttributionEngine.runComprehensiveAttribution({
      symbols,
      weights,
      covarianceMatrix
    });
    return {
      stressAttribution: attr.stressAttribution,
      status: ConfidenceStatus.SCENARIO
    };
  },

  // 9. What-If Counterfactual: Remove Position & Re-attribute
  tool_what_if_remove_position: async ({ symbols, weights, covarianceMatrix, removeSymbol, sectors }) => {
    const removeIdx = symbols.indexOf(removeSymbol);
    if (removeIdx === -1) {
      throw new Error(`Symbol ${removeSymbol} not found in portfolio`);
    }

    // Base attribution
    const baseAttr = RiskAttributionEngine.runComprehensiveAttribution({
      symbols,
      weights,
      covarianceMatrix,
      sectors
    });

    // Rebalanced portfolio without the removed position
    const filteredSymbols = symbols.filter((_, i) => i !== removeIdx);
    const rawWeights = weights.filter((_, i) => i !== removeIdx);
    const sumRaw = rawWeights.reduce((s, w) => s + w, 0);
    const rebalancedWeights = sumRaw > 0 ? rawWeights.map(w => w / sumRaw) : rawWeights;

    const filteredCov = [];
    for (let i = 0; i < symbols.length; i++) {
      if (i === removeIdx) continue;
      const row = [];
      for (let j = 0; j < symbols.length; j++) {
        if (j === removeIdx) continue;
        row.push(covarianceMatrix[i][j]);
      }
      filteredCov.push(row);
    }

    const rebalancedAttr = RiskAttributionEngine.runComprehensiveAttribution({
      symbols: filteredSymbols,
      weights: rebalancedWeights,
      covarianceMatrix: filteredCov,
      sectors
    });

    const volDelta = rebalancedAttr.portfolioMetrics.portfolioVolatility - baseAttr.portfolioMetrics.portfolioVolatility;

    return {
      removedSymbol: removeSymbol,
      baseVolatility: baseAttr.portfolioMetrics.portfolioVolatility,
      rebalancedVolatility: rebalancedAttr.portfolioMetrics.portfolioVolatility,
      volatilityDelta: volDelta,
      volatilityDeltaPercent: (volDelta / baseAttr.portfolioMetrics.portfolioVolatility) * 100,
      rebalancedAttribution: rebalancedAttr,
      status: ConfidenceStatus.CALCULATED
    };
  },

  // 10. Get Full Explanation DAG
  tool_get_attribution_dag: async ({ symbols, weights, covarianceMatrix, sectors, factorExposures }) => {
    const attr = RiskAttributionEngine.runComprehensiveAttribution({
      symbols,
      weights,
      covarianceMatrix,
      sectors,
      factorExposures
    });
    return RiskAttributionExplanationDAG.buildExplanationDAG(attr);
  }
};
