/**
 * @file news.adapter.js
 * Normalized Institutional News Adapter with Deterministic Deduplication for Phase 10.
 */

import crypto from 'crypto';
import { BaseProviderAdapter } from './base.adapter.js';
import { SourceTier, SourceCategory } from '../source.types.js';
import { sourceRegistry } from '../sourceRegistry.js';

export class NewsAdapter extends BaseProviderAdapter {
  constructor() {
    super({
      sourceId: 'SRC-GNEWS-FEED',
      sourceName: 'Google News Syndicate',
      tier: SourceTier.TIER_3_SECONDARY,
      category: SourceCategory.NEWS
    });
    this.seenArticles = new Set();
  }

  generateDeduplicationKey({ ticker, title, publisher, publishedAt, url }) {
    const raw = `${ticker}:${publisher}:${title}:${url || ''}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  async getNews(ticker, { limit = 10 } = {}) {
    if (!ticker) throw new Error('ticker is required for news lookup');
    const cb = sourceRegistry.getCircuitBreaker(this.sourceId);

    return await cb.execute(async () => {
      const sampleHeadlines = {
        'AAPL': [
          { title: 'Apple Expands AI Services Infrastructure with New Datacenter Investment', publisher: 'Reuters', url: 'https://reuters.com/tech/aapl-ai-2026' },
          { title: 'Supply Chain Reports Stable Demand for High-End iPhone Units', publisher: 'Bloomberg', url: 'https://bloomberg.com/news/aapl-supply-2026' }
        ],
        'RELIANCE.NS': [
          { title: 'Reliance Retail Expands Omnichannel Fulfillment Network across Tier-2 Cities', publisher: 'Economic Times', url: 'https://economictimes.com/reliance-retail-2026' }
        ]
      };

      const rawItems = sampleHeadlines[ticker.toUpperCase()] || [
        { title: `${ticker.toUpperCase()} Management Reports Steady Operating Progress in Latest Quarter`, publisher: 'MarketWatch', url: `https://marketwatch.com/story/${ticker.toLowerCase()}-update` }
      ];

      const deduplicated = [];
      for (const item of rawItems) {
        const publishedAt = new Date().toISOString();
        const deduplicationKey = this.generateDeduplicationKey({
          ticker: ticker.toUpperCase(),
          title: item.title,
          publisher: item.publisher,
          publishedAt,
          url: item.url
        });

        const isDuplicate = this.seenArticles.has(deduplicationKey);
        this.seenArticles.add(deduplicationKey);

        const eventId = `EVT-NEWS-${deduplicationKey.slice(0, 12)}`;
        deduplicated.push({
          id: eventId,
          ticker: ticker.toUpperCase(),
          title: item.title,
          publisher: item.publisher,
          url: item.url,
          publishedAt,
          sourceId: this.sourceId,
          sourceTier: this.tier,
          deduplicationKey,
          isDuplicate,
          isAccountingFact: false // Invariant: news does not create accounting truth
        });
      }

      return {
        ticker: ticker.toUpperCase(),
        sourceId: this.sourceId,
        count: deduplicated.length,
        articles: deduplicated
      };
    });
  }
}

export const newsAdapter = new NewsAdapter();
