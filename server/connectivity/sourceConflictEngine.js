/**
 * @file sourceConflictEngine.js
 * Multi-Tier Source Conflict Resolution Engine for Phase 10.
 * Strictly resolves discrepancies without averaging authoritative numbers.
 */

import { SourceTier } from './source.types.js';

const TIER_WEIGHTS = {
  [SourceTier.TIER_1_PRIMARY]: 100,
  [SourceTier.TIER_2_REGULATED]: 80,
  [SourceTier.TIER_3_SECONDARY]: 50,
  [SourceTier.TIER_4_UNVERIFIED]: 10
};

export class SourceConflictEngine {
  resolveConflict(arg1, arg2) {
    let metric = 'UNKNOWN';
    let candidates = [];

    if (Array.isArray(arg1)) {
      candidates = arg1;
      metric = arg2 || 'UNKNOWN';
    } else if (arg1 && typeof arg1 === 'object') {
      metric = arg1.metric || 'UNKNOWN';
      candidates = arg1.candidates || [];
    }

    if (!candidates || candidates.length === 0) {
      return { status: 'UNAVAILABLE', selectedFact: null, selectedValue: null, rejectedFacts: [], reason: 'No fact candidates available' };
    }

    // Normalizing candidate format (infer tier from sourceRegistry if missing)
    candidates = candidates.map(c => {
      let sourceTier = c.sourceTier;
      if (!sourceTier && c.sourceId) {
        if (c.sourceId === 'SRC-SEC-EDGAR' || c.sourceId === 'SRC-NSE-BSE-INDIA') {
          sourceTier = SourceTier.TIER_1_PRIMARY;
        } else if (c.sourceId === 'SRC-FRED-MACRO' || c.sourceId === 'SRC-ECB-FX') {
          sourceTier = SourceTier.TIER_2_REGULATED;
        } else if (c.sourceId === 'SRC-YAHOO-FINANCE' || c.sourceId === 'SRC-GNEWS-FEED') {
          sourceTier = SourceTier.TIER_3_SECONDARY;
        } else {
          sourceTier = SourceTier.TIER_4_UNVERIFIED;
        }
      }
      return {
        ...c,
        sourceTier: sourceTier || SourceTier.TIER_4_UNVERIFIED
      };
    });

    if (candidates.length === 1) {
      return {
        status: 'RESOLVED',
        selectedFact: candidates[0],
        selectedValue: candidates[0].value,
        rejectedFacts: [],
        reason: 'Single source candidate'
      };
    }

    // 1. Group by Period
    const periods = new Set(candidates.map(c => c.period || 'LATEST'));
    if (periods.size > 1) {
      return {
        status: 'CONFLICTING',
        selectedFact: null,
        rejectedFacts: candidates,
        reason: `Period mismatch among candidates (${Array.from(periods).join(', ')})`
      };
    }

    // 2. Sort candidates by Tier Weight (Descending), then Restated (True first), then Timestamp (Newest first)
    const sorted = [...candidates].sort((a, b) => {
      const weightA = TIER_WEIGHTS[a.sourceTier] || 0;
      const weightB = TIER_WEIGHTS[b.sourceTier] || 0;
      if (weightB !== weightA) return weightB - weightA;

      // Prefer restated facts from same tier
      if (a.isRestated && !b.isRestated) return -1;
      if (!a.isRestated && b.isRestated) return 1;

      // Prefer newer publication timestamp
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return timeB - timeA;
    });

    const highestTier = sorted[0].sourceTier;
    const sameTierTopCandidates = sorted.filter(c => c.sourceTier === highestTier);

    // If top tier has multiple candidates with divergent values
    if (sameTierTopCandidates.length > 1) {
      const val0 = Number(sameTierTopCandidates[0].value);
      const isDivergent = sameTierTopCandidates.some(c => Number(c.value) !== val0);

      if (isDivergent) {
        // If one is explicitly a restatement, it wins
        const restatements = sameTierTopCandidates.filter(c => c.isRestated);
        if (restatements.length === 1) {
          const selected = restatements[0];
          const rejected = sorted.filter(c => c !== selected);
          return {
            status: 'RESOLVED',
            selectedFact: selected,
            selectedValue: selected.value,
            rejectedFacts: rejected,
            reason: `Restatement from tier '${highestTier}' takes precedence`
          };
        }

        // Irreconcilable same-tier conflict -> UNAVAILABLE / CONFLICTING. NEVER AVERAGE!
        return {
          status: 'UNAVAILABLE',
          selectedFact: null,
          selectedValue: null,
          rejectedFacts: sorted,
          reason: `Irreconcilable divergence in '${highestTier}' for metric ${metric} (Averaging prohibited)`
        };
      }
    }

    const selected = sorted[0];
    const rejected = sorted.slice(1);

    return {
      status: 'RESOLVED',
      selectedFact: selected,
      selectedValue: selected.value,
      rejectedFacts: rejected,
      reason: `Selected authoritative tier '${selected.sourceTier}' over lower tiers`
    };
  }
}

export const sourceConflictEngine = new SourceConflictEngine();
