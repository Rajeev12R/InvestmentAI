import crypto from 'crypto';
import { CorroborationState, ObservationClass, computeExternalHash } from './external.types.js';
import { defaultExternalStore } from './external.store.js';

export class ExternalCorroborationEngine {
  constructor(store = defaultExternalStore) {
    this.store = store;
  }

  /**
   * Evaluate Corroboration across a set of observations
   */
  evaluateCorroboration(tenantId = 'tenant_default', {
    subjectId,
    observationIds = [],
    tolerancePct = 0.05
  }) {
    if (!observationIds || observationIds.length === 0) {
      return {
        state: CorroborationState.UNCORROBORATED,
        isCorroborated: false,
        independentSourcesCount: 0,
        observationsCount: 0,
        hasConflicts: false
      };
    }

    const observations = observationIds.map(id => this.store.getEntityAsOf(tenantId, 'observations', id)).filter(Boolean);
    if (observations.length === 0) {
      return {
        state: CorroborationState.UNCORROBORATED,
        isCorroborated: false,
        independentSourcesCount: 0,
        observationsCount: 0,
        hasConflicts: false
      };
    }

    if (observations.length === 1) {
      const src = this.store.getEntityAsOf(tenantId, 'sources', observations[0].sourceId);
      const isPrimary = src && (src.verificationStatus === 'VERIFIED_PRIMARY' || src.sourceType === 'COMPANY_PRIMARY');
      return {
        state: isPrimary ? CorroborationState.PRIMARY_CORROBORATED : CorroborationState.SINGLE_SOURCE,
        isCorroborated: isPrimary,
        independentSourcesCount: 1,
        observationsCount: 1,
        hasConflicts: false
      };
    }

    // Check for Syndication & Duplicate Wire Copy
    // Identify distinct original sources / publishers
    const distinctPublishers = new Set();
    const distinctContentHashes = new Set();
    let hasPrimary = false;

    for (const obs of observations) {
      const src = this.store.getEntityAsOf(tenantId, 'sources', obs.sourceId);
      if (src) {
        // If article cites an original wire (e.g., 'REUTERS_WIRE'), use wire source for independence
        const effectivePublisher = obs.payload?.originalWireSource || src.publisher || src.sourceId;
        distinctPublishers.add(effectivePublisher);
        if (src.verificationStatus === 'VERIFIED_PRIMARY' || src.sourceType === 'COMPANY_PRIMARY') {
          hasPrimary = true;
        }
      }
      const rawArt = this.store.getEntityAsOf(tenantId, 'rawArtifacts', obs.artifactId);
      if (rawArt) {
        distinctContentHashes.add(rawArt.rawContentHash);
      }
    }

    // Check for Direct Numerical or Directional Conflicts
    let hasConflicts = false;
    const values = observations.map(o => o.payload?.numericValue).filter(v => typeof v === 'number');
    if (values.length >= 2) {
      const minVal = Math.min(...values);
      const maxVal = Math.max(...values);
      if (minVal !== 0 && (maxVal - minVal) / Math.abs(minVal) > tolerancePct) {
        hasConflicts = true;
      }
    }

    const directions = observations.map(o => o.payload?.direction).filter(Boolean);
    if (directions.includes('POSITIVE') && directions.includes('NEGATIVE')) {
      hasConflicts = true;
    }

    let state = CorroborationState.UNCORROBORATED;
    if (hasConflicts) {
      state = CorroborationState.CONFLICTED;
    } else if (hasPrimary) {
      state = CorroborationState.PRIMARY_CORROBORATED;
    } else if (distinctPublishers.size > 1 && distinctContentHashes.size > 1) {
      state = CorroborationState.MULTI_SOURCE;
    } else {
      state = CorroborationState.SINGLE_SOURCE; // Syndicated copies collapse to SINGLE_SOURCE
    }

    const corroborationId = `corr_${crypto.randomBytes(8).toString('hex')}`;
    const corrRecord = {
      corroborationId,
      subjectId,
      observationIds,
      state,
      isCorroborated: state === CorroborationState.PRIMARY_CORROBORATED || state === CorroborationState.MULTI_SOURCE,
      independentSourcesCount: distinctPublishers.size,
      distinctContentHashesCount: distinctContentHashes.size,
      hasConflicts,
      evaluatedAt: new Date().toISOString()
    };

    this.store.saveCorroboration(tenantId, corrRecord);
    return corrRecord;
  }
}

export const defaultCorroborationEngine = new ExternalCorroborationEngine();
