import { sealTruthPackage } from '../tools/evidence.tool.js';
import { SOURCE_TIERS } from './ingestion.types.js';

function isChronologicallyOlder(eventPeriod, existingPeriod, eventDate, existingDate) {
  const getYear = (p) => {
    if (!p || typeof p !== 'string') return null;
    const m = p.match(/(20\d\d)/);
    return m ? parseInt(m[1], 10) : null;
  };

  const eventYear = getYear(eventPeriod);
  const existingYear = getYear(existingPeriod);
  if (eventYear && existingYear && eventYear < existingYear) {
    return true;
  }
  if (eventDate && existingDate) {
    const eDate = new Date(eventDate).getTime();
    const exDate = new Date(existingDate).getTime();
    if (!isNaN(eDate) && !isNaN(exDate) && eDate < exDate) {
      return true;
    }
  }
  return false;
}


/**
 * Fact Update Engine.
 * Prepares and applies validated fact updates to create new immutable Truth Packages.
 */
export function applyFactUpdatesToTruthPackage({
  previousTruthPackage,
  event,
  options = {}
}) {
  if (!previousTruthPackage) {
    throw new Error('Previous Truth Package is required for fact update ingestion.');
  }
  if (!event || !event.extractedFacts || event.extractedFacts.length === 0) {
    return {
      hasTruthChanges: false,
      reason: 'No extracted facts in event; Truth Package remains unchanged.',
      updatedTruthPackage: previousTruthPackage,
      candidates: []
    };
  }

  // Cross-Company Protection: Ticker must match
  const prevTicker = (previousTruthPackage.company?.ticker || previousTruthPackage.company?.name || '').toUpperCase();
  const eventTicker = (event.ticker || '').toUpperCase();
  if (prevTicker !== eventTicker) {
    throw new Error(`Cross-company fact update rejected: Cannot apply ${eventTicker} event to ${prevTicker} Truth Package.`);
  }

  // Source Authority Guard: Tier 3/4 cannot mutate core financial facts directly
  if (event.sourceTier === SOURCE_TIERS.TIER_3 || event.sourceTier === SOURCE_TIERS.TIER_4) {
    return {
      hasTruthChanges: false,
      reason: `Source authority ${event.sourceTier} cannot directly mutate Truth Package facts. Event logged as candidate only.`,
      updatedTruthPackage: previousTruthPackage,
      candidates: []
    };
  }

  // Clone previous package
  const clonedPackage = JSON.parse(JSON.stringify(previousTruthPackage));
  const existingFacts = clonedPackage.financialFacts || [];
  const existingCalculated = clonedPackage.calculatedMetrics || [];

  const candidates = [];
  let truthModified = false;

  for (const newFact of event.extractedFacts) {
    const factIndex = existingFacts.findIndex(f => f.id === newFact.id);
    const existingFact = factIndex >= 0 ? existingFacts[factIndex] : null;
    const prevValue = existingFact ? existingFact.value : null;

    // Check chronological order: do not overwrite newer period with older period
    if (existingFact && isChronologicallyOlder(event.reportingPeriod, existingFact.period, event.effectiveDate, existingFact.asOf)) {
      continue;
    }

    if (prevValue !== newFact.value) {
      truthModified = true;

      const candidate = {
        factId: newFact.id,
        name: newFact.name,
        previousValue: prevValue ?? 'UNAVAILABLE',
        proposedValue: newFact.value,
        unit: newFact.unit,
        sourceEventId: event.eventId,
        source: event.source,
        sourceTier: event.sourceTier,
        reportingPeriod: event.reportingPeriod,
        effectiveDate: event.effectiveDate,
        validationStatus: 'VALIDATED'
      };
      candidates.push(candidate);

      if (factIndex >= 0) {
        existingFacts[factIndex] = {
          ...existingFacts[factIndex],
          value: newFact.value,
          source: event.source,
          period: event.reportingPeriod,
          asOf: event.effectiveDate
        };
      } else {
        existingFacts.push({
          id: newFact.id,
          name: newFact.name,
          value: newFact.value,
          source: event.source,
          period: event.reportingPeriod,
          asOf: event.effectiveDate
        });
      }
    }
  }


  if (!truthModified) {
    return {
      hasTruthChanges: false,
      reason: 'Extracted facts identical to existing Truth Package values. No snapshot needed.',
      updatedTruthPackage: previousTruthPackage,
      candidates: []
    };
  }

  // Recalculate deterministic metrics (e.g. Net Debt = Debt - Cash)
  const debtFact = existingFacts.find(f => f.id === 'financial.totalDebt')?.value;
  const cashFact = existingFacts.find(f => f.id === 'financial.totalCash')?.value;
  if (typeof debtFact === 'number' && typeof cashFact === 'number') {
    const netDebt = debtFact - cashFact;
    const ndIndex = existingCalculated.findIndex(f => f.id === 'financial.netDebt');
    if (ndIndex >= 0) {
      existingCalculated[ndIndex].value = netDebt;
    } else {
      existingCalculated.push({ id: 'financial.netDebt', name: 'Net Debt', value: netDebt, source: 'CALCULATED' });
    }
  }

  clonedPackage.financialFacts = existingFacts;
  clonedPackage.calculatedMetrics = existingCalculated;

  // Increment package version and reseal
  const versionParts = (clonedPackage.integrity?.version || '1.0.0').split('.');
  const patchNum = parseInt(versionParts[2] || '0', 10) + 1;
  const newVersion = `${versionParts[0]}.${versionParts[1]}.${patchNum}`;

  const newSeal = sealTruthPackage(clonedPackage);
  clonedPackage.integrity = {
    ...newSeal,
    version: newVersion,
    sealedAt: new Date().toISOString()
  };

  return {
    hasTruthChanges: true,
    reason: `Applied ${candidates.length} verified fact update(s) from event ${event.eventId}.`,
    updatedTruthPackage: clonedPackage,
    candidates
  };
}
