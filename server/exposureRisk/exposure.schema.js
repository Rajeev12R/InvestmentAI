import {
  ExposureStatus,
  ExposureSourceTier,
  ExposureClassification,
  FactorCategory,
  RiskMethodology,
  BreachPrecedenceLevel,
  BreachStatus,
  ExposureChangeType,
  CommonDriverType
} from './exposure.types.js';

export class ExposureRiskValidationError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.name = 'ExposureRiskValidationError';
    this.errors = errors;
  }
}

/**
 * Validate ExposureObservation schema
 */
export function validateExposureObservation(obs) {
  const errors = [];
  if (!obs || typeof obs !== 'object') throw new ExposureRiskValidationError('ExposureObservation must be an object');
  if (!obs.observationId) errors.push('observationId is required');
  if (!obs.entityId && !obs.portfolioId) errors.push('entityId or portfolioId is required');
  if (!obs.factorId && !obs.dimension) errors.push('factorId or dimension is required');
  if (obs.exposureValue === undefined || isNaN(obs.exposureValue)) errors.push('valid exposureValue is required');

  if (errors.length > 0) {
    throw new ExposureRiskValidationError(`Invalid ExposureObservation: ${errors.join(', ')}`, errors);
  }
  return true;
}

/**
 * Validate FactorDefinition schema
 */
export function validateFactorDefinition(fact) {
  const errors = [];
  if (!fact || typeof fact !== 'object') throw new ExposureRiskValidationError('FactorDefinition must be an object');
  if (!fact.factorId) errors.push('factorId is required');
  if (!fact.name) errors.push('name is required');
  if (!fact.category || !Object.values(FactorCategory).includes(fact.category)) {
    errors.push('valid FactorCategory is required');
  }

  if (errors.length > 0) {
    throw new ExposureRiskValidationError(`Invalid FactorDefinition: ${errors.join(', ')}`, errors);
  }
  return true;
}

/**
 * Validate PortfolioExposure schema
 */
export function validatePortfolioExposure(portExp) {
  const errors = [];
  if (!portExp || typeof portExp !== 'object') throw new ExposureRiskValidationError('PortfolioExposure must be an object');
  if (!portExp.portfolioExposureId) errors.push('portfolioExposureId is required');
  if (!portExp.portfolioId) errors.push('portfolioId is required');
  if (portExp.grossExposure === undefined || isNaN(portExp.grossExposure)) errors.push('valid grossExposure is required');
  if (portExp.netExposure === undefined || isNaN(portExp.netExposure)) errors.push('valid netExposure is required');

  if (errors.length > 0) {
    throw new ExposureRiskValidationError(`Invalid PortfolioExposure: ${errors.join(', ')}`, errors);
  }
  return true;
}

/**
 * Validate RiskDecomposition schema
 */
export function validateRiskDecomposition(risk) {
  const errors = [];
  if (!risk || typeof risk !== 'object') throw new ExposureRiskValidationError('RiskDecomposition must be an object');
  if (!risk.riskDecompId) errors.push('riskDecompId is required');
  if (risk.totalVolatility === undefined || isNaN(risk.totalVolatility)) errors.push('valid totalVolatility is required');
  if (!risk.componentRiskContributions || typeof risk.componentRiskContributions !== 'object') {
    errors.push('componentRiskContributions object is required');
  }

  if (errors.length > 0) {
    throw new ExposureRiskValidationError(`Invalid RiskDecomposition: ${errors.join(', ')}`, errors);
  }
  return true;
}

/**
 * Validate CommonDriver schema
 */
export function validateCommonDriver(driver) {
  const errors = [];
  if (!driver || typeof driver !== 'object') throw new ExposureRiskValidationError('CommonDriver must be an object');
  if (!driver.driverId) errors.push('driverId is required');
  if (!driver.driverType || !Object.values(CommonDriverType).includes(driver.driverType)) {
    errors.push('valid CommonDriverType is required');
  }
  if (!Array.isArray(driver.affectedSecurities) || driver.affectedSecurities.length === 0) {
    errors.push('affectedSecurities array is required');
  }

  if (errors.length > 0) {
    throw new ExposureRiskValidationError(`Invalid CommonDriver: ${errors.join(', ')}`, errors);
  }
  return true;
}

/**
 * Validate HiddenConcentration schema
 */
export function validateHiddenConcentration(conc) {
  const errors = [];
  if (!conc || typeof conc !== 'object') throw new ExposureRiskValidationError('HiddenConcentration must be an object');
  if (!conc.concentrationId) errors.push('concentrationId is required');
  if (conc.securityHHI === undefined || isNaN(conc.securityHHI)) errors.push('valid securityHHI is required');

  if (errors.length > 0) {
    throw new ExposureRiskValidationError(`Invalid HiddenConcentration: ${errors.join(', ')}`, errors);
  }
  return true;
}

/**
 * Validate ExposureLimit schema
 */
export function validateExposureLimit(limit) {
  const errors = [];
  if (!limit || typeof limit !== 'object') throw new ExposureRiskValidationError('ExposureLimit must be an object');
  if (!limit.limitId) errors.push('limitId is required');
  if (!limit.dimension) errors.push('dimension is required');
  if (limit.maxLimit === undefined || isNaN(limit.maxLimit)) errors.push('valid maxLimit is required');
  if (!limit.precedence || !Object.values(BreachPrecedenceLevel).includes(limit.precedence)) {
    errors.push('valid BreachPrecedenceLevel is required');
  }

  if (errors.length > 0) {
    throw new ExposureRiskValidationError(`Invalid ExposureLimit: ${errors.join(', ')}`, errors);
  }
  return true;
}

/**
 * Validate ExposureBreach schema
 */
export function validateExposureBreach(breach) {
  const errors = [];
  if (!breach || typeof breach !== 'object') throw new ExposureRiskValidationError('ExposureBreach must be an object');
  if (!breach.breachId) errors.push('breachId is required');
  if (!breach.limitId) errors.push('limitId is required');
  if (!breach.status || !Object.values(BreachStatus).includes(breach.status)) {
    errors.push('valid BreachStatus is required');
  }

  if (errors.length > 0) {
    throw new ExposureRiskValidationError(`Invalid ExposureBreach: ${errors.join(', ')}`, errors);
  }
  return true;
}

/**
 * Validate ExposureChange schema
 */
export function validateExposureChange(change) {
  const errors = [];
  if (!change || typeof change !== 'object') throw new ExposureRiskValidationError('ExposureChange must be an object');
  if (!change.changeId) errors.push('changeId is required');
  if (!change.changeType || !Object.values(ExposureChangeType).includes(change.changeType)) {
    errors.push('valid ExposureChangeType is required');
  }

  if (errors.length > 0) {
    throw new ExposureRiskValidationError(`Invalid ExposureChange: ${errors.join(', ')}`, errors);
  }
  return true;
}

/**
 * Validate ExposureRiskPackage schema
 */
export function validateExposureRiskPackage(pkg) {
  const errors = [];
  if (!pkg || typeof pkg !== 'object') throw new ExposureRiskValidationError('ExposureRiskPackage must be an object');
  if (!pkg.packageId) errors.push('packageId is required');
  if (!pkg.portfolioId) errors.push('portfolioId is required');
  if (!pkg.explanationDAG || !Array.isArray(pkg.explanationDAG.nodes)) {
    errors.push('valid explanationDAG with nodes array is required');
  }

  if (errors.length > 0) {
    throw new ExposureRiskValidationError(`Invalid ExposureRiskPackage: ${errors.join(', ')}`, errors);
  }
  return true;
}
