// server/portfolio/portfolio.repository.js
// ESM — package.json has: "type": "module"

import crypto from 'crypto';

import { defaultStorageAdapter } from '../infrastructure/storage.adapter.js';
import { getPersistentStore } from '../infrastructure/persistence/store.js';

const PORTFOLIO_NAMESPACE = 'portfolio';

const clone = (value) =>
  value == null ? value : structuredClone(value);

const nowIso = () => new Date().toISOString();

const isFiniteNumber = (value) =>
  typeof value === 'number' && Number.isFinite(value);

const requireId = (value, fieldName) => {
  const id = String(value ?? '').trim();

  if (!id) {
    throw new Error(`${fieldName} is required`);
  }

  return id;
};

const normalizeStatus = (status = 'ACTIVE') => {
  const value = String(status).toUpperCase();

  const allowed = new Set([
    'ACTIVE',
    'INACTIVE',
    'CLOSED',
    'ARCHIVED',
  ]);

  if (!allowed.has(value)) {
    throw new Error(`Invalid portfolio status: ${value}`);
  }

  return value;
};

const normalizeHolding = (input) => {
  if (!input || typeof input !== 'object') {
    throw new Error('Holding must be an object');
  }

  const securityId = requireId(
    input.securityId ?? input.ticker ?? input.symbol,
    'holding.securityId'
  );

  if (!isFiniteNumber(input.quantity) || input.quantity < 0) {
    throw new Error(`Invalid quantity for holding ${securityId}`);
  }

  const holding = {
    securityId,
    quantity: input.quantity,
  };

  if (input.ticker !== undefined) {
    holding.ticker = String(input.ticker);
  }

  if (input.symbol !== undefined) {
    holding.symbol = String(input.symbol);
  }

  if (input.currency !== undefined) {
    holding.currency = String(input.currency);
  }

  /*
   * These values are accepted only when supplied by an
   * authoritative upstream source.
   *
   * This repository NEVER calculates them.
   */
  const financialFields = [
    'marketValue',
    'costBasis',
    'unrealizedPnL',
    'unrealizedPnLPct',
  ];

  for (const field of financialFields) {
    if (input[field] !== undefined) {
      if (!isFiniteNumber(input[field])) {
        throw new Error(
          `Invalid ${field} for holding ${securityId}`
        );
      }

      holding[field] = input[field];
    }
  }

  if (input.asOf !== undefined) {
    holding.asOf = input.asOf;
  }

  if (input.freshness !== undefined) {
    holding.freshness = input.freshness;
  }

  if (input.provenance !== undefined) {
    holding.provenance = clone(input.provenance);
  }

  if (input.source !== undefined) {
    holding.source = String(input.source);
  }

  if (input.sourceId !== undefined) {
    holding.sourceId = String(input.sourceId);
  }

  return holding;
};

const normalizeHoldings = (holdings = []) => {
  if (!Array.isArray(holdings)) {
    throw new Error('holdings must be an array');
  }

  return holdings.map(normalizeHolding);
};

const reconcileHolding = (holding) =>
  normalizeHolding(holding);

const reconcilePortfolioHoldings = (holdings) =>
  normalizeHoldings(holdings).map(reconcileHolding);

const assertNoSyntheticFinancialFallback = (
  value,
  path = 'portfolio'
) => {
  if (value === null || value === undefined) {
    return;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(
        `Non-finite financial value at ${path}`
      );
    }

    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      assertNoSyntheticFinancialFallback(
        item,
        `${path}[${index}]`
      );
    });

    return;
  }

  if (typeof value !== 'object') {
    return;
  }

  const financialFields = new Set([
    'marketValue',
    'costBasis',
    'unrealizedPnL',
    'unrealizedPnLPct',
    'realizedPnL',
    'return',
    'returnPct',
    'twr',
    'mwr',
    'volatility',
    'sharpeRatio',
    'trackingError',
    'var95',
    'var99',
    'es95',
    'es99',
    'drawdown',
    'activeReturn',
    'benchmarkReturn',
    'expectedReturn',
  ]);

  for (const [key, child] of Object.entries(value)) {
    if (
      financialFields.has(key) &&
      child !== null &&
      child !== undefined
    ) {
      if (
        typeof child !== 'number' ||
        !Number.isFinite(child)
      ) {
        throw new Error(
          `Invalid financial value at ${path}.${key}`
        );
      }
    }

    assertNoSyntheticFinancialFallback(
      child,
      `${path}.${key}`
    );
  }
};

