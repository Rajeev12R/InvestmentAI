import { RiskForecastBudgetEngine } from '../riskForecast/riskForecast.budget.engine.js';
import { RiskForecastLimitEngine } from '../riskForecast/riskForecast.limit.engine.js';
import { BudgetScope, BudgetUtilizationStatus, CompliancePrecedence, DataClassification } from '../riskForecast/riskForecast.types.js';

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  passed++;
}

console.log('--- SUITE 7: Dynamic Risk Budgeting, Limit Precedence & Breach Probability ---');

// 1. Single Risk Budget Evaluation
const budgetVol = {
  budgetId: 'RB_VOL_01',
  scope: BudgetScope.PORTFOLIO,
  metric: 'volatility',
  limit: 15.0,
  unit: '%'
};

const evalGreen = RiskForecastBudgetEngine.evaluateBudgetUtilization({
  budget: budgetVol,
  currentRiskValue: 10.0,
  forecastRiskValue: 11.0,
  stressRiskValue: 14.0
});
assert(evalGreen.overallStatus === BudgetUtilizationStatus.GREEN, '10% vol is GREEN (< 80% of 15% limit)');
assert(evalGreen.current.utilization === 10.0 / 15.0, 'Current utilization = 66.67%');

const evalAmber = RiskForecastBudgetEngine.evaluateBudgetUtilization({
  budget: budgetVol,
  currentRiskValue: 13.0,
  forecastRiskValue: 14.0,
  stressRiskValue: 18.0
});
assert(evalAmber.overallStatus === BudgetUtilizationStatus.AMBER, '13% vol is AMBER (>= 80% and < 100%)');

const evalRed = RiskForecastBudgetEngine.evaluateBudgetUtilization({
  budget: budgetVol,
  currentRiskValue: 16.5,
  forecastRiskValue: 17.0,
  stressRiskValue: 22.0
});
assert(evalRed.overallStatus === BudgetUtilizationStatus.RED, '16.5% vol is RED (>= 100% breach)');
assert(evalRed.current.isBreached === true, 'Current isBreached is true');

// 2. Multi-Scope Budget Suite Evaluation
const budgets = [
  { budgetId: 'B1', scope: BudgetScope.PORTFOLIO, metric: 'volatility', limit: 15.0 },
  { budgetId: 'B2', scope: BudgetScope.TRACKING_ERROR, metric: 'trackingError', limit: 4.0 },
  { budgetId: 'B3', scope: BudgetScope.FACTOR, metric: 'techFactorRisk', limit: 25.0 }
];

const riskMetrics = {
  volatility: 12.0,      // 80% -> AMBER
  trackingError: 2.5,   // 62.5% -> GREEN
  techFactorRisk: 28.0  // 112% -> RED
};

const suiteEval = RiskForecastBudgetEngine.evaluatePortfolioBudgets({ budgets, riskMetrics });
assert(suiteEval.budgetCount === 3, 'Evaluated 3 budgets');
assert(suiteEval.redCount === 1, '1 RED breach');
assert(suiteEval.amberCount === 1, '1 AMBER warning');
assert(suiteEval.greenCount === 1, '1 GREEN normal');
assert(suiteEval.hasBreaches === true, 'hasBreaches is true');

// 3. Compliance Limit Precedence Hierarchy
const limits = [
  { limitId: 'LIM_SOFT', precedence: CompliancePrecedence.SOFT, metric: 'leverage', threshold: 120.0 },
  { limitId: 'LIM_REG', precedence: CompliancePrecedence.REGULATORY, metric: 'leverage', threshold: 200.0 },
  { limitId: 'LIM_FIRM', precedence: CompliancePrecedence.FIRM, metric: 'leverage', threshold: 150.0 },
  { limitId: 'LIM_PORT', precedence: CompliancePrecedence.PORTFOLIO, metric: 'leverage', threshold: 130.0 }
];

const limitEval = RiskForecastLimitEngine.evaluateLimits({
  limits,
  riskValues: { leverage: 160.0 }
});

assert(limitEval.hasBreaches === true, 'Breaches detected');
assert(limitEval.breachCount === 3, '3 limits breached (SOFT, PORTFOLIO, FIRM)');
assert(limitEval.evaluations[0].precedence === CompliancePrecedence.REGULATORY, 'Sorted by precedence: REGULATORY evaluated first (Rank 1)');
assert(limitEval.evaluations[0].isBreached === false, 'REGULATORY limit (200) not breached');
assert(limitEval.evaluations[1].precedence === CompliancePrecedence.FIRM, 'FIRM evaluated second (Rank 2)');
assert(limitEval.evaluations[1].isBreached === true, 'FIRM limit (150) breached by 10');
assert(limitEval.highestPrecedenceBreach === CompliancePrecedence.FIRM, 'Highest precedence breach correctly identified as FIRM');

// 4. Mathematical Breach Probability
const probRes = RiskForecastLimitEngine.calculateBreachProbability({
  metricType: 'PORTFOLIO_LOSS',
  threshold: 0.05,
  forecastVolatility: 0.16,
  horizonDays: 20,
  sampleSize: 100
});

assert(probRes.classification === DataClassification.MODEL_ESTIMATE, 'Breach probability status is MODEL_ESTIMATE');
assert(probRes.breachProbability >= 0 && probRes.breachProbability <= 1.0, 'Breach probability is valid in [0, 1]');
assert(probRes.zScore < 0, 'z-score is negative for loss tail');

console.log(`PASSED: ${passed}`);
