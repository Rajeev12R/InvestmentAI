/**
 * server/forecasting/forecast.package.js
 * 
 * Phase 20: Cryptographic Forecast Intelligence Package Sealing
 * Generates tamper-evident immutable sealed packages with SHA-256 verification.
 */

import { canonicalHash, deepFreeze } from './forecast.types.js';
import { FORECAST_CONFIG } from './forecast.config.js';

/**
 * Seals a forward-looking forecast intelligence package.
 */
export function sealForecastPackage(params) {
  if (!params || typeof params !== 'object') {
    throw new TypeError('sealForecastPackage requires params object');
  }

  const {
    tenantId,
    forecastRecord,
    assumptions,
    sealedBy = 'FORECAST_SYSTEM'
  } = params;

  if (!tenantId || typeof tenantId !== 'string') {
    throw new Error('tenantId is required for package sealing');
  }
  if (!forecastRecord || typeof forecastRecord !== 'object') {
    throw new Error('forecastRecord is required for package sealing');
  }

  const timestamp = new Date().toISOString();
  const dateStr = timestamp.slice(0, 10).replace(/-/g, '');

  const payloadToHash = {
    tenantId,
    forecastId: forecastRecord.forecastId,
    ticker: forecastRecord.ticker,
    metric: forecastRecord.metric,
    value: forecastRecord.value,
    horizon: forecastRecord.horizon,
    assumptions: assumptions || forecastRecord.assumptions || null,
    sealedBy,
    timestamp
  };

  const fullHash = canonicalHash(payloadToHash);
  const sealId = `${FORECAST_CONFIG.SEAL_PREFIX}${dateStr}-${fullHash.slice(0, 16).toUpperCase()}`;

  const sealedPackage = {
    sealId,
    schemaVersion: FORECAST_CONFIG.PACKAGE_SCHEMA_VERSION,
    engineVersion: FORECAST_CONFIG.ENGINE_VERSION,
    tenantId,
    forecastId: forecastRecord.forecastId,
    ticker: forecastRecord.ticker,
    metric: forecastRecord.metric,
    value: forecastRecord.value,
    horizon: forecastRecord.horizon,
    sealedBy,
    timestamp,
    canonicalHash: fullHash,
    forecastRecord,
    assumptions: assumptions || forecastRecord.assumptions || null,
    verification: {
      isSealed: true,
      algorithm: 'SHA-256',
      tamperEvident: true
    }
  };

  return deepFreeze(sealedPackage);
}

/**
 * Verifies integrity of a sealed forecast package
 */
export function verifyForecastPackage(sealedPackage) {
  if (!sealedPackage || typeof sealedPackage !== 'object') {
    return { valid: false, error: 'Package must be a non-null object' };
  }

  if (!sealedPackage.sealId || !sealedPackage.canonicalHash || !sealedPackage.verification?.isSealed) {
    return { valid: false, error: 'Package missing required sealing metadata' };
  }

  const payloadToHash = {
    tenantId: sealedPackage.tenantId,
    forecastId: sealedPackage.forecastId,
    ticker: sealedPackage.ticker,
    metric: sealedPackage.metric,
    value: sealedPackage.value,
    horizon: sealedPackage.horizon,
    assumptions: sealedPackage.assumptions || null,
    sealedBy: sealedPackage.sealedBy,
    timestamp: sealedPackage.timestamp
  };

  const recomputedHash = canonicalHash(payloadToHash);
  const isValid = recomputedHash === sealedPackage.canonicalHash;

  return {
    valid: isValid,
    sealId: sealedPackage.sealId,
    storedHash: sealedPackage.canonicalHash,
    recomputedHash,
    timestamp: sealedPackage.timestamp
  };
}
