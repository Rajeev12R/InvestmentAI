import { OptimizationStatus } from "./portfolioConstruction.types.js";
import { PORTFOLIO_CONSTRAINT_CONFIG_V1 } from "./portfolioConstructionConfig.js";

/**
 * Deterministic Constraint Engine for Phase 14
 */
export class ConstraintEngine {
  /**
   * Validates and checks feasibility of a constraint specification for a given universe.
   */
  static evaluateConstraints(universeSecurities, constraintSpec = {}, config = PORTFOLIO_CONSTRAINT_CONFIG_V1) {
    const n = universeSecurities.length;
    const tickers = universeSecurities.map(s => s.ticker);
    const conflicts = [];

    // Extract position bounds
    const minWeights = {};
    const maxWeights = {};
    let minSum = 0;
    let maxSum = 0;

    const defaultMin = constraintSpec.minWeight !== undefined ? constraintSpec.minWeight : config.defaultMinWeight;
    const defaultMax = constraintSpec.maxWeight !== undefined ? constraintSpec.maxWeight : config.defaultMaxWeight;
    const allowShorting = constraintSpec.allowShorting ?? config.defaultAllowShorting;
    const allowLeverage = constraintSpec.allowLeverage ?? config.defaultAllowLeverage;
    const minCash = constraintSpec.minCash !== undefined ? constraintSpec.minCash : config.defaultMinCash;
    const maxCash = constraintSpec.maxCash !== undefined ? constraintSpec.maxCash : config.defaultMaxCash;

    // Security-specific bounds
    for (const sec of universeSecurities) {
      const t = sec.ticker;
      const minW = constraintSpec.positionMinWeights?.[t] ?? defaultMin;
      const maxW = constraintSpec.positionMaxWeights?.[t] ?? defaultMax;

      if (!allowShorting && minW < 0) {
        conflicts.push({
          type: "SHORTING_NOT_ALLOWED",
          ticker: t,
          minWeight: minW,
          message: `Negative minimum weight (${minW}) specified for ${t} while shorting is disabled`
        });
      }

      if (minW > maxW) {
        conflicts.push({
          type: "BOUND_INVERSION",
          ticker: t,
          minWeight: minW,
          maxWeight: maxW,
          message: `Minimum weight (${minW}) exceeds maximum weight (${maxW}) for ${t}`
        });
      }

      minWeights[t] = minW;
      maxWeights[t] = maxW;
      minSum += minW;
      maxSum += maxW;
    }

    // Cash feasibility
    const totalMinRequirement = minSum + minCash;
    if (totalMinRequirement > (allowLeverage ? config.maxLeverageGross : 1.0001)) {
      conflicts.push({
        type: "MIN_WEIGHTS_EXCEED_BUDGET",
        totalMinRequirement,
        budgetLimit: allowLeverage ? config.maxLeverageGross : 1.0,
        message: `Sum of minimum position weights (${minSum.toFixed(4)}) plus minimum cash (${minCash.toFixed(4)}) exceeds 100% budget (${totalMinRequirement.toFixed(4)})`
      });
    }

    const totalMaxCapacity = maxSum + maxCash;
    if (totalMaxCapacity < 0.9999 && !allowShorting) {
      conflicts.push({
        type: "MAX_WEIGHTS_UNDER_BUDGET",
        totalMaxCapacity,
        message: `Sum of maximum position weights (${maxSum.toFixed(4)}) plus maximum cash (${maxCash.toFixed(4)}) cannot reach 100% budget (${totalMaxCapacity.toFixed(4)})`
      });
    }

    // Sector constraints check
    const sectorLimits = constraintSpec.sectorMaxWeights || {};
    const sectorSecurities = {};
    for (const sec of universeSecurities) {
      const sector = sec.sector || "UNKNOWN";
      if (!sectorSecurities[sector]) sectorSecurities[sector] = [];
      sectorSecurities[sector].push(sec.ticker);
    }

    for (const [sector, secList] of Object.entries(sectorSecurities)) {
      const sectorMinSum = secList.reduce((acc, t) => acc + (minWeights[t] || 0), 0);
      const sectorLimit = sectorLimits[sector] ?? config.defaultMaxSectorWeight;

      if (sectorMinSum > sectorLimit + 0.0001) {
        conflicts.push({
          type: "SECTOR_BOUND_CONFLICT",
          sector,
          sectorMinSum,
          sectorLimit,
          message: `Sum of minimum weights in sector '${sector}' (${sectorMinSum.toFixed(4)}) exceeds sector max limit (${sectorLimit.toFixed(4)})`
        });
      }
    }

    if (conflicts.length > 0) {
      return {
        isFeasible: false,
        status: OptimizationStatus.INFEASIBLE_CONSTRAINTS,
        conflicts,
        bounds: { minWeights, maxWeights, minCash, maxCash },
        summary: "Constraint set is mathematically infeasible"
      };
    }

    return {
      isFeasible: true,
      status: OptimizationStatus.FEASIBLE,
      conflicts: [],
      bounds: { minWeights, maxWeights, minCash, maxCash, defaultMin, defaultMax },
      sectorLimits,
      allowShorting,
      allowLeverage
    };
  }

  /**
   * Verify if a candidate weight vector satisfies all active constraints.
   */
  static verifyWeightCompliance(weightsMap, universeSecurities, constraintSpec = {}, config = PORTFOLIO_CONSTRAINT_CONFIG_V1) {
    const violations = [];
    let weightSum = 0;
    const defaultMin = constraintSpec.minWeight ?? config.defaultMinWeight;
    const defaultMax = constraintSpec.maxWeight ?? config.defaultMaxWeight;
    const allowShorting = constraintSpec.allowShorting ?? config.defaultAllowShorting;

    for (const sec of universeSecurities) {
      const t = sec.ticker;
      const w = weightsMap[t] ?? 0;
      const minW = constraintSpec.positionMinWeights?.[t] ?? defaultMin;
      const maxW = constraintSpec.positionMaxWeights?.[t] ?? defaultMax;

      if (!allowShorting && w < -1e-6) {
        violations.push({ ticker: t, weight: w, rule: "NO_SHORTING", message: `Negative weight ${w.toFixed(6)} on ${t}` });
      }
      if (w < minW - 1e-4) {
        violations.push({ ticker: t, weight: w, minLimit: minW, rule: "MIN_WEIGHT_VIOLATION" });
      }
      if (w > maxW + 1e-4) {
        violations.push({ ticker: t, weight: w, maxLimit: maxW, rule: "MAX_WEIGHT_VIOLATION" });
      }

      weightSum += w;
    }

    const cashW = weightsMap["CASH"] ?? 0;
    weightSum += cashW;

    if (Math.abs(weightSum - 1.0) > 1e-3) {
      violations.push({ rule: "WEIGHT_SUM_NOT_100", actualSum: weightSum, expectedSum: 1.0 });
    }

    return {
      isCompliant: violations.length === 0,
      violations
    };
  }
}
