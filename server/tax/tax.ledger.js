/**
 * Phase 17 — Tax Effect Ledger
 * Enforces Single-Count Tax Invariant & Valuation Boundary Tracking
 */

import { canonicalHash, deepFreeze, TaxPaymentSource, TaxStatus, ValuationBoundary } from './tax.types.js';

export class TaxEffectLedger {
  constructor(entries = []) {
    this._entries = new Map();
    this._processedEvents = new Set();

    if (Array.isArray(entries)) {
      for (const entry of entries) {
        this.addEvent(entry);
      }
    }
  }

  /**
   * Adds an event to the ledger with full provenance and boundary tracking.
   * @param {Object} event
   */
  addEvent(event) {
    if (!event || typeof event !== 'object') {
      return {
        status: TaxStatus.INVALID_INPUT,
        reason: 'Event record is missing or invalid'
      };
    }

    const {
      eventId,
      eventType,
      amount,
      date,
      paymentSource = TaxPaymentSource.PORTFOLIO,
      valuationBoundary = ValuationBoundary.POST_ALL_INVESTOR_COSTS,
      includedInPortfolioValue = true,
      includedInCashFlow = false,
      includedInReturnCalculation = false,
      currency = 'USD',
      sourceEvidenceId = 'EVID-DEFAULT'
    } = event;

    if (!eventId || typeof eventId !== 'string') {
      return { status: TaxStatus.INVALID_INPUT, reason: 'Missing eventId' };
    }

    if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
      return { status: TaxStatus.INVALID_INPUT, reason: 'Amount must be a non-negative number' };
    }

    if (this._entries.has(eventId)) {
      return {
        status: TaxStatus.NUMERICAL_FAILURE,
        code: TaxStatus.DOUBLE_COUNTED_TAX_EVENT,
        reason: `Duplicate tax event ID '${eventId}' detected in ledger`
      };
    }

    const record = {
      eventId,
      eventType: eventType || 'ACTUAL_TAX_PAID',
      amount,
      date: date || new Date().toISOString(),
      paymentSource,
      valuationBoundary,
      includedInPortfolioValue: Boolean(includedInPortfolioValue),
      includedInCashFlow: Boolean(includedInCashFlow),
      includedInReturnCalculation: Boolean(includedInReturnCalculation),
      currency,
      sourceEvidenceId,
      entryHash: canonicalHash({ eventId, eventType, amount, date, paymentSource, valuationBoundary, currency })
    };

    if (record.includedInReturnCalculation) {
      this._processedEvents.add(eventId);
    }

    this._entries.set(eventId, record);
    return { status: TaxStatus.PASS, entry: deepFreeze({ ...record }) };
  }

  /**
   * Marks an event as included in return calculation exactly once.
   * Throws or returns NUMERICAL_FAILURE with DOUBLE_COUNTED_TAX_EVENT on violation.
   * @param {string} eventId
   */
  markIncludedInReturn(eventId) {
    const entry = this._entries.get(eventId);
    if (!entry) {
      return {
        status: TaxStatus.INVALID_INPUT,
        reason: `Event '${eventId}' not found in ledger`
      };
    }

    if (entry.includedInReturnCalculation || this._processedEvents.has(eventId)) {
      return {
        status: TaxStatus.NUMERICAL_FAILURE,
        code: TaxStatus.DOUBLE_COUNTED_TAX_EVENT,
        reason: `Tax event '${eventId}' is already marked as included in return calculation (Double-Counting Violation)`
      };
    }

    entry.includedInReturnCalculation = true;
    this._processedEvents.add(eventId);
    return { status: TaxStatus.PASS, entry: deepFreeze({ ...entry }) };
  }

  /**
   * Returns all ledger entries as a frozen array.
   */
  getEvents() {
    return deepFreeze(Array.from(this._entries.values()));
  }

  /**
   * Computes deterministic SHA-256 hash of all ledger entries.
   */
  getLedgerHash() {
    const entriesArray = Array.from(this._entries.values()).map(e => ({
      eventId: e.eventId,
      eventType: e.eventType,
      amount: e.amount,
      date: e.date,
      paymentSource: e.paymentSource,
      valuationBoundary: e.valuationBoundary,
      includedInPortfolioValue: e.includedInPortfolioValue,
      includedInCashFlow: e.includedInCashFlow,
      includedInReturnCalculation: e.includedInReturnCalculation
    }));
    return canonicalHash(entriesArray);
  }

  /**
   * Reconciles total tax and cost impact across boundaries.
   */
  reconcile() {
    let portfolioPaidTaxes = 0;
    let externalPaidTaxes = 0;
    let withheldTaxes = 0;
    let transactionCosts = 0;

    for (const e of this._entries.values()) {
      if (e.eventType === 'ACTUAL_TAX_PAID') {
        if (e.paymentSource === TaxPaymentSource.PORTFOLIO) {
          portfolioPaidTaxes += e.amount;
        } else if (e.paymentSource === TaxPaymentSource.INVESTOR_EXTERNAL) {
          externalPaidTaxes += e.amount;
        } else if (e.paymentSource === TaxPaymentSource.WITHHELD_FROM_DISTRIBUTION) {
          withheldTaxes += e.amount;
        }
      } else if (e.eventType === 'TRANSACTION_COST') {
        transactionCosts += e.amount;
      }
    }

    return deepFreeze({
      status: TaxStatus.PASS,
      totalEvents: this._entries.size,
      portfolioPaidTaxes,
      externalPaidTaxes,
      withheldTaxes,
      transactionCosts,
      ledgerHash: this.getLedgerHash()
    });
  }
}