const hashObject = (value) =>
  crypto
    .createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex');

export class PortfolioRepository {
  constructor(options = {}) {
    this.storage =
      options.storage ??
      getPersistentStore() ??
      defaultStorageAdapter;

    this.namespace =
      options.namespace ?? PORTFOLIO_NAMESPACE;

    /*
     * IMPORTANT:
     *
     * There is intentionally NO seed/demo data.
     *
     * Production starts empty.
     * Tests must explicitly inject fixtures.
     */
  }

  _key(portfolioId) {
    return `${this.namespace}:${portfolioId}`;
  }

  _snapshotKey(portfolioId, snapshotId) {
    return `${this.namespace}:${portfolioId}:snapshot:${snapshotId}`;
  }

  _serialize(portfolio) {
    const serialized = {
      ...clone(portfolio),
      holdings: reconcilePortfolioHoldings(
        portfolio.holdings ?? []
      ),
    };

    assertNoSyntheticFinancialFallback(serialized);

    return serialized;
  }

  _validatePortfolio(portfolio) {
    if (!portfolio || typeof portfolio !== 'object') {
      throw new Error('Portfolio is required');
    }

    requireId(portfolio.id, 'portfolio.id');
    requireId(
      portfolio.organizationId,
      'portfolio.organizationId'
    );
    requireId(
      portfolio.workspaceId,
      'portfolio.workspaceId'
    );

    if (!String(portfolio.name ?? '').trim()) {
      throw new Error('portfolio.name is required');
    }

    if (!Array.isArray(portfolio.holdings)) {
      throw new Error('portfolio.holdings must be an array');
    }

    assertNoSyntheticFinancialFallback(portfolio);

    return true;
  }

  async createPortfolio(input) {
    if (!input || typeof input !== 'object') {
      throw new Error('Portfolio input is required');
    }

    const id = requireId(input.id, 'portfolio.id');

    const organizationId = requireId(
      input.organizationId,
      'portfolio.organizationId'
    );

    const workspaceId = requireId(
      input.workspaceId,
      'portfolio.workspaceId'
    );

    const existing = await this.getPortfolioById(id, {
      organizationId,
      workspaceId,
    });

    if (existing) {
      throw new Error(
        `Portfolio already exists: ${id}`
      );
    }

    const timestamp = nowIso();

    const portfolio = {
      id,
      organizationId,
      workspaceId,

      name: String(input.name).trim(),

      description:
        input.description === undefined
          ? undefined
          : String(input.description),

      baseCurrency:
        input.baseCurrency === undefined
          ? undefined
          : String(input.baseCurrency),

      status: normalizeStatus(input.status),

      holdings: reconcilePortfolioHoldings(
        input.holdings ?? []
      ),

      metadata: clone(input.metadata ?? {}),

      createdAt: input.createdAt ?? timestamp,
      updatedAt: timestamp,

      version: 1,
    };

    this._validatePortfolio(portfolio);

    const serialized = this._serialize(portfolio);

    await this.storage.set(
      this._key(id),
      serialized
    );

    return clone(serialized);
  }

  async getPortfolioById(
    portfolioId,
    context = {}
  ) {
    const id = requireId(
      portfolioId,
      'portfolioId'
    );

    const portfolio = await this.storage.get(
      this._key(id)
    );

    if (!portfolio) {
      return null;
    }

    if (
      context.organizationId &&
      portfolio.organizationId !==
        context.organizationId
    ) {
      return null;
    }

    if (
      context.workspaceId &&
      portfolio.workspaceId !==
        context.workspaceId
    ) {
      return null;
    }

    return clone(portfolio);
  }

  async requirePortfolioById(
    portfolioId,
    context = {}
  ) {
    const portfolio =
      await this.getPortfolioById(
        portfolioId,
        context
      );

    if (!portfolio) {
      throw new Error(
        `Portfolio not found: ${portfolioId}`
      );
    }

    return portfolio;
  }

  async listPortfolios(context = {}) {
    const records = await this.storage.list(
      `${this.namespace}:`
    );

    return records
      .map((record) =>
        record?.value !== undefined
          ? record.value
          : record
      )
      .filter(Boolean)
      .filter((portfolio) => {
        if (
          context.organizationId &&
          portfolio.organizationId !==
            context.organizationId
        ) {
          return false;
        }

        if (
          context.workspaceId &&
          portfolio.workspaceId !==
            context.workspaceId
        ) {
          return false;
        }

        return true;
      })
      .map(clone);
  }

