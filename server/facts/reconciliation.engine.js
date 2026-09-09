/**
 * @file reconciliation.engine.js
 * Multi-Provider Fact Reconciliation Engine for Phase 11.
 * Harmonizes observations across providers, applies Tier hierarchy, and preserves rejected records.
 */

import { SourceTier } from '../connectivity/source.types.js';
import { FactStatus } from './fact.types.js';
import { periodIntegrityEngine } from './periodIntegrity.engine.js';

const TIER_AUTHORITY = {
  [SourceTier.TIER_1_PRIMARY]: 100,
  [SourceTier.TIER_2_REGULATED]: 80,
  [SourceTier.TIER_3_SECONDARY]: 50,
  [SourceTier.TIER_4_UNVERIFIED]: 10
};

class ReconciliationEngine {
  /**
   * Reconciles multiple provider observations for the same fundamental metric.
   */
  reconcileObservations(arg1, arg2, arg3, arg4) {
    let ticker = 'UNKNOWN';
    let metric = 'UNKNOWN';
    let period = 'FY2025';
    let observations = [];

    if (typeof arg1 === 'object' && arg1 !== null && !Array.isArray(arg1)) {
      metric = arg1.metric || 'UNKNOWN';
      observations = arg1.observations || [];
      ticker = arg1.ticker || 'UNKNOWN';
      period = arg1.period || 'FY2025';
    } else {
      ticker = arg1 || 'UNKNOWN';
      metric = arg2 || 'UNKNOWN';
      period = arg3 || 'FY2025';
      observations = Array.isArray(arg4) ? arg4 : (Array.isArray(arg2) ? arg2 : []);
    }

    // Cross-company poison check
    if (observations.length > 0) {
      const firstTicker = observations[0].ticker;
      if (firstTicker && observations.some(o => o.ticker && o.ticker.toUpperCase() !== firstTicker.toUpperCase())) {
        throw new Error(`Cross-company observation detected in reconciliation: ${observations.map(o => o.ticker).join(', ')}`);
      }
    }

    if (!observations || observations.length === 0) {
      return {
        status: FactStatus.UNAVAILABLE,
        selectedFact: null,
        value: null,
        rejectedObservations: [],
        reason: 'No provider observations available'
      };
    }

    if (observations.length === 1) {
      const single = observations[0];
      return {
        status: FactStatus.ACTIVE,
        selectedFact: single,
        value: single.value,
        selectedSourceTier: single.sourceTier,
        selectedSourceRecordId: single.sourceRecordId,
        sourceDocumentId: single.sourceDocumentId,
        evidenceId: single.evidenceId,
        rejectedObservations: [],
        reason: 'Single authoritative observation'
      };
    }

    // 1. Validate Period Consistency across observations
    const baseObs = observations[0];
    for (let i = 1; i < observations.length; i++) {
      const compat = periodIntegrityEngine.validatePeriodCompatibility(baseObs, observations[i]);
      if (!compat.compatible) {
        return {
          status: FactStatus.CONFLICT,
          selectedFact: null,
          rejectedObservations: observations,
          reason: `Observations have incompatible periods/units: ${compat.reason}`
        };
      }
    }

    // 2. Sort observations by Tier Authority (Descending), then Restated (true first), then Observed Date (newest first)
    const sorted = [...observations].sort((a, b) => {
      const authA = TIER_AUTHORITY[a.sourceTier] || 10;
      const authB = TIER_AUTHORITY[b.sourceTier] || 10;
      if (authB !== authA) return authB - authA;

      if (a.isRestated && !b.isRestated) return -1;
      if (!a.isRestated && b.isRestated) return 1;

      const timeA = new Date(a.observedAt || a.filingDate || 0).getTime();
      const timeB = new Date(b.observedAt || b.filingDate || 0).getTime();
      return timeB - timeA;
    });

    const topTier = sorted[0].sourceTier;
    const sameTierCandidates = sorted.filter(o => o.sourceTier === topTier);

    // 3. Same-tier divergence check -> Strict Anti-Averaging Invariant
    if (sameTierCandidates.length > 1) {
      const val0 = Number(sameTierCandidates[0].value);
      const isDivergent = sameTierCandidates.some(c => Number(c.value) !== val0);

      if (isDivergent) {
        // If one is explicitly a restatement, it takes precedence
        const restatements = sameTierCandidates.filter(c => c.isRestated);
        if (restatements.length === 1) {
          const selected = restatements[0];
          const rejected = sorted.filter(o => o !== selected);
          return {
            status: FactStatus.ACTIVE,
            selectedFact: selected,
            value: selected.value,
            selectedSourceTier: selected.sourceTier,
            selectedSourceRecordId: selected.sourceRecordId,
            sourceDocumentId: selected.sourceDocumentId,
            evidenceId: selected.evidenceId,
            rejectedObservations: rejected,
            reason: `Restatement from tier '${topTier}' takes precedence`
          };
        }

        // Irreconcilable same-tier conflict -> UNAVAILABLE. NEVER AVERAGE!
        return {
          status: FactStatus.UNAVAILABLE,
          selectedFact: null,
          value: null,
          rejectedObservations: sorted,
          reason: `Irreconcilable divergence in '${topTier}' for ${metric} (Averaging strictly prohibited, Anti-averaging enforced)`
        };
      }
    }

    const selected = sorted[0];
    const rejected = sorted.slice(1);

    return {
      status: FactStatus.ACTIVE,
      selectedFact: selected,
      value: selected.value,
      selectedSourceTier: selected.sourceTier,
      selectedSourceRecordId: selected.sourceRecordId,
      sourceDocumentId: selected.sourceDocumentId,
      evidenceId: selected.evidenceId,
      rejectedObservations: rejected,
      reason: `Tier-${selected.sourceTier === SourceTier.TIER_1_PRIMARY ? '1 Primary' : selected.sourceTier} authoritative source selected over lower-tier observations`
    };
  }

  getTierRank(tier) {
    return TIER_AUTHORITY[tier] || 10;
  }
}

export const reconciliationEngine = new ReconciliationEngine();
