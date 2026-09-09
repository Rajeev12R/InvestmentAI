/**
 * @file secretManager.js
 * Secret Management, Classification & Leak Detection for Phase 9 Institutional Security.
 */

export const ConfigClassification = Object.freeze({
  PUBLIC_CONFIG: 'PUBLIC_CONFIG',
  SERVER_CONFIG: 'SERVER_CONFIG',
  SECRET: 'SECRET'
});

class SecretManager {
  constructor() {
    this.secretKeys = new Set([
      'GEMINI_API_KEY',
      'API_KEY',
      'SECRET',
      'PASSWORD',
      'TOKEN',
      'AUTH_SECRET',
      'DATABASE_URL',
      'SESSION_SECRET'
    ]);
  }

  isSecretKey(key) {
    if (!key) return false;
    const cleanKey = key.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return Array.from(this.secretKeys).some(s => {
      const cleanSecret = s.toUpperCase().replace(/[^A-Z0-9]/g, '');
      return cleanKey.includes(cleanSecret);
    });
  }

  maskSecret(val) {
    if (!val || typeof val !== 'string') return '***';
    if (val.length <= 8) return '***';
    return `${val.slice(0, 4)}...${val.slice(-4)}`;
  }

  sanitizeObject(obj, depth = 0) {
    if (!obj || typeof obj !== 'object' || depth > 8) return obj;
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item, depth + 1));
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (this.isSecretKey(key)) {
        sanitized[key] = '[REDACTED_SECRET]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value, depth + 1);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  detectSecretLeak(text) {
    if (typeof text !== 'string') return { hasLeak: false };

    // Patterns: API keys, raw bearer tokens, password hashes
    const patterns = [
      /AIzaSy[0-9A-Za-z_-]{33}/g, // Google API key pattern
      /inv_live_[0-9a-f]{48}/g, // InvestmentAI live key
      /Bearer\s+[0-9a-f]{64}/g, // Raw bearer session token
      /-----BEGIN (RSA|EC|PRIVATE) KEY-----/g // Private keys
    ];

    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return { hasLeak: true, pattern: pattern.toString() };
      }
    }
    return { hasLeak: false };
  }
}

export const secretManager = new SecretManager();
