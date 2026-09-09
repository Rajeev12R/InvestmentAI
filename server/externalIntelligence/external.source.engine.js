import crypto from 'crypto';
import {
  SourceType,
  VerificationStatus,
  ObservationClass,
  computeExternalHash,
  deepFreeze
} from './external.types.js';
import { defaultExternalStore } from './external.store.js';

export class ExternalSourceEngine {
  constructor(store = defaultExternalStore) {
    this.store = store;
  }

  /**
   * Register a new external source
   */
  registerSource(tenantId = 'tenant_default', {
    sourceId,
    sourceType,
    publisher,
    canonicalName,
    domain = '',
    sourceTier = 'TIER_3', // TIER_1 (Regulatory/Primary), TIER_2 (Audited Vendor), TIER_3 (News/Web)
    verificationStatus = VerificationStatus.UNVERIFIED,
    licensing = {}
  }) {
    if (!sourceType || !publisher || !canonicalName) {
      throw new Error('registerSource requires sourceType, publisher, and canonicalName');
    }

    const id = sourceId || `src_${crypto.randomBytes(8).toString('hex')}`;
    const sourceRecord = {
      sourceId: id,
      sourceType,
      publisher,
      canonicalName,
      domain,
      sourceTier,
      verificationStatus,
      verificationEvidence: null,
      verifiedAt: null,
      licensing: {
        licenseId: licensing.licenseId || 'OPEN_PUBLIC',
        allowedUsage: licensing.allowedUsage || ['RESEARCH', 'DERIVED_MODELS'],
        redistributionRestricted: licensing.redistributionRestricted || false
      },
      registeredAt: new Date().toISOString(),
      version: 1
    };

    return this.store.saveSource(tenantId, sourceRecord);
  }

  /**
   * Promote source verification with explicit verification evidence
   */
  verifySource(tenantId = 'tenant_default', sourceId, {
    verificationStatus,
    verificationMethod, // e.g. 'SEC_REGULATORY_DIRECTORY', 'PRIMARY_DOMAIN_DNS_CERT', 'VENDOR_AUDITED_CONTRACT'
    verificationEvidence,
    verifierId
  }) {
    const existing = this.store.getEntityAsOf(tenantId, 'sources', sourceId);
    if (!existing) throw new Error(`Source ${sourceId} not found`);

    if (![VerificationStatus.VERIFIED_PRIMARY, VerificationStatus.VERIFIED_REGULATORY, VerificationStatus.VERIFIED_VENDOR].includes(verificationStatus)) {
      throw new Error(`Invalid target verification status: ${verificationStatus}`);
    }

    if (existing.verificationStatus === VerificationStatus.REVOKED) {
      if (!verificationEvidence || !verificationEvidence.includes('EXPLICIT_REINSTATEMENT_AUDIT')) {
        throw new Error('Revoked source cannot silently return to VERIFIED without explicit reinstatement audit evidence');
      }
    }

    if (!verificationEvidence || typeof verificationEvidence !== 'string' || verificationEvidence.trim().length === 0) {
      throw new Error('Verification evidence is mandatory. Cannot verify source by URL or hash presence alone.');
    }

    const updated = {
      ...existing,
      verificationStatus,
      verificationMethod,
      verificationEvidence,
      verifiedAt: new Date().toISOString(),
      verifiedBy: verifierId || 'SYSTEM_VERIFIER',
      version: (existing.version || 1) + 1
    };

    return this.store.saveSource(tenantId, updated);
  }

  /**
   * Revoke a previously registered/verified source
   */
  revokeSource(tenantId = 'tenant_default', sourceId, {
    revocationReason,
    revokedBy
  }) {
    const existing = this.store.getEntityAsOf(tenantId, 'sources', sourceId);
    if (!existing) throw new Error(`Source ${sourceId} not found`);

    const updated = {
      ...existing,
      verificationStatus: VerificationStatus.REVOKED,
      revocationReason: revocationReason || 'Unreliable or fraudulent source',
      revokedAt: new Date().toISOString(),
      revokedBy: revokedBy || 'ADMIN',
      version: (existing.version || 1) + 1
    };

    const savedSource = this.store.saveSource(tenantId, updated);

    // Identify affected observations and mark them as REVOKED/INVALIDATED without deleting
    const affectedObservations = this.store.listEntities(tenantId, 'observations', obs => obs.sourceId === sourceId);
    for (const obs of affectedObservations) {
      this.store.saveObservation(tenantId, {
        ...obs,
        observationClass: ObservationClass.REVOKED,
        corroborationState: 'INVALIDATED',
        status: 'REVOKED',
        revokedAt: new Date().toISOString(),
        revocationReason: revocationReason || 'Source revoked',
        version: (obs.version || 1) + 1
      });
    }

    return {
      revokedSource: savedSource,
      affectedObservationsCount: affectedObservations.length,
      affectedObservationIds: affectedObservations.map(o => o.observationId),
      requiresWorkflowReview: affectedObservations.length > 0
    };
  }
}

export const defaultSourceEngine = new ExternalSourceEngine();
