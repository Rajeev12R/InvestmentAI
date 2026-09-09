import { SOURCE_TIERS } from './ingestion.types.js';

/**
 * Event Deduplicator & Source Conflict Resolver.
 */
export class EventDeduplicator {
  constructor() {
    this.primaryEvents = new Map(); // key: eventFingerprint -> Event
    this.confirmingSources = new Map(); // key: eventFingerprint -> Array<Event>
  }

  /**
   * Evaluates an incoming normalized event against the deduplication registry.
   */
  processEvent(event) {
    if (!event || !event.eventFingerprint) {
      return { isDuplicate: false, role: 'PRIMARY_EVENT', resolvedEvent: event };
    }

    const fp = event.eventFingerprint;

    // First time seeing this event fingerprint -> PRIMARY_EVENT
    if (!this.primaryEvents.has(fp)) {
      this.primaryEvents.set(fp, event);
      this.confirmingSources.set(fp, []);
      return {
        isDuplicate: false,
        role: 'PRIMARY_EVENT',
        resolvedEvent: event
      };
    }

    // Existing event found
    const primary = this.primaryEvents.get(fp);
    const existingConfirmations = this.confirmingSources.get(fp);

    // Exact duplicate from same source ID
    if (primary.sourceId === event.sourceId && primary.source === event.source) {
      return {
        isDuplicate: true,
        role: 'DUPLICATE',
        resolvedEvent: primary
      };
    }

    // Confirming source from a different data provider
    existingConfirmations.push({
      source: event.source,
      sourceTier: event.sourceTier,
      sourceUrl: event.sourceUrl,
      publishedAt: event.publishedAt,
      extractedFacts: event.extractedFacts
    });

    // Check for fact conflicts
    const conflictResolution = this.resolveFactConflicts(primary, event);

    // Boost primary confidence with confirming source (up to 99)
    const boostedConfidence = Math.min(99, primary.confidence + 5);
    const updatedPrimary = {
      ...primary,
      confidence: boostedConfidence,
      confirmingSources: existingConfirmations,
      hasConflicts: conflictResolution.hasConflict,
      conflictDetails: conflictResolution.conflictDetails
    };

    this.primaryEvents.set(fp, updatedPrimary);

    return {
      isDuplicate: false,
      role: 'CONFIRMING_SOURCE',
      resolvedEvent: updatedPrimary
    };
  }

  /**
   * Resolves competing facts using explicit source hierarchy.
   */
  resolveFactConflicts(primaryEvent, incomingEvent) {
    let hasConflict = false;
    const conflictDetails = [];

    const primaryFacts = primaryEvent.extractedFacts || [];
    const incomingFacts = incomingEvent.extractedFacts || [];

    for (const inFact of incomingFacts) {
      const match = primaryFacts.find(p => p.id === inFact.id);
      if (match && match.value !== inFact.value) {
        hasConflict = true;

        // Compare source tiers: Tier 1 > Tier 2 > Tier 3
        const tierRank = { [SOURCE_TIERS.TIER_1]: 1, [SOURCE_TIERS.TIER_2]: 2, [SOURCE_TIERS.TIER_3]: 3, [SOURCE_TIERS.TIER_4]: 4 };
        const primaryRank = tierRank[primaryEvent.sourceTier] || 4;
        const incomingRank = tierRank[incomingEvent.sourceTier] || 4;

        const primaryAuth = primaryEvent.authorityLevel || 0.5;
        const incomingAuth = incomingEvent.authorityLevel || 0.5;

        let selectedValue = match.value;
        let resolutionReason = '';

        if (incomingRank < primaryRank || (incomingRank === primaryRank && incomingAuth > primaryAuth)) {

          // Incoming source has higher authority -> Override
          selectedValue = inFact.value;
          match.value = inFact.value;
          match.source = incomingEvent.source;
          match.sourceTier = incomingEvent.sourceTier;
          resolutionReason = `Overridden by higher authority ${incomingEvent.source} (${incomingEvent.sourceTier}, auth: ${incomingAuth}).`;
        } else if (primaryRank < incomingRank || (incomingRank === primaryRank && primaryAuth > incomingAuth)) {
          resolutionReason = `Retained higher authority ${primaryEvent.source} (${primaryEvent.sourceTier}, auth: ${primaryAuth}) over ${incomingEvent.source}.`;
        } else {
          // Same tier & same authority conflict: cannot resolve automatically -> mark fact as UNAVAILABLE
          match.value = 'UNAVAILABLE';
          resolutionReason = `Same-tier conflict between ${primaryEvent.source} ($${match.value}) and ${incomingEvent.source} ($${inFact.value}); marked UNAVAILABLE.`;
        }


        conflictDetails.push({
          factId: inFact.id,
          primaryValue: match.value,
          competingValue: inFact.value,
          selectedValue,
          resolutionReason
        });
      }
    }

    return { hasConflict, conflictDetails };
  }

  clear() {
    this.primaryEvents.clear();
    this.confirmingSources.clear();
  }
}

export const eventDeduplicator = new EventDeduplicator();
