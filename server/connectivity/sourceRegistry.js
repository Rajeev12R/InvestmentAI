/**
 * @file sourceRegistry.js
 * Centralized Institutional Source Registry & Capability Matrix for Phase 10.
 */

import { SourceCategory, SourceTier, SourceStatus } from './source.types.js';
import { CircuitBreaker } from './circuitBreaker.js';

class SourceRegistry {
  constructor() {
    this.sources = new Map();
    this.circuitBreakers = new Map();
    this._initInstitutionalSources();
  }

  _initInstitutionalSources() {
    const defaultSources = [
      {
        id: 'SRC-SEC-EDGAR',
        name: 'SEC EDGAR System',
        provider: 'U.S. Securities and Exchange Commission',
        category: SourceCategory.FILINGS,
        jurisdiction: 'US',
        tier: SourceTier.TIER_1_PRIMARY,
        capabilities: {
          quotes: false,
          fundamentals: true,
          filings: true,
          corporateActions: true,
          news: false,
          fx: false,
          macro: false
        },
        authenticationType: 'USER_AGENT_HEADER',
        status: SourceStatus.HEALTHY,
        reliabilityScore: 0.99,
        freshnessPolicy: 'EVENT_DRIVEN',
        rateLimitPolicy: { maxPerSec: 10, windowMs: 1000 },
        license: {
          type: 'PUBLIC_DOMAIN_US_GOV',
          redistributionAllowed: true,
          internalUseAllowed: true,
          attributionRequired: true,
          retentionAllowed: true
        }
      },
      {
        id: 'SRC-YAHOO-FINANCE',
        name: 'Yahoo Finance Market Feed',
        provider: 'Yahoo Finance / RapidAPI',
        category: SourceCategory.MARKET_DATA,
        jurisdiction: 'GLOBAL',
        tier: SourceTier.TIER_3_SECONDARY,
        capabilities: {
          quotes: true,
          fundamentals: true,
          filings: false,
          corporateActions: true,
          news: true,
          fx: true,
          macro: false
        },
        authenticationType: 'API_KEY_OR_PUBLIC',
        status: SourceStatus.HEALTHY,
        reliabilityScore: 0.95,
        freshnessPolicy: 'POLLING_15_MIN',
        rateLimitPolicy: { maxPerMin: 120, windowMs: 60000 },
        license: {
          type: 'COMMERCIAL_API_LICENSE',
          redistributionAllowed: false,
          internalUseAllowed: true,
          attributionRequired: true,
          retentionAllowed: true
        }
      },
      {
        id: 'SRC-NSE-BSE-INDIA',
        name: 'National Stock Exchange of India (NSE/BSE)',
        provider: 'NSE India / BSE Direct',
        category: SourceCategory.FILINGS,
        jurisdiction: 'IN',
        tier: SourceTier.TIER_1_PRIMARY,
        capabilities: {
          quotes: true,
          fundamentals: true,
          filings: true,
          corporateActions: true,
          news: false,
          fx: false,
          macro: false
        },
        authenticationType: 'REGULATED_SESSION',
        status: SourceStatus.HEALTHY,
        reliabilityScore: 0.98,
        freshnessPolicy: 'EVENT_DRIVEN',
        rateLimitPolicy: { maxPerSec: 5, windowMs: 1000 },
        license: {
          type: 'REGULATED_EXCHANGE_DATA',
          redistributionAllowed: false,
          internalUseAllowed: true,
          attributionRequired: true,
          retentionAllowed: true
        }
      },
      {
        id: 'SRC-FRED-MACRO',
        name: 'Federal Reserve Economic Data (FRED)',
        provider: 'Federal Reserve Bank of St. Louis',
        category: SourceCategory.MACRO,
        jurisdiction: 'US',
        tier: SourceTier.TIER_2_REGULATED,
        capabilities: {
          quotes: false,
          fundamentals: false,
          filings: false,
          corporateActions: false,
          news: false,
          fx: true,
          macro: true
        },
        authenticationType: 'API_KEY',
        status: SourceStatus.HEALTHY,
        reliabilityScore: 0.99,
        freshnessPolicy: 'DAILY',
        rateLimitPolicy: { maxPerMin: 120, windowMs: 60000 },
        license: {
          type: 'PUBLIC_FEDERAL_DATA',
          redistributionAllowed: true,
          internalUseAllowed: true,
          attributionRequired: true,
          retentionAllowed: true
        }
      },
      {
        id: 'SRC-ECB-FX',
        name: 'European Central Bank FX Reference Feed',
        provider: 'European Central Bank',
        category: SourceCategory.FX,
        jurisdiction: 'EU',
        tier: SourceTier.TIER_2_REGULATED,
        capabilities: {
          quotes: false,
          fundamentals: false,
          filings: false,
          corporateActions: false,
          news: false,
          fx: true,
          macro: true
        },
        authenticationType: 'PUBLIC_XML',
        status: SourceStatus.HEALTHY,
        reliabilityScore: 0.99,
        freshnessPolicy: 'DAILY_16_00_CET',
        rateLimitPolicy: { maxPerMin: 60, windowMs: 60000 },
        license: {
          type: 'CENTRAL_BANK_PUBLIC_DATA',
          redistributionAllowed: true,
          internalUseAllowed: true,
          attributionRequired: true,
          retentionAllowed: true
        }
      },
      {
        id: 'SRC-GNEWS-FEED',
        name: 'Google News Syndicate',
        provider: 'Google News Aggregator',
        category: SourceCategory.NEWS,
        jurisdiction: 'GLOBAL',
        tier: SourceTier.TIER_3_SECONDARY,
        capabilities: {
          quotes: false,
          fundamentals: false,
          filings: false,
          corporateActions: false,
          news: true,
          fx: false,
          macro: false
        },
        authenticationType: 'PUBLIC_RSS',
        status: SourceStatus.HEALTHY,
        reliabilityScore: 0.92,
        freshnessPolicy: 'HOURLY',
        rateLimitPolicy: { maxPerMin: 60, windowMs: 60000 },
        license: {
          type: 'SYNDICATED_NEWS_FEED',
          redistributionAllowed: false,
          internalUseAllowed: true,
          attributionRequired: true,
          retentionAllowed: false
        }
      }
    ];

    for (const src of defaultSources) {
      this.registerSource(src);
    }
  }

