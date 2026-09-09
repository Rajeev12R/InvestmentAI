import crypto from 'crypto';

class ResearchCache {
  constructor(maxEntries = 200, ttlMs = 1000 * 60 * 30) { // 30 mins TTL
    this.cache = new Map();
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
  }

  generateKey({ ticker = '', packageHash = '', question = '', investorProfile = '' }) {
    const raw = `${String(ticker).toUpperCase()}_${packageHash}_${String(question).toLowerCase()}_${JSON.stringify(investorProfile)}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  get(key) {
    if (!this.cache.has(key)) return null;
    const entry = this.cache.get(key);
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key, data) {
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clear() {
    this.cache.clear();
  }
}

export const researchCache = new ResearchCache();
