/**
 * Phase 16 — Institutional Remediation Engine
 * Deterministically generates remedial action proposals for compliance breaches.
 * Pure proposal only — never automatically executes trades.
 */

import { ComplianceStatus, canonicalHash, deepFreeze } from './compliance.types.js';
import { PolicyRuleType } from './policy.types.js';

export class RemediationEngine {
  /**
   * Generates remediation proposals for a set of rule evaluation results.
   */
  static generateRemediationPlan({
    workspaceId,
    portfolioId,
    ruleResults = [],
    asOf = new Date().toISOString()
  }) {
    if (!workspaceId || !portfolioId) {
      throw new Error('workspaceId and portfolioId are required for remediation plan');
    }

    const remedialActions = [];

    for (const res of ruleResults) {
      if (res.status !== ComplianceStatus.BREACH && res.status !== ComplianceStatus.WARNING) {
        continue;
      }

      let proposedAction = null;
      let targetDelta = null;

      switch (res.ruleType) {
        case PolicyRuleType.POSITION_LIMIT:
          if (res.variance > 0) {
            targetDelta = -res.variance;
            proposedAction = {
              action: 'REDUCE_WEIGHT',
              target: res.targetKey || 'LARGEST_POSITION',
              deltaPercentage: -(res.variance * 100),
              rationale: `Reduce position weight by ${(res.variance * 100).toFixed(2)}% to satisfy ${res.threshold * 100}% limit.`
            };
          }
          break;

        case PolicyRuleType.SECTOR_LIMIT:
          if (res.variance > 0) {
            targetDelta = -res.variance;
            proposedAction = {
              action: 'REBALANCE_SECTOR',
              targetSector: res.targetKey,
              deltaPercentage: -(res.variance * 100),
              rationale: `Trim sector exposure in ${res.targetKey} by ${(res.variance * 100).toFixed(2)}% to reach ${res.threshold * 100}% cap.`
            };
          }
          break;

        case PolicyRuleType.CASH_LIMIT:
          if (res.variance < 0) {
            targetDelta = Math.abs(res.variance);
            proposedAction = {
              action: 'INCREASE_CASH',
              deltaPercentage: targetDelta * 100,
              rationale: `Raise cash buffer by ${(targetDelta * 100).toFixed(2)}% to meet minimum ${(res.threshold * 100).toFixed(2)}% threshold.`
            };
          } else if (res.variance > 0) {
            targetDelta = -res.variance;
            proposedAction = {
              action: 'DEPLOY_CASH',
              deltaPercentage: -(res.variance * 100),
              rationale: `Deploy excess cash of ${(res.variance * 100).toFixed(2)}% to remain under ${(res.threshold * 100).toFixed(2)}% max cash limit.`
            };
          }
          break;

        case PolicyRuleType.TURNOVER_LIMIT:
          proposedAction = {
            action: 'REDUCE_TRADE_VOLUME',
            rationale: `Throttle rebalance trade size to bring turnover under ${(res.threshold * 100).toFixed(2)}%.`
          };
          break;

        case PolicyRuleType.LIQUIDITY_LIMIT:
          proposedAction = {
            action: 'EXTEND_EXECUTION_HORIZON',
            rationale: 'Slice orders across multiple trading days to remain below ADV participation cap.'
          };
          break;

        case PolicyRuleType.SECURITY_ELIGIBILITY:
          proposedAction = {
            action: 'LIQUIDATE_INELIGIBLE_HOLDING',
            target: res.actualValue,
            rationale: `Liquidate position in ${res.actualValue} as it violates portfolio security eligibility mandate.`
          };
          break;

        case PolicyRuleType.SHORTING_LIMIT:
          proposedAction = {
            action: 'CLOSE_SHORT_POSITIONS',
            rationale: 'Cover/close all short positions to restore long-only mandate compliance.'
          };
          break;

        default:
          proposedAction = {
            action: 'POLICY_EXCEPTION_OR_REBALANCE',
            rationale: `Review ${res.ruleType} and request a formal waiver or rebalance portfolio.`
          };
      }

      if (proposedAction) {
        remedialActions.push({
          ruleId: res.ruleId,
          ruleType: res.ruleType,
          severity: res.severity,
          ...proposedAction
        });
      }
    }

    const plan = {
      remediationPlanId: `REM-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      workspaceId,
      portfolioId,
      asOf,
      remedialActions,
      actionCount: remedialActions.length,
      requiresReEvaluation: true,
      isExecutionAuthorized: false // Strictly non-executing boundary
    };

    const planHash = canonicalHash({
      remediationPlanId: plan.remediationPlanId,
      workspaceId: plan.workspaceId,
      portfolioId: plan.portfolioId,
      remedialActions: plan.remedialActions
    });

    return deepFreeze({
      ...plan,
      planHash
    });
  }
}
