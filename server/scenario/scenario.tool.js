/**
 * server/scenario/scenario.tool.js
 * 
 * Phase 19: Scenario Intelligence Copilot Tool
 * Read-only tool bridge for AI Copilot to execute deterministic stress scenarios and retrieve explanations.
 */

import { ScenarioEngine } from './scenario.engine.js';
import { generateScenarioExplanation } from './scenario.explanation.js';
import { sealScenarioPackage } from './scenario.package.js';

const engine = new ScenarioEngine();

/**
 * Copilot tool execution function for stress testing
 */
export async function executeScenarioAnalysisTool(params) {
  const {
    tenantId,
    portfolio,
    scenarioDefinition,
    canonicalScenarioKey,
    reverseSolverRequest,
    compareScenariosList,
    options = {}
  } = params;

  if (!portfolio) {
    return {
      success: false,
      error: 'Portfolio data is required for scenario analysis'
    };
  }

  try {
    let result;

    // 1. Reverse Break-Even Solver
    if (reverseSolverRequest) {
      result = engine.solveReverse(portfolio, reverseSolverRequest);
      return {
        success: true,
        type: 'REVERSE_SOLVER_RESULT',
        data: result,
        classification: 'SCENARIO_OUTPUT',
        disclaimer: 'Hypothetical break-even model estimate. Does not represent observed market pricing.'
      };
    }

    // 2. Scenario Comparison
    if (Array.isArray(compareScenariosList) && compareScenariosList.length >= 2) {
      result = engine.compare(portfolio, compareScenariosList, options);
      return {
        success: true,
        type: 'SCENARIO_COMPARISON_RESULT',
        data: result,
        classification: 'SCENARIO_OUTPUT',
        disclaimer: 'Comparative hypothetical simulations.'
      };
    }

    // 3. Canonical Macro Scenario
    if (canonicalScenarioKey) {
      result = engine.runCanonicalScenario(portfolio, canonicalScenarioKey, options);
    } 
    // 4. Custom Scenario Definition
    else if (scenarioDefinition) {
      result = engine.evaluatePortfolio(portfolio, scenarioDefinition, options);
    } else {
      return {
        success: false,
        error: 'Must provide scenarioDefinition, canonicalScenarioKey, reverseSolverRequest, or compareScenariosList'
      };
    }

    const explanation = generateScenarioExplanation(result);
    let sealedPackage = null;
    if (options.sealPackage && tenantId) {
      sealedPackage = sealScenarioPackage({
        tenantId,
        scenarioResult: result,
        portfolioSnapshot: portfolio,
        scenarioDefinition: scenarioDefinition || { id: canonicalScenarioKey, name: canonicalScenarioKey }
      });
    }

    return {
      success: true,
      type: 'PORTFOLIO_SCENARIO_EVALUATION',
      data: result,
      explanation,
      sealedPackage: sealedPackage ? { sealId: sealedPackage.sealId, canonicalHash: sealedPackage.canonicalHash } : null,
      classification: 'SCENARIO_OUTPUT',
      disclaimer: 'HYPOTHETICAL SIMULATION ONLY — SCENARIO_OUTPUT. Not Truth Layer financial facts.'
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
      details: err.details || null
    };
  }
}
