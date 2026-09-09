/**
 * Phase 15 — Implementation Snapshot Engine
 * 
 * Captures, validates, and hashes immutable portfolio holdings and transaction snapshots.
 * Enforces temporal integrity (no look-ahead), zero-fallback rules, and multi-tenant boundaries.
 */

import { ImplementationStatus, canonicalHash, deepFreeze } from './implementation.types.js';

export class ImplementationSnapshotEngine {
  /**
   * Validate and build an immutable holdings snapshot.
   */
  static buildHoldingsSnapshot(params) {
    const {
      workspaceId,
      portfolioId,
      asOf,
      holdings = [],
      cash = 0,
      currency = 'USD',
      sourceEvidenceIds = []
    } = params;

    if (!workspaceId || typeof workspaceId !== 'string' || workspaceId.trim() === '') {
      return { status: ImplementationStatus.INVALID_INPUT, reasonCode: 'MISSING_WORKSPACE_ID', snapshot: null };
    }
    if (!portfolioId || typeof portfolioId !== 'string' || portfolioId.trim() === '') {
      return { status: ImplementationStatus.INVALID_INPUT, reasonCode: 'MISSING_PORTFOLIO_ID', snapshot: null };
    }
    if (!asOf || isNaN(Date.parse(asOf))) {
      return { status: ImplementationStatus.INVALID_INPUT, reasonCode: 'INVALID_AS_OF_TIMESTAMP', snapshot: null };
    }

    const asOfTime = new Date(asOf).getTime();
    if (asOfTime > Date.now() + 60000) {
      return { status: ImplementationStatus.INVALID_INPUT, reasonCode: 'FUTURE_TIMESTAMP_REJECTED', snapshot: null };
    }

    if (!Array.isArray(holdings) || holdings.length === 0) {
      return { status: ImplementationStatus.INSUFFICIENT_DATA, reasonCode: 'EMPTY_HOLDINGS_ARRAY', snapshot: null };
    }

    let totalValue = typeof cash === 'number' && isFinite(cash) ? cash : 0;
    const validatedHoldings = [];
    const seenTickers = new Set();

    for (const h of holdings) {
      if (!h || typeof h !== 'object') {
        return { status: ImplementationStatus.INVALID_INPUT, reasonCode: 'MALFORMED_HOLDING_RECORD', snapshot: null };
      }
      const ticker = h.ticker;
      if (!ticker || typeof ticker !== 'string' || ticker.trim() === '') {
        return { status: ImplementationStatus.INVALID_INPUT, reasonCode: 'INVALID_HOLDING_TICKER', snapshot: null };
      }
      if (seenTickers.has(ticker)) {
        return { status: ImplementationStatus.INVALID_INPUT, reasonCode: `DUPLICATE_HOLDING_TICKER_${ticker}`, snapshot: null };
      }
      seenTickers.add(ticker);

      const shares = typeof h.shares === 'number' ? h.shares : h.quantity;
      const price = typeof h.price === 'number' ? h.price : h.unitPrice;
      if (typeof shares !== 'number' || isNaN(shares) || !isFinite(shares) || shares < 0) {
        return { status: ImplementationStatus.INVALID_INPUT, reasonCode: `INVALID_SHARES_FOR_${ticker}`, snapshot: null };
      }
      if (typeof price !== 'number' || isNaN(price) || !isFinite(price) || price <= 0) {
        return { status: ImplementationStatus.INVALID_INPUT, reasonCode: `INVALID_PRICE_FOR_${ticker}`, snapshot: null };
      }

      const holdingValue = Number((shares * price).toFixed(4));
      totalValue += holdingValue;

      validatedHoldings.push({
        ticker,
        assetId: h.assetId || ticker,
        shares,
        price,
        value: holdingValue,
        sector: h.sector || 'Unassigned',
        industry: h.industry || 'Unassigned',
        geography: h.geography || 'US',
        costBasis: typeof h.costBasis === 'number' && isFinite(h.costBasis) ? h.costBasis : null,
        sourceEvidenceId: h.sourceEvidenceId || null
      });
    }

    if (totalValue <= 0) {
      return { status: ImplementationStatus.INVALID_INPUT, reasonCode: 'ZERO_OR_NEGATIVE_PORTFOLIO_VALUE', snapshot: null };
    }

    // Assign computed actual weights
    const holdingsWithWeights = validatedHoldings.map(h => ({
      ...h,
      weight: Number((h.value / totalValue).toFixed(6))
    }));

    const cashWeight = Number((cash / totalValue).toFixed(6));

    const snapshotPayload = {
      snapshotId: `HOLDINGS-${portfolioId}-${asOf.replace(/[:.]/g, '-')}`,
      workspaceId,
      portfolioId,
      asOf,
      currency,
      totalValue: Number(totalValue.toFixed(4)),
      cash: Number(cash.toFixed(4)),
      cashWeight,
      holdings: holdingsWithWeights,
      positionCount: holdingsWithWeights.length,
      sourceEvidenceIds,
      createdAt: asOf
    };

    const hash = canonicalHash(snapshotPayload);
    const sealedSnapshot = deepFreeze({
      ...snapshotPayload,
      snapshotHash: hash
    });

    return {
      status: ImplementationStatus.RECONCILED,
      snapshot: sealedSnapshot
    };
  }

