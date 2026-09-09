/**
 * @file productionIngestion.orchestrator.js
 * Master Ingestion Orchestrator for Phase 10.
 * Coordinates prioritized jobs across market data, fundamentals, filings, news, and FX.
 */

import crypto from 'crypto';
import { jobQueue } from '../jobs/job.queue.js';
import { idempotencyEngine } from '../jobs/idempotency.engine.js';
import { marketDataAdapter } from './adapters/marketData.adapter.js';
import { fundamentalDataAdapter } from './adapters/fundamentalData.adapter.js';
import { filingAdapter } from './adapters/filing.adapter.js';
import { corporateActionAdapter } from './adapters/corporateAction.adapter.js';
import { newsAdapter } from './adapters/news.adapter.js';
import { fxAdapter } from './adapters/fx.adapter.js';
import { macroDataAdapter } from './adapters/macroData.adapter.js';
import { dataLineageEngine } from './dataLineage.engine.js';
import { auditRepository } from '../governance/audit.repository.js';

export class ProductionIngestionOrchestrator {
  constructor() {
    this._registerOrchestratorHandlers();
  }

  _registerOrchestratorHandlers() {
    // 1. Market Refresh Job
    jobQueue.registerHandler('MARKET_REFRESH', async (payload, ctx) => {
      const { ticker } = payload;
      const quote = await marketDataAdapter.getQuote(ticker);
      return { ticker, quote };
    });

    // 2. Fundamental Refresh Job
    jobQueue.registerHandler('FUNDAMENTAL_REFRESH', async (payload, ctx) => {
      const { ticker, period } = payload;
      const fundamentals = await fundamentalDataAdapter.getFundamentals(ticker, { period });
      
      // Record lineage for primary metric (Revenue)
      if (fundamentals.metrics?.revenue) {
        dataLineageEngine.recordLineage({
          ticker,
          metric: 'REVENUE',
          period: period || 'FY2025',
          displayedValue: fundamentals.metrics.revenue,
          providerId: fundamentals.sourceId,
          rawRecordId: fundamentals.sourceRecordId,
          packageHash: fundamentals.contentHash
        });
      }

      return { ticker, fundamentals };
    });

    // 3. Filing Scan Job
    jobQueue.registerHandler('FILING_SCAN', async (payload, ctx) => {
      const { ticker, documentType } = payload;
      const filings = await filingAdapter.getFilings(ticker, { documentType });
      return { ticker, filings };
    });

    // 4. Corporate Action Scan Job
    jobQueue.registerHandler('CORPORATE_ACTION_SCAN', async (payload, ctx) => {
      const { ticker } = payload;
      const actions = await corporateActionAdapter.getCorporateActions(ticker);
      return { ticker, actions };
    });

    // 5. News Scan Job
    jobQueue.registerHandler('NEWS_SCAN', async (payload, ctx) => {
      const { ticker } = payload;
      const news = await newsAdapter.getNews(ticker);
      return { ticker, news };
    });

    // 6. FX Refresh Job
    jobQueue.registerHandler('FX_REFRESH', async (payload, ctx) => {
      const { base, quote } = payload;
      const rate = await fxAdapter.getFXRate(base, quote);
      return { base, quote, rate };
    });

    // 7. Macro Refresh Job
    jobQueue.registerHandler('MACRO_REFRESH', async (payload, ctx) => {
      const { seriesId } = payload;
      const macro = await macroDataAdapter.getMacroSeries(seriesId);
      return { seriesId, macro };
    });
  }

  async scheduleIngestionJob({
    jobType,
    workspaceId = 'default',
    payload = {},
    priority = 'NORMAL',
    actorId = 'SYSTEM'
  }) {
    const idemKey = idempotencyEngine.generateKey({
      workspaceId,
      sourceId: jobType,
      sourceRecordHash: JSON.stringify(payload),
      eventType: 'INGESTION_ORCHESTRATION',
      reportingPeriod: payload.period || 'LATEST'
    });

    const job = jobQueue.enqueueJob({
      type: jobType,
      workspaceId,
      payload,
      idempotencyKey: idemKey,
      priority,
      maxRetries: 3
    });

    auditRepository.appendEvent({
      workspaceId,
      actorId,
      actorType: 'USER',
      action: 'ingestion.triggered',
      resourceType: 'INGESTION_JOB',
      resourceId: job.jobId || 'JOB_ENQUEUED',
      result: 'SUCCESS',
      metadata: { jobType, priority, ticker: payload.ticker }
    });

    return job;
  }

  normalizeEvent(rawEvent = {}) {
    const rawPayload = JSON.stringify(rawEvent);
    const eventHash = crypto.createHash('sha256').update(rawPayload).digest('hex');
    const eventId = `EVT-${eventHash.slice(0, 16)}`;
    return {
      eventId,
      sourceId: rawEvent.sourceId || 'SRC-UNSPECIFIED',
      symbol: rawEvent.symbol || rawEvent.ticker || 'UNKNOWN',
      dataType: rawEvent.dataType || 'UNKNOWN',
      timestamp: rawEvent.timestamp || Date.now(),
      data: rawEvent.data || {},
      normalizedAt: new Date().toISOString()
    };
  }

  dispatchJob({ type, priority = 'NORMAL', payload = {} }) {
    const jobId = `JOB-${crypto.randomUUID().slice(0, 8)}`;
    return {
      jobId,
      type,
      priority,
      payload,
      status: 'QUEUED',
      enqueuedAt: new Date().toISOString()
    };
  }
}

export const productionIngestionOrchestrator = new ProductionIngestionOrchestrator();
