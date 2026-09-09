import { ObservationClass, computeExternalHash } from './external.types.js';
import { defaultExternalStore } from './external.store.js';

export class ExternalIntelligenceBridges {
  constructor(store = defaultExternalStore) {
    this.store = store;
  }

  /**
   * Bridge 1: Knowledge Graph (Phase 23) Candidate Edge Integration
   * External relationships enter as UNVERIFIED_EXTERNAL or VALIDATED_EXTERNAL candidate edges.
   */
  createKnowledgeGraphEdgeCandidate(tenantId = 'tenant_default', {
    sourceEntityId,
    targetEntityId,
    relationshipType = 'SUPPLIES_TO', // 'SUPPLIES_TO', 'CUSTOMER_OF', 'COMPETES_WITH'
    observationId,
    confidence = 0.8
  }) {
    const obs = this.store.getEntityAsOf(tenantId, 'observations', observationId);
    if (!obs) throw new Error(`Observation ${observationId} not found`);

    const edgeCandidate = {
      candidateEdgeId: `kg_cand_${sourceEntityId}_${targetEntityId}_${relationshipType}`,
      sourceEntityId,
      targetEntityId,
      relationshipType,
      status: obs.observationClass === ObservationClass.VERIFIED_PRIMARY ? 'VALIDATED_EXTERNAL' : 'UNVERIFIED_EXTERNAL',
      evidenceIds: [obs.evidenceId],
      confidence,
      observationId,
      createdAt: new Date().toISOString()
    };

    return edgeCandidate;
  }

  /**
   * Bridge 2: Research Synthesis (Phase 24) Claim Integration
   * Converts external observation into a synthesis claim object with clear classification.
   */
  synthesizeExternalClaim(tenantId = 'tenant_default', observationId) {
    const obs = this.store.getEntityAsOf(tenantId, 'observations', observationId);
    if (!obs) throw new Error(`Observation ${observationId} not found`);

    const ev = this.store.getEntityAsOf(tenantId, 'extractedEvidences', obs.evidenceId);

    const isObjective = (
      obs.observationClass === ObservationClass.VERIFIED_PRIMARY ||
      obs.observationClass === ObservationClass.VERIFIED_REGULATORY
    ) && obs.attribution?.isObjectiveFact !== false && obs.attribution?.statementType !== 'MANAGEMENT_STATED';

    return {
      claimId: `claim_ext_${obs.observationId}`,
      text: ev ? ev.extractedText : (obs.payload?.statementText || JSON.stringify(obs.payload)),
      type: obs.observationType,
      classification: obs.observationClass,
      evidenceId: obs.evidenceId,
      artifactId: obs.artifactId,
      isObjectiveFact: isObjective,
      knowledgeCutoff: obs.knowledgeAvailableAt
    };
  }

  /**
   * Bridge 3: Attention Engine (Phase 7) Material Event Trigger
   */
  generateAttentionTrigger(tenantId = 'tenant_default', observationId) {
    const obs = this.store.getEntityAsOf(tenantId, 'observations', observationId);
    if (!obs) throw new Error(`Observation ${observationId} not found`);

    const isCritical = obs.observationType === 'REGULATORY_SIGNAL' || obs.payload?.severity === 'CRITICAL';

    return {
      triggerId: `att_trig_${obs.observationId}`,
      tenantId,
      subjectId: obs.subjectId,
      attentionType: isCritical ? 'REGULATORY_EVENT_RISK' : 'ALTERNATIVE_DATA_SHIFT',
      severity: isCritical ? 'HIGH' : 'MEDIUM',
      observationId: obs.observationId,
      summary: `External intelligence event for ${obs.subjectId}: ${obs.observationType}`,
      timestamp: obs.publicationTimestamp || new Date().toISOString()
    };
  }

  /**
   * Bridge 4: Research Workflow (Phase 25) Review Task Generation
   */
  generateWorkflowTask(tenantId = 'tenant_default', observationId, creatorId = 'SYSTEM_EXTERNAL_BRIDGE') {
    const obs = this.store.getEntityAsOf(tenantId, 'observations', observationId);
    if (!obs) throw new Error(`Observation ${observationId} not found`);

    return {
      taskId: `task_ext_${obs.observationId}`,
      tenantId,
      researchProductId: `rp_${obs.subjectId}_EXTERNAL`,
      taskType: obs.observationType === 'REGULATORY_SIGNAL' ? 'REVIEW_COMPLIANCE' : 'REVIEW_EVIDENCE',
      priority: obs.observationType === 'REGULATORY_SIGNAL' ? 'HIGH' : 'MEDIUM',
      title: `Review External Signal for ${obs.subjectId}: ${obs.observationType}`,
      referencedObjectId: obs.observationId,
      referencedEvidenceId: obs.evidenceId,
      createdBy: creatorId,
      createdAt: new Date().toISOString(),
      status: 'PENDING'
    };
  }
}

export const defaultExternalBridges = new ExternalIntelligenceBridges();
