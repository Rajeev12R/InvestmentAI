/**
 * server/scenario/scenario.solver.js
 * 
 * Phase 19: Reverse / Break-Even Scenario Numerical Solver
 * Deterministic root-finding to discover the threshold shock that induces a specified target portfolio outcome.
 */

import { SolverMethod, ValueStatus } from './scenario.types.js';
import { validateReverseScenarioRequest } from './scenario.schema.js';
import { aggregatePortfolioScenario } from './scenario.aggregation.js';
import { SCENARIO_CONFIG } from './scenario.config.js';

export class SolverConvergenceError extends Error {
  constructor(message, diagnostics) {
    super(message);
    this.name = 'SolverConvergenceError';
    this.diagnostics = diagnostics;
  }
}

/**
 * Objective function evaluator: computes f(x) = metric(x) - targetValue
 */
function evaluateObjective(x, portfolio, reverseRequest) {
  const { targetMetric, targetValue, variableParameter } = reverseRequest;
  
  // Construct a single-shock scenario definition with shockValue = x
  const testScenario = {
    id: 'SOLVER_PROBE',
    name: 'Solver Probe Scenario',
    scenarioType: 'HYPOTHETICAL_STRESS',
    shocks: [
      {
        targetType: variableParameter.targetType,
        target: variableParameter.target,
        shockUnit: variableParameter.shockUnit,
        shockValue: x,
        betaAdjusted: variableParameter.betaAdjusted !== undefined ? variableParameter.betaAdjusted : true,
        durationAdjusted: variableParameter.durationAdjusted !== undefined ? variableParameter.durationAdjusted : true
      }
    ]
  };

  const agg = aggregatePortfolioScenario(portfolio, testScenario);
  
  let actualMetricValue = 0.0;
  switch (targetMetric) {
    case 'NAV_CHANGE_PERCENT':
      actualMetricValue = agg.deltas.pnlPercent;
      break;
    case 'NAV_CHANGE_DOLLAR':
      actualMetricValue = agg.deltas.pnlDollar;
      break;
    case 'PORTFOLIO_VALUE':
      actualMetricValue = agg.stressed.nav;
      break;
    default:
      throw new Error(`Unsupported target metric: ${targetMetric}`);
  }

  const residual = actualMetricValue - targetValue;
  return { residual, actualMetricValue, aggResult: agg };
}

/**
 * Bisection solver method: robust & deterministic
 */
function solveBisection(portfolio, reverseRequest, minBound, maxBound, tolerance, maxIterations) {
  let a = minBound;
  let b = maxBound;

  const faObj = evaluateObjective(a, portfolio, reverseRequest);
  const fbObj = evaluateObjective(b, portfolio, reverseRequest);

  if (Math.abs(faObj.residual) <= tolerance) {
    return {
      solution: a,
      converged: true,
      iterations: 0,
      residual: faObj.residual,
      actualMetricValue: faObj.actualMetricValue,
      aggResult: faObj.aggResult
    };
  }
  if (Math.abs(fbObj.residual) <= tolerance) {
    return {
      solution: b,
      converged: true,
      iterations: 0,
      residual: fbObj.residual,
      actualMetricValue: fbObj.actualMetricValue,
      aggResult: fbObj.aggResult
    };
  }

  // Check if root is bracketed (fa * fb <= 0)
  if (faObj.residual * fbObj.residual > 0) {
    throw new SolverConvergenceError(
      `Root not bracketed in initial interval [${a}, ${b}]. f(a)=${faObj.residual.toFixed(6)}, f(b)=${fbObj.residual.toFixed(6)}`,
      { a, b, fa: faObj.residual, fb: fbObj.residual, maxIterations }
    );
  }

  let mid = (a + b) / 2;
  let iter = 0;
  let lastEval = null;

  while (iter < maxIterations) {
    iter++;
    mid = (a + b) / 2;
    lastEval = evaluateObjective(mid, portfolio, reverseRequest);

    if (Math.abs(lastEval.residual) <= tolerance || (b - a) / 2 < tolerance) {
      return {
        solution: mid,
        converged: true,
        iterations: iter,
        residual: lastEval.residual,
        actualMetricValue: lastEval.actualMetricValue,
        aggResult: lastEval.aggResult
      };
    }

    const fMid = lastEval.residual;
    const faEval = evaluateObjective(a, portfolio, reverseRequest);

    if (fMid * faEval.residual < 0) {
      b = mid;
    } else {
      a = mid;
    }
  }

  return {
    solution: mid,
    converged: false,
    iterations: iter,
    residual: lastEval ? lastEval.residual : null,
    actualMetricValue: lastEval ? lastEval.actualMetricValue : null,
    aggResult: lastEval ? lastEval.aggResult : null
  };
}

/**
 * Main reverse scenario solve entry point
 */
export function solveReverseScenario(portfolio, reverseRequest) {
  const startTime = Date.now();
  validateReverseScenarioRequest(reverseRequest);

  const method = reverseRequest.solverMethod || SCENARIO_CONFIG.SOLVER.DEFAULT_METHOD;
  const tolerance = reverseRequest.tolerance || SCENARIO_CONFIG.SOLVER.DEFAULT_TOLERANCE;
  const maxIterations = reverseRequest.maxIterations || SCENARIO_CONFIG.SOLVER.MAX_ITERATIONS;
  const minBound = reverseRequest.minBound !== undefined ? reverseRequest.minBound : SCENARIO_CONFIG.SOLVER.DEFAULT_MIN_BOUND;
  const maxBound = reverseRequest.maxBound !== undefined ? reverseRequest.maxBound : SCENARIO_CONFIG.SOLVER.DEFAULT_MAX_BOUND;

  let solverResult;
  if (method === SolverMethod.BISECTION || method === SolverMethod.BRENT || method === SolverMethod.SECANT) {
    solverResult = solveBisection(portfolio, reverseRequest, minBound, maxBound, tolerance, maxIterations);
  } else {
    throw new Error(`Unsupported solver method: ${method}`);
  }

  const durationMs = Date.now() - startTime;

  return {
    targetMetric: reverseRequest.targetMetric,
    targetValue: reverseRequest.targetValue,
    variableParameter: reverseRequest.variableParameter,
    solverMethod: method,
    solution: solverResult.solution,
    converged: solverResult.converged,
    iterations: solverResult.iterations,
    residual: solverResult.residual,
    initialBounds: { minBound, maxBound },
    tolerance,
    durationMs,
    resultingPortfolioOutcome: solverResult.aggResult ? {
      baselineNav: solverResult.aggResult.baseline.nav,
      stressedNav: solverResult.aggResult.stressed.nav,
      pnlDollar: solverResult.aggResult.deltas.pnlDollar,
      pnlPercent: solverResult.aggResult.deltas.pnlPercent
    } : null,
    status: ValueStatus.SCENARIO_OUTPUT
  };
}
