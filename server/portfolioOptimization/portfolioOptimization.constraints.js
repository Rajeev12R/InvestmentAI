/**
 * server/portfolioOptimization/portfolioOptimization.constraints.js
 * 
 * Phase 33: Constraint Engine & Feasibility Diagnostics
 */

import { ConstraintType, ConstraintStatus, FeasibilityStatus, RelaxationPolicy } from './portfolioOptimization.types.js';
import { OPTIMIZATION_CONFIG } from './portfolioOptimization.config.js';
import { PortfolioOptimizationValidation } from './portfolioOptimization.validation.js';

export class PortfolioOptimizationConstraints {
  /**
   * Comprehensive pre-optimization feasibility check.
   * Returns structured feasibility diagnostics without silently relaxing any constraint.
   */
  static checkFeasibility({
    symbols,
    constraints = {},
    initialWeights = null,
    sectors = null,
    geographies = null,
    sleeves = null,
    factorExposures = null
  }) {
    const n = symbols.length;
    const issues = [];
    const minWeights = constraints.minWeights || (constraints.longOnly ? new Array(n).fill(0) : new Array(n).fill(-1.0));
    const maxWeights = constraints.maxWeights || new Array(n).fill(1.0);

    // 1. Box Bound Contradictions
    let sumMin = 0;
    let sumMax = 0;
    for (let i = 0; i < n; i++) {
      const l = minWeights[i];
      const u = maxWeights[i];
      if (l > u) {
        issues.push(`Asset ${symbols[i]} has contradictory bounds: minWeight (${l}) > maxWeight (${u})`);
      }
      sumMin += l;
      sumMax += u;
    }

    // 2. Full-Investment Feasibility (sum(w) == 1)
    if (constraints.fullyInvested !== false) {
      if (sumMin > 1.0 + OPTIMIZATION_CONFIG.TOLERANCE.FEASIBILITY) {
        issues.push(`Infeasible full investment: sum of minimum weights (${sumMin.toFixed(4)}) exceeds 1.0`);
      }
      if (sumMax < 1.0 - OPTIMIZATION_CONFIG.TOLERANCE.FEASIBILITY) {
        issues.push(`Infeasible full investment: sum of maximum weights (${sumMax.toFixed(4)}) is less than 1.0`);
      }
    }

    // 3. Group Bounds Feasibility (Sector / Geography / Sleeve)
    if (constraints.sectorBounds && sectors) {
      for (const [sec, bounds] of Object.entries(constraints.sectorBounds)) {
        if (bounds.min > bounds.max) {
          issues.push(`Sector ${sec} contradictory bounds: min (${bounds.min}) > max (${bounds.max})`);
        }
      }
    }

    if (constraints.geographyBounds && geographies) {
      for (const [geo, bounds] of Object.entries(constraints.geographyBounds)) {
        if (bounds.min > bounds.max) {
          issues.push(`Geography ${geo} contradictory bounds: min (${bounds.min}) > max (${bounds.max})`);
        }
      }
    }

    // 4. Turnover Feasibility
    if (constraints.maxTurnover !== undefined && initialWeights) {
      if (constraints.maxTurnover < 0) {
        issues.push(`Max turnover limit cannot be negative: ${constraints.maxTurnover}`);
      }
      // Calculate minimum turnover needed to achieve minWeights
      let minRequiredTurnover = 0;
      for (let i = 0; i < n; i++) {
        if (initialWeights[i] < minWeights[i]) {
          minRequiredTurnover += (minWeights[i] - initialWeights[i]);
        } else if (initialWeights[i] > maxWeights[i]) {
          minRequiredTurnover += (initialWeights[i] - maxWeights[i]);
        }
      }
      if (minRequiredTurnover > constraints.maxTurnover + OPTIMIZATION_CONFIG.TOLERANCE.FEASIBILITY) {
        issues.push(`Infeasible turnover: minimum turnover required to reach bounds (${minRequiredTurnover.toFixed(4)}) exceeds max turnover limit (${constraints.maxTurnover})`);
      }
    }

    const isFeasible = issues.length === 0;

    return {
      status: isFeasible ? FeasibilityStatus.FEASIBLE : FeasibilityStatus.INFEASIBLE,
      isFeasible,
      issues,
      minWeightSum: sumMin,
      maxWeightSum: sumMax
    };
  }

