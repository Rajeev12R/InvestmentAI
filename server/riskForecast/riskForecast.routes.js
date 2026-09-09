import express from 'express';
import { riskForecastRepository } from './riskForecast.repository.js';
import { RiskForecastEngine } from './riskForecast.forecast.engine.js';
import { RiskForecastBudgetEngine } from './riskForecast.budget.engine.js';
import { RiskForecastLimitEngine } from './riskForecast.limit.engine.js';
import { RiskForecastBacktestEngine } from './riskForecast.backtest.engine.js';
import { RiskForecastVaREngine } from './riskForecast.var.engine.js';
import { RiskForecastExpectedShortfallEngine } from './riskForecast.expectedShortfall.engine.js';
import { RiskForecastMarginalEngine } from './riskForecast.marginal.engine.js';
import { RiskForecastPackageBuilder } from './riskForecast.package.js';

const router = express.Router();

const getTenant = (req) => req.headers['x-tenant-id'] || req.query.tenantId || req.body?.tenantId || 'tenant_default';

/**
 * POST /api/risk-forecast/forecast
 */
router.post('/forecast', (req, res) => {
  try {
    const result = RiskForecastEngine.runComprehensiveForecast(req.body);
    res.json({ success: true, forecast: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/risk-forecast/var-es
 */
router.post('/var-es', (req, res) => {
  try {
    const { returns, portfolioVolatility, confidence, horizonDays, portfolioValue } = req.body;
    let histVaR = null;
    let histES = null;
    let paramVaR = null;

    if (returns && Array.isArray(returns)) {
      histVaR = RiskForecastVaREngine.calculateHistoricalVaR(returns, { confidence, horizonDays, portfolioValue });
      histES = RiskForecastExpectedShortfallEngine.calculateHistoricalExpectedShortfall(returns, { confidence, horizonDays, portfolioValue });
    }
    if (typeof portfolioVolatility === 'number') {
      paramVaR = RiskForecastVaREngine.calculateParametricVaR({ portfolioVolatility, confidence, horizonDays, portfolioValue });
    }

    res.json({ success: true, historicalVaR: histVaR, expectedShortfall: histES, parametricVaR: paramVaR });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/risk-forecast/marginal-risk
 */
router.post('/marginal-risk', (req, res) => {
  try {
    const result = RiskForecastMarginalEngine.decomposeMarginalRisk(req.body);
    res.json({ success: true, marginalRisk: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/risk-forecast/budget/evaluate
 */
router.post('/budget/evaluate', (req, res) => {
  try {
    const tenant = getTenant(req);
    const budgets = req.body.budgets || riskForecastRepository.getBudgets(tenant);
    const result = RiskForecastBudgetEngine.evaluatePortfolioBudgets({
      budgets,
      riskMetrics: req.body.riskMetrics,
      config: req.body.config
    });
    res.json({ success: true, budgetEvaluation: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/risk-forecast/budget/save
 */
router.post('/budget/save', (req, res) => {
  try {
    const tenant = getTenant(req);
    const userRole = req.headers['x-user-role'] || req.body?.userRole || 'VIEWER';
    
    // RBAC check: only RISK_MANAGER, PORTFOLIO_MANAGER, ADMIN can mutate risk budgets
    const allowedRoles = ['ADMIN', 'RISK_MANAGER', 'PORTFOLIO_MANAGER'];
    if (!allowedRoles.includes(userRole.toUpperCase())) {
      return res.status(403).json({
        success: false,
        error: `Unauthorized: role ${userRole} is not permitted to mutate risk budgets`
      });
    }

    const saved = riskForecastRepository.saveBudget(req.body.budget, req.headers['x-user-id'] || 'ANALYST', tenant);
    res.json({ success: true, budget: saved });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/risk-forecast/budget
 */
router.get('/budget', (req, res) => {
  try {
    const tenant = getTenant(req);
    const budgets = riskForecastRepository.getBudgets(tenant);
    res.json({ success: true, budgets });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/risk-forecast/limits/evaluate
 */
router.post('/limits/evaluate', (req, res) => {
  try {
    const result = RiskForecastLimitEngine.evaluateLimits(req.body);
    res.json({ success: true, limitEvaluation: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/risk-forecast/breach-probability
 */
router.post('/breach-probability', (req, res) => {
  try {
    const result = RiskForecastLimitEngine.calculateBreachProbability(req.body);
    res.json({ success: true, breachProbability: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/risk-forecast/backtest
 */
router.post('/backtest', (req, res) => {
  try {
    const { forecastVolatility, realizedVolatility, sampleSize, realizedReturns, varThresholdPercent, confidence } = req.body;
    let volEval = null;
    let varBacktest = null;

    if (typeof forecastVolatility === 'number' && typeof realizedVolatility === 'number') {
      volEval = RiskForecastBacktestEngine.evaluateVolatilityForecast({ forecastVolatility, realizedVolatility, sampleSize });
    }
    if (realizedReturns && varThresholdPercent) {
      varBacktest = RiskForecastBacktestEngine.backtestVaRExceptions({ realizedReturns, varThresholdPercent, confidence });
    }

    res.json({ success: true, volatilityBacktest: volEval, varBacktest });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/risk-forecast/package/seal
 */
router.post('/package/seal', (req, res) => {
  try {
    const tenant = getTenant(req);
    const pkg = RiskForecastPackageBuilder.sealPackage({
      ...req.body,
      tenantId: tenant
    });
    riskForecastRepository.savePackage(pkg, tenant);
    res.json({ success: true, package: pkg });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/risk-forecast/package/:packageId
 */
router.get('/package/:packageId', (req, res) => {
  try {
    const tenant = getTenant(req);
    const pkg = riskForecastRepository.getPackage(req.params.packageId, tenant);
    if (!pkg) {
      return res.status(404).json({ success: false, error: 'Package not found for tenant' });
    }
    res.json({ success: true, package: pkg });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/risk-forecast/package/verify
 */
router.post('/package/verify', (req, res) => {
  try {
    const result = RiskForecastPackageBuilder.verifyPackage(req.body.package);
    res.json({ success: true, verification: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/risk-forecast/audit-logs
 */
router.get('/audit-logs', (req, res) => {
  try {
    const tenant = getTenant(req);
    const logs = riskForecastRepository.getAuditLogs(tenant);
    res.json({ success: true, auditLogs: logs });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
