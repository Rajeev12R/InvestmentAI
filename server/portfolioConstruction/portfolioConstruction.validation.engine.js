import { OptimizationStatus } from "./portfolioConstruction.types.js";
import { ConstraintEngine } from "./portfolioConstruction.constraints.engine.js";

/**
 * Deterministic Post-Optimization Validator for Phase 14
 */
export class OptimizationValidator {
  /**
   * Validate completed optimization output before packaging.
   */
  static validate(result, universeSecurities, constraints = {}, config = {}) {
    const errors = [];

    if (!result || typeof result !== "object") {
      return {
        isValid: false,
        status: OptimizationStatus.OPTIMIZATION_INVALID,
        errors: ["Optimization result is not an object"]
      };
    }

    if (result.status !== OptimizationStatus.OPTIMAL && result.status !== OptimizationStatus.FEASIBLE) {
      return {
        isValid: false,
        status: result.status || OptimizationStatus.OPTIMIZATION_INVALID,
        errors: [result.reasonCode || "Optimization did not converge to an optimal or feasible state"]
      };
    }

    const weights = result.weights || {};
    const tickers = universeSecurities.map(s => s.ticker);
    let weightSum = 0;

    for (const t of tickers) {
      const w = weights[t];
      if (typeof w !== "number" || isNaN(w) || !isFinite(w)) {
        errors.push(`Invalid non-finite target weight for ${t}: ${w}`);
        continue;
      }
      weightSum += w;
    }

    if (weights["CASH"] !== undefined) {
      weightSum += weights["CASH"];
    }

    // Weight sum verification
    const tol = config.weightSumTolerance || 1e-4;
    if (Math.abs(weightSum - 1.0) > tol) {
      errors.push(`Target weights sum to ${weightSum.toFixed(6)}, expected 1.0 (tolerance: ${tol})`);
    }

    // Constraint compliance
    const compliance = ConstraintEngine.verifyWeightCompliance(weights, universeSecurities, constraints);
    if (!compliance.isCompliant) {
      compliance.violations.forEach(v => errors.push(v.message || `Constraint violation: ${v.rule}`));
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        status: OptimizationStatus.OPTIMIZATION_INVALID,
        errors
      };
    }

    return {
      isValid: true,
      status: OptimizationStatus.OPTIMAL,
      errors: []
    };
  }
}
