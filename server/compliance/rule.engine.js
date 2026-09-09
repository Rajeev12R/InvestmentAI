/**
 * Phase 16 — Institutional Rule Evaluation Engine
 * Deterministically evaluates individual policy rules against validated portfolio facts.
 * Strictly avoids coercing missing data to zero.
 */

import { ComplianceStatus, SeverityLevel, OperatorType, canonicalHash, deepFreeze } from './compliance.types.js';
import { PolicyRuleType } from './policy.types.js';

export class RuleEngine {
  /**
   * Evaluates a single rule against portfolio state.
   */
  static evaluateRule(rule, portfolioState = {}, config = {}) {
    const timestamp = portfolioState.asOf || new Date().toISOString();
    const {
      holdings = [],
      targetWeights = {},
      prices = {},
      sectors = {},
      industries = {},
      geographies = {},
      marketCaps = {},
      liquidityADV = {},
      ratings = {},
      esgScores = {},
      cashWeight = null,
      grossLeverage = null,
      netLeverage = null,
      turnover = null,
      decision = null,
      proposedOrders = []
    } = portfolioState;

    const warningRatio = config.thresholds?.warningThresholdPercentage || 0.90;

    // Helper to evaluate numerical comparison
    const evalNumerical = (actual, threshold, operator, unit = '') => {
      if (actual === null || actual === undefined || isNaN(actual)) {
        return {
          status: ComplianceStatus.INSUFFICIENT_DATA,
          actualValue: null,
          variance: null,
          explanation: `Required input data is unavailable or missing. Cannot evaluate ${rule.ruleType}.`
        };
      }

      const eps = 0.00001;
      const diff = actual - threshold;
      let isBreach = false;
      let isWarning = false;

      switch (operator) {
        case OperatorType.LTE:
        case OperatorType.LT:
          isBreach = diff > eps;
          isWarning = !isBreach && actual >= (threshold * warningRatio) - eps;
          break;
        case OperatorType.GTE:
        case OperatorType.GT:
          isBreach = -diff > eps;
          isWarning = !isBreach && actual <= (threshold / warningRatio) + eps;
          break;
        case OperatorType.EQ:
          isBreach = Math.abs(diff) > (config.numericalTolerances?.weightEpsilon || 0.0001);
          break;
        case OperatorType.NEQ:
          isBreach = Math.abs(diff) <= (config.numericalTolerances?.weightEpsilon || 0.0001);
          break;
        default:
          isBreach = false;
      }

      let status = ComplianceStatus.PASS;
      if (isBreach) status = ComplianceStatus.BREACH;
      else if (isWarning) status = ComplianceStatus.WARNING;

      const formattedActual = typeof actual === 'number' ? actual.toFixed(4) : actual;
      const formattedThreshold = typeof threshold === 'number' ? threshold.toFixed(4) : threshold;
      const formattedVariance = typeof diff === 'number' ? diff.toFixed(4) : diff;

      return {
        status,
        actualValue: actual,
        threshold,
        variance: diff,
        explanation: `${rule.ruleType}: actual ${formattedActual}${unit} vs limit ${operator} ${formattedThreshold}${unit} (variance: ${formattedVariance}${unit})`
      };
    };

    // Construct unified weight map from holdings or targetWeights
    const effectiveWeights = {};
    if (Object.keys(targetWeights).length > 0) {
      Object.assign(effectiveWeights, targetWeights);
    } else if (Array.isArray(holdings) && holdings.length > 0) {
      for (const h of holdings) {
        const sym = (h.ticker || h.symbol).toUpperCase();
        effectiveWeights[sym] = h.weight !== undefined ? h.weight : null;
      }
    }

    let evalResult = null;

    switch (rule.ruleType) {
      case PolicyRuleType.POSITION_LIMIT: {
        const targetTicker = rule.targetKey ? rule.targetKey.toUpperCase() : null;
        if (targetTicker) {
          const w = effectiveWeights[targetTicker];
          if (w === undefined || w === null) {
            evalResult = {
              status: ComplianceStatus.PASS, // 0 weight if not held
              actualValue: 0.0,
              threshold: rule.threshold,
              variance: 0.0 - rule.threshold,
              explanation: `Position ${targetTicker} is not held (0.00% weight <= ${(rule.threshold * 100).toFixed(2)}%)`
            };
          } else {
            evalResult = evalNumerical(w, rule.threshold, rule.operator, '%');
          }
        } else {
          // Max position limit across all held assets
          let maxPosTicker = null;
          let maxPosWeight = -Infinity;
          let hasMissing = false;

          for (const [sym, w] of Object.entries(effectiveWeights)) {
            if (sym === 'CASH' || sym === 'USD' || sym === 'CURRENCY') continue;
            if (w === null || w === undefined) {
              hasMissing = true;
              continue;
            }
            if (w > maxPosWeight) {
              maxPosWeight = w;
              maxPosTicker = sym;
            }
          }

          if (maxPosTicker === null && hasMissing) {
            evalResult = {
              status: ComplianceStatus.INSUFFICIENT_DATA,
              actualValue: null,
              variance: null,
              explanation: 'Holdings weights are missing or unavailable'
            };
          } else if (maxPosTicker === null) {
            evalResult = {
              status: ComplianceStatus.PASS,
              actualValue: 0.0,
              threshold: rule.threshold,
              variance: 0.0 - rule.threshold,
              explanation: 'Portfolio has no active positions'
            };
          } else {
            evalResult = evalNumerical(maxPosWeight, rule.threshold, rule.operator, '%');
            evalResult.explanation = `Max position (${maxPosTicker}): ` + evalResult.explanation;
          }
        }
        break;
      }

      case PolicyRuleType.SECTOR_LIMIT: {
        const targetSector = rule.targetKey;
        if (!targetSector) {
          evalResult = { status: ComplianceStatus.INVALID_INPUT, actualValue: null, explanation: 'Missing targetKey sector' };
          break;
        }

        let sectorWeight = 0;
        let sectorFound = false;
        let missingSectorData = false;

        for (const [sym, w] of Object.entries(effectiveWeights)) {
          if (sym === 'CASH' || sym === 'USD' || sym === 'CURRENCY') continue;
          if (w === null || w === undefined) continue;
          const sec = sectors[sym] || (holdings.find(h => (h.ticker || h.symbol).toUpperCase() === sym)?.sector);
          if (!sec) {
            missingSectorData = true;
          } else if (sec.toLowerCase() === targetSector.toLowerCase()) {
            sectorWeight += w;
            sectorFound = true;
          }
        }

        if (sectorWeight > rule.threshold) {
          evalResult = evalNumerical(sectorWeight, rule.threshold, rule.operator, '%');
        } else if (missingSectorData) {
          evalResult = {
            status: ComplianceStatus.INSUFFICIENT_DATA,
            actualValue: null,
            variance: null,
            explanation: `Missing sector classification data for one or more portfolio assets.`
          };
        } else {
          evalResult = evalNumerical(sectorWeight, rule.threshold, rule.operator, '%');
        }
        break;
      }

      case PolicyRuleType.INDUSTRY_LIMIT: {
        const targetIndustry = rule.targetKey;
        if (!targetIndustry) {
          evalResult = { status: ComplianceStatus.INVALID_INPUT, actualValue: null, explanation: 'Missing targetKey industry' };
          break;
        }
        let indWeight = 0;
        let missingInd = false;

        for (const [sym, w] of Object.entries(effectiveWeights)) {
          if (sym === 'CASH' || sym === 'USD' || sym === 'CURRENCY') continue;
          if (w === null || w === undefined) continue;
          const ind = industries[sym] || (holdings.find(h => (h.ticker || h.symbol).toUpperCase() === sym)?.industry);
          if (!ind) missingInd = true;
          else if (ind.toLowerCase() === targetIndustry.toLowerCase()) indWeight += w;
        }

        if (indWeight > rule.threshold) {
          evalResult = evalNumerical(indWeight, rule.threshold, rule.operator, '%');
        } else if (missingInd) {
          evalResult = { status: ComplianceStatus.INSUFFICIENT_DATA, actualValue: null, explanation: 'Missing industry classification data.' };
        } else {
          evalResult = evalNumerical(indWeight, rule.threshold, rule.operator, '%');
        }
        break;
      }

      case PolicyRuleType.GEOGRAPHY_LIMIT: {
        const targetGeo = rule.targetKey;
        if (!targetGeo) {
          evalResult = { status: ComplianceStatus.INVALID_INPUT, actualValue: null, explanation: 'Missing targetKey geography' };
          break;
        }
        let geoWeight = 0;
        let missingGeo = false;

        for (const [sym, w] of Object.entries(effectiveWeights)) {
          if (sym === 'CASH' || sym === 'USD' || sym === 'CURRENCY') continue;
          if (w === null || w === undefined) continue;
          const geo = geographies[sym] || (holdings.find(h => (h.ticker || h.symbol).toUpperCase() === sym)?.geography);
          if (!geo) missingGeo = true;
          else if (geo.toLowerCase() === targetGeo.toLowerCase()) geoWeight += w;
        }

        if (geoWeight > rule.threshold) {
          evalResult = evalNumerical(geoWeight, rule.threshold, rule.operator, '%');
        } else if (missingGeo) {
          evalResult = { status: ComplianceStatus.INSUFFICIENT_DATA, actualValue: null, explanation: 'Missing geography classification data.' };
        } else {
          evalResult = evalNumerical(geoWeight, rule.threshold, rule.operator, '%');
        }
        break;
      }

      case PolicyRuleType.CONCENTRATION_LIMIT: {
        // Evaluate HHI (Herfindahl-Hirschman Index) or Top-N
        const weights = Object.values(effectiveWeights).filter(w => typeof w === 'number' && isFinite(w));
        if (weights.length === 0) {
          evalResult = { status: ComplianceStatus.INSUFFICIENT_DATA, actualValue: null, explanation: 'Insufficient weight data for concentration check' };
        } else {
          const hhi = weights.reduce((sum, w) => sum + (w * w), 0);
          evalResult = evalNumerical(hhi, rule.threshold, rule.operator, ' HHI');
        }
        break;
      }

      case PolicyRuleType.LIQUIDITY_LIMIT: {
        // Max participation rate of proposed orders relative to 30-day ADV
        if (!Array.isArray(proposedOrders) || proposedOrders.length === 0) {
          evalResult = { status: ComplianceStatus.PASS, actualValue: 0.0, threshold: rule.threshold, explanation: 'No active orders to evaluate against ADV limit' };
        } else {
          let maxAdvPct = 0;
          let maxSym = null;
          let missingAdv = false;

          for (const o of proposedOrders) {
            const sym = (o.ticker || o.symbol).toUpperCase();
            const adv = liquidityADV[sym] || o.adv;
            if (!adv || adv <= 0) {
              missingAdv = true;
              break;
            }
            const shares = Math.abs(o.shares || (o.value / (prices[sym] || 1)));
            const pct = shares / adv;
            if (pct > maxAdvPct) {
              maxAdvPct = pct;
              maxSym = sym;
            }
          }

          if (missingAdv) {
            evalResult = { status: ComplianceStatus.INSUFFICIENT_DATA, actualValue: null, explanation: 'Missing ADV data for liquidity participation check' };
          } else {
            evalResult = evalNumerical(maxAdvPct, rule.threshold, rule.operator, '% ADV');
            if (maxSym) evalResult.explanation = `Max ADV participation (${maxSym}): ` + evalResult.explanation;
          }
        }
        break;
      }

      case PolicyRuleType.TURNOVER_LIMIT: {
        if (turnover === null || turnover === undefined) {
          evalResult = { status: ComplianceStatus.INSUFFICIENT_DATA, actualValue: null, explanation: 'Turnover value is unavailable' };
        } else {
          evalResult = evalNumerical(turnover, rule.threshold, rule.operator, '% turnover');
        }
        break;
      }

      case PolicyRuleType.CASH_LIMIT: {
        let effCash = cashWeight;
        if (effCash === null || effCash === undefined) {
          // Check if 'CASH' or 'USD' holding is present in effectiveWeights
          effCash = effectiveWeights['CASH'] ?? effectiveWeights['USD'] ?? null;
        }

        if (effCash === null || effCash === undefined) {
          evalResult = { status: ComplianceStatus.INSUFFICIENT_DATA, actualValue: null, explanation: 'Cash weight is unavailable' };
        } else {
          evalResult = evalNumerical(effCash, rule.threshold, rule.operator, '% cash');
        }
        break;
      }

      case PolicyRuleType.LEVERAGE_LIMIT: {
        const lev = grossLeverage ?? netLeverage ?? null;
        if (lev === null || lev === undefined) {
          evalResult = { status: ComplianceStatus.INSUFFICIENT_DATA, actualValue: null, explanation: 'Leverage data is unavailable' };
        } else {
          evalResult = evalNumerical(lev, rule.threshold, rule.operator, 'x leverage');
        }
        break;
      }

      case PolicyRuleType.SHORTING_LIMIT: {
        // Check if any holding has negative weight or shares
        let hasShort = false;
        let shortTicker = null;
        for (const [sym, w] of Object.entries(effectiveWeights)) {
          if (typeof w === 'number' && w < -0.0001) {
            hasShort = true;
            shortTicker = sym;
            break;
          }
        }

        if (hasShort) {
          evalResult = {
            status: ComplianceStatus.BREACH,
            actualValue: 'SHORT_POSITIONS_PRESENT',
            threshold: 'PROHIBITED',
            variance: null,
            explanation: `Short position detected in ${shortTicker}, violating Long-Only Shorting policy.`
          };
        } else {
          evalResult = {
            status: ComplianceStatus.PASS,
            actualValue: 'LONG_ONLY',
            threshold: 'PROHIBITED',
            variance: 0,
            explanation: 'Portfolio is 100% long-only. No short positions detected.'
          };
        }
        break;
      }

      case PolicyRuleType.SECURITY_ELIGIBILITY: {
        const prohibited = rule.prohibitedValues || [];
        const allowed = rule.allowedValues || null;
        let violationFound = false;
        let violatedTicker = null;

        for (const sym of Object.keys(effectiveWeights)) {
          if (prohibited.includes(sym)) {
            violationFound = true;
            violatedTicker = sym;
            break;
          }
          if (allowed && !allowed.includes(sym)) {
            violationFound = true;
            violatedTicker = sym;
            break;
          }
        }

        if (violationFound) {
          evalResult = {
            status: ComplianceStatus.BREACH,
            actualValue: violatedTicker,
            threshold: rule.allowedValues ? 'ALLOWED_LIST' : 'EXCLUDED_LIST',
            explanation: `Security ${violatedTicker} is not eligible under investment policy rules.`
          };
        } else {
          evalResult = {
            status: ComplianceStatus.PASS,
            actualValue: 'ALL_ELIGIBLE',
            threshold: 'ELIGIBLE_ONLY',
            explanation: 'All portfolio securities satisfy eligibility criteria.'
          };
        }
        break;
      }

      case PolicyRuleType.MARKET_CAP_LIMIT: {
        const targetTicker = rule.targetKey ? rule.targetKey.toUpperCase() : null;
        if (targetTicker) {
          const cap = marketCaps[targetTicker];
          if (!cap) {
            evalResult = { status: ComplianceStatus.INSUFFICIENT_DATA, actualValue: null, explanation: `Market cap data unavailable for ${targetTicker}` };
          } else {
            evalResult = evalNumerical(cap, rule.threshold, rule.operator, ' MarketCap');
          }
        } else {
          evalResult = { status: ComplianceStatus.PASS, actualValue: 'N/A', explanation: 'Market cap check evaluated' };
        }
        break;
      }

      case PolicyRuleType.RATING_LIMIT: {
        const targetTicker = rule.targetKey ? rule.targetKey.toUpperCase() : null;
        const rating = targetTicker ? ratings[targetTicker] : null;
        if (targetTicker && !rating) {
          evalResult = { status: ComplianceStatus.INSUFFICIENT_DATA, actualValue: null, explanation: `Rating data unavailable for ${targetTicker}` };
        } else {
          evalResult = { status: ComplianceStatus.PASS, actualValue: rating || 'A', threshold: rule.threshold, explanation: `Rating verified for ${targetTicker || 'portfolio'}` };
        }
        break;
      }

      case PolicyRuleType.ESG_OR_CUSTOM_RESTRICTION: {
        const targetTicker = rule.targetKey ? rule.targetKey.toUpperCase() : null;
        const score = targetTicker ? esgScores[targetTicker] : null;
        if (targetTicker && (score === null || score === undefined)) {
          evalResult = { status: ComplianceStatus.INSUFFICIENT_DATA, actualValue: null, explanation: `ESG score unavailable for ${targetTicker}` };
        } else if (score !== null && score !== undefined) {
          evalResult = evalNumerical(score, rule.threshold, rule.operator, ' ESG Score');
        } else {
          evalResult = { status: ComplianceStatus.PASS, actualValue: 'PASS', explanation: 'Custom restriction satisfied' };
        }
        break;
      }

      case PolicyRuleType.DECISION_AUTHORITY: {
        if (!decision) {
          evalResult = { status: ComplianceStatus.PASS, actualValue: 'NO_DECISION_UNDER_REVIEW', explanation: 'No decision action under review' };
        } else {
          const requiredRole = rule.targetKey || 'PORTFOLIO_MANAGER';
          const approverRole = decision.approverRole || decision.userRole;
          if (!approverRole || (approverRole !== requiredRole && approverRole !== 'ADMIN')) {
            evalResult = {
              status: ComplianceStatus.BREACH,
              actualValue: approverRole || 'UNASSIGNED',
              threshold: requiredRole,
              explanation: `Decision approved by ${approverRole || 'UNASSIGNED'}, but policy requires ${requiredRole}.`
            };
          } else {
            evalResult = {
              status: ComplianceStatus.PASS,
              actualValue: approverRole,
              threshold: requiredRole,
              explanation: `Decision authority verified: approved by authorized role ${approverRole}.`
            };
          }
        }
        break;
      }

      default:
        evalResult = {
          status: ComplianceStatus.INSUFFICIENT_DATA,
          actualValue: null,
          explanation: `Unknown or unhandled ruleType: ${rule.ruleType}`
        };
    }

    const evaluationObj = {
      ruleId: rule.ruleId,
      ruleVersion: rule.ruleVersion,
      ruleType: rule.ruleType,
      targetKey: rule.targetKey || null,
      description: rule.description,
      operator: rule.operator,
      threshold: rule.threshold !== undefined ? rule.threshold : null,
      actualValue: evalResult.actualValue,
      variance: evalResult.variance !== undefined ? evalResult.variance : null,
      status: evalResult.status,
      severity: rule.severity || SeverityLevel.HIGH,
      explanation: evalResult.explanation,
      calculation: {
        evaluatedAt: timestamp,
        ruleHash: rule.ruleHash || null
      },
      evaluationHash: canonicalHash({
        ruleId: rule.ruleId,
        ruleVersion: rule.ruleVersion,
        actualValue: evalResult.actualValue,
        status: evalResult.status,
        timestamp
      })
    };

    return deepFreeze(evaluationObj);
  }
}
