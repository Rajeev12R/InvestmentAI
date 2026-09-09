import crypto from 'crypto';
import { SignalDependencyType, computeSignalHash, deepFreeze } from './signal.types.js';
import { defaultSignalStore } from './signal.store.js';

export class SignalIndependenceEngine {
  constructor(store = defaultSignalStore) {
    this.store = store;
  }

  /**
   * Analyze independence between a set of signals or inputs.
   */
  analyzeIndependence(tenantId = 'tenant_default', {
    entityId,
    inputs = [] // array of normalized input records or signals
  }) {
    if (!inputs || inputs.length === 0) {
      return {
        entityId,
        dependencyGroups: [],
        independentEffectiveCount: 0,
        evidenceDiversityScore: 0.0,
        sharedFacts: [],
        effectiveWeightsAdjustment: {}
      };
    }

    const dependencyGroups = [];
    const sharedFacts = new Set();
    const uniqueEvidenceIds = new Set();
    const uniqueSources = new Set();

    // Map to group dependent inputs
    const factToInputs = new Map();
    const sourceToInputs = new Map();

    for (const inp of inputs) {
      // Evidence & Source tracking
      if (Array.isArray(inp.evidenceIds)) {
        inp.evidenceIds.forEach(evId => uniqueEvidenceIds.add(evId));
      }
      if (inp.sourceId) uniqueSources.add(inp.sourceId);

      // Shared Fact Tracking (e.g. underlying factId from Knowledge Graph or Truth)
      const factId = inp.sharedFactId || inp.underlyingFactId || (inp.payload?.factId) || (inp.evidenceIds && inp.evidenceIds[0]);
      if (factId) {
        if (!factToInputs.has(factId)) factToInputs.set(factId, []);
        factToInputs.get(factId).push(inp);
      }

      // Shared Original Source Tracking (e.g., wire news or press releases)
      const originSource = inp.originalWireSource || inp.sourceId || inp.publisher;
      if (originSource) {
        if (!sourceToInputs.has(originSource)) sourceToInputs.set(originSource, []);
        sourceToInputs.get(originSource).push(inp);
      }
    }

    // Identify Shared Fact Dependencies
    for (const [factId, groupedInputs] of factToInputs.entries()) {
      if (groupedInputs.length > 1) {
        sharedFacts.add(factId);
        dependencyGroups.push({
          dependencyType: SignalDependencyType.SHARED_UNDERLYING_FACT,
          sharedIdentifier: factId,
          inputIds: groupedInputs.map(i => i.inputId || i.signalId),
          discountFactor: parseFloat((1 / groupedInputs.length).toFixed(3))
        });
      }
    }

    // Identify Shared Source Dependencies (e.g., duplicate press release or wire syndication)
    for (const [src, groupedInputs] of sourceToInputs.entries()) {
      if (groupedInputs.length > 1) {
        const existing = dependencyGroups.find(g => g.sharedIdentifier === src);
        if (!existing) {
          dependencyGroups.push({
            dependencyType: SignalDependencyType.DERIVED_FROM_SAME_SOURCE,
            sharedIdentifier: src,
            inputIds: groupedInputs.map(i => i.inputId || i.signalId),
            discountFactor: parseFloat((1 / groupedInputs.length).toFixed(3))
          });
        }
      }
    }

    // Calculate Evidence Diversity Score
    // Formula: EvidenceDiversityScore = 0.4 * (uniqueSources / totalInputs) + 0.6 * (uniqueEvidence / max(1, totalEvidenceCount))
    const totalInputsCount = inputs.length;
    const sourceRatio = totalInputsCount > 0 ? Math.min(1.0, uniqueSources.size / totalInputsCount) : 0;
    const evidenceRatio = uniqueEvidenceIds.size > 0 ? Math.min(1.0, uniqueEvidenceIds.size / totalInputsCount) : 0.5;
    const diversityScore = parseFloat((0.4 * sourceRatio + 0.6 * evidenceRatio).toFixed(3));

    // Calculate effective independent count: total inputs reduced by duplicate overlap
    let independentEffectiveCount = totalInputsCount;
    for (const grp of dependencyGroups) {
      const redundantCount = grp.inputIds.length - 1;
      independentEffectiveCount -= redundantCount;
    }
    independentEffectiveCount = parseFloat(Math.max(1, independentEffectiveCount).toFixed(2));

    // Compute effective weights adjustment
    const effectiveWeightsAdjustment = {};
    for (const inp of inputs) {
      const id = inp.inputId || inp.signalId;
      const grp = dependencyGroups.find(g => g.inputIds.includes(id));
      effectiveWeightsAdjustment[id] = grp ? grp.discountFactor : 1.0;
    }

    return {
      entityId,
      totalInputsCount,
      independentEffectiveCount,
      evidenceDiversityScore: diversityScore,
      dependencyGroups,
      sharedFacts: Array.from(sharedFacts),
      effectiveWeightsAdjustment
    };
  }
}

export const defaultIndependenceEngine = new SignalIndependenceEngine();
