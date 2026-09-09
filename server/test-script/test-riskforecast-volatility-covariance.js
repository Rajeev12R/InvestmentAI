import { RiskForecastVolatilityEngine } from '../riskForecast/riskForecast.volatility.engine.js';
import { RiskForecastCovarianceEngine } from '../riskForecast/riskForecast.covariance.engine.js';
import { RiskForecastValidation } from '../riskForecast/riskForecast.validation.js';
import { DataClassification, VolatilityModel, CovarianceModel, CovarianceRepairMethod } from '../riskForecast/riskForecast.types.js';

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  passed++;
}

console.log('--- SUITE 3: Deterministic Volatility & Covariance Forecasting Engines ---');

// 1. Historical Volatility Calculation
const sampleReturns = [0.01, -0.02, 0.015, -0.005, 0.02, -0.01, 0.005, 0.012, -0.018, 0.008, 0.014, -0.006]; // N = 12
const histVol = RiskForecastVolatilityEngine.calculateHistoricalVolatility(sampleReturns, { minObservations: 10, periodsPerYear: 252 });

assert(histVol.status === DataClassification.DERIVED, 'Historical vol status is DERIVED');
assert(histVol.sampleSize === 12, 'Sample size is 12');
assert(histVol.periodVolatility > 0, 'Period vol is positive');
assert(Math.abs(histVol.annualizedVolatility - histVol.periodVolatility * Math.sqrt(252)) < 1e-10, 'Explicit annualization matches formula');

// 2. Insufficient Observations for Volatility
const shortReturns = [0.01, 0.02];
const shortVol = RiskForecastVolatilityEngine.calculateHistoricalVolatility(shortReturns, { minObservations: 10 });
assert(shortVol.status === DataClassification.UNAVAILABLE, 'Fails closed on insufficient data (UNAVAILABLE)');

// 3. EWMA Volatility Calculation
const ewmaVol = RiskForecastVolatilityEngine.calculateEWMAVolatility(sampleReturns, { lambda: 0.94, minObservations: 10, periodsPerYear: 252 });
assert(ewmaVol.status === DataClassification.MODEL_ESTIMATE, 'EWMA vol status is MODEL_ESTIMATE');
assert(ewmaVol.lambda === 0.94, 'Lambda is explicitly recorded');
assert(ewmaVol.annualizedVolatility > 0, 'EWMA annualized vol is positive');

// 4. Volatility Forecast by Horizon
const horizonVols = RiskForecastVolatilityEngine.forecastVolatilityByHorizon(sampleReturns, { minObservations: 10 });
assert(horizonVols.classification === DataClassification.FORECAST, 'Classification is FORECAST');
assert(horizonVols.horizonForecasts['1D'].days === 1, '1D horizon present');
assert(horizonVols.horizonForecasts['20D'].days === 20, '20D horizon present');
assert(Math.abs(horizonVols.horizonForecasts['20D'].volatility - horizonVols.periodVolatility * Math.sqrt(20)) < 1e-10, '20D vol scaled by sqrt(20)');

// 5. Historical Covariance Estimation
const multiAssetReturns = [
  [0.01, -0.02, 0.015, -0.005, 0.02, -0.01, 0.005, 0.012, -0.018, 0.008, 0.014, -0.006, 0.002, 0.011, -0.009, 0.004],
  [0.008, -0.015, 0.012, -0.003, 0.018, -0.008, 0.004, 0.010, -0.014, 0.006, 0.011, -0.004, 0.001, 0.009, -0.007, 0.003],
  [-0.005, 0.010, -0.008, 0.002, -0.012, 0.006, -0.003, -0.007, 0.011, -0.004, -0.008, 0.003, -0.001, -0.006, 0.005, -0.002]
]; // 3 assets, 16 observations
const symbols = ['AAPL', 'MSFT', 'TLT'];

const covRes = RiskForecastCovarianceEngine.calculateHistoricalCovariance(multiAssetReturns, symbols, { minObservations: 15 });
assert(covRes.status === DataClassification.DERIVED, 'Covariance calculation successful (DERIVED)');
assert(covRes.assetCount === 3, 'Asset count is 3');
assert(covRes.covarianceMatrix.length === 3 && covRes.covarianceMatrix[0].length === 3, '3x3 matrix');
assert(covRes.quality.positiveSemidefinite === true, 'Matrix is positive semidefinite');
assert(covRes.quality.positiveDefinite === true, 'Matrix is positive definite');
assert(covRes.quality.conditionNumber > 0, 'Condition number is calculated');

// 6. EWMA Covariance Estimation
const ewmaCovRes = RiskForecastCovarianceEngine.calculateEWMACovariance(multiAssetReturns, symbols, { lambda: 0.94, minObservations: 15 });
assert(ewmaCovRes.model === CovarianceModel.EWMA, 'EWMA model recorded');
assert(ewmaCovRes.quality.positiveSemidefinite === true, 'EWMA covariance is positive semidefinite');

// 7. Non-PSD Matrix Detection & Eigenvalue Clipping Repair
const nonPsdMatrix = [
  [1.0, 0.9, 0.9],
  [0.9, 1.0, 0.9],
  [0.9, 0.9, 0.1] // deliberately non-PSD
];

const rawQuality = RiskForecastValidation.assessCovarianceQuality(nonPsdMatrix);
assert(rawQuality.positiveSemidefinite === false, 'Detects non-PSD matrix');
assert(rawQuality.minimumEigenvalue < 0, 'Minimum eigenvalue is negative');

const repairedCov = RiskForecastCovarianceEngine.processCovarianceQualityAndRepair(
  nonPsdMatrix,
  ['A', 'B', 'C'],
  20,
  { repairMethod: CovarianceRepairMethod.EIGENVALUE_CLIPPING, eigenvalueFloor: 1e-5 }
);

assert(repairedCov.repairApplied === true, 'Repair was applied');
assert(repairedCov.repairMethod === CovarianceRepairMethod.EIGENVALUE_CLIPPING, 'Repair method recorded');
assert(repairedCov.quality.positiveSemidefinite === true, 'Repaired matrix is now positive semidefinite');
assert(repairedCov.originalMatrix !== null, 'Original matrix preserved for institutional audit');

// 8. Shrinkage Repair
const shrunkCov = RiskForecastCovarianceEngine.processCovarianceQualityAndRepair(
  nonPsdMatrix,
  ['A', 'B', 'C'],
  20,
  { repairMethod: CovarianceRepairMethod.SHRINKAGE_LEDROIT_WOLF, shrinkageAlpha: 0.20 }
);
assert(shrunkCov.repairApplied === true, 'Shrinkage repair applied');
assert(shrunkCov.repairMethod === CovarianceRepairMethod.SHRINKAGE_LEDROIT_WOLF, 'Shrinkage repair method recorded');

console.log(`PASSED: ${passed}`);
