/**
 * Phase 13 - Thesis Versioning Engine
 * 
 * Immutable thesis versions preserving historical beliefs and evolution.
 * A thesis update must NEVER mutate the old thesis.
 */

import { deepFreeze, computeDeterministicHash, ThesisState } from './process.types.js';

export class ThesisVersioningEngine {
  constructor() {
    this.theses = new Map(); // thesisVersionId -> ThesisVersion
    this.decisionTheses = new Map(); // decisionId -> [thesisVersionId]
  }

  /**
   * Create an immutable thesis version
   */
  createThesisVersion(params) {
    const {
      thesisVersionId,
      decisionId,
      workspaceId,
      ticker,
      versionNumber = 1,
      thesisStatement,
      supportingEvidence = [],
      expectedDrivers = [],
      expectedDirection = 'IMPROVE',
      expectedTimeframe,
      falsificationConditions = [],
      confidence = 0.5,
      valuationAssumptions = {},
      riskAssumptions = {},
      catalystExpectations = [],
      supersedesThesisId = null,
      createdTimestamp = new Date().toISOString()
    } = params;

    if (!thesisVersionId || !decisionId || !workspaceId || !ticker || !thesisStatement) {
      throw new Error('Missing required fields for ThesisVersion: thesisVersionId, decisionId, workspaceId, ticker, thesisStatement');
    }

    if (this.theses.has(thesisVersionId)) {
      throw new Error(`ThesisVersion already exists for thesisVersionId: ${thesisVersionId}. Theses are strictly immutable.`);
    }

    if (supersedesThesisId && !this.theses.has(supersedesThesisId)) {
      throw new Error(`Superseded thesis ${supersedesThesisId} does not exist.`);
    }

    const payloadToHash = {
      thesisVersionId,
      decisionId,
      workspaceId,
      ticker,
      versionNumber: Number(versionNumber),
      thesisStatement,
      supportingEvidence: [...supportingEvidence].sort(),
      expectedDrivers: [...expectedDrivers].sort((a, b) => (a.driverId || '').localeCompare(b.driverId || '')),
      expectedDirection,
      expectedTimeframe: expectedTimeframe || '12_MONTHS',
      falsificationConditions: [...falsificationConditions].sort((a, b) => (a.conditionId || '').localeCompare(b.conditionId || '')),
      confidence: Number(confidence),
      valuationAssumptions: valuationAssumptions || {},
      riskAssumptions: riskAssumptions || {},
      catalystExpectations: [...catalystExpectations].sort((a, b) => (a.catalystId || '').localeCompare(b.catalystId || '')),
      supersedesThesisId: supersedesThesisId || null,
      createdTimestamp: new Date(createdTimestamp).toISOString()
    };

    const packageHash = computeDeterministicHash(payloadToHash);

    const thesis = {
      ...payloadToHash,
      packageHash
    };

    const frozenThesis = deepFreeze(thesis);
    this.theses.set(thesisVersionId, frozenThesis);

    if (!this.decisionTheses.has(decisionId)) {
      this.decisionTheses.set(decisionId, []);
    }
    this.decisionTheses.get(decisionId).push(thesisVersionId);

    return frozenThesis;
  }

  /**
   * Get immutable thesis version
   */
  getThesisVersion(thesisVersionId, workspaceId) {
    const thesis = this.theses.get(thesisVersionId);
    if (!thesis) {
      return null;
    }
    if (workspaceId && thesis.workspaceId !== workspaceId) {
      throw new Error(`Unauthorized workspace access for thesisVersionId ${thesisVersionId}`);
    }
    return thesis;
  }

  /**
   * Get full thesis version history for a decision
   */
  getThesisHistory(decisionId, workspaceId) {
    const versionIds = this.decisionTheses.get(decisionId) || [];
    const history = [];
    for (const vId of versionIds) {
      const v = this.theses.get(vId);
      if (v) {
        if (workspaceId && v.workspaceId !== workspaceId) {
          throw new Error(`Unauthorized workspace access for thesisVersionId ${vId}`);
        }
        history.push(v);
      }
    }
    return history.sort((a, b) => a.versionNumber - b.versionNumber);
  }

  /**
   * Clear store for testing
   */
  clear() {
    this.theses.clear();
    this.decisionTheses.clear();
  }
}

export const thesisVersioningEngine = new ThesisVersioningEngine();