  registerSource(sourceDef) {
    if (!sourceDef || !sourceDef.id || !sourceDef.name || !sourceDef.tier || !sourceDef.category) {
      throw new Error('Valid source definition with id, name, category, and tier is required');
    }
    this.sources.set(sourceDef.id, Object.freeze({
      rateLimitPerMin: sourceDef.rateLimitPolicy?.maxPerMin || 60,
      ...sourceDef
    }));
    this.circuitBreakers.set(sourceDef.id, new CircuitBreaker({ name: sourceDef.id }));
    return this.sources.get(sourceDef.id);
  }

  getSource(sourceId) {
    return this.sources.get(sourceId) || null;
  }

  listSources(category = null) {
    const list = Array.from(this.sources.values());
    if (category) {
      return list.filter(s => s.category === category);
    }
    return list;
  }

  getCircuitBreaker(sourceId) {
    return this.circuitBreakers.get(sourceId) || null;
  }

  getCapabilityMatrix() {
    const matrix = [];
    for (const src of this.sources.values()) {
      matrix.push({
        id: src.id,
        name: src.name,
        tier: src.tier,
        category: src.category,
        capabilities: { ...src.capabilities },
        status: src.status
      });
    }
    return matrix;
  }

  getSourceHealth() {
    const health = [];
    for (const [id, src] of this.sources.entries()) {
      const cb = this.circuitBreakers.get(id);
      health.push({
        sourceId: id,
        name: src.name,
        tier: src.tier,
        status: src.status,
        reliabilityScore: src.reliabilityScore,
        circuitBreaker: cb?.getState() || { state: 'UNKNOWN' }
      });
    }
    return health;
  }

  getSystemHealth() {
    return {
      totalSources: this.sources.size,
      healthySources: Array.from(this.sources.values()).filter(s => s.status === SourceStatus.HEALTHY).length,
      sources: this.getSourceHealth()
    };
  }
}

export const sourceRegistry = new SourceRegistry();