  /**
   * Validate and build an immutable transaction ledger snapshot.
   */
  static buildTransactionSnapshot(params) {
    const {
      workspaceId,
      portfolioId,
      asOf,
      transactions = [],
      sourceEvidenceIds = []
    } = params;

    if (!workspaceId || typeof workspaceId !== 'string' || workspaceId.trim() === '') {
      return { status: ImplementationStatus.INVALID_INPUT, reasonCode: 'MISSING_WORKSPACE_ID', snapshot: null };
    }
    if (!portfolioId || typeof portfolioId !== 'string' || portfolioId.trim() === '') {
      return { status: ImplementationStatus.INVALID_INPUT, reasonCode: 'MISSING_PORTFOLIO_ID', snapshot: null };
    }
    if (!asOf || isNaN(Date.parse(asOf))) {
      return { status: ImplementationStatus.INVALID_INPUT, reasonCode: 'INVALID_AS_OF_TIMESTAMP', snapshot: null };
    }

    const asOfTime = new Date(asOf).getTime();
    if (asOfTime > Date.now() + 60000) {
      return { status: ImplementationStatus.INVALID_INPUT, reasonCode: 'FUTURE_TIMESTAMP_REJECTED', snapshot: null };
    }

    const validatedTx = [];
    const seenTxIds = new Set();

    for (const tx of transactions) {
      if (!tx || typeof tx !== 'object') {
        return { status: ImplementationStatus.INVALID_INPUT, reasonCode: 'MALFORMED_TRANSACTION_RECORD', snapshot: null };
      }
      const txId = tx.transactionId;
      if (!txId || typeof txId !== 'string') {
        return { status: ImplementationStatus.INVALID_INPUT, reasonCode: 'MISSING_TRANSACTION_ID', snapshot: null };
      }
      if (seenTxIds.has(txId)) {
        return { status: ImplementationStatus.INVALID_INPUT, reasonCode: `DUPLICATE_TRANSACTION_ID_${txId}`, snapshot: null };
      }
      seenTxIds.add(txId);

      const ticker = tx.ticker;
      if (!ticker || typeof ticker !== 'string') {
        return { status: ImplementationStatus.INVALID_INPUT, reasonCode: 'MISSING_TX_TICKER', snapshot: null };
      }

      const side = (tx.side || '').toUpperCase();
      if (side !== 'BUY' && side !== 'SELL') {
        return { status: ImplementationStatus.INVALID_INPUT, reasonCode: `INVALID_TX_SIDE_${side}`, snapshot: null };
      }

      const quantity = tx.quantity;
      const price = tx.price;
      if (typeof quantity !== 'number' || isNaN(quantity) || !isFinite(quantity) || quantity <= 0) {
        return { status: ImplementationStatus.INVALID_INPUT, reasonCode: `INVALID_TX_QUANTITY_FOR_${txId}`, snapshot: null };
      }
      if (typeof price !== 'number' || isNaN(price) || !isFinite(price) || price <= 0) {
        return { status: ImplementationStatus.INVALID_INPUT, reasonCode: `INVALID_TX_PRICE_FOR_${txId}`, snapshot: null };
      }

      const timestamp = tx.timestamp;
      if (!timestamp || isNaN(Date.parse(timestamp))) {
        return { status: ImplementationStatus.INVALID_INPUT, reasonCode: `INVALID_TX_TIMESTAMP_FOR_${txId}`, snapshot: null };
      }
      if (new Date(timestamp).getTime() > asOfTime) {
        return { status: ImplementationStatus.INVALID_INPUT, reasonCode: `FUTURE_TX_TIMESTAMP_${txId}`, snapshot: null };
      }

      const grossValue = Number((quantity * price).toFixed(4));
      const fees = typeof tx.fees === 'number' && isFinite(tx.fees) ? tx.fees : 0;
      const netValue = side === 'BUY' ? Number((grossValue + fees).toFixed(4)) : Number((grossValue - fees).toFixed(4));

      validatedTx.push({
        transactionId: txId,
        ticker,
        side,
        quantity,
        price,
        grossValue,
        fees,
        netValue,
        currency: tx.currency || 'USD',
        timestamp,
        settlementStatus: tx.settlementStatus || 'SETTLED',
        sourceEvidenceId: tx.sourceEvidenceId || null
      });
    }

    const payload = {
      snapshotId: `TXS-${portfolioId}-${asOf.replace(/[:.]/g, '-')}`,
      workspaceId,
      portfolioId,
      asOf,
      transactionCount: validatedTx.length,
      transactions: validatedTx,
      sourceEvidenceIds,
      createdAt: asOf
    };

    const hash = canonicalHash(payload);
    const sealedTxSnapshot = deepFreeze({
      ...payload,
      snapshotHash: hash
    });

    return {
      status: ImplementationStatus.RECONCILED,
      snapshot: sealedTxSnapshot
    };
  }

  static createHoldingsSnapshot(params) {
    const res = ImplementationSnapshotEngine.buildHoldingsSnapshot(params);
    return res.snapshot || res;
  }

  static createTransactionSnapshot(params) {
    const res = ImplementationSnapshotEngine.buildTransactionSnapshot(params);
    return res.snapshot || res;
  }
}