  /**
   * Evaluates all constraints against a weight vector and classifies each as PASS, FAIL, or WITHIN_TOLERANCE.
   */
  static evaluateConstraints({
    weights,
    symbols,
    constraints = {},
    covarianceMatrix,
    expectedReturns = null,
    initialWeights = null,
    benchmarkWeights = null,
    sectors = null,
    geographies = null,
    sleeves = null,
    factorExposures = null,
    periodsPerYear = 252,
    confidence = 0.95
  }) {
    const n = symbols.length;
    const records = [];
    let allHardPassed = true;
    let totalPenalty = 0;
    const tol = OPTIMIZATION_CONFIG.TOLERANCE.FEASIBILITY;
    const penaltyMult = constraints.penaltyMultiplier || 100000.0;

    // 1. Fully Invested: sum(w) == 1
    const sumW = weights.reduce((s, w) => s + w, 0);
    const sumDiff = Math.abs(sumW - 1.0);
    const sumPass = sumDiff <= tol;
    if (!sumPass && constraints.fullyInvested !== false) allHardPassed = false;
    records.push({
      type: ConstraintType.FULLY_INVESTED,
      name: 'Full Investment (sum(w) = 1.0)',
      target: 1.0,
      actual: sumW,
      residual: sumDiff,
      isHard: true,
      status: sumPass ? ConstraintStatus.PASS : (sumDiff < 1e-4 ? ConstraintStatus.WITHIN_TOLERANCE : ConstraintStatus.FAIL)
    });

    // 2. Long-Only: w_i >= 0
    if (constraints.longOnly) {
      let minW = 0;
      for (let i = 0; i < n; i++) {
        if (weights[i] < -tol) {
          allHardPassed = false;
          minW = Math.min(minW, weights[i]);
        }
      }
      records.push({
        type: ConstraintType.LONG_ONLY,
        name: 'Long-Only Constraint (w_i >= 0)',
        actual: minW,
        isHard: true,
        status: minW >= -tol ? ConstraintStatus.PASS : ConstraintStatus.FAIL
      });
    }

    // 3. Position Box Bounds (minWeights <= w_i <= maxWeights)
    const minWeights = constraints.minWeights;
    const maxWeights = constraints.maxWeights;
    if (minWeights || maxWeights) {
      let boxViolations = 0;
      let maxViolation = 0;
      for (let i = 0; i < n; i++) {
        const l = minWeights ? minWeights[i] : -Infinity;
        const u = maxWeights ? maxWeights[i] : Infinity;
        if (weights[i] < l - tol) {
          boxViolations++;
          maxViolation = Math.max(maxViolation, l - weights[i]);
        }
        if (weights[i] > u + tol) {
          boxViolations++;
          maxViolation = Math.max(maxViolation, weights[i] - u);
        }
      }
      if (boxViolations > 0) allHardPassed = false;
      records.push({
        type: ConstraintType.POSITION_BOUNDS,
        name: 'Position Min/Max Bounds',
        violationsCount: boxViolations,
        maxViolation,
        isHard: true,
        status: boxViolations === 0 ? ConstraintStatus.PASS : ConstraintStatus.FAIL
      });
    }

    // 4. Group Bounds: Sectors
    if (constraints.sectorBounds && sectors) {
      for (const [secName, bounds] of Object.entries(constraints.sectorBounds)) {
        let secWeight = 0;
        for (let i = 0; i < n; i++) {
          if (sectors[symbols[i]] === secName) secWeight += weights[i];
        }
        const minViol = bounds.min !== undefined && secWeight < bounds.min - tol;
        const maxViol = bounds.max !== undefined && secWeight > bounds.max + tol;
        const passed = !minViol && !maxViol;
        if (!passed && bounds.isSoft !== true) allHardPassed = false;
        if (!passed) {
          const violAmt = minViol ? bounds.min - secWeight : secWeight - bounds.max;
          totalPenalty += penaltyMult * violAmt * violAmt;
        }

        records.push({
          type: ConstraintType.SECTOR_BOUNDS,
          name: `Sector Bounds: ${secName}`,
          group: secName,
          targetMin: bounds.min,
          targetMax: bounds.max,
          actual: secWeight,
          isHard: bounds.isSoft !== true,
          status: passed ? ConstraintStatus.PASS : ConstraintStatus.FAIL
        });
      }
    }

    // 5. Group Bounds: Geographies
    if (constraints.geographyBounds && geographies) {
      for (const [geoName, bounds] of Object.entries(constraints.geographyBounds)) {
        let geoWeight = 0;
        for (let i = 0; i < n; i++) {
          if (geographies[symbols[i]] === geoName) geoWeight += weights[i];
        }
        const minViol = bounds.min !== undefined && geoWeight < bounds.min - tol;
        const maxViol = bounds.max !== undefined && geoWeight > bounds.max + tol;
        const passed = !minViol && !maxViol;
        if (!passed && bounds.isSoft !== true) allHardPassed = false;
        if (!passed) {
          const violAmt = minViol ? bounds.min - geoWeight : geoWeight - bounds.max;
          totalPenalty += penaltyMult * violAmt * violAmt;
        }

        records.push({
          type: ConstraintType.GEOGRAPHY_BOUNDS,
          name: `Geography Bounds: ${geoName}`,
          group: geoName,
          targetMin: bounds.min,
          targetMax: bounds.max,
          actual: geoWeight,
          isHard: bounds.isSoft !== true,
          status: passed ? ConstraintStatus.PASS : ConstraintStatus.FAIL
        });
      }
    }

    // 6. Turnover Constraint: sum(|w - w_init|) <= maxTurnover
    if (constraints.maxTurnover !== undefined && initialWeights) {
      let turnover = 0;
      for (let i = 0; i < n; i++) turnover += Math.abs(weights[i] - initialWeights[i]);
      const turnPass = turnover <= constraints.maxTurnover + tol;
      if (!turnPass && constraints.isTurnoverSoft !== true) allHardPassed = false;
      if (!turnPass) {
        const violAmt = turnover - constraints.maxTurnover;
        totalPenalty += penaltyMult * violAmt * violAmt;
      }

      records.push({
        type: ConstraintType.TURNOVER_LIMIT,
        name: 'Portfolio Turnover Limit',
        targetMax: constraints.maxTurnover,
        actual: turnover,
        isHard: constraints.isTurnoverSoft !== true,
        status: turnPass ? ConstraintStatus.PASS : ConstraintStatus.FAIL
      });
    }

    // 7. Volatility Cap: sigma_p <= maxVolatility
    const portVarPeriod = PortfolioOptimizationValidation.quadraticForm(weights, covarianceMatrix);
    const portVol = Math.sqrt(Math.max(0, portVarPeriod * periodsPerYear));
    if (constraints.maxVolatility !== undefined) {
      const volPass = portVol <= constraints.maxVolatility + tol;
      if (!volPass) {
        allHardPassed = false;
        const violAmt = portVol - constraints.maxVolatility;
        totalPenalty += penaltyMult * violAmt * violAmt;
      }
      records.push({
        type: ConstraintType.VOLATILITY_CAP,
        name: 'Portfolio Volatility Cap',
        targetMax: constraints.maxVolatility,
        actual: portVol,
        isHard: true,
        status: volPass ? ConstraintStatus.PASS : ConstraintStatus.FAIL
      });
    }

    // 8. VaR Cap: z * sigma_p <= maxVaR
    if (constraints.maxVaR !== undefined) {
      const z = PortfolioOptimizationValidation.inverseNormalCDF(confidence);
      const portVaR = z * portVol;
      const varPass = portVaR <= constraints.maxVaR + tol;
      if (!varPass) {
        allHardPassed = false;
        const violAmt = portVaR - constraints.maxVaR;
        totalPenalty += penaltyMult * violAmt * violAmt;
      }
      records.push({
        type: ConstraintType.VAR_CAP,
        name: 'Portfolio VaR Cap',
        targetMax: constraints.maxVaR,
        actual: portVaR,
        isHard: true,
        status: varPass ? ConstraintStatus.PASS : ConstraintStatus.FAIL
      });
    }

    // 9. Tracking Error Cap: sqrt((w - b)^T Sigma (w - b)) <= maxTrackingError
    if (constraints.maxTrackingError !== undefined && benchmarkWeights) {
      const diff = weights.map((w, i) => w - benchmarkWeights[i]);
      const teVarPeriod = PortfolioOptimizationValidation.quadraticForm(diff, covarianceMatrix);
      const te = Math.sqrt(Math.max(0, teVarPeriod * periodsPerYear));
      const tePass = te <= constraints.maxTrackingError + tol;
      if (!tePass) {
        allHardPassed = false;
        const violAmt = te - constraints.maxTrackingError;
        totalPenalty += penaltyMult * violAmt * violAmt;
      }
      records.push({
        type: ConstraintType.TRACKING_ERROR_CAP,
        name: 'Benchmark Tracking Error Cap',
        targetMax: constraints.maxTrackingError,
        actual: te,
        isHard: true,
        status: tePass ? ConstraintStatus.PASS : ConstraintStatus.FAIL
      });
    }

    // 10. Concentration Limit: HHI <= maxHHI
    if (constraints.maxHHI !== undefined) {
      const hhi = weights.reduce((s, w) => s + (w * w), 0);
      const hhiPass = hhi <= constraints.maxHHI + tol;
      if (!hhiPass) {
        allHardPassed = false;
        const violAmt = hhi - constraints.maxHHI;
        totalPenalty += penaltyMult * violAmt * violAmt;
      }
      records.push({
        type: ConstraintType.CONCENTRATION_LIMIT,
        name: 'Concentration HHI Cap',
        targetMax: constraints.maxHHI,
        actual: hhi,
        isHard: true,
        status: hhiPass ? ConstraintStatus.PASS : ConstraintStatus.FAIL
      });
    }

    return {
      allHardPassed,
      records,
      totalPenalty,
      hasSoftRelaxations: totalPenalty > 0
    };
  }

