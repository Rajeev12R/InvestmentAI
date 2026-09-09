/**
 * @file job.worker.js
 * Ingestion Worker Architecture for Phase 9 Institutional Processing.
 */

import { jobQueue } from './job.queue.js';
import { JobType } from './job.types.js';
import { IngestionEngine } from '../ingestion/ingestion.engine.js';
import { generateAttentionPackage } from '../attention/attention.engine.js';
import { workspaceStorage } from '../storage/workspace.storage.js';
import { auditRepository } from '../governance/audit.repository.js';

const ingestionEngine = new IngestionEngine();

export class IngestionWorker {
  constructor(queue = jobQueue) {
    this.queue = queue;
    this.isRunning = false;
    this._registerHandlers();
  }

  _registerHandlers() {
    // 1. Ticker Ingestion Worker
    this.queue.registerHandler(JobType.INGESTION_TICKER, async (payload, context) => {
      const { ticker, source = 'YAHOO_FINANCE', rawPayload = {} } = payload;
      if (!ticker) throw new Error('ticker is required for ingestion job');

      const result = await ingestionEngine.ingestExternalEvent({
        workspaceId: context.workspaceId,
        ticker,
        source,
        rawPayload
      });

      auditRepository.appendEvent({
        workspaceId: context.workspaceId,
        actorId: 'WORKER-INGESTION',
        actorType: 'WORKER',
        action: 'ingestion.triggered',
        resourceType: 'TICKER_INGESTION',
        resourceId: ticker,
        result: 'SUCCESS',
        metadata: {
          ticker,
          status: result.status,
          jobId: context.jobId
        }
      });

      return result;
    });

    // 2. Attention Sweep Worker
    this.queue.registerHandler(JobType.ATTENTION_SWEEP, async (payload, context) => {
      const state = workspaceStorage.getWorkspace(context.workspaceId);
      const watchlist = state?.watchlist || [];
      const companyTransitions = watchlist.map(item => {
        const ticker = typeof item === 'string' ? item : item.ticker;
        return { ticker };
      });

      const pkg = generateAttentionPackage({
        workspaceId: context.workspaceId,
        companyTransitions
      });

      return { sweptTickers: watchlist.length, attentionPackageHash: pkg.packageHash };
    });
  }

  async runOnce() {
    return await this.queue.processNextJob();
  }

  async drainQueue() {
    let processed = 0;
    while (this.queue.queue.length > 0) {
      const job = await this.queue.processNextJob();
      if (job) processed++;
      else break;
    }
    return processed;
  }
}

export const ingestionWorker = new IngestionWorker();
