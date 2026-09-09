/**
 * Phase 17 — Account Tax Model
 * Deterministic Account Tax Profile Engine
 */

import { AccountType, deepFreeze, TaxStatus } from './tax.types.js';

export class TaxAccountEngine {
  /**
   * Validates and returns account tax context.
   */
  static validateAccount(account) {
    if (!account || typeof account !== 'object') {
      return deepFreeze({
        status: TaxStatus.INVALID_INPUT,
        reason: 'Account payload missing or malformed'
      });
    }

    const { accountId, workspaceId, portfolioId, jurisdiction, accountType, baseCurrency, taxProfileVersion } = account;

    if (!accountId || typeof accountId !== 'string') {
      return deepFreeze({
        status: TaxStatus.INVALID_INPUT,
        reason: 'Missing or invalid accountId'
      });
    }

    if (!workspaceId || typeof workspaceId !== 'string') {
      return deepFreeze({
        status: TaxStatus.INVALID_INPUT,
        reason: 'Missing or invalid workspaceId'
      });
    }

    if (!portfolioId || typeof portfolioId !== 'string') {
      return deepFreeze({
        status: TaxStatus.INVALID_INPUT,
        reason: 'Missing or invalid portfolioId'
      });
    }

    if (!jurisdiction || typeof jurisdiction !== 'string') {
      return deepFreeze({
        status: TaxStatus.JURISDICTION_UNAVAILABLE,
        reason: 'Missing or invalid account jurisdiction'
      });
    }

    if (!accountType || !Object.values(AccountType).includes(accountType)) {
      return deepFreeze({
        status: TaxStatus.INVALID_INPUT,
        reason: `Invalid accountType: ${accountType}`
      });
    }

    if (accountType === AccountType.UNKNOWN) {
      return deepFreeze({
        status: TaxStatus.TAX_RULE_UNAVAILABLE,
        reason: 'Account tax type is UNKNOWN; cannot assume TAXABLE or TAX_EXEMPT treatment',
        account: {
          accountId,
          workspaceId,
          portfolioId,
          jurisdiction,
          accountType: AccountType.UNKNOWN,
          baseCurrency: baseCurrency || 'USD',
          taxProfileVersion: taxProfileVersion || 'V1'
        }
      });
    }

    return deepFreeze({
      status: TaxStatus.PASS,
      account: {
        accountId,
        workspaceId,
        portfolioId,
        jurisdiction: jurisdiction.toUpperCase(),
        accountType,
        baseCurrency: baseCurrency || 'USD',
        taxProfileVersion: taxProfileVersion || 'V1'
      }
    });
  }

  /**
   * Evaluates whether an account is subject to capital gains tax.
   */
  static isTaxableAccount(accountType) {
    return accountType === AccountType.TAXABLE;
  }
}
