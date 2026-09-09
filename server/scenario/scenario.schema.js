/**
 * server/scenario/scenario.schema.js
 * 
 * Phase 19: Scenario Analysis & Stress Intelligence Schemas and Validators
 * Strictly validates scenario definitions, shock structures, and solver parameters.
 */

import {
  ScenarioType,
  ShockUnit,
  ScenarioHorizon,
  SolverMethod,
  BaselineType
} from './scenario.types.js';
import { SCENARIO_CONFIG } from './scenario.config.js';

export class ScenarioValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'ScenarioValidationError';
    this.details = details;
  }
}

/**
 * Validates a single shock object
 */
export function validateShock(shock, index = 0) {
  const errors = [];
  const prefix = `Shock[${index}]: `;

  if (!shock || typeof shock !== 'object') {
    errors.push(`${prefix}Must be a non-null object`);
    return errors;
  }

  const validTargetTypes = ['SECURITY', 'INDEX', 'SECTOR', 'FACTOR', 'LIQUIDITY', 'FX'];
  if (!shock.targetType || !validTargetTypes.includes(shock.targetType)) {
    errors.push(`${prefix}Invalid or missing targetType. Must be one of: ${validTargetTypes.join(', ')}`);
  }

  if (typeof shock.target !== 'string' || shock.target.trim() === '') {
    errors.push(`${prefix}target must be a non-empty string`);
  }

  const validShockUnits = Object.values(ShockUnit);
  if (!shock.shockUnit || !validShockUnits.includes(shock.shockUnit)) {
    errors.push(`${prefix}Invalid or missing shockUnit. Must be one of: ${validShockUnits.join(', ')}`);
  }

  if (typeof shock.shockValue !== 'number' || !Number.isFinite(shock.shockValue)) {
    errors.push(`${prefix}shockValue must be a finite number`);
  } else {
    if (shock.shockUnit === ShockUnit.PERCENT) {
      if (shock.shockValue < SCENARIO_CONFIG.LIMITS.MIN_PRICE_PERCENT_SHOCK) {
        errors.push(`${prefix}PERCENT shockValue (${shock.shockValue}) is below minimum limit (${SCENARIO_CONFIG.LIMITS.MIN_PRICE_PERCENT_SHOCK})`);
      }
      if (shock.shockValue > SCENARIO_CONFIG.LIMITS.MAX_PRICE_PERCENT_SHOCK) {
        errors.push(`${prefix}PERCENT shockValue (${shock.shockValue}) exceeds maximum limit (${SCENARIO_CONFIG.LIMITS.MAX_PRICE_PERCENT_SHOCK})`);
      }
    } else if (shock.shockUnit === ShockUnit.BPS) {
      if (shock.shockValue < SCENARIO_CONFIG.LIMITS.MIN_YIELD_BPS_SHOCK || shock.shockValue > SCENARIO_CONFIG.LIMITS.MAX_YIELD_BPS_SHOCK) {
        errors.push(`${prefix}BPS shockValue (${shock.shockValue}) out of bounds [${SCENARIO_CONFIG.LIMITS.MIN_YIELD_BPS_SHOCK}, ${SCENARIO_CONFIG.LIMITS.MAX_YIELD_BPS_SHOCK}]`);
      }
    } else if (shock.shockUnit === ShockUnit.MULTIPLIER) {
      if (shock.shockValue < 0) {
        errors.push(`${prefix}MULTIPLIER shockValue cannot be negative (${shock.shockValue})`);
      }
    }
  }

  if (shock.betaAdjusted !== undefined && typeof shock.betaAdjusted !== 'boolean') {
    errors.push(`${prefix}betaAdjusted if provided must be a boolean`);
  }

  if (shock.durationAdjusted !== undefined && typeof shock.durationAdjusted !== 'boolean') {
    errors.push(`${prefix}durationAdjusted if provided must be a boolean`);
  }

  return errors;
}

/**
 * Validates a complete scenario definition
 */
