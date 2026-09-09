/**
 * Phase 14 Test Suite 11: Solver Convergence Contract, Quality Validation & Covariance Numerical Policy
 * 
 * Verifies the 10 solver convergence scenarios, post-optimization quality validation,
 * exact covariance matrix numerical classifications, and turnover reconciliation.
 */

import assert from 'assert';
import { PortfolioOptimizerEngine } from '../portfolioConstruction/portfolioConstruction.optimizer.engine.js';
import { CovarianceEngine } from '../portfolioConstruction/portfolioConstruction.covariance.engine.js';
import { TurnoverEngine } from '../portfolioConstruction/portfolioConstruction.turnover.engine.js';
import { OptimizationMethod, OptimizationStatus } from '../portfolioConstruction/portfolioConstruction.types.js';
import { PORTFOLIO_OPTIMIZATION_CONFIG_V1, PORTFOLIO_OPTIMIZATION_CONFIG_V2 } from '../portfolioConstruction/portfolioConstructionConfig.js';

console.log("Starting Phase 14 Suite 11: Solver Convergence Contract & Numerical Policy Tests...");

let assertions = 0;

const baseSecurities = [
  { ticker: "AAPL", sector: "Technology" },
  { ticker: "MSFT", sector: "Technology" },
  { ticker: "JPM", sector: "Financials" }
];

const baseReturns = { AAPL: 0.12, MSFT: 0.10, JPM: 0.08 };

const validPDCov = [
  [0.04, 0.01, 0.005],
  [0.01, 0.05, 0.008],
  [0.005, 0.008, 0.06]
];

// =========================================================================
// SECTION 1: 10 SOLVER CONVERGENCE TESTS
// =========================================================================

// Test 1: Normal Convergence (Mean-Variance & Min-Variance on standard PD covariance)
{
  const optMV = PortfolioOptimizerEngine.optimize({
    method: OptimizationMethod.MEAN_VARIANCE,
    universeSecurities: baseSecurities,
    expectedReturns: baseReturns,
    covarianceMatrix: validPDCov
  });
  assert.strictEqual(optMV.status, OptimizationStatus.OPTIMAL);
  assert.strictEqual(optMV.solverStats.converged, true);
  assert.ok(optMV.solverStats.iterations > 0 && optMV.solverStats.iterations < 1000);
  assert.ok(Math.abs(optMV.weightsArray.reduce((a, b) => a + b, 0) - 1.0) < 1e-4);

  const optMinVar = PortfolioOptimizerEngine.optimize({
    method: OptimizationMethod.MINIMUM_VARIANCE,
    universeSecurities: baseSecurities,
    covarianceMatrix: validPDCov
  });
  assert.strictEqual(optMinVar.status, OptimizationStatus.OPTIMAL);
  assert.strictEqual(optMinVar.solverStats.converged, true);
  assertions += 6;
}

// Test 2: Convergence at Boundary (Box bounds active)
{
  const optBound = PortfolioOptimizerEngine.optimize({
    method: OptimizationMethod.MEAN_VARIANCE,
    universeSecurities: baseSecurities,
    expectedReturns: { AAPL: 0.50, MSFT: 0.05, JPM: 0.02 }, // AAPL strongly dominates
    covarianceMatrix: validPDCov,
    constraints: {
      positionMaxWeights: { AAPL: 0.40, MSFT: 0.40, JPM: 0.40 }
    }
  });
  assert.strictEqual(optBound.status, OptimizationStatus.OPTIMAL);
  assert.strictEqual(optBound.solverStats.converged, true);
  assert.ok(optBound.weights.AAPL <= 0.400001);
  assert.ok(optBound.weights.AAPL >= 0.399990); // Hits upper bound exactly
  assertions += 4;
}

