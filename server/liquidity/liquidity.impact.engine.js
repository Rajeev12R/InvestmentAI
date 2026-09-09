/**
 * Phase 18 — Institutional Market Impact Engine
 * Deterministic, versioned square-root and linear market impact models with full provenance.
 */

import { LiquidityStatus, ImpactModelType, LiquidityDataStatus, ValueStatus, deepFreeze } from './liquidity.types.js';
import { LIQUIDITY_POLICY_V1 } from './liquidity.config.js';
import { LiquidityValidationEngine } from './liquidity.validation.engine.js';

export class LiquidityImpactEngine {
  /**
   * Calculates estimated market impact for a given order notional and Dollar ADV.
   */
  static calculateMarketImpact(orderNotional, dollarAdv, options = {}) {
    const notionalVal = LiquidityValidationEngine.validateOrder(null, orderNotional, 1.0);
    if (!notionalVal.isValid) return notionalVal;

    const advVal = LiquidityValidationEngine.validateAdv(dollarAdv);
    if (!advVal.isValid) return advVal;

    const policy = options.policy || LIQUIDITY_POLICY_V1;
    const modelConfig = options.modelConfig || policy.impactModel;
    const modelType = modelConfig.modelType || ImpactModelType.SQUARE_ROOT;
    const coefficient = options.coefficient !== undefined && options.coefficient !== null ?
      Number(options.coefficient) : (modelConfig.defaultCoefficient !== undefined ? modelConfig.defaultCoefficient : 0.10);

    const notional = notionalVal.notional;
    const dAdv = advVal.adv;
    const participationRatio = notional / dAdv;

    let impactBps = 0;
    if (modelType === ImpactModelType.SQUARE_ROOT) {
      // ImpactBps = coefficient * 10000 * sqrt(OrderNotional / DollarADV)
      impactBps = (coefficient * 10000) * Math.sqrt(participationRatio);
    } else if (modelType === ImpactModelType.LINEAR) {
      impactBps = (coefficient * 10000) * participationRatio;
    } else {
      impactBps = (coefficient * 10000) * Math.sqrt(participationRatio);
    }

    const impactCost = notional * (impactBps / 10000);

    return deepFreeze({
      status: LiquidityStatus.PASS,
      modelId: modelConfig.modelId || 'SQUARE_ROOT_IMPACT_MODEL_V1',
      modelName: modelConfig.modelName || 'Square Root Market Impact Approximation',
      modelFamily: modelConfig.modelFamily || modelType,
      modelVersion: modelConfig.modelVersion || '1.0',
      modelType,
      orderNotional: notional,
      dollarAdv: dAdv,
      participationRatio,
      coefficient,
      coefficientUnits: modelConfig.coefficientUnits || 'dimensionless_scaling_factor',
      calibrationMethod: modelConfig.calibrationMethod || 'CONFIGURED_ASSUMPTION',
      calibrationUniverse: modelConfig.calibrationUniverse || 'UNAVAILABLE',
      calibrationPeriod: modelConfig.calibrationPeriod || 'UNAVAILABLE',
      impactBps: Math.round(impactBps * 100) / 100,
      impactCost: Math.round(impactCost * 100) / 100,
      valueStatus: ValueStatus.MODEL_ESTIMATE,
      inputs: {
        orderNotional: ValueStatus.CONFIGURED,
        dollarAdv: ValueStatus.DERIVED,
        coefficient: ValueStatus.CONFIGURED,
        methodology: ValueStatus.CONFIGURED
      },
      inputStatuses: [ValueStatus.CONFIGURED, ValueStatus.DERIVED, ValueStatus.CONFIGURED],
      dataStatus: LiquidityDataStatus.CONFIGURED,
      assumptionStatus: 'CONFIGURED_ASSUMPTION',
      provenance: {
        sourceAuthority: modelConfig.sourceAuthority || policy.sourceAuthority,
        sourceDocument: modelConfig.sourceDocument || modelConfig.source || policy.sourceDocument,
        sourceSection: modelConfig.sourceSection || 'Section 2.1 (Non-linear Temporary Market Impact)',
        sourceURI: modelConfig.sourceURI || policy.sourceURI,
        evidenceId: modelConfig.evidenceId || policy.evidenceId,
        evidenceHash: modelConfig.evidenceHash || policy.evidenceHash,
        academicLineage: modelConfig.academicLineage || 'Square-root market impact functional form (Barra / Almgren-Chriss literature lineage)',
        regulatoryEvidence: modelConfig.regulatoryEvidence || {
          sourceAuthority: 'ESMA / SEC',
          sourceDocument: 'MiFID II RTS 27 / SEC Rule 605',
          sourceURI: policy.sourceURI,
          evidenceId: 'EVID-REG-MIFID-SEC-605',
          role: 'Regulatory execution-quality transparency context (does NOT constitute empirical mathematical calibration)'
        },
        empiricalCalibrationEvidence: modelConfig.empiricalCalibrationEvidence || {
          status: 'UNAVAILABLE',
          description: 'Model uses configured baseline assumptions rather than empirical trading dataset calibration'
        }
      }
    });
  }
}