export function validateScenarioDefinition(scenarioDef) {
  const errors = [];

  if (!scenarioDef || typeof scenarioDef !== 'object') {
    throw new ScenarioValidationError('Scenario definition must be a valid non-null object');
  }

  if (typeof scenarioDef.name !== 'string' || scenarioDef.name.trim() === '') {
    errors.push('Scenario "name" is required and must be a non-empty string');
  }

  const validTypes = Object.values(ScenarioType);
  if (!scenarioDef.scenarioType || !validTypes.includes(scenarioDef.scenarioType)) {
    errors.push(`Invalid or missing "scenarioType". Must be one of: ${validTypes.join(', ')}`);
  }

  if (scenarioDef.horizon) {
    const validHorizons = Object.values(ScenarioHorizon);
    if (!validHorizons.includes(scenarioDef.horizon)) {
      errors.push(`Invalid "horizon". Must be one of: ${validHorizons.join(', ')}`);
    }
  }

  if (!Array.isArray(scenarioDef.shocks)) {
    errors.push('"shocks" must be an array');
  } else if (scenarioDef.shocks.length === 0) {
    errors.push('"shocks" array must contain at least one shock specification');
  } else {
    scenarioDef.shocks.forEach((shock, idx) => {
      const shockErrors = validateShock(shock, idx);
      errors.push(...shockErrors);
    });
  }

  if (errors.length > 0) {
    throw new ScenarioValidationError(`Scenario definition validation failed: ${errors.join('; ')}`, errors);
  }

  return true;
}

/**
 * Validates a reverse / break-even scenario request
 */
export function validateReverseScenarioRequest(request) {
  const errors = [];

  if (!request || typeof request !== 'object') {
    throw new ScenarioValidationError('Reverse scenario request must be a valid object');
  }

  const validMetrics = ['NAV_CHANGE_PERCENT', 'NAV_CHANGE_DOLLAR', 'MAX_DRAWDOWN_PERCENT', 'PORTFOLIO_VALUE', 'LIQUIDITY_COST_DOLLAR'];
  if (!request.targetMetric || !validMetrics.includes(request.targetMetric)) {
    errors.push(`Invalid or missing "targetMetric". Must be one of: ${validMetrics.join(', ')}`);
  }

  if (typeof request.targetValue !== 'number' || !Number.isFinite(request.targetValue)) {
    errors.push('"targetValue" must be a finite number');
  }

  if (!request.variableParameter || typeof request.variableParameter !== 'object') {
    errors.push('"variableParameter" must be an object specifying targetType, target, and shockUnit');
  } else {
    if (!request.variableParameter.targetType || typeof request.variableParameter.targetType !== 'string') {
      errors.push('variableParameter.targetType is required');
    }
    if (!request.variableParameter.target || typeof request.variableParameter.target !== 'string') {
      errors.push('variableParameter.target is required');
    }
    if (!request.variableParameter.shockUnit || !Object.values(ShockUnit).includes(request.variableParameter.shockUnit)) {
      errors.push('variableParameter.shockUnit must be a valid ShockUnit');
    }
  }

  if (request.solverMethod) {
    if (!Object.values(SolverMethod).includes(request.solverMethod)) {
      errors.push(`Invalid "solverMethod". Must be one of: ${Object.values(SolverMethod).join(', ')}`);
    }
  }

  if (request.minBound !== undefined && (typeof request.minBound !== 'number' || !Number.isFinite(request.minBound))) {
    errors.push('minBound must be a finite number if provided');
  }

  if (request.maxBound !== undefined && (typeof request.maxBound !== 'number' || !Number.isFinite(request.maxBound))) {
    errors.push('maxBound must be a finite number if provided');
  }

  if (request.minBound !== undefined && request.maxBound !== undefined && request.minBound >= request.maxBound) {
    errors.push(`minBound (${request.minBound}) must be strictly less than maxBound (${request.maxBound})`);
  }

  if (errors.length > 0) {
    throw new ScenarioValidationError(`Reverse scenario request validation failed: ${errors.join('; ')}`, errors);
  }

  return true;
}
