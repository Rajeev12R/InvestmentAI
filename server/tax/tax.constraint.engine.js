/**
 * Phase 17 — Tax Constraint Engine
 * Strict Inheritance & Verification of Phase 14, 15, and 16 Constraints
 */

import { deepFreeze, TaxStatus } from './tax.types.js';

export class TaxConstraintEngine {
  /**
   * Validates a candidate portfolio allocation against inherited Phase 14, 15, and 16 constraints.
   */
  static validateCandidateConstraints(candidateWeights, constraints = {}) {
    if (!candidateWeights || typeof candidateWeights !== 'object') {
      return deepFreeze({
        status: TaxStatus.INVALID_INPUT,
        reason: 'candidateWeights is missing or invalid'
      });
    }

    const {
      maxPositionWeight = 0.35,
      minPositionWeight = 0.0,
      allowShorting = false,
      maxLeverage = 1.0,
      prohibitedSecurities = [],
      sectorLimits = {},
      securitySectorMap = {},
      complianceHardLimits = []
    } = constraints;

    let totalWeight = 0;
    const violations = [];

    // Check individual position limits and shorting
    for (const [secId, weight] of Object.entries(candidateWeights)) {
      if (typeof weight !== 'number' || isNaN(weight)) {
        violations.push(`Weight for ${secId} is not a valid number`);
        continue;
      }

      totalWeight += weight;

      if (!allowShorting && weight < -0.00001) {
        violations.push(`Short position detected for ${secId} (weight: ${weight}) under long-only constraint`);
      }

      if (weight > maxPositionWeight + 0.00001) {
        violations.push(`Position ${secId} weight (${weight}) exceeds max limit (${maxPositionWeight})`);
      }

      if (prohibitedSecurities.includes(secId) && Math.abs(weight) > 0.00001) {
        violations.push(`Security ${secId} is prohibited by compliance policy`);
      }
    }

    if (totalWeight > maxLeverage + 0.001) {
      violations.push(`Total portfolio leverage (${totalWeight.toFixed(4)}) exceeds max allowed (${maxLeverage})`);
    }

    // Check sector limits
    const sectorWeights = {};
    for (const [secId, weight] of Object.entries(candidateWeights)) {
      const sector = securitySectorMap[secId] || 'UNCLASSIFIED';
      sectorWeights[sector] = (sectorWeights[sector] || 0) + weight;
    }

    for (const [sector, secWeight] of Object.entries(sectorWeights)) {
      const limit = sectorLimits[sector];
      if (typeof limit === 'number' && secWeight > limit + 0.00001) {
        violations.push(`Sector '${sector}' weight (${secWeight.toFixed(4)}) exceeds limit (${limit})`);
      }
    }

    if (violations.length > 0) {
      return deepFreeze({
        status: TaxStatus.INFEASIBLE_CONSTRAINTS,
        feasible: false,
        violations,
        reason: `Candidate violates ${violations.length} inherited constraint(s)`
      });
    }

    return deepFreeze({
      status: TaxStatus.PASS,
      feasible: true,
      violations: []
    });
  }
}
