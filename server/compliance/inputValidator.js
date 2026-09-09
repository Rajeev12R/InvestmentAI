/**
 * Phase 16 — Institutional Compliance Input Boundary Validator
 * Enforces strict non-zero coercion, finite number checks, $T_0$ temporal integrity,
 * and portfolio data consistency.
 */

import { ComplianceStatus } from './compliance.types.js';

export class ComplianceInputValidator {
  /**
   * Validates common evaluation inputs.
   */
  static validateEvaluationInput(input = {}) {
    const {
      workspaceId,
      portfolioId,
      asOf,
      policy,
      policyId,
      holdings,
      holdingsSnapshot,
      targetWeights,
      targetPackage,
      transactions,
      prices,
      fxRates,
      sectors,
      geographies,
      marketCaps,
      liquidityADV
    } = input;

    if (!workspaceId || typeof workspaceId !== 'string') {
      return { valid: false, status: ComplianceStatus.INVALID_INPUT, error: 'workspaceId is required and must be a string' };
    }

    if (!portfolioId || typeof portfolioId !== 'string') {
      return { valid: false, status: ComplianceStatus.INVALID_INPUT, error: 'portfolioId is required and must be a string' };
    }

    if (!policy && !policyId) {
      return { valid: false, status: ComplianceStatus.INVALID_INPUT, error: 'policy or policyId is required' };
    }

    // Validate asOf timestamp
    const evalTime = asOf ? new Date(asOf) : new Date();
    if (isNaN(evalTime.getTime())) {
      return { valid: false, status: ComplianceStatus.INVALID_INPUT, error: 'Invalid asOf timestamp' };
    }

    // Temporal check: Reject far-future timestamps (e.g. > 10 minutes in future)
    const now = new Date();
    if (evalTime.getTime() > now.getTime() + 600000) {
      return { valid: false, status: ComplianceStatus.TEMPORAL_VIOLATION, error: 'asOf date cannot be in the future (Temporal violation)' };
    }

    // Validate Holdings if present
    const rawHoldings = holdingsSnapshot?.holdings || holdings;
    if (rawHoldings) {
      if (!Array.isArray(rawHoldings)) {
        return { valid: false, status: ComplianceStatus.INVALID_INPUT, error: 'holdings must be an array' };
      }

      const seenTickers = new Set();
      let totalWeight = 0;
      let hasWeights = false;

      for (const h of rawHoldings) {
        if (!h.ticker && !h.symbol) {
          return { valid: false, status: ComplianceStatus.INVALID_INPUT, error: 'Each holding must have a ticker or symbol' };
        }
        const sym = (h.ticker || h.symbol).toUpperCase();
        if (seenTickers.has(sym)) {
          return { valid: false, status: ComplianceStatus.CONFLICT, error: `Duplicate holding detected for ticker: ${sym}` };
        }
        seenTickers.add(sym);

        // Check numerical validity of shares/weight/value
        if (h.shares !== undefined) {
          if (typeof h.shares !== 'number' || !isFinite(h.shares)) {
            return { valid: false, status: ComplianceStatus.NUMERICAL_FAILURE, error: `Invalid non-finite shares for ${sym}` };
          }
          if (h.shares < 0 && !input.allowShorting) {
            return { valid: false, status: ComplianceStatus.INVALID_INPUT, error: `Negative shares for long-only holding: ${sym}` };
          }
        }

        if (h.weight !== undefined) {
          hasWeights = true;
          if (typeof h.weight !== 'number' || !isFinite(h.weight) || isNaN(h.weight)) {
            return { valid: false, status: ComplianceStatus.NUMERICAL_FAILURE, error: `Invalid non-finite weight for ${sym}` };
          }
          if (h.weight < 0 && !input.allowShorting) {
            return { valid: false, status: ComplianceStatus.INVALID_INPUT, error: `Negative weight for long-only holding: ${sym}` };
          }
          totalWeight += h.weight;
        }

        if (h.marketValue !== undefined && (typeof h.marketValue !== 'number' || !isFinite(h.marketValue) || isNaN(h.marketValue))) {
          return { valid: false, status: ComplianceStatus.NUMERICAL_FAILURE, error: `Invalid marketValue for ${sym}` };
        }
      }

      // If weights are provided and no cash holding, check sum roughly <= 1.05
      if (hasWeights && totalWeight > 1.05) {
        return { valid: false, status: ComplianceStatus.INVALID_INPUT, error: `Holdings total weight exceeds 100%: ${(totalWeight * 100).toFixed(2)}%` };
      }
    }

    // Validate Target Weights if present
    const rawTargets = targetPackage?.targetWeights || targetWeights;
    if (rawTargets) {
      if (typeof rawTargets !== 'object' || Array.isArray(rawTargets)) {
        return { valid: false, status: ComplianceStatus.INVALID_INPUT, error: 'targetWeights must be an object map' };
      }
      for (const [sym, w] of Object.entries(rawTargets)) {
        if (typeof w !== 'number' || !isFinite(w) || isNaN(w)) {
          return { valid: false, status: ComplianceStatus.NUMERICAL_FAILURE, error: `Invalid target weight for ${sym}` };
        }
        if (w < 0 && !input.allowShorting) {
          return { valid: false, status: ComplianceStatus.INVALID_INPUT, error: `Negative target weight for ${sym}` };
        }
      }
    }

    // Validate Transactions if present
    if (transactions) {
      if (!Array.isArray(transactions)) {
        return { valid: false, status: ComplianceStatus.INVALID_INPUT, error: 'transactions must be an array' };
      }
      const seenTxIds = new Set();
      for (const tx of transactions) {
        if (!tx.transactionId) {
          return { valid: false, status: ComplianceStatus.INVALID_INPUT, error: 'Missing transactionId on transaction' };
        }
        if (seenTxIds.has(tx.transactionId)) {
          return { valid: false, status: ComplianceStatus.CONFLICT, error: `Duplicate transaction ID: ${tx.transactionId}` };
        }
        seenTxIds.add(tx.transactionId);

        // Future transaction check
        if (tx.timestamp && new Date(tx.timestamp).getTime() > evalTime.getTime()) {
          return { valid: false, status: ComplianceStatus.TEMPORAL_VIOLATION, error: `Future transaction detected: ${tx.transactionId} after evaluation time` };
        }
      }
    }

    return { valid: true };
  }
}
