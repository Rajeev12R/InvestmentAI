/**
 * server/scenario/scenario.transform.js
 * 
 * Phase 19: Scenario Analysis & Stress Intelligence Mathematical Transform Operators
 * Pure deterministic mathematical functions for applying shock transformations.
 */

import { ShockUnit } from './scenario.types.js';
import { SCENARIO_CONFIG } from './scenario.config.js';

/**
 * Applies a percentage shock: V_stressed = V_baseline * (1 + shockPercent)
 * @param {number} baselineValue
 * @param {number} shockPercent (e.g. -0.20 for -20%)
 * @returns {number}
 */
export function applyPercentShock(baselineValue, shockPercent) {
  if (typeof baselineValue !== 'number' || !Number.isFinite(baselineValue)) {
    throw new TypeError(`baselineValue must be a finite number, got: ${baselineValue}`);
  }
  if (typeof shockPercent !== 'number' || !Number.isFinite(shockPercent)) {
    throw new TypeError(`shockPercent must be a finite number, got: ${shockPercent}`);
  }
  return baselineValue * (1 + shockPercent);
}

/**
 * Applies a basis point shock: R_stressed = R_baseline + shockBps / 10000 (or in bps: R + shockBps)
 * @param {number} baselineValue
 * @param {number} shockBps
 * @param {boolean} isFractional - if true, shock is shockBps / 10000; if false, added directly
 * @returns {number}
 */
export function applyBpsShock(baselineValue, shockBps, isFractional = true) {
  if (typeof baselineValue !== 'number' || !Number.isFinite(baselineValue)) {
    throw new TypeError(`baselineValue must be a finite number, got: ${baselineValue}`);
  }
  if (typeof shockBps !== 'number' || !Number.isFinite(shockBps)) {
    throw new TypeError(`shockBps must be a finite number, got: ${shockBps}`);
  }
  const delta = isFractional ? (shockBps / 10000) : shockBps;
  return baselineValue + delta;
}

/**
 * Applies a multiplier shock: V_stressed = V_baseline * multiplier
 * @param {number} baselineValue
 * @param {number} multiplier
 * @returns {number}
 */
export function applyMultiplierShock(baselineValue, multiplier) {
  if (typeof baselineValue !== 'number' || !Number.isFinite(baselineValue)) {
    throw new TypeError(`baselineValue must be a finite number, got: ${baselineValue}`);
  }
  if (typeof multiplier !== 'number' || !Number.isFinite(multiplier)) {
    throw new TypeError(`multiplier must be a finite number, got: ${multiplier}`);
  }
  return baselineValue * multiplier;
}

/**
 * Applies an absolute shock: V_stressed = V_baseline + delta
 * @param {number} baselineValue
 * @param {number} delta
 * @returns {number}
 */
export function applyAbsoluteShock(baselineValue, delta) {
  if (typeof baselineValue !== 'number' || !Number.isFinite(baselineValue)) {
    throw new TypeError(`baselineValue must be a finite number, got: ${baselineValue}`);
  }
  if (typeof delta !== 'number' || !Number.isFinite(delta)) {
    throw new TypeError(`delta must be a finite number, got: ${delta}`);
  }
  return baselineValue + delta;
}

/**
 * Unified shock applier based on ShockUnit enum
 */
export function applyShock(baselineValue, shockUnit, shockValue) {
  switch (shockUnit) {
    case ShockUnit.PERCENT:
      return applyPercentShock(baselineValue, shockValue);
    case ShockUnit.BPS:
      return applyBpsShock(baselineValue, shockValue, true);
    case ShockUnit.MULTIPLIER:
      return applyMultiplierShock(baselineValue, shockValue);
    case ShockUnit.ABSOLUTE:
      return applyAbsoluteShock(baselineValue, shockValue);
    default:
      throw new Error(`Unsupported ShockUnit: ${shockUnit}`);
  }
}

/**
 * Calculates absolute delta: stressed - baseline
 */
export function calculateDelta(baselineValue, stressedValue) {
  return stressedValue - baselineValue;
}

/**
 * Calculates percentage delta: (stressed - baseline) / baseline
 * Returns 0 if baseline is 0 and stressed is 0; returns null if baseline is 0 and stressed is non-zero
 */
export function calculatePercentDelta(baselineValue, stressedValue) {
  if (Math.abs(baselineValue) < SCENARIO_CONFIG.NUMERICAL.EPSILON) {
    if (Math.abs(stressedValue) < SCENARIO_CONFIG.NUMERICAL.EPSILON) {
      return 0.0;
    }
    return null; // Undefined percentage return from zero base
  }
  return (stressedValue - baselineValue) / baselineValue;
}
