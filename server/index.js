import "dotenv/config";
import express from "express";
import cors from "cors";
import { testGemini } from "./test-script/geminiTest.js";
import { analyzecontroller } from "./controllers/analyzeController.js";
import { compareController } from "./controllers/compareController.js";
import { getMarketTickers } from "./controllers/marketController.js";
import workspaceRoutes from "./routes/workspace.routes.js";
import ingestionRoutes from "./routes/ingestion.routes.js";
import attentionRoutes from "./routes/attention.routes.js";
import portfolioIntelligenceRoutes from "./routes/portfolioIntelligence.routes.js";
import operationsRoutes from "./routes/operations.routes.js";
import copilotRoutes from "./routes/copilot.routes.js";

import authRoutes from "./routes/auth.routes.js";
import organizationRoutes from "./routes/organization.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import governanceRoutes from "./routes/governance.routes.js";
import jobsRoutes from "./routes/jobs.routes.js";
import connectivityRoutes from "./routes/connectivity.routes.js";
import infraRoutes from "./routes/infra.routes.js";
import factQualityRoutes from "./routes/factQuality.routes.js";
import portfolioAnalyticsRoutes from "./routes/portfolioAnalytics.routes.js";
import processIntelligenceRoutes from "./routes/processIntelligence.routes.js";
import portfolioConstructionRoutes from "./routes/portfolioConstruction.routes.js";
import implementationRoutes from "./routes/implementation.routes.js";
import complianceRoutes from "./routes/compliance.routes.js";
import taxRoutes from "./routes/tax.routes.js";
import liquidityRoutes from "./routes/liquidity.routes.js";
import scenarioRoutes from "./routes/scenario.routes.js";
import forecastRoutes from "./routes/forecast.routes.js";
import earningsRoutes from "./routes/earnings.routes.js";
import macroRoutes from "./routes/macro.routes.js";
import knowledgeGraphRoutes from "./routes/knowledgeGraph.routes.js";
import researchSynthesisRoutes from "./routes/researchSynthesis.routes.js";
import researchWorkflowRoutes from "./routes/researchWorkflow.routes.js";
import externalIntelligenceRoutes from "./routes/externalIntelligence.routes.js";
import signalIntelligenceRoutes from "./routes/signalIntelligence.routes.js";
import alphaAttributionRoutes from "./routes/alphaAttribution.routes.js";
import performanceSkillRoutes from "./routes/performanceSkill.routes.js";
import exposureRiskRoutes from "./routes/exposureRisk.routes.js";
import riskForecastRoutes from "./routes/riskForecast.routes.js";
import riskAttributionRoutes from "./routes/riskAttribution.routes.js";
import portfolioOptimizationRoutes from "./routes/portfolioOptimization.routes.js";
import portfolioRoutes from "./routes/portfolio.routes.js";
import decisionWorkbenchRoutes from "./routes/decisionWorkbench.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import alertRoutes from "./alerts/alert.routes.js";
import reportRoutes from "./reporting/report.routes.js";
import { authenticate } from "./auth/auth.middleware.js";
import { observabilityService } from "./infrastructure/observability.service.js";
import { initializePersistence, closePersistence} from './infrastructure/persistence/index.js';
import { assertProductionConfig, config} from './infrastructure/config.js';
  
import { researchQuestionController, researchReportController } from "./controllers/researchController.js";

const app = express();
const port = process.env.PORT || 3000;

app.use(observabilityService.middleware());
app.use(express.json());
app.use(authenticate);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const allowedOrigins = [
            "https://investment-ai-gray.vercel.app",
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:3000"
        ];
        if (
            allowedOrigins.includes(origin) ||
            /^http:\/\/localhost(:\d+)?$/.test(origin) ||
            /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin) ||
            origin.endsWith(".vercel.app")
        ) {
            callback(null, true);
        } else {
            callback(null, true);
        }
    },
    credentials: true
}));

assertProductionConfig();

app.get('/health', (req, res) => res.json(observabilityService.getLiveness()));
app.get('/ready', (req, res) => {
    const r = observabilityService.getReadiness();
    res.status(r.status === 'READY' ? 200 : 503).json(r);
});
app.get('/metrics', (req, res) => res.json(observabilityService.getMetrics()));

app.get('/api/test', testGemini);
app.get('/api/market/ticker', getMarketTickers);
app.post('/api/analyze', analyzecontroller);
app.post('/api/compare', compareController);
app.post('/api/research/question', researchQuestionController);
app.get('/api/research/:ticker', researchReportController);

app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/governance', governanceRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/connectivity', connectivityRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/ingestion', ingestionRoutes);
app.use('/api/attention', attentionRoutes);
app.use('/api/portfolio-intelligence', portfolioIntelligenceRoutes);
app.use('/api/operations', operationsRoutes);
app.use('/api/copilot', copilotRoutes);
app.use('/api/quality', factQualityRoutes);
app.use('/api/facts', factQualityRoutes);
app.use('/api/portfolio-analytics', portfolioAnalyticsRoutes);
app.use('/api/process', processIntelligenceRoutes);
app.use('/api/portfolio-construction', portfolioConstructionRoutes);
app.use('/api/implementation', implementationRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/tax', taxRoutes);
app.use('/api/liquidity', liquidityRoutes);
app.use('/api/scenario', scenarioRoutes);
app.use('/api/forecast', forecastRoutes);
app.use('/api/earnings', earningsRoutes);
app.use('/api/macro', macroRoutes);
app.use('/api/knowledge-graph', knowledgeGraphRoutes);
app.use('/api/research-synthesis', researchSynthesisRoutes);
app.use('/api/research-workflow', researchWorkflowRoutes);
app.use('/api/external-intelligence', externalIntelligenceRoutes);
app.use('/api/signal-intelligence', signalIntelligenceRoutes);
app.use('/api/alpha-attribution', alphaAttributionRoutes);
app.use('/api/performance-skill', performanceSkillRoutes);
app.use('/api/exposure-risk', exposureRiskRoutes);
app.use('/api/risk-forecast', riskForecastRoutes);
app.use('/api/risk-attribution', riskAttributionRoutes);
app.use('/api/portfolio-optimization', portfolioOptimizationRoutes);
app.use('/api/portfolios', portfolioRoutes);
app.use('/api/decisions', decisionWorkbenchRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/reports', reportRoutes);

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, async () => {
        await initializePersistence();
        console.log(`Server Started at port: ${port}`);
    });
}

const shutdown = async (signal) => {
    console.log(
      `[InvestmentAI] ${signal} received. Shutting down...`
    );
  
    try {
      await closePersistence();
    } finally {
      process.exit(0);
    }
  };
  
  process.once(
    'SIGTERM',
    () => shutdown('SIGTERM')
  );
  
  process.once(
    'SIGINT',
    () => shutdown('SIGINT')
  );

export default app;


