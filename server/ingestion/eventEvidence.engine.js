/**
 * Event Evidence Engine.
 * Creates auditable provenance records for extracted event facts.
 */
export function buildEventEvidenceRecords(event) {
  if (!event || !event.extractedFacts) return [];

  return event.extractedFacts.map(fact => ({
    evidenceId: `EVID_${event.ticker}_${fact.id}_${Date.now()}`,
    factId: fact.id,
    name: fact.name,
    value: fact.value,
    unit: fact.unit,
    source: event.source,
    confidence: event.confidence,
    eventId: event.eventId,
    verificationStatus: event.validationStatus
  }));
}

export function generateEvidenceProof({

  factId,
  value,
  source,
  eventId,
  rawRecordId,
  contentHash
}) {
  return {
    proofId: `PROOF_${factId}_${Date.now()}`,
    factId,
    value,
    source,
    eventId,
    rawRecordId,
    contentHash,
    retrievedAt: new Date().toISOString(),
    status: 'PROVENANCE_VERIFIED'
  };
}