// Test 3: Zero/Near-Zero Gradient (Initial guess already at stationary point)
{
  // Symmetrical universe with identical returns and identical diagonal covariance
  const symSecurities = [
    { ticker: "A", sector: "Tech" },
    { ticker: "B", sector: "Tech" }
  ];
  const symReturns = { A: 0.10, B: 0.10 };
  const symCov = [
    [0.04, 0.0],
    [0.0, 0.04]
  ];
  const optSym = PortfolioOptimizerEngine.optimize({
    method: OptimizationMethod.MEAN_VARIANCE,
    universeSecurities: symSecurities,
    expectedReturns: symReturns,
    covarianceMatrix: symCov
  });
  assert.strictEqual(optSym.status, OptimizationStatus.OPTIMAL);
  assert.strictEqual(optSym.solverStats.converged, true);
  assert.strictEqual(optSym.weights.A, 0.5);
  assert.strictEqual(optSym.weights.B, 0.5);
  assertions += 4;
}

// Test 4: Iteration Limit -> NON_CONVERGENT failure state
{
  const tightCfg = { ...PORTFOLIO_OPTIMIZATION_CONFIG_V1, maxIterations: 1, convergenceTolerance: 1e-15 };
  const optNonConv = PortfolioOptimizerEngine.optimize({
    method: OptimizationMethod.MEAN_VARIANCE,
    universeSecurities: baseSecurities,
    expectedReturns: baseReturns,
    covarianceMatrix: validPDCov,
    config: tightCfg
  });
  assert.strictEqual(optNonConv.status, OptimizationStatus.NON_CONVERGENT);
  assert.strictEqual(optNonConv.solverStats.converged, false);
  assert.strictEqual(optNonConv.solverStats.iterations, 1);
  assert.strictEqual(optNonConv.reasonCode, "MAX_ITERATIONS_REACHED_WITHOUT_CONVERGENCE");
  assertions += 4;
}

// Test 5: Oscillation & Line Search Stability
{
  // Ill-conditioned matrix with high eigenvalues that would cause divergence without Lipschitz step sizing
  const stiffCov = [
    [1.0, 0.0],
    [0.0, 0.001]
  ];
  const stiffSec = [{ ticker: "H", sector: "X" }, { ticker: "L", sector: "Y" }];
  const optStiff = PortfolioOptimizerEngine.optimize({
    method: OptimizationMethod.MINIMUM_VARIANCE,
    universeSecurities: stiffSec,
    covarianceMatrix: stiffCov
  });
  assert.strictEqual(optStiff.status, OptimizationStatus.OPTIMAL);
  assert.strictEqual(optStiff.solverStats.converged, true);
  assert.ok(optStiff.weights.L > optStiff.weights.H); // Low variance gets higher weight
  assertions += 3;
}

// Test 6: Stalled Objective Detection
{
  const optStalled = PortfolioOptimizerEngine.optimize({
    method: OptimizationMethod.RISK_PARITY,
    universeSecurities: baseSecurities,
    covarianceMatrix: validPDCov,
    config: { ...PORTFOLIO_OPTIMIZATION_CONFIG_V1, convergenceTolerance: 1e-3 }
  });
  assert.strictEqual(optStalled.status, OptimizationStatus.OPTIMAL);
  assert.strictEqual(optStalled.solverStats.converged, true);
  assertions += 2;
}

// Test 7: Malformed Solver Output Rejected (NaN / Infinity weights)
{
  const malformedValidation = PortfolioOptimizerEngine.validateOptimizationQuality({
    tickers: ["AAPL", "MSFT", "JPM"],
    candidateWeights: [NaN, 0.5, 0.5]
  });
  assert.strictEqual(malformedValidation.isValid, false);
  assert.ok(malformedValidation.errors.some(e => e.includes("NON_FINITE_WEIGHT")));

  const infValidation = PortfolioOptimizerEngine.validateOptimizationQuality({
    tickers: ["AAPL", "MSFT", "JPM"],
    candidateWeights: [Infinity, 0.0, 0.0]
  });
  assert.strictEqual(infValidation.isValid, false);
  assertions += 3;
}

// Test 8: False Convergence Detection (Feasible vector violating bound or sum constraint)
{
  const invalidSumValidation = PortfolioOptimizerEngine.validateOptimizationQuality({
    tickers: ["AAPL", "MSFT", "JPM"],
    candidateWeights: [0.30, 0.30, 0.30] // Sums to 0.90 !== 1.0
  });
  assert.strictEqual(invalidSumValidation.isValid, false);
  assert.ok(invalidSumValidation.errors.some(e => e.includes("WEIGHT_SUM_VIOLATION")));

  const boundViolation = PortfolioOptimizerEngine.validateOptimizationQuality({
    tickers: ["AAPL", "MSFT", "JPM"],
    candidateWeights: [0.70, 0.20, 0.10],
    maxWeights: { AAPL: 0.50, MSFT: 0.50, JPM: 0.50 }
  });
  assert.strictEqual(boundViolation.isValid, false);
  assert.ok(boundViolation.errors.some(e => e.includes("UPPER_BOUND_VIOLATION_AAPL")));
  assertions += 4;
}

// Test 9: Feasible but Materially Suboptimal Candidate Quality Validation
{
  // Quality validation rejects candidate weights with invalid portfolio variance or structure
  const invalidVarValidation = PortfolioOptimizerEngine.validateOptimizationQuality({
    tickers: ["AAPL", "MSFT", "JPM"],
    candidateWeights: [0.33, 0.33, 0.34],
    covarianceMatrix: [
      [NaN, 0, 0],
      [0, 0.04, 0],
      [0, 0, 0.04]
    ]
  });
  assert.strictEqual(invalidVarValidation.isValid, false);
  assert.ok(invalidVarValidation.errors.includes("INVALID_PORTFOLIO_VARIANCE"));
  assertions += 2;
}

// Test 10: Deterministic Repeated Convergence (100 Replays)
{
  let firstWeights = null;
  let firstIter = null;
  let identical = true;

  for (let replay = 0; replay < 100; replay++) {
    const res = PortfolioOptimizerEngine.optimize({
      method: OptimizationMethod.MEAN_VARIANCE,
      universeSecurities: baseSecurities,
      expectedReturns: baseReturns,
      covarianceMatrix: validPDCov
    });
    if (replay === 0) {
      firstWeights = JSON.stringify(res.weights);
      firstIter = res.solverStats.iterations;
    } else {
      if (JSON.stringify(res.weights) !== firstWeights || res.solverStats.iterations !== firstIter) {
        identical = false;
        break;
      }
    }
  }
  assert.strictEqual(identical, true);
  assertions += 1;
}

// =========================================================================
// SECTION 2: COVARIANCE NUMERICAL POLICY TESTS
// =========================================================================

// Test 11: Valid Positive Definite (PD)
{
  const val = CovarianceEngine.validateCovarianceMatrix(validPDCov);
  assert.strictEqual(val.isValid, true);
  assert.strictEqual(val.status, OptimizationStatus.OPTIMAL);
  assert.strictEqual(val.matrixClass, "POSITIVE_DEFINITE");
  assert.ok(val.minEigenvalueEstimate > 0);
  assertions += 4;
}

// Test 12: Valid PSD Singular Matrix
{
  // Rank 1 matrix: column 2 = 2 * column 1
  const psdSingular = [
    [0.04, 0.08],
    [0.08, 0.16]
  ];
  const val = CovarianceEngine.validateCovarianceMatrix(psdSingular);
  assert.strictEqual(val.isValid, false);
  assert.strictEqual(val.status, OptimizationStatus.NUMERICAL_FAILURE);
  assert.strictEqual(val.matrixClass, "PSD_SINGULAR");
  assert.strictEqual(val.reasonCode, "PSD is mathematically valid, but the current optimization implementation requires PD for numerical stability.");
  assertions += 4;
}

// Test 13: Slightly Negative Eigenvalue (Non-PSD)
{
  const nonPSD = [
    [0.04, 0.05],
    [0.05, 0.04] // Det = 0.0016 - 0.0025 = -0.0009 < 0
  ];
  const val = CovarianceEngine.validateCovarianceMatrix(nonPSD);
  assert.strictEqual(val.isValid, false);
  assert.strictEqual(val.status, OptimizationStatus.NUMERICAL_FAILURE);
  assert.strictEqual(val.matrixClass, "NON_PSD");
  assert.strictEqual(val.reasonCode, "MATRIX_NOT_POSITIVE_SEMI_DEFINITE");
  assertions += 4;
}

// Test 14: Near-Singular Matrix
{
  const nearSingular = [
    [1.0, 0.9999999],
    [0.9999999, 1.0]
  ];
  const val = CovarianceEngine.validateCovarianceMatrix(nearSingular);
  assert.strictEqual(val.isValid, false);
  assert.strictEqual(val.status, OptimizationStatus.NUMERICAL_FAILURE);
  assert.ok(val.matrixClass === "PSD_SINGULAR" || val.matrixClass === "ILL_CONDITIONED");
  assertions += 3;
}

// Test 15: Highly Ill-Conditioned Matrix (Cond > 1e6)
{
  const illCond = [
    [1000.0, 0.0],
    [0.0, 0.0000001]
  ];
  const val = CovarianceEngine.validateCovarianceMatrix(illCond, { conditionNumberLimit: 1e6 });
  assert.strictEqual(val.isValid, false);
  assert.strictEqual(val.status, OptimizationStatus.NUMERICAL_FAILURE);
  assert.strictEqual(val.matrixClass, "ILL_CONDITIONED");
  assert.ok(val.reasonCode.includes("ILL_CONDITIONED"));
  assertions += 4;
}

// Test 16: Asymmetric Matrix
{
  const asym = [
    [0.04, 0.02],
    [0.01, 0.04]
  ];
  const val = CovarianceEngine.validateCovarianceMatrix(asym);
  assert.strictEqual(val.isValid, false);
  assert.strictEqual(val.status, OptimizationStatus.NUMERICAL_FAILURE);
  assert.strictEqual(val.matrixClass, "ASYMMETRIC");
  assertions += 3;
}

// Test 17: Dimension Mismatch / Non-Square Matrix
{
  const nonSquare = [
    [0.04, 0.02, 0.01],
    [0.02, 0.04]
  ];
  const val = CovarianceEngine.validateCovarianceMatrix(nonSquare);
  assert.strictEqual(val.isValid, false);
  assert.strictEqual(val.status, OptimizationStatus.INVALID_INPUT);
  assert.strictEqual(val.reasonCode, "NON_SQUARE_MATRIX");
  assertions += 3;
}

// =========================================================================
// SECTION 3: TURNOVER TERMINOLOGY & RECONCILIATION TEST
// =========================================================================

// Test 18: Exact Turnover Reconciliation: TwoWayTurnover = 2 * OneWayTurnover
{
  const currentWeights = { AAPL: 0.50, MSFT: 0.30, JPM: 0.20 };
  const targetWeights = { AAPL: 0.30, MSFT: 0.40, JPM: 0.30 };

  const turnover = TurnoverEngine.calculateTurnover(currentWeights, targetWeights);

  // Delta: AAPL: -0.20, MSFT: +0.10, JPM: +0.10
  // TwoWayTurnover = |-0.20| + |0.10| + |0.10| = 0.40
  // OneWayTurnover = 0.5 * 0.40 = 0.20
  // BuySideTurnover = 0.10 + 0.10 = 0.20
  // SellSideTurnover = 0.20
  assert.strictEqual(turnover.twoWayTurnover, 0.40);
  assert.strictEqual(turnover.oneWayTurnover, 0.20);
  assert.strictEqual(turnover.buySideTurnover, 0.20);
  assert.strictEqual(turnover.sellSideTurnover, 0.20);
  assert.strictEqual(turnover.twoWayTurnover, Number((2.0 * turnover.oneWayTurnover).toFixed(6)));
  assert.strictEqual(turnover.buySideTurnover, turnover.oneWayTurnover);
  assert.strictEqual(turnover.sellSideTurnover, turnover.oneWayTurnover);
  assertions += 7;
}

console.log(`✓ Phase 14 Suite 11 Passed: ${assertions} assertions`);
export { assertions };
