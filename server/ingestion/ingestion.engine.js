import { rawEventStore } from './rawEventStore.js';
import { normalizeSourceEvent } from './eventNormalizer.js';
import { eventDeduplicator } from './eventDeduplicator.js';
import { analyzeEventImpact } from './eventImpact.engine.js';
import { applyFactUpdatesToTruthPackage } from './factUpdate.engine.js';
import { workspaceEngine } from '../workspace/workspace.engine.js';
import { workspaceRepository } from '../workspace/workspace.repository.js';
import { ingestionCache } from './ingestionCache.js';
import { ingestionScheduler } from './ingestionScheduler.js';
import { createTimelineEvent } from '../workspace/workspaceTimeline.engine.js';
import { TIMELINE_EVENT_TYPES, EVENT_SEVERITY } from '../workspace/workspace.types.js';

export class IngestionEngine {
  /**
   * Ingests an external source payload for a company.
   *
   * @param {Object} params
   * @param {string} params.workspaceId - Workspace ID
   * @param {string} params.ticker - Company Ticker
   * @param {string} params.source - Data Provider / Source
   * @param {string} [params.publishedAt] - Publication Date
   * @param {Object} params.rawPayload - Raw external payload
   * @param {Object} [params.currentTruthPackage] - Current sealed Truth Package (optional)
   * @returns {Object} Complete ingestion pipeline outcome
   */
  async ingestExternalEvent({
    workspaceId = 'default',
    ticker,
    company = '',
    source,
    sourceId = '',
    sourceUrl = '',
    publishedAt,
    rawPayload = {},
    currentTruthPackage = null
  }) {
    if (!ticker) throw new Error('Ticker is required for event ingestion');

    const upperTicker = ticker.toUpperCase();
    ingestionScheduler.logStatus(`INGESTION_STARTED for ${upperTicker}`, { source });

    // 1. Store Raw Record (Immutable + SHA-256 contentHash)
    const rawRecord = rawEventStore.storeRawRecord({
      ticker: upperTicker,
      company,
      sourceType: source,
      sourceId,
      sourceUrl,
      publishedAt,
      rawPayload
    });

    // 2. Normalize and Validate Source Event
    const normalizedEvent = normalizeSourceEvent(rawRecord);

    if (normalizedEvent.validationStatus === 'REJECTED') {
      ingestionScheduler.logStatus(`SOURCE_REJECTED for ${upperTicker}`, { reasons: normalizedEvent.validationReasons });
      return {
        stage: 'VALIDATION',
        success: false,
        status: 'REJECTED',
        event: normalizedEvent,
        reasons: normalizedEvent.validationReasons
      };
    }

    // 3. Deduplicate and Conflict Resolution
    const dedupResult = eventDeduplicator.processEvent(normalizedEvent);
    if (dedupResult.isDuplicate && dedupResult.role === 'DUPLICATE') {
      ingestionScheduler.logStatus(`EVENT_DEDUPLICATED (Exact Duplicate) for ${upperTicker}`, { eventId: normalizedEvent.eventId });
      return {
        stage: 'DEDUPLICATION',
        success: true,
        status: 'DUPLICATE_SKIPPED',
        event: dedupResult.resolvedEvent
      };
    }

    const resolvedEvent = dedupResult.resolvedEvent;

    // 4. Deterministic Event Impact Analysis
    const eventImpact = analyzeEventImpact(resolvedEvent);

    // 5. Check if Truth Package update is needed
    // Fetch latest truth package from workspace if not supplied
    let activeTruthPackage = currentTruthPackage;
    if (!activeTruthPackage) {
      const latestSnapshot = workspaceRepository.getLatestSnapshot(workspaceId, upperTicker);
      if (latestSnapshot) {
        // Construct truth package mock matching snapshot
        activeTruthPackage = {
          company: { ticker: upperTicker, name: resolvedEvent.company, currentPrice: latestSnapshot.marketState?.currentPrice },
          financialFacts: Object.entries(latestSnapshot.financialState || {}).map(([k, v]) => ({ id: `financial.${k}`, value: v })),
          calculatedMetrics: [],
          valuationModels: { dcf: { fairValue: latestSnapshot.valuationState?.dcfFairValue } },
          riskSignals: latestSnapshot.riskState,
          decision: latestSnapshot.decisionState,
          integrity: { packageHash: latestSnapshot.truthPackageHash, valid: true, version: latestSnapshot.truthPackageVersion }
        };
      }
    }

    if (!activeTruthPackage) {
      // If no baseline truth package exists yet, record event in timeline
      workspaceRepository.saveTimelineEvent(createTimelineEvent({
        workspaceId,
        ticker: upperTicker,
        type: TIMELINE_EVENT_TYPES.MATERIAL_CHANGE,
        severity: EVENT_SEVERITY.INFO,
        title: resolvedEvent.title,
        summary: resolvedEvent.summary,
        impact: eventImpact.deterministicReasons.join(' '),
        evidenceIds: resolvedEvent.evidenceIds
      }));

      return {
        stage: 'COMPLETED',
        success: true,
        status: 'EVENT_LOGGED_NO_BASELINE',
        event: resolvedEvent,
        impact: eventImpact
      };
    }

    // 6. Apply Fact Updates to Truth Package
    const updateResult = applyFactUpdatesToTruthPackage({
      previousTruthPackage: activeTruthPackage,
      event: resolvedEvent
    });

    if (!updateResult.hasTruthChanges) {
      // Record event in timeline without creating redundant snapshot
      workspaceRepository.saveTimelineEvent(createTimelineEvent({
        workspaceId,
        ticker: upperTicker,
        type: TIMELINE_EVENT_TYPES.MATERIAL_CHANGE,
        severity: EVENT_SEVERITY.LOW,
        title: resolvedEvent.title,
        summary: `${resolvedEvent.summary} (No material truth change)`,
        impact: updateResult.reason,
        evidenceIds: resolvedEvent.evidenceIds
      }));

      return {
        stage: 'COMPLETED',
        success: true,
        status: 'EVENT_PROCESSED_NO_TRUTH_CHANGE',
        event: resolvedEvent,
        impact: eventImpact,
        reason: updateResult.reason
      };
    }

    // 7. Ingest New Resealed Truth Package into Workspace -> Generates Snapshot Tn, runs Phase 5 Change Engine & Alerts
    const workspaceOutcome = workspaceEngine.ingestTruthPackage(workspaceId, updateResult.updatedTruthPackage);

    if (workspaceOutcome.snapshot) {
      workspaceOutcome.snapshot.rawEventHash = rawRecord.contentHash;
      workspaceOutcome.snapshot.integrityHash = updateResult.updatedTruthPackage.integrity.packageHash || workspaceOutcome.snapshot.snapshotHash;
    }

    // 8. Invalidate Downstream Caches
    ingestionCache.invalidateDownstreamCaches(upperTicker, updateResult.updatedTruthPackage.integrity.packageHash);

    ingestionScheduler.logStatus(`INGESTION_COMPLETED for ${upperTicker}`, {
      snapshotId: workspaceOutcome.snapshot?.snapshotId,
      packageHash: updateResult.updatedTruthPackage.integrity.packageHash
    });

    return {
      stage: 'COMPLETED',
      success: true,
      status: 'SNAPSHOT_MINTED',
      event: resolvedEvent,
      impact: eventImpact,
      factUpdates: updateResult.candidates,
      snapshot: workspaceOutcome.snapshot,
      changeReport: workspaceOutcome.changeReport,
      alerts: workspaceOutcome.alerts
    };
  }
}


export const ingestionEngine = new IngestionEngine();
