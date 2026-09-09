import crypto from 'crypto';
import { SignalDirection, SignalType, SignalStatus, computeSignalHash, deepFreeze } from './signal.types.js';
import { defaultSignalStore } from './signal.store.js';

export class SignalNormalizationEngine {
  constructor(store = defaultSignalStore) {
    this.store = store;
  }

  /**
   * Normalize an arbitrary raw input to [-1.0, +1.0] scale with full parameter preservation.
   */
  normalizeInput(tenantId = 'tenant_default', {
    inputId,
    entityId,
    signalType = SignalType.FUNDAMENTAL_SIGNAL,
    originalValue,
    originalUnits, // e.g. 'PERCENT', 'BPS', 'USD', 'SCORE_0_100', 'REGIME_CODE'
    normalizationMethod = 'LINEAR_SCALED', // 'LINEAR_SCALED', 'SIGMOID', 'Z_SCORE', 'ENUM_MAP'
    parameters = {}, // e.g. { min: -0.20, max: 0.20, clip: true }
    evidenceIds = [],
    knowledgeCutoff = new Date().toISOString()
  }) {
    if (originalValue === undefined || originalValue === null) {
      throw new Error('normalizeInput requires originalValue');
    }
    if (!originalUnits) throw new Error('normalizeInput requires originalUnits');

    let rawScore = 0;
    let isClipped = false;

    if (normalizationMethod === 'LINEAR_SCALED') {
      const min = parameters.min !== undefined ? parameters.min : -1.0;
      const max = parameters.max !== undefined ? parameters.max : 1.0;
      const midpoint = (max + min) / 2;
      const halfRange = (max - min) / 2 || 1;
      rawScore = (Number(originalValue) - midpoint) / halfRange;
    } else if (normalizationMethod === 'SIGMOID') {
      const k = parameters.k !== undefined ? parameters.k : 1.0;
      const x0 = parameters.x0 !== undefined ? parameters.x0 : 0.0;
      const sig = 1 / (1 + Math.exp(-k * (Number(originalValue) - x0)));
      rawScore = 2 * (sig - 0.5); // Maps [0, 1] to [-1, 1]
    } else if (normalizationMethod === 'ENUM_MAP') {
      const map = parameters.enumMap || {
        'STRONGLY_POSITIVE': 1.0,
        'POSITIVE': 0.5,
        'NEUTRAL': 0.0,
        'NEGATIVE': -0.5,
        'STRONGLY_NEGATIVE': -1.0,
        'EXPANSION': 0.8,
        'SLOWDOWN': -0.4,
        'CONTRACTION': -0.8,
        'RECOVERY': 0.5
      };
      rawScore = map[String(originalValue)] !== undefined ? map[String(originalValue)] : 0.0;
    } else if (normalizationMethod === 'PERCENT_SURPRISE') {
      // E.g., +10% surprise -> +1.0 (capped at +/-10%)
      const cap = parameters.capPct || 0.10;
      rawScore = Number(originalValue) / cap;
    } else {
      rawScore = Number(originalValue);
    }

    if (isNaN(rawScore)) rawScore = 0.0;

    let normalizedValue = rawScore;
    if (rawScore > 1.0) {
      normalizedValue = 1.0;
      isClipped = true;
    } else if (rawScore < -1.0) {
      normalizedValue = -1.0;
      isClipped = true;
    }

    // Round to 4 decimal places for determinism
    normalizedValue = parseFloat(normalizedValue.toFixed(4));
    const rawNormalized = parseFloat(rawScore.toFixed(4));

    let direction = SignalDirection.NEUTRAL;
    if (normalizedValue >= 0.6) direction = SignalDirection.STRONGLY_POSITIVE;
    else if (normalizedValue >= 0.15) direction = SignalDirection.POSITIVE;
    else if (normalizedValue <= -0.6) direction = SignalDirection.STRONGLY_NEGATIVE;
    else if (normalizedValue <= -0.15) direction = SignalDirection.NEGATIVE;

    const id = inputId || `norm_${computeSignalHash({ entityId, originalValue, normalizationMethod }).slice(0, 16)}`;
    const normalizedRecord = {
      inputId: id,
      entityId,
      signalType,
      originalValue,
      originalUnits,
      normalizationMethod,
      parameters,
      rawNormalizedScore: rawNormalized,
      normalizedValue,
      isClipped,
      direction,
      evidenceIds,
      knowledgeCutoff,
      methodologyVersion: '2026.1',
      normalizedAt: knowledgeCutoff || new Date().toISOString(),
      version: 1
    };

    return this.store.saveNormalizedInput(tenantId, normalizedRecord);
  }
}

export const defaultNormalizationEngine = new SignalNormalizationEngine();
