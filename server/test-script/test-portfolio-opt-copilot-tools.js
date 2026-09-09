/**
 * server/test-script/test-portfolio-opt-copilot-tools.js
 * 
 * Phase 33 — Suite 10: Institutional Read-Only Copilot Inspection Tools
 */

import { PortfolioOptimizationCopilotTools } from '../portfolioOptimization/portfolioOptimization.tool.js';
import { PortfolioOptimizationPackageBuilder } from '../portfolioOptimization/portfolioOptimization.package.js';
import { portfolioOptimizationRepository } from '../portfolioOptimization/portfolioOptimization.repository.js';
import { OptimizationObjective } from '../portfolioOptimization/portfolioOptimization.types.js';

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  passed++;
}

console.log('--- SUITE 10: Read-Only Copilot Tools ---');

const symbols = ['EQ1', 'EQ2'];
const cov = [[0.04, 0.01], [0.01, 0.04]];

// Tool 1: optimize_portfolio
const opt = PortfolioOptimizationCopilotTools.optimize_portfolio({
  objectiveType: OptimizationObjective.MINIMUM_VARIANCE,
  symbols,
  covarianceMatrix: cov,
  constraints: { longOnly: true }
});
assert(opt.status === 'OPTIMAL', 'Tool 1: optimize_portfolio executes successfully');

// Tool 2: explain_optimization
const expl = PortfolioOptimizationCopilotTools.explain_optimization(opt);
assert(expl.dagId !== undefined, 'Tool 2: explain_optimization returns Explanation DAG');

// Tool 3: inspect_constraints
const constr = PortfolioOptimizationCopilotTools.inspect_constraints({
  weights: opt.optimizedWeights,
  symbols,
  covarianceMatrix: cov,
  constraints: { longOnly: true }
});
assert(constr.allHardPassed === true, 'Tool 3: inspect_constraints verifies hard constraints');

// Tool 4: compare_current_vs_optimized
const comp = PortfolioOptimizationCopilotTools.compare_current_vs_optimized(opt);
assert(comp.positionDecisions.length === 2, 'Tool 4: compare_current_vs_optimized returns position decisions');

// Tool 5: inspect_risk_budget_changes
const rbChanges = PortfolioOptimizationCopilotTools.inspect_risk_budget_changes(opt);
assert(rbChanges.currentCRC !== undefined, 'Tool 5: inspect_risk_budget_changes returns current CRC');

// Tool 6: inspect_solver_diagnostics
const diag = PortfolioOptimizationCopilotTools.inspect_solver_diagnostics(opt);
assert(diag.status === 'OPTIMAL', 'Tool 6: inspect_solver_diagnostics returns status');

// Tool 7: inspect_scenario_results
const scRes = PortfolioOptimizationCopilotTools.inspect_scenario_results({
  symbols,
  covarianceMatrix: cov
});
assert(scRes.scenarios.length === 4, 'Tool 7: inspect_scenario_results returns scenarios');

// Tool 8 & 9: retrieve_sealed_package and verify_package_integrity
const pkg = PortfolioOptimizationPackageBuilder.buildSealedPackage({
  optimizationResult: opt,
  explanationDAG: expl,
  tenantId: 'tenant_copilot_test'
});
portfolioOptimizationRepository.savePackage('tenant_copilot_test', pkg);

const retrieved = PortfolioOptimizationCopilotTools.retrieve_sealed_package('tenant_copilot_test', pkg.packageId);
assert(retrieved !== null && retrieved.packageId === pkg.packageId, 'Tool 8: retrieve_sealed_package retrieves package');

const verif = PortfolioOptimizationCopilotTools.verify_package_integrity(retrieved);
assert(verif.isValid === true, 'Tool 9: verify_package_integrity validates integrity');

// Tool 10: inspect_feasibility
const feas = PortfolioOptimizationCopilotTools.inspect_feasibility({
  symbols,
  constraints: { minWeights: [0.1, 0.1], maxWeights: [0.9, 0.9] }
});
assert(feas.isFeasible === true, 'Tool 10: inspect_feasibility checks feasibility');

console.log(`PASSED: ${passed}`);