  async updatePortfolio(
    portfolioId,
    patch,
    context = {}
  ) {
    const id = requireId(
      portfolioId,
      'portfolioId'
    );

    if (!patch || typeof patch !== 'object') {
      throw new Error('Portfolio patch is required');
    }

    const existing =
      await this.requirePortfolioById(
        id,
        context
      );

    const next = {
      ...existing,
      ...clone(patch),

      // Immutable identity / tenancy fields.
      id: existing.id,
      organizationId: existing.organizationId,
      workspaceId: existing.workspaceId,

      updatedAt: nowIso(),
      version: (existing.version ?? 0) + 1,
    };

    if (patch.holdings !== undefined) {
      next.holdings =
        reconcilePortfolioHoldings(
          patch.holdings
        );
    }

    if (patch.status !== undefined) {
      next.status = normalizeStatus(
        patch.status
      );
    }

    this._validatePortfolio(next);

    const serialized = this._serialize(next);

    await this.storage.set(
      this._key(id),
      serialized
    );

    return clone(serialized);
  }

  async updateStatus(
    portfolioId,
    status,
    context = {}
  ) {
    return this.updatePortfolio(
      portfolioId,
      {
        status: normalizeStatus(status),
      },
      context
    );
  }

  async updateHoldings(
    portfolioId,
    holdings,
    context = {}
  ) {
    return this.updatePortfolio(
      portfolioId,
      {
        holdings:
          reconcilePortfolioHoldings(
            holdings
          ),
      },
      context
    );
  }

  async replaceHoldings(
    portfolioId,
    holdings,
    context = {}
  ) {
    return this.updateHoldings(
      portfolioId,
      holdings,
      context
    );
  }

  async createSnapshot(
    portfolioId,
    snapshot,
    context = {}
  ) {
    const portfolio =
      await this.requirePortfolioById(
        portfolioId,
        context
      );

    if (!snapshot || typeof snapshot !== 'object') {
      throw new Error('snapshot is required');
    }

    const snapshotId = requireId(
      snapshot.id,
      'snapshot.id'
    );

    const record = {
      id: snapshotId,
      portfolioId: portfolio.id,
      organizationId:
        portfolio.organizationId,
      workspaceId:
        portfolio.workspaceId,

      asOf: snapshot.asOf ?? nowIso(),
      createdAt: nowIso(),

      source:
        snapshot.source ??
        'AUTHORITATIVE',

      data: clone(snapshot.data ?? {}),
    };

    assertNoSyntheticFinancialFallback(record);

    record.integrityHash =
      hashObject(record);

    await this.storage.set(
      this._snapshotKey(
        portfolio.id,
        snapshotId
      ),
      record
    );

    return clone(record);
  }

  async getSnapshot(
    portfolioId,
    snapshotId,
    context = {}
  ) {
    const portfolio =
      await this.requirePortfolioById(
        portfolioId,
        context
      );

    const id = requireId(
      snapshotId,
      'snapshotId'
    );

    const snapshot =
      await this.storage.get(
        this._snapshotKey(
          portfolio.id,
          id
        )
      );

    return snapshot
      ? clone(snapshot)
      : null;
  }

  async listSnapshots(
    portfolioId,
    context = {}
  ) {
    const portfolio =
      await this.requirePortfolioById(
        portfolioId,
        context
      );

    const prefix =
      `${this.namespace}:${portfolio.id}:snapshot:`;

    const records =
      await this.storage.list(prefix);

    return records
      .map((record) =>
        record?.value !== undefined
          ? record.value
          : record
      )
      .filter(Boolean)
      .map(clone);
  }

  async deletePortfolio(
    portfolioId,
    context = {}
  ) {
    /*
     * Institutional records are not physically deleted.
     * Deletion means lifecycle archival.
     */
    return this.updateStatus(
      portfolioId,
      'ARCHIVED',
      context
    );
  }

  async health() {
    if (
      this.storage &&
      typeof this.storage.health === 'function'
    ) {
      return this.storage.health();
    }

    return {
      status: 'UNKNOWN',
    };
  }
}

export const portfolioRepository =
  new PortfolioRepository();

export {
  normalizeHolding,
  normalizeHoldings,
  reconcileHolding,
  reconcilePortfolioHoldings,
  assertNoSyntheticFinancialFallback,
};