/**
 * Phase 14 Test Suite 2: Covariance & Constraints Engine Tests
 */

import assert from 'assert';
import { CovarianceEngine } from '../portfolioConstruction/portfolioConstruction.covariance.engine.js';
import { ConstraintEngine } from '../portfolioConstruction/portfolioConstruction.constraints.engine.js';
import { OptimizationStatus } from '../portfolioConstruction/portfolioConstruction.types.js';

console.log("Starting Phase 14 Suite 2: Covariance & Constraints Engine Tests...");

let assertions = 0;

// Test 1: Compute covariance matrix from valid return series
{
  const seriesA = Array.from({ length: 40 }, (_, i) => 0.01 * Math.sin(i));
  const seriesB = Array.from({ length: 40 }, (_, i) => 0.015 * Math.cos(i));
  const res = CovarianceEngine.computeCovarianceMatrix({ AAPL: seriesA, MSFT: seriesB });
  assert.strictEqual(res.status, OptimizationStatus.OPTIMAL);
  assert.strictEqual(res.covarianceMatrix.length, 2);
  assert.strictEqual(res.covarianceMatrix[0].length, 2);
  assert.ok(res.covarianceMatrix[0][0] > 0);
  assert.ok(res.covarianceMatrix[1][1] > 0);
  assertions += 5;
}

// Test 2: Insufficient observations (< 30) returns INSUFFICIENT_DATA
{
  const seriesA = [0.01, -0.02, 0.03];
  const seriesB = [0.005, 0.01, -0.01];
  const res = CovarianceEngine.computeCovarianceMatrix({ AAPL: seriesA, MSFT: seriesB });
  assert.strictEqual(res.status, OptimizationStatus.INSUFFICIENT_DATA);
  assert.strictEqual(res.covarianceMatrix, null);
  assertions += 2;
}

// Test 3: Asymmetric matrix detection
{
  const asymMatrix = [
    [0.04, 0.02],
    [0.05, 0.04] // [1][0] !== [0][1]
  ];
  const val = CovarianceEngine.validateCovarianceMatrix(asymMatrix);
  assert.strictEqual(val.isValid, false);
  assert.strictEqual(val.status, OptimizationStatus.NUMERICAL_FAILURE);
  assert.ok(val.reasonCode.includes("ASYMMETRIC"));
  assertions += 3;
}

// Test 4: Negative variance on diagonal detection
{
  const negVarMatrix = [
    [-0.04, 0.01],
    [0.01, 0.04]
  ];
  const val = CovarianceEngine.validateCovarianceMatrix(negVarMatrix);
  assert.strictEqual(val.isValid, false);
  assert.strictEqual(val.status, OptimizationStatus.NUMERICAL_FAILURE);
  assert.ok(val.reasonCode.includes("NEGATIVE_VARIANCE"));
  assertions += 3;
}

// Test 5: Non-PSD matrix detection
{
  const nonPSDMatrix = [
    [0.01, 0.05],
    [0.05, 0.01] // Det = 0.0001 - 0.0025 < 0
  ];
  const val = CovarianceEngine.validateCovarianceMatrix(nonPSDMatrix);
  assert.strictEqual(val.isValid, false);
  assert.ok(val.reasonCode.includes("POSITIVE_SEMI_DEFINITE"));
  assertions += 2;
}

// Test 6: Risk contribution calculation & exact reconciliation sum(RC) = sigma_p
{
  const cov = [
    [0.04, 0.01],
    [0.01, 0.09]
  ];
  const weights = [0.60, 0.40];
  const riskBudget = CovarianceEngine.calculateRiskContributions(weights, cov, ["AAPL", "MSFT"]);
  assert.strictEqual(riskBudget.isReconciled, true);
  assert.ok(riskBudget.portfolioVolatility > 0);
  assert.ok(Math.abs(riskBudget.sumRiskContribution - riskBudget.portfolioVolatility) < 0.0001);
  assertions += 3;
}

// Test 7: Constraint bound inversion (min > max) returns INFEASIBLE_CONSTRAINTS
{
  const universe = [{ ticker: "AAPL", sector: "Technology" }];
  const spec = {
    positionMinWeights: { AAPL: 0.40 },
    positionMaxWeights: { AAPL: 0.30 }
  };
  const feas = ConstraintEngine.evaluateConstraints(universe, spec);
  assert.strictEqual(feas.isFeasible, false);
  assert.strictEqual(feas.status, OptimizationStatus.INFEASIBLE_CONSTRAINTS);
  assert.ok(feas.conflicts.some(c => c.type === "BOUND_INVERSION"));
  assertions += 3;
}

// Test 8: Sum of min weights exceeding 100% budget returns INFEASIBLE_CONSTRAINTS
{
  const universe = [
    { ticker: "AAPL", sector: "Technology" },
    { ticker: "MSFT", sector: "Technology" }
  ];
  const spec = {
    positionMinWeights: { AAPL: 0.60, MSFT: 0.50 } // Sum = 1.10 > 1.0
  };
  const feas = ConstraintEngine.evaluateConstraints(universe, spec);
  assert.strictEqual(feas.isFeasible, false);
  assert.strictEqual(feas.status, OptimizationStatus.INFEASIBLE_CONSTRAINTS);
  assert.ok(feas.conflicts.some(c => c.type === "MIN_WEIGHTS_EXCEED_BUDGET"));
  assertions += 3;
}

// Test 9: Sector bound conflict detection
{
  const universe = [
    { ticker: "AAPL", sector: "Technology" },
    { ticker: "MSFT", sector: "Technology" }
  ];
  const spec = {
    positionMinWeights: { AAPL: 0.25, MSFT: 0.25 }, // Tech sum min = 0.50
    sectorMaxWeights: { Technology: 0.40 } // Tech max = 0.40 < 0.50
  };
  const feas = ConstraintEngine.evaluateConstraints(universe, spec);
  assert.strictEqual(feas.isFeasible, false);
  assert.strictEqual(feas.status, OptimizationStatus.INFEASIBLE_CONSTRAINTS);
  assert.ok(feas.conflicts.some(c => c.type === "SECTOR_BOUND_CONFLICT"));
  assertions += 3;
}

console.log(`✓ Phase 14 Suite 2 Passed: ${assertions} assertions`);
export { assertions };
