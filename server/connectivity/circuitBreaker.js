/**
 * @file circuitBreaker.js
 * Provider-Level Circuit Breaker & Resilience Engine for Phase 10.
 */

import { CircuitState } from './source.types.js';

export class CircuitBreaker {
  constructor({
    name,
    failureThreshold = 5,
    cooldownPeriodMs = 30000,
    cooldownMs = null,
    halfOpenSuccessThreshold = 2
  } = {}) {
    this.name = name || 'DEFAULT_PROVIDER_CIRCUIT';
    this.failureThreshold = failureThreshold;
    this.cooldownPeriodMs = cooldownMs || cooldownPeriodMs;
    this.halfOpenSuccessThreshold = halfOpenSuccessThreshold;

    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.consecutiveSuccesses = 0;
    this.lastStateChange = Date.now();
    this.lastFailureTime = null;
    this.metrics = {
      totalRequests: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      trippedCount: 0
    };
  }

  async execute(fn, fallbackFn = null) {
    this.metrics.totalRequests++;
    const now = Date.now();

    // Check if cooldown expired in OPEN state -> transition to HALF_OPEN
    if (this.state === CircuitState.OPEN) {
      if (now - this.lastStateChange >= this.cooldownPeriodMs) {
        this.state = CircuitState.HALF_OPEN;
        this.lastStateChange = now;
        this.consecutiveSuccesses = 0;
      } else {
        if (typeof fallbackFn === 'function') {
          return await fallbackFn(new Error(`Circuit breaker '${this.name}' is OPEN`));
        }
        throw new Error(`Circuit breaker '${this.name}' is OPEN (cooling down)`);
      }
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (err) {
      this._onFailure(err);
      if (typeof fallbackFn === 'function') {
        return await fallbackFn(err);
      }
      throw err;
    }
  }

  _onSuccess() {
    this.metrics.totalSuccesses++;
    if (this.state === CircuitState.HALF_OPEN) {
      this.consecutiveSuccesses++;
      if (this.consecutiveSuccesses >= this.halfOpenSuccessThreshold) {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.lastStateChange = Date.now();
      }
    } else if (this.state === CircuitState.CLOSED) {
      this.failureCount = 0;
    }
  }

  _onFailure(err) {
    this.metrics.totalFailures++;
    this.lastFailureTime = Date.now();
    this.failureCount++;

    if (this.state === CircuitState.HALF_OPEN || this.failureCount >= this.failureThreshold) {
      if (this.state !== CircuitState.OPEN) {
        this.metrics.trippedCount++;
      }
      this.state = CircuitState.OPEN;
      this.lastStateChange = Date.now();
    }
  }

  recordFailure() {
    this._onFailure(new Error('Manual failure recorded'));
  }

  recordSuccess() {
    this._onSuccess();
  }

  allowRequest() {
    const now = Date.now();
    if (this.state === CircuitState.OPEN) {
      if (now - this.lastStateChange >= this.cooldownPeriodMs) {
        this.state = CircuitState.HALF_OPEN;
        this.lastStateChange = now;
        return true;
      }
      return false;
    }
    return true;
  }

  getState() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      metrics: { ...this.metrics },
      lastStateChange: new Date(this.lastStateChange).toISOString()
    };
  }

  getMetrics() {
    return this.getState();
  }

  reset() {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.consecutiveSuccesses = 0;
    this.lastStateChange = Date.now();
  }
}
