/**
 * @file rateLimiter.engine.js
 * Multi-Tier Rate Limiting Engine for Phase 9 Institutional Security.
 */

class RateLimiter {
  constructor() {
    this.buckets = new Map(); // key -> { count, resetAt }
    this.tiers = {
      AUTH: { max: 10, windowMs: 60 * 1000 }, // 10 per min
      COPILOT: { max: 60, windowMs: 60 * 1000 }, // 60 per min
      RESEARCH: { max: 20, windowMs: 60 * 1000 }, // 20 per min
      INGESTION: { max: 30, windowMs: 60 * 1000 }, // 30 per min
      API_KEY: { max: 120, windowMs: 60 * 1000 }, // 120 per min
      GENERAL: { max: 100, windowMs: 60 * 1000 }
    };
  }

  checkRateLimit(key, tier = 'GENERAL') {
    const config = this.tiers[tier] || this.tiers.GENERAL;
    const now = Date.now();
    const bucketKey = `${tier}:${key}`;

    let bucket = this.buckets.get(bucketKey);
    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 1, resetAt: now + config.windowMs };
      this.buckets.set(bucketKey, bucket);
      return { isAllowed: true, remaining: config.max - 1, resetAt: bucket.resetAt };
    }

    if (bucket.count >= config.max) {
      return {
        isAllowed: false,
        remaining: 0,
        resetAt: bucket.resetAt,
        retryAfterMs: bucket.resetAt - now
      };
    }

    bucket.count++;
    return {
      isAllowed: true,
      remaining: config.max - bucket.count,
      resetAt: bucket.resetAt
    };
  }

  middleware(tier = 'GENERAL', keyExtractor = req => req.ip || req.headers['x-forwarded-for'] || 'client') {
    return (req, res, next) => {
      const key = keyExtractor(req);
      const check = this.checkRateLimit(key, tier);

      res.setHeader('X-RateLimit-Limit', this.tiers[tier]?.max || 100);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, check.remaining));
      res.setHeader('X-RateLimit-Reset', Math.ceil(check.resetAt / 1000));

      if (!check.isAllowed) {
        return res.status(429).json({
          error: 'Too Many Requests',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfterSeconds: Math.ceil(check.retryAfterMs / 1000)
        });
      }
      next();
    };
  }

  reset() {
    this.buckets.clear();
  }
}

export const rateLimiter = new RateLimiter();
