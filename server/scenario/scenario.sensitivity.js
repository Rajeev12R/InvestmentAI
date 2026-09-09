/**
 * server/scenario/scenario.sensitivity.js
 * 
 * Phase 19: Security Sensitivity & Stress Evaluation
 * Evaluates multi-factor shocks against individual security holdings with strict missing-data safety.
 */

import { ValueStatus, ShockUnit } from './scenario.types.js';
import { applyShock, calculateDelta, calculatePercentDelta } from './scenario.transform.js';
import { SCENARIO_CONFIG } from './scenario.config.js';

/**
 * Calculates security-level stressed metrics under scenario shocks.
 */
export function evaluateSecurityScenario(security, shocks, options = {}) {
  if (!security || typeof security !== 'object') {
    throw new TypeError('security must be a valid object');
  }
  if (!Array.isArray(shocks)) {
    throw new TypeError('shocks must be an array');
  }

  const baseCurrency = options.baseCurrency || 'USD';
  const ticker = security.ticker || security.symbol || 'UNKNOWN';
  const price = security.price;
  const shares = security.shares !== undefined ? security.shares : (security.quantity !== undefined ? security.quantity : 1);
  const baselineMarketValue = security.marketValue !== undefined ? security.marketValue : (price * shares);
  const assetClass = (security.assetClass || 'EQUITY').toUpperCase();
  const sector = security.sector || 'Unassigned';
  const currency = security.currency || baseCurrency;

  if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) {
    throw new Error(`Invalid price for security ${ticker}: ${price}`);
  }

  let totalEffectivePriceShock = 0.0;
  const appliedShocks = [];
  let betaUsed = null;
  let durationUsed = null;
  let marginUsed = null;

  // Stressed liquidity metrics
  let stressedAdv = security.adv !== undefined ? security.adv : null;
  let stressedSpreadBps = security.spreadBps !== undefined ? security.spreadBps : null;

  for (const shock of shocks) {
    let shockApplied = false;
    let shockContribution = 0.0;
    let shockReason = '';

    // 1. Direct security-level shock
    if (shock.targetType === 'SECURITY' && (shock.target.toUpperCase() === ticker.toUpperCase())) {
      shockContribution = shock.shockUnit === ShockUnit.PERCENT ? shock.shockValue : (shock.shockValue / 100);
      totalEffectivePriceShock += shockContribution;
      shockApplied = true;
      shockReason = `Direct security shock on ${ticker}`;
    }

    // 2. Sector-level shock
    else if (shock.targetType === 'SECTOR' && shock.target.toLowerCase() === sector.toLowerCase()) {
      shockContribution = shock.shockUnit === ShockUnit.PERCENT ? shock.shockValue : (shock.shockValue / 100);
      totalEffectivePriceShock += shockContribution;
      shockApplied = true;
      shockReason = `Sector shock on ${sector}`;
    }

    // 3. Index / Broad Market shock
    else if (shock.targetType === 'INDEX') {
      if (assetClass === 'EQUITY') {
        let beta = null;
        if (typeof security.beta === 'number' && Number.isFinite(security.beta)) {
          beta = security.beta;
        } else if (options.configuredBeta !== undefined && typeof options.configuredBeta === 'number') {
          beta = options.configuredBeta;
        }

        if (shock.betaAdjusted) {
          if (beta === null) {
            throw new Error(`Missing required beta for beta-adjusted shock on ${ticker}. Silent fallback forbidden.`);
          }
          betaUsed = beta;
          const indexShockPercent = shock.shockUnit === ShockUnit.PERCENT ? shock.shockValue : (shock.shockValue / 100);
          shockContribution = beta * indexShockPercent;
          shockReason = `Index shock on ${shock.target} (${(indexShockPercent * 100).toFixed(2)}%) scaled by beta (${beta.toFixed(2)})`;
        } else {
          shockContribution = shock.shockUnit === ShockUnit.PERCENT ? shock.shockValue : (shock.shockValue / 100);
          shockReason = `Index shock on ${shock.target} unadjusted`;
        }
        totalEffectivePriceShock += shockContribution;
        shockApplied = true;
      }
    }

    // 4. Factor / Interest Rate shock for Fixed Income
    else if (shock.targetType === 'FACTOR' && (shock.target.includes('RATE') || shock.target.includes('YIELD'))) {
      if (assetClass === 'FIXED_INCOME' || assetClass === 'BOND') {
        let duration = null;
        if (typeof security.duration === 'number' && Number.isFinite(security.duration)) {
          duration = security.duration;
        } else if (options.configuredDuration !== undefined && typeof options.configuredDuration === 'number') {
          duration = options.configuredDuration;
        }

        if (duration === null) {
          throw new Error(`Missing required duration for fixed income rate shock on ${ticker}. Silent fallback forbidden.`);
        }

        const convexity = typeof security.convexity === 'number' && Number.isFinite(security.convexity) ? security.convexity : 0.0;
        durationUsed = duration;
        
        // shockValue in BPS (e.g. +100 bps = +0.01)
        const deltaYield = shock.shockUnit === ShockUnit.BPS ? (shock.shockValue / 10000) : shock.shockValue;
        
        // Price shock = -Duration * deltaYield + 0.5 * Convexity * (deltaYield^2)
        shockContribution = (-duration * deltaYield) + (0.5 * convexity * Math.pow(deltaYield, 2));
        totalEffectivePriceShock += shockContribution;
        shockApplied = true;
        shockReason = `Rate shock (${shock.shockValue} bps) evaluated with duration (${duration.toFixed(2)}) & convexity (${convexity.toFixed(2)})`;
      }
    }

    // 5. Fundamental / Operating Margin Compression Shock (Golden D)
    else if ((shock.targetType === 'FUNDAMENTAL' || shock.targetType === 'FACTOR') && 
             (shock.target === 'OPERATING_MARGIN' || shock.target === 'MARGIN')) {
      if (assetClass === 'EQUITY') {
        const baseMargin = typeof security.operatingMargin === 'number' && Number.isFinite(security.operatingMargin) 
          ? security.operatingMargin 
          : (options.configuredOperatingMargin !== undefined ? options.configuredOperatingMargin : null);

        if (baseMargin === null || baseMargin <= 0) {
          throw new Error(`Missing required operatingMargin for fundamental margin shock on ${ticker}. Silent fallback forbidden.`);
        }
        marginUsed = baseMargin;

        // Margin delta in percentage points or bps (e.g. -300 bps = -0.03 margin compression)
        const deltaMargin = shock.shockUnit === ShockUnit.BPS 
          ? (shock.shockValue / 10000) 
          : (shock.shockUnit === ShockUnit.PERCENT ? (baseMargin * shock.shockValue) : shock.shockValue);
        
        // Price impact = deltaMargin / baseMargin (assuming valuation scales with operating profit)
        shockContribution = deltaMargin / baseMargin;
        totalEffectivePriceShock += shockContribution;
        shockApplied = true;
        shockReason = `Operating margin shock (${shock.shockValue} ${shock.shockUnit}) on base margin ${(baseMargin * 100).toFixed(1)}% -> earnings impact ${(shockContribution * 100).toFixed(2)}%`;
      }
    }

    // 6. FX shock (if foreign currency relative to baseCurrency)
    else if (shock.targetType === 'FX' && currency !== baseCurrency) {
      const fxPair = `${currency}/${baseCurrency}`;
      if (shock.target.toUpperCase() === fxPair.toUpperCase() || shock.target.toUpperCase() === currency.toUpperCase()) {
        const fxShock = shock.shockUnit === ShockUnit.PERCENT ? shock.shockValue : (shock.shockValue / 100);
        shockContribution = fxShock;
        totalEffectivePriceShock += shockContribution;
        shockApplied = true;
        shockReason = `FX shock on ${currency} relative to ${baseCurrency}`;
      }
    }

    // 7. Liquidity shocks (ADV / Spread)
    else if (shock.targetType === 'LIQUIDITY') {
      if (shock.target === 'ADV' && stressedAdv !== null) {
        if (shock.shockUnit === ShockUnit.PERCENT) {
          stressedAdv = applyShock(stressedAdv, ShockUnit.PERCENT, shock.shockValue);
        } else if (shock.shockUnit === ShockUnit.MULTIPLIER) {
          stressedAdv = applyShock(stressedAdv, ShockUnit.MULTIPLIER, shock.shockValue);
        }
        shockApplied = true;
        shockReason = `Liquidity ADV shock: stressed ADV = ${stressedAdv.toFixed(0)}`;
      } else if ((shock.target === 'SPREAD_BPS' || shock.target === 'SPREAD') && stressedSpreadBps !== null) {
        if (shock.shockUnit === ShockUnit.PERCENT) {
          stressedSpreadBps = applyShock(stressedSpreadBps, ShockUnit.PERCENT, shock.shockValue);
        } else if (shock.shockUnit === ShockUnit.MULTIPLIER) {
          stressedSpreadBps = applyShock(stressedSpreadBps, ShockUnit.MULTIPLIER, shock.shockValue);
        } else if (shock.shockUnit === ShockUnit.BPS || shock.shockUnit === ShockUnit.ABSOLUTE) {
          stressedSpreadBps = applyShock(stressedSpreadBps, ShockUnit.ABSOLUTE, shock.shockValue);
        }
        shockApplied = true;
        shockReason = `Liquidity Spread shock: stressed spread = ${stressedSpreadBps.toFixed(2)} bps`;
      }
    }

    if (shockApplied) {
      appliedShocks.push({
        targetType: shock.targetType,
        target: shock.target,
        shockUnit: shock.shockUnit,
        shockValue: shock.shockValue,
        contributionPercent: shockContribution,
        reason: shockReason
      });
    }
  }

  // Ensure price does not become negative for standard assets
  const stressedPrice = Math.max(0, applyShock(price, ShockUnit.PERCENT, totalEffectivePriceShock));
  const stressedMarketValue = stressedPrice * shares;
  const pnlDollar = calculateDelta(baselineMarketValue, stressedMarketValue);
  const pnlPercent = calculatePercentDelta(baselineMarketValue, stressedMarketValue);

  return {
    ticker,
    assetClass,
    sector,
    currency,
    shares,
    isDelisted: security.isDelisted || false,
    isBankrupt: security.isBankrupt || false,
    baseline: {
      price,
      marketValue: baselineMarketValue,
      adv: security.adv || null,
      spreadBps: security.spreadBps || null,
      status: ValueStatus.DERIVED
    },
    stressed: {
      price: stressedPrice,
      marketValue: stressedMarketValue,
      adv: stressedAdv,
      spreadBps: stressedSpreadBps,
      status: ValueStatus.SCENARIO_OUTPUT
    },
    deltas: {
      pnlDollar,
      pnlPercent,
      effectivePriceShockPercent: totalEffectivePriceShock,
      status: ValueStatus.SCENARIO_OUTPUT
    },
    sensitivities: {
      betaUsed,
      durationUsed,
      marginUsed
    },
    appliedShocks
  };
}
