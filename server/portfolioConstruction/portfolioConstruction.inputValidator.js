import { OptimizationStatus } from "./portfolioConstruction.types.js";

/**
 * Validates optimization input package and returns structured diagnostic.
 */
export class PortfolioInputValidator {
  static validate(input) {
    const errors = [];

    if (!input || typeof input !== "object") {
      return {
        isValid: false,
        status: OptimizationStatus.INVALID_INPUT,
        errors: ["Input package must be a non-null object"]
      };
    }

    // Required identifiers & temporal fields
    if (!input.workspaceId || typeof input.workspaceId !== "string") {
      errors.push("Missing or invalid workspaceId");
    }
    if (!input.portfolioId || typeof input.portfolioId !== "string") {
      errors.push("Missing or invalid portfolioId");
    }
    if (!input.asOf || typeof input.asOf !== "string" || isNaN(Date.parse(input.asOf))) {
      errors.push("Missing or invalid asOf timestamp");
    }

    // Check for future timestamp (temporal boundary check)
    if (input.asOf && new Date(input.asOf).getTime() > Date.now() + 60000) { // allow 1 min clock drift
      errors.push("Temporal boundary violation: asOf timestamp is in the future");
    }

    // Securities validation
    if (!Array.isArray(input.securities) || input.securities.length === 0) {
      errors.push("Securities must be a non-empty array");
    } else {
      const tickers = new Set();
      for (const s of input.securities) {
        if (!s || typeof s.ticker !== "string" || s.ticker.trim() === "") {
          errors.push(`Invalid security entry: ${JSON.stringify(s)}`);
          continue;
        }
        if (tickers.has(s.ticker)) {
          errors.push(`Duplicate security ticker detected: ${s.ticker}`);
        }
        tickers.add(s.ticker);
      }
    }

    // Current weights validation if provided
    if (input.currentWeights) {
      if (typeof input.currentWeights !== "object") {
        errors.push("currentWeights must be an object mapping ticker to weight");
      } else {
        let sum = 0;
        for (const [ticker, w] of Object.entries(input.currentWeights)) {
          if (typeof w !== "number" || isNaN(w) || !isFinite(w)) {
            errors.push(`Invalid non-finite current weight for ticker ${ticker}: ${w}`);
          }
          if (w < 0 && (!input.constraints || !input.constraints.allowShorting)) {
            errors.push(`Negative current weight detected for ${ticker} without shorting allowed`);
          }
          sum += w;
        }
        // If current weights exist and has cash or securities, verify sum ≈ 1.0 (or cash handles remainder)
        if (Object.keys(input.currentWeights).length > 0 && Math.abs(sum - 1.0) > 0.01 && !input.allowUnallocatedCash) {
          // Warning or error if sum deviates significantly
          if (Math.abs(sum - 1.0) > 0.05) {
            errors.push(`Current weights sum to ${sum.toFixed(4)}, expected ~1.0`);
          }
        }
      }
    }

    // Covariance matrix dimension check if provided
    if (input.covarianceMatrix) {
      if (!Array.isArray(input.covarianceMatrix) || input.covarianceMatrix.length !== input.securities?.length) {
        errors.push(`Covariance matrix dimension (${input.covarianceMatrix?.length}) does not match securities count (${input.securities?.length})`);
      }
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        status: OptimizationStatus.INVALID_INPUT,
        errors
      };
    }

    return {
      isValid: true,
      status: OptimizationStatus.FEASIBLE,
      errors: []
    };
  }
}
