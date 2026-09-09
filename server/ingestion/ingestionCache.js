import { researchCache } from '../research/researchCache.js';

class IngestionCache {
  constructor() {
    this.eventCache = new Map();
    this.invalidations = [];
  }

  /**
   * Invalidates downstream caches for a ticker when a new Truth Package hash is minted.
   */
  invalidateDownstreamCaches(ticker, newPackageHash = '') {
    if (!ticker) return;
    // Clear research cache entries for this ticker
    researchCache.clear();
    this.invalidations.push({ ticker, newPackageHash, timestamp: new Date().toISOString() });
    const hashSummary = typeof newPackageHash === 'string' && newPackageHash.length > 0 ? `${newPackageHash.substring(0, 10)}...` : 'N/A';
    console.log(`[IngestionCache] Invalidated downstream caches for ${ticker} (New Hash: ${hashSummary})`);
  }

  invalidate(ticker, newPackageHash) {
    return this.invalidateDownstreamCaches(ticker, newPackageHash);
  }

  getStats() {
    const trackedTickers = Array.from(new Set(this.invalidations.map(i => i.ticker)));
    return {
      totalInvalidations: this.invalidations.length,
      trackedTickers,
      recent: this.invalidations.slice(-10)
    };
  }
}

export const ingestionCache = new IngestionCache();

