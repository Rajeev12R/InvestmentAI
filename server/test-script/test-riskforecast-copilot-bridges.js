import { riskForecastTools } from '../riskForecast/riskForecast.tool.js';
import { RiskForecastBridges } from '../riskForecast/riskForecast.bridges.js';
import { riskForecastRepository } from '../riskForecast/riskForecast.repository.js';
import { DataClassification, CompliancePrecedence } from '../riskForecast/riskForecast.types.js';

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  passed++;
}

console.log('--- SUITE 12: Read-Only Copilot Inspection Tools & Inter-Phase Bridges ---');

const symbols = ['AAPL', 'MSFT'];
const weights = [0.6, 0.4];
const covMatrix = [
  [0.000400, 0.000100],
  [0.000100, 0.000250]
];

// 1. Tool 1: Inspect Portfolio Risk Forecast
const t1 = await riskForecastTools.tool_get_portfolio_risk_forecast({ symbols, weights, covarianceMatrix: covMatrix });
assert(t1.portfolioVolatility > 0, 'Tool 1 returns portfolio volatility');

// 2. Tool 2: Inspect Risk Budgets
const t2 = await riskForecastTools.tool_get_risk_budget({
  budgets: [{ budgetId: 'B1', scope: 'PORTFOLIO', metric: 'volatility', limit: 20.0 }],
  riskMetrics: { volatility: 15.0 }
});
assert(t2.budgetCount === 1, 'Tool 2 returns budget evaluation');

// 3. Tool 3: Inspect Risk Contributors
const t3 = await riskForecastTools.tool_get_risk_contributors({ symbols, weights, covarianceMatrix: covMatrix });
assert(t3.marginalRiskDecomposition.assetContributions.length === 2, 'Tool 3 returns asset contributions');

// 4. Tool 4: Inspect Tail Risk
const t4 = await riskForecastTools.tool_get_tail_risk({ symbols, weights, covarianceMatrix: covMatrix });
assert(t4.horizons['20D'].parametricVaR !== null, 'Tool 4 returns tail risk horizons');

// 5. Tool 5: Inspect Risk Limit Utilization
const t5 = await riskForecastTools.tool_get_risk_limit_utilization({
  limits: [{ limitId: 'L1', precedence: CompliancePrecedence.FIRM, metric: 'vol', threshold: 20.0 }],
  riskValues: { vol: 18.0 }
});
assert(t5.limitCount === 1, 'Tool 5 returns limit evaluations');

// 6. Tool 6: Compare Risk Forecasts
const t6 = await riskForecastTools.tool_compare_risk_forecasts({ forecastVolatility: 0.15, realizedVolatility: 0.16 });
assert(Math.abs(t6.forecastError - 0.01) < 1e-6, 'Tool 6 compares forecast vs realized');

// 7. Tool 7: Model Health
const t7 = await riskForecastTools.tool_get_risk_model_health({ observationCount: 252, assetCount: 2 });
assert(t7.healthState === 'VALID', 'Tool 7 returns model health');

// 8. Tool 8: Explanation DAG
const t8 = await riskForecastTools.tool_get_risk_forecast_explanation({
  portfolioSnapshotId: 'PS_01',
  forecastResult: t1
});
assert(t8.nodes.length >= 2, 'Tool 8 returns explanation DAG');

// 9. Tool 9: Multi-Horizon Risk
const t9 = await riskForecastTools.tool_get_multi_horizon_risk({ symbols, weights, covarianceMatrix: covMatrix });
assert(t9['252D'] !== undefined, 'Tool 9 returns 252D forecast');

// 10. Tool 10: Factor Risk Forecast
const t10 = await riskForecastTools.tool_get_factor_risk_forecast({
  symbols,
  weights,
  covarianceMatrix: covMatrix,
  factorExposures: { MKT: 1.0 },
  factorCovarianceMatrix: [[0.0003]]
});
assert(t10.factorVolatility > 0, 'Tool 10 returns factor risk');

// 11. Tool 11: Breach Probability
const t11 = await riskForecastTools.tool_get_breach_probability({
  metric: 'vol',
  currentValue: 14.0,
  threshold: 16.0,
  forecastVolatility: 14.5
});
assert(t11.breachProbability >= 0, 'Tool 11 returns breach probability');

// 12. Tool 12: Forecast Backtest
const t12 = await riskForecastTools.tool_get_forecast_backtest({
  realizedReturns: [-0.01, -0.02, 0.01, 0.02, -0.03, 0.01, 0.02, -0.01, 0.00, 0.01, -0.02, 0.01, 0.02, -0.01, 0.01, 0.02],
  varThresholdPercent: 0.015,
  confidence: 0.95
});
assert(t12.status === DataClassification.DERIVED, 'Tool 12 returns backtest results');

// 13 & 14. Tool 13 & 14: Sealed Package & Verification
const sealed = await riskForecastTools.tool_verify_risk_package_integrity({
  sealedPackage: { packageId: 'P1', hash: 'dummy' }
});
assert(sealed.isValid === false, 'Tool 14 correctly rejects invalid dummy package');

// 15. Inter-Phase Bridges
const b30 = RiskForecastBridges.bridgeFromPhase30Exposure({ factorExposures: { MKT: 1.1 } });
assert(b30.factorExposures.MKT === 1.1, 'Phase 30 Exposure Bridge connected');

const b22 = RiskForecastBridges.bridgeFromPhase22Macro({ currentRegime: 'STRESS', volatilityMultiplier: 1.5 });
assert(b22.regime === 'STRESS' && b22.multiplier === 1.5, 'Phase 22 Macro Bridge connected');

const b18 = RiskForecastBridges.bridgeFromPhase18Liquidity({ weightedSpreadBps: 25 });
assert(b18.costBps === 25, 'Phase 18 Liquidity Bridge connected');

const b17 = RiskForecastBridges.bridgeFromPhase17Tax({ blendedTaxRate: 0.22 });
assert(b17.effectiveTaxRate === 0.22, 'Phase 17 Tax Bridge connected');

const b16 = RiskForecastBridges.bridgeToPhase16Compliance(t5);
assert(b16.complianceStatus === 'COMPLIANT', 'Phase 16 Compliance Bridge connected');

console.log(`PASSED: ${passed}`);
