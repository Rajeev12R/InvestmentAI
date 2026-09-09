import crypto from 'crypto';
import {
  SignalRegime,
  SignalDirection,
  SignalStatus,
  DivergenceType,
  computeSignalHash,
  deepFreeze
} from './signal.types.js';
import { defaultSignalStore } from './signal.store.js';
import { defaultIndependenceEngine } from './signal.independence.engine.js';

export class SignalFusionEngine {
  constructor(store = defaultSignalStore, independence = defaultIndependenceEngine) {
    this.store = store;
    this.independence = independence;
  }

  /**
   * Compute Temporal Exponential or Half-Life Decay on a signal
   */
  applyDecay({
    normalizedValue,
    signalAgeDays = 0,
    halfLifeDays = 30,
    decayModel = 'EXPONENTIAL_HALF_LIFE'
  }) {
    if (signalAgeDays <= 0 || halfLifeDays <= 0) {
      return { decayedValue: normalizedValue, decayFactor: 1.0 };
    }
    // Formula: Decayed = Value * (0.5)^(age / halfLife)
    const decayFactor = Math.pow(0.5, signalAgeDays / halfLifeDays);
    const decayedValue = parseFloat((normalizedValue * decayFactor).toFixed(4));
    return {
      decayedValue,
      decayFactor: parseFloat(decayFactor.toFixed(4))
    };
  }

  /**
   * Fuse Multiple Normalized Signals into an Evidence-Backed Composite Signal
   */
  fuseSignals(tenantId = 'tenant_default', {
    entityId,
    signals = [], // Array of normalized inputs or sub-signals
    weightConfig = null, // { weights: { [signalType]: number }, methodologyVersion: '2026.1' }
    knowledgeCutoff = new Date().toISOString()
  }) {
    if (!entityId) throw new Error('fuseSignals requires entityId');
    if (!signals || signals.length === 0) {
      return {
        compositeSignalId: `comp_${crypto.randomBytes(8).toString('hex')}`,
        entityId,
        score: 0.0,
        regime: SignalRegime.UNAVAILABLE,
        direction: SignalDirection.UNKNOWN,
        confidence: 0.0,
        status: SignalStatus.UNAVAILABLE,
        contributors: [],
        conflicts: [],
        divergences: [],
        knowledgeCutoff,
        methodologyVersion: '2026.1',
        fusedAt: new Date().toISOString()
      };
    }

    // 1. Analyze Independence and Shared Fact Dependencies
    const independenceAnalysis = this.independence.analyzeIndependence(tenantId, {
      entityId,
      inputs: signals
    });

    // 2. Weights Handling (equal weight default if not supplied)
    const defaultWeight = 1.0 / signals.length;
    const weights = weightConfig?.weights || {};

    let totalRawWeight = 0;
    const preparedSignals = signals.map(s => {
      const type = s.signalType || 'GENERIC';
      const userWeight = weights[type] !== undefined ? weights[type] : (weights[s.inputId] !== undefined ? weights[s.inputId] : (s.weight !== undefined ? s.weight : defaultWeight));
      const id = s.inputId || s.signalId;
      const independenceAdj = independenceAnalysis.effectiveWeightsAdjustment[id] !== undefined ? independenceAnalysis.effectiveWeightsAdjustment[id] : 1.0;

      // Temporal Decay
      const ageDays = s.ageDays || (s.publicationTimestamp ? (new Date(knowledgeCutoff) - new Date(s.publicationTimestamp)) / (1000 * 60 * 60 * 24) : 0);
      const halfLife = s.halfLifeDays || 30;
      const { decayedValue, decayFactor } = this.applyDecay({
        normalizedValue: s.normalizedValue !== undefined ? s.normalizedValue : (s.score || 0),
        signalAgeDays: ageDays,
        halfLifeDays: halfLife
      });

      const effectiveWeight = userWeight * independenceAdj;
      totalRawWeight += effectiveWeight;

      return {
        ...s,
        id,
        decayedValue,
        decayFactor,
        userWeight,
        independenceAdj,
        effectiveWeight
      };
    });

    // Normalize weights to sum to 1.0 if totalRawWeight > 0
    const normalizedWeightFactor = totalRawWeight > 0 ? 1.0 / totalRawWeight : 1.0;

    let compositeScore = 0;
    let positiveWeightSum = 0;
    let negativeWeightSum = 0;
    let positiveCount = 0;
    let negativeCount = 0;
    const contributors = [];

    for (const s of preparedSignals) {
      const finalWeight = parseFloat((s.effectiveWeight * normalizedWeightFactor).toFixed(4));
      const contribution = parseFloat((s.decayedValue * finalWeight).toFixed(4));
      compositeScore += contribution;

      if (s.decayedValue > 0.1) {
        positiveWeightSum += finalWeight;
        positiveCount++;
      } else if (s.decayedValue < -0.1) {
        negativeWeightSum += finalWeight;
        negativeCount++;
      }

      contributors.push({
        inputId: s.id,
        signalType: s.signalType,
        originalValue: s.originalValue,
        normalizedValue: s.normalizedValue,
        decayedValue: s.decayedValue,
        weight: finalWeight,
        contribution,
        evidenceIds: s.evidenceIds || []
      });
    }

    compositeScore = parseFloat(compositeScore.toFixed(4));

    // 3. Conflict Analysis (Significant Positive vs Significant Negative)
    const hasConflict = (positiveWeightSum >= 0.25 && negativeWeightSum >= 0.25) || (positiveCount >= 1 && negativeCount >= 1 && Math.abs(positiveWeightSum - negativeWeightSum) < 0.35);

    // 4. Regime Determination
    let regime = SignalRegime.MIXED;
    if (hasConflict) {
      regime = SignalRegime.MIXED;
    } else if (compositeScore >= 0.50) {
      regime = SignalRegime.STRONG_POSITIVE;
    } else if (compositeScore >= 0.15) {
      regime = SignalRegime.POSITIVE;
    } else if (compositeScore <= -0.50) {
      regime = SignalRegime.STRONG_NEGATIVE;
    } else if (compositeScore <= -0.15) {
      regime = SignalRegime.NEGATIVE;
    } else {
      regime = SignalRegime.MIXED;
    }

    let direction = SignalDirection.NEUTRAL;
    if (regime === SignalRegime.STRONG_POSITIVE) direction = SignalDirection.STRONGLY_POSITIVE;
    else if (regime === SignalRegime.POSITIVE) direction = SignalDirection.POSITIVE;
    else if (regime === SignalRegime.STRONG_NEGATIVE) direction = SignalDirection.STRONGLY_NEGATIVE;
    else if (regime === SignalRegime.NEGATIVE) direction = SignalDirection.NEGATIVE;
    else if (hasConflict) direction = SignalDirection.CONFLICTED;

    // 5. Divergence Detection
    const divergences = this.detectDivergences(signals);

    // 6. Confidence Score
    // Confidence combines sample diversity and absence of direct contradiction
    const confidence = parseFloat((independenceAnalysis.evidenceDiversityScore * (hasConflict ? 0.5 : 0.95)).toFixed(3));

    const compositeSignalId = `comp_${computeSignalHash({ entityId, compositeScore, knowledgeCutoff, signals: signals.map(s => s.id || s.inputId) }).slice(0, 16)}`;

    const compositeRecord = {
      compositeSignalId,
      entityId,
      score: compositeScore,
      regime,
      direction,
      confidence,
      status: hasConflict ? SignalStatus.CONFLICTED : SignalStatus.VALIDATED,
      hasConflict,
      positiveWeightSum: parseFloat(positiveWeightSum.toFixed(3)),
      negativeWeightSum: parseFloat(negativeWeightSum.toFixed(3)),
      evidenceDiversityScore: independenceAnalysis.evidenceDiversityScore,
      independentEffectiveCount: independenceAnalysis.independentEffectiveCount,
      dependencyGroups: independenceAnalysis.dependencyGroups,
      contributors,
      divergences,
      knowledgeCutoff,
      methodologyVersion: '2026.1',
      fusedAt: knowledgeCutoff || new Date().toISOString()
    };

    return this.store.saveCompositeSignal(tenantId, compositeRecord);
  }

