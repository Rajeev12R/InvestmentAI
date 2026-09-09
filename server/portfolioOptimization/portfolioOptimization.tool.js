/**
 * server/portfolioOptimization/portfolioOptimization.tool.js
 * 
 * Phase 33: Institutional Read-Only Copilot Inspection Tools
 */

import { PortfolioOptimizationEngine } from './portfolioOptimization.engine.js';
import { PortfolioOptimizationExplanationDAG } from './portfolioOptimization.explanation.js';
import { PortfolioOptimizationConstraints } from './portfolioOptimization.constraints.js';
import { PortfolioOptimizationScenarios } from './portfolioOptimization.scenarios.js';
import { PortfolioOptimizationPackageBuilder } from './portfolioOptimization.package.js';
import { portfolioOptimizationRepository } from './portfolioOptimization.repository.js';
import { deepFreeze } from './portfolioOptimization.types.js';

export const PortfolioOptimizationCopilotTools = Object.freeze({
  /**
   * Tool 1: Run comprehensive institutional portfolio optimization
   */
  optimize_portfolio: (params) => {
    return PortfolioOptimizationEngine.runOptimization(params);
  },

  /**
   * Tool 2: Explain portfolio optimization decision via DAG and NLG
   */
  explain_optimization: (optResult) => {
    return PortfolioOptimizationExplanationDAG.buildExplanationDAG(optResult);
  },

  /**
   * Tool 3: Inspect active, satisfied, and violated constraints
   */
  inspect_constraints: (params) => {
    return PortfolioOptimizationConstraints.evaluateConstraints(params);
  },

  /**
   * Tool 4: Compare current vs optimized portfolio decisions and metrics
   */
  compare_current_vs_optimized: (optResult) => {
    return deepFreeze({
      positionDecisions: optResult.positionDecisions,
      totalTurnover: optResult.totalTurnover,
      metrics: optResult.portfolioMetrics,
      phase32AttributionDelta: optResult.phase32Attribution?.delta || null
    });
  },

  /**
   * Tool 5: Inspect component risk contribution shifts and risk budgets
   */
  inspect_risk_budget_changes: (optResult) => {
    return deepFreeze({
      currentCRC: optResult.phase32Attribution?.current?.positions?.map(p => ({
        symbol: p.symbol,
        crc: p.componentRiskContribution,
        prc: p.percentageRiskContribution
      })) || [],
      optimizedCRC: optResult.phase32Attribution?.optimized?.positions?.map(p => ({
        symbol: p.symbol,
        crc: p.componentRiskContribution,
        prc: p.percentageRiskContribution
      })) || []
    });
  },

  /**
   * Tool 6: Inspect solver convergence, iterations, runtime, and regularization
   */
  inspect_solver_diagnostics: (optResult) => {
    return deepFreeze({
      solver: optResult.solverMetadata,
      status: optResult.status,
      certification: optResult.certificationStatus,
      runtimeMs: optResult.totalExecutionMs
    });
  },

  /**
   * Tool 7: Inspect multi-scenario optimization decisions
   */
  inspect_scenario_results: (baseParams) => {
    return PortfolioOptimizationScenarios.runMultiScenarioOptimization(baseParams);
  },

  /**
   * Tool 8: Retrieve cryptographically sealed optimization package from repository
   */
  retrieve_sealed_package: (tenantId, packageId) => {
    return portfolioOptimizationRepository.getPackage(tenantId, packageId);
  },

  /**
   * Tool 9: Verify cryptographic integrity of a sealed optimization package
   */
  verify_package_integrity: (sealedPackage) => {
    return PortfolioOptimizationPackageBuilder.verifyPackageIntegrity(sealedPackage);
  },

  /**
   * Tool 10: Inspect pre-optimization constraint feasibility diagnostics
   */
  inspect_feasibility: (params) => {
    return PortfolioOptimizationConstraints.checkFeasibility(params);
  }
});
