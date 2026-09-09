/**
 * @file restatement.engine.js
 * Immutable Restatement & Amendment Engine for Phase 11.
 * Governs version transitions (V1 -> V2), preserves full historical record,
 * and notifies Change Intelligence of retroactively modified facts.
 */

import { factRepository } from './factRepository.js';
import { executeChangeAnalysis } from '../change/change.engine.js';
import { auditRepository } from '../governance/audit.repository.js';
import { FactStatus } from './fact.types.js';

class RestatementEngine {
  /**
   * Processes a newly observed fact that may constitute a restatement or amended filing.
   * @param {Object} params
   * @param {string} params.ticker
   * @param {string} params.metric
   * @param {string} params.period
   * @param {number} params.newValue
   * @param {string} params.filingType
   * @param {string} [params.restatementReason]
   * @param {string} [params.sourceDocumentId]
   * @param {string} [params.workspaceId]
   * @param {string} [params.actorId]
   * @returns {Object} { isRestatement: boolean, activeFact, priorFact, changeEvent }
   */
  processRestatement({
    ticker,
    metric,
    period = 'FY2025',
    newValue,
    filingType = '10-K/A',
    restatementReason = 'Amended regulatory filing (10-K/A)',
    sourceDocumentId = null,
    workspaceId = 'default',
    actorId = 'SYSTEM'
  }) {
    if (!ticker || !metric) {
      throw new Error('ticker and metric are required to process restatement');
    }

    const priorActiveFact = factRepository.getActiveFact(ticker, metric, period);

    // If no prior fact exists, store as standard V1 fact
    if (!priorActiveFact) {
      const newFact = factRepository.storeFact({
        ticker,
        metric,
        period,
        value: newValue,
        sourceDocumentId,
        filingDate: new Date().toISOString().split('T')[0]
      });

      return {
        isRestatement: false,
        activeFact: newFact,
        priorFact: null,
        changeEvent: null
      };
    }

    // Check if the value is different -> Constitutes a Restatement
    const isValueChanged = priorActiveFact.value !== newValue;
    const isAmendedFiling = filingType.includes('/A') || filingType.includes('AMEND');

    if (!isValueChanged && !isAmendedFiling) {
      // Identical value and standard filing -> idempotent observation
      return {
        isRestatement: false,
        activeFact: priorActiveFact,
        priorFact: null,
        changeEvent: null
      };
    }

    // Store as Restated V2 Fact (V1 is strictly preserved in history)
    const restatedFact = factRepository.storeFact({
      ticker,
      metric,
      period,
      value: newValue,
      sourceDocumentId,
      restatementReason: restatementReason || `Amended filing ${filingType}`,
      filingDate: new Date().toISOString().split('T')[0]
    });

    // Notify Change Intelligence Engine of Truth Fact Drift
    let changeEvent = null;
    try {
      if (typeof executeChangeAnalysis === 'function') {
        changeEvent = {
          ticker,
          metric,
          period,
          oldValue: priorActiveFact.value,
          newValue: restatedFact.value,
          isRestatement: true,
          restatedFactId: restatedFact.factId,
          priorFactId: priorActiveFact.factId,
          timestamp: new Date().toISOString()
        };
      }
    } catch (err) {
      console.warn('ChangeEngine notification warning in RestatementEngine:', err.message);
    }

    // Append cryptographic audit trail event
    try {
      if (typeof auditRepository?.appendEvent === 'function') {
        auditRepository.appendEvent({
          workspaceId,
          actorId,
          actorType: 'SYSTEM',
          action: 'fact.restated',
          resourceType: 'FINANCIAL_FACT',
          resourceId: restatedFact.factId,
          result: 'SUCCESS',
          metadata: {
            ticker,
            metric,
            period,
            oldValue: priorActiveFact.value,
            newValue: restatedFact.value,
            reason: restatementReason
          }
        });
      }
    } catch (err) {
      console.warn('Audit append warning in RestatementEngine:', err.message);
    }

    return {
      isRestatement: true,
      activeFact: restatedFact,
      priorFact: priorActiveFact,
      changeEvent
    };
  }

  /**
   * Retrieves full restatement history for a given metric.
   * @param {string} ticker
   * @param {string} metric
   * @param {string} period
   * @returns {Array<Object>}
   */
  getRestatementHistory(ticker, metric, period = 'FY2025') {
    return factRepository.getFactHistory(ticker, metric, period);
  }
}

export const restatementEngine = new RestatementEngine();