  /**
   * Detect First-Class Multi-Domain Divergences
   */
  detectDivergences(signals = []) {
    const divergences = [];
    const sigMap = {};
    for (const s of signals) {
      if (s.signalType) sigMap[s.signalType] = s;
    }

    // 1. Valuation vs Fundamentals Divergence
    if (sigMap['VALUATION_SIGNAL'] && sigMap['FUNDAMENTAL_SIGNAL']) {
      const val = sigMap['VALUATION_SIGNAL'].normalizedValue || 0;
      const fund = sigMap['FUNDAMENTAL_SIGNAL'].normalizedValue || 0;
      if (val >= 0.4 && fund <= -0.3) {
        divergences.push({
          divergenceId: `div_val_fund_${crypto.randomBytes(4).toString('hex')}`,
          divergenceType: DivergenceType.VALUATION_VS_FUNDAMENTALS,
          severity: 'HIGH',
          description: 'Cheap valuation multiple contradicted by deteriorating fundamental metrics',
          components: ['VALUATION_SIGNAL', 'FUNDAMENTAL_SIGNAL'],
          observedDifference: parseFloat((val - fund).toFixed(3))
        });
      }
    }

    // 2. Earnings vs Alternative Data Divergence
    if (sigMap['EARNINGS_SIGNAL'] && sigMap['ALTERNATIVE_DATA_SIGNAL']) {
      const earn = sigMap['EARNINGS_SIGNAL'].normalizedValue || 0;
      const alt = sigMap['ALTERNATIVE_DATA_SIGNAL'].normalizedValue || 0;
      if (earn >= 0.3 && alt <= -0.3) {
        divergences.push({
          divergenceId: `div_earn_alt_${crypto.randomBytes(4).toString('hex')}`,
          divergenceType: DivergenceType.EARNINGS_VS_ALTERNATIVE_DATA,
          severity: 'MEDIUM',
          description: 'Reported earnings growth diverged from weakening external alternative demand data',
          components: ['EARNINGS_SIGNAL', 'ALTERNATIVE_DATA_SIGNAL'],
          observedDifference: parseFloat((earn - alt).toFixed(3))
        });
      }
    }

    // 3. Macro vs Company Specific Divergence
    if (sigMap['MACRO_SIGNAL'] && (sigMap['GROWTH_SIGNAL'] || sigMap['FUNDAMENTAL_SIGNAL'])) {
      const macro = sigMap['MACRO_SIGNAL'].normalizedValue || 0;
      const growth = (sigMap['GROWTH_SIGNAL'] || sigMap['FUNDAMENTAL_SIGNAL']).normalizedValue || 0;
      if (macro <= -0.4 && growth >= 0.4) {
        divergences.push({
          divergenceId: `div_macro_co_${crypto.randomBytes(4).toString('hex')}`,
          divergenceType: DivergenceType.MACRO_VS_COMPANY,
          severity: 'MEDIUM',
          description: 'Company-specific growth acceleration resisting broader macro regime headwinds',
          components: ['MACRO_SIGNAL', 'GROWTH_SIGNAL'],
          observedDifference: parseFloat((growth - macro).toFixed(3))
        });
      }
    }

    return divergences;
  }
}

export const defaultFusionEngine = new SignalFusionEngine();
