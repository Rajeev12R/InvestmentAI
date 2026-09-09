/**
 * server/test-script/test-riskattribution-copilot-bridges.js
 * 
 * Phase 32 — Suite 12: Read-Only Copilot Inspection Tools & Inter-Phase Integration Bridges
 */

import { riskAttributionTools } from '../riskAttribution/riskAttribution.tool.js';
import { RiskAttributionBridges } from '../riskAttribution/riskAttribution.bridges.js';
import { RiskAttributionEngine } from '../riskAttribution/riskAttribution.engine.js';
import { ConfidenceStatus } from '../riskAttribution/riskAttribution.types.js';

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  passed++;
}

console.log('--- SUITE 12: Read-Only Copilot Tools & Inter-Phase Integration Bridges ---');

const symbols = ['MSFT', 'GOOGL', 'AMZN'];
const weights = [0.4, 0.3, 0.3];
const cov = [
  [0.04, 0.02, 0.015],
  [0.02, 0.05, 0.020],
  [0.015, 0.02, 0.060]
];
const sectors = { MSFT: 'Technology', GOOGL: 'Communication Services', AMZN: 'Consumer Discretionary' };

// 1. Tool: tool_get_portfolio_risk_attribution
const t1 = await riskAttributionTools.tool_get_portfolio_risk_attribution({ symbols, weights, covarianceMatrix: cov, sectors });
assert(t1.portfolioMetrics.portfolioVolatility > 0, 'tool_get_portfolio_risk_attribution returns portfolio volatility');

// 2. Tool: tool_get_top_risk_contributors
const t2 = await riskAttributionTools.tool_get_top_risk_contributors({ symbols, weights, covarianceMatrix: cov, sectors, topN: 2 });
assert(t2.topPositions.length === 2, 'tool_get_top_risk_contributors returns top 2 positions');
assert(t2.topPositions[0].componentRiskContribution >= t2.topPositions[1].componentRiskContribution, 'Top positions sorted descending by CRC');

// 3. Tool: tool_explain_risk_driver
const t3 = await riskAttributionTools.tool_explain_risk_driver({ symbols, weights, covarianceMatrix: cov, sectors });
assert(t3.narrative.summary !== undefined, 'tool_explain_risk_driver returns structured narrative');

// 4. Tool: tool_get_sector_risk_attribution
const t4 = await riskAttributionTools.tool_get_sector_risk_attribution({ symbols, weights, covarianceMatrix: cov, sectors });
assert(t4.sectors.groups.length === 3, 'tool_get_sector_risk_attribution returns sector groups');

// 5. Tool: tool_get_concentration_vs_correlation_risk
const t5 = await riskAttributionTools.tool_get_concentration_vs_correlation_risk({ symbols, weights, covarianceMatrix: cov });
assert(t5.concentration.weightHHI > 0 && t5.correlation.diversificationRatio > 1, 'Concentration and correlation tools return valid metrics');

// 6. Tool: tool_get_stress_risk_attribution
const t6 = await riskAttributionTools.tool_get_stress_risk_attribution({ symbols, weights, covarianceMatrix: cov });
assert(t6.stressAttribution.scenarios.length >= 4, 'Stress scenarios returned');

// 7. Tool: tool_what_if_remove_position
const t7 = await riskAttributionTools.tool_what_if_remove_position({ symbols, weights, covarianceMatrix: cov, removeSymbol: 'AMZN', sectors });
assert(t7.removedSymbol === 'AMZN', 'what-if removed symbol matches');
assert(t7.rebalancedAttribution.positions.length === 2, 'Rebalanced portfolio has 2 remaining assets');
assert(t7.rebalancedVolatility > 0, 'Rebalanced volatility computed');

// 8. Tool: tool_get_attribution_dag
const t8 = await riskAttributionTools.tool_get_attribution_dag({ symbols, weights, covarianceMatrix: cov, sectors });
assert(t8.nodes.length >= 4, 'DAG nodes returned');

// 9. Inter-Phase Bridge: Phase 31 Risk Forecast Cross-Validation
const forecastMock = { portfolioVolatility: t1.portfolioMetrics.portfolioVolatility };
const bridge31 = RiskAttributionBridges.bridgeWithRiskForecast(forecastMock, t1);
assert(bridge31.isConsistent === true, 'Phase 31 bridge confirms volatility consistency');

// 10. Inter-Phase Bridge: Phase 16 Compliance Limits
const limitsMock = [
  { id: 'RULE-CONC-35', type: 'MAX_PERCENTAGE_RISK_CONTRIBUTION', threshold: 0.35 }
];
const bridge16 = RiskAttributionBridges.bridgeWithComplianceLimits(limitsMock, t1);
assert(typeof bridge16.hasBreaches === 'boolean', 'Phase 16 bridge checks limits breaches');

console.log(`PASSED: ${passed}`);