  /**
   * Euclidean projection of vector v onto the box bounds [minW, maxW] and simplex sum(w) = 1.
   * Machine-precision Bisection projection algorithm for constrained optimization.
   */
  static projectOntoConstraints(vector, minWeights, maxWeights, fullyInvested = true) {
    const n = vector.length;
    const minW = minWeights || new Array(n).fill(0);
    const maxW = maxWeights || new Array(n).fill(1.0);

    if (!fullyInvested) {
      return vector.map((v, i) => Math.max(minW[i], Math.min(maxW[i], v)));
    }

    // Exact Bisection for Simplex + Box Bounds: sum(clamp(v_i - theta, minW_i, maxW_i)) = 1
    let low = Infinity;
    let high = -Infinity;
    for (let i = 0; i < n; i++) {
      low = Math.min(low, vector[i] - maxW[i]);
      high = Math.max(high, vector[i] - minW[i]);
    }
    low -= 10.0;
    high += 10.0;

    for (let iter = 0; iter < 80; iter++) {
      const mid = (low + high) / 2.0;
      let sum = 0;
      for (let i = 0; i < n; i++) {
        sum += Math.max(minW[i], Math.min(maxW[i], vector[i] - mid));
      }
      if (sum > 1.0) {
        low = mid;
      } else {
        high = mid;
      }
    }

    const theta = (low + high) / 2.0;
    const projected = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      projected[i] = Math.max(minW[i], Math.min(maxW[i], vector[i] - theta));
    }

    return projected;
  }
}
