import crypto from 'crypto';
import { SignalRegime, DivergenceType, computeSignalHash, deepFreeze } from './signal.types.js';
import { defaultSignalStore } from './signal.store.js';

export class SignalIntelligenceBridges {
  constructor(store = defaultSignalStore) {
    this.store = store;
  }

  /**
   * Bridge 1: Research Synthesis Integration (Phase 24)
   * Formulates an explainable research product section from composite signals.
   */
  synthesizeResearchSignalSection(tenantId = 'tenant_default', compositeSignalId) {
    const comp = this.store.getEntityAsOf(tenantId, 'compositeSignals', compositeSignalId);
    if (!comp) throw new Error(`CompositeSignal ${compositeSignalId} not found`);

    return {
      sectionId: `synth_sig_${comp.compositeSignalId}`,
      entityId: comp.entityId,
      headline: `Signal Intelligence: ${comp.regime} (${comp.direction}) Score: ${comp.score}`,
      compositeScore: comp.score,
      regime: comp.regime,
      direction: comp.direction,
      confidence: comp.confidence,
      dominantFactors: comp.contributors.slice(0, 3).map(c => ({
        signalType: c.signalType,
        contribution: c.contribution,
        evidenceIds: c.evidenceIds
      })),
      hasConflicts: comp.hasConflict,
      divergencesCount: comp.divergences?.length || 0,
      divergences: comp.divergences || [],
      knowledgeCutoff: comp.knowledgeCutoff,
      provenanceLinkage: comp.contributors.flatMap(c => c.evidenceIds || [])
    };
  }

  /**
   * Bridge 2: Attention Engine Trigger (Phase 7)
   * Evaluates if signal conditions warrant high-priority attention alerts.
   */
  generateAttentionTriggers(tenantId = 'tenant_default', compositeSignalId) {
    const comp = this.store.getEntityAsOf(tenantId, 'compositeSignals', compositeSignalId);
    if (!comp) throw new Error(`CompositeSignal ${compositeSignalId} not found`);

    const triggers = [];

    // Trigger on Conflict
    if (comp.hasConflict) {
      triggers.push({
        triggerId: `att_conf_${comp.compositeSignalId}`,
        entityId: comp.entityId,
        attentionType: 'SIGNAL_CONFLICT_DETECTED',
        severity: 'MEDIUM',
        description: `Direct contradiction between fundamental and alternative/valuation signals for ${comp.entityId}`,
        compositeScore: comp.score,
        timestamp: new Date().toISOString()
      });
    }

    // Trigger on High Divergence
    if (comp.divergences && comp.divergences.length > 0) {
      for (const div of comp.divergences) {
        triggers.push({
          triggerId: `att_div_${div.divergenceId}`,
          entityId: comp.entityId,
          attentionType: 'SIGNAL_DIVERGENCE_ALERT',
          severity: div.severity,
          description: div.description,
          divergenceType: div.divergenceType,
          timestamp: new Date().toISOString()
        });
      }
    }

    return triggers;
  }

  /**
   * Bridge 3: Forecasting Comparison (Phase 20)
   * Compares forecast trajectory against composite signal direction.
   */
  compareForecastAlignment(tenantId = 'tenant_default', {
    entityId,
    compositeSignalId,
    forecastDirection // e.g. 'POSITIVE', 'NEGATIVE'
  }) {
    const comp = this.store.getEntityAsOf(tenantId, 'compositeSignals', compositeSignalId);
    if (!comp) throw new Error(`CompositeSignal ${compositeSignalId} not found`);

    const signalIsPositive = comp.score > 0.1;
    const signalIsNegative = comp.score < -0.1;
    const forecastIsPositive = forecastDirection === 'POSITIVE';
    const forecastIsNegative = forecastDirection === 'NEGATIVE';

    let alignmentStatus = 'ALIGNED';
    if ((signalIsPositive && forecastIsNegative) || (signalIsNegative && forecastIsPositive)) {
      alignmentStatus = 'FORECAST_SIGNAL_DIVERGENCE';
    } else if (comp.hasConflict) {
      alignmentStatus = 'MIXED_SIGNAL_ALIGNMENT';
    }

    return {
      entityId,
      compositeScore: comp.score,
      signalDirection: comp.direction,
      forecastDirection,
      alignmentStatus,
      isAligned: alignmentStatus === 'ALIGNED',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Bridge 4: Decision Intelligence Snapshot (Phase 13)
   * Immutable capture of signals at the exact decision moment.
   */
  createDecisionSignalSnapshot(tenantId = 'tenant_default', {
    decisionId,
    entityId,
    compositeSignalId,
    decisionType = 'HOLDING_INCREASE',
    analystRationale = ''
  }) {
    const comp = this.store.getEntityAsOf(tenantId, 'compositeSignals', compositeSignalId);
    if (!comp) throw new Error(`CompositeSignal ${compositeSignalId} not found`);

    const snapshotRecord = {
      decisionSnapshotId: `dec_snap_${crypto.randomBytes(8).toString('hex')}`,
      decisionId,
      entityId,
      decisionType,
      compositeSignalId: comp.compositeSignalId,
      score: comp.score,
      regime: comp.regime,
      direction: comp.direction,
      confidence: comp.confidence,
      contributorsCount: comp.contributors.length,
      analystRationale,
      capturedAt: new Date().toISOString(),
      knowledgeCutoff: comp.knowledgeCutoff,
      version: 1
    };

    return snapshotRecord;
  }
}

export const defaultSignalBridges = new SignalIntelligenceBridges();
