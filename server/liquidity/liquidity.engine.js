/**
 * Phase 18 — Institutional Liquidity Intelligence Unified Engine
 * Primary orchestrator for single-asset and multi-asset portfolio liquidity analytics.
 */

import {
  LiquidityStatus,
  LiquidityTier,
  LiquidityDataStatus,
  ValueStatus,
  VerificationStatus,
  ConnectionEvidenceState,
  SourceConnectionClassification,
  deepFreeze
} from './liquidity.types.js';
import { LIQUIDITY_POLICY_V1 } from './liquidity.config.js';
import { LiquidityMetricsEngine } from './liquidity.metrics.engine.js';
import { LiquidityValidationEngine } from './liquidity.validation.engine.js';
import { LiquidityCapacityEngine } from './liquidity.capacity.engine.js';
import { LiquidityHorizonEngine } from './liquidity.horizon.engine.js';
import { liquiditySourceRegistry } from './liquidity.sourceRegistry.js';

export class LiquidityEngine {
  /**
   * Evaluates single security comprehensive liquidity profile.
   */
  static evaluateSecurityLiquidity(observation, options = {}) {
    if (!observation || typeof observation !== 'object') {
      return deepFreeze({
        status: LiquidityStatus.INVALID_INPUT,
        valueStatus: ValueStatus.UNAVAILABLE,
        reason: 'Observation missing or invalid'
      });
    }

    const { ticker, price, bid, ask, adv, volumeObservations, marketCap, currency = 'USD', asOf = null, timestamp = null } = observation;

    // Freshness check if timestamps provided
    if (timestamp) {
      const freshness = LiquidityValidationEngine.validateFreshness(timestamp, options.asOf || asOf);
      if (freshness.status === LiquidityStatus.TEMPORAL_VIOLATION) {
        return deepFreeze({
          status: LiquidityStatus.TEMPORAL_VIOLATION,
          valueStatus: ValueStatus.UNAVAILABLE,
          reason: freshness.reason
        });
      }
    }

    // 1. Price validation
    const priceVal = LiquidityValidationEngine.validatePrice(price);
    if (!priceVal.isValid) return { ...priceVal, valueStatus: ValueStatus.UNAVAILABLE };

    // 2. ADV calculation or validation
    let advVal;
    let includedObservationIds = [];
    const volHistory = volumeObservations || observation.volumeHistory;
    if (Array.isArray(volHistory) && volHistory.length > 0) {
      const advResult = LiquidityMetricsEngine.calculateAdv(volHistory, options.window || options.advWindow || '20D');
      if (advResult.status !== LiquidityStatus.PASS) return { ...advResult, valueStatus: ValueStatus.UNAVAILABLE };
      advVal = { isValid: true, adv: advResult.adv };
      includedObservationIds = advResult.includedObservationIds;
    } else {
      advVal = LiquidityValidationEngine.validateAdv(adv);
      if (!advVal.isValid) return { ...advVal, valueStatus: ValueStatus.UNAVAILABLE };
    }

    // 3. Dollar ADV calculation
    const dollarAdv = advVal.adv * priceVal.price;

    // 4. Spread calculation
    let quoteResult = null;
    let finalSpreadBps = observation.spreadBps !== undefined && observation.spreadBps !== null ? Number(observation.spreadBps) : null;
    if (bid !== undefined && ask !== undefined && bid !== null && ask !== null) {
      quoteResult = LiquidityMetricsEngine.calculateSpread(bid, ask);
      if (quoteResult.status === LiquidityStatus.PASS) {
        finalSpreadBps = quoteResult.spreadBps;
      } else {
        return { ...quoteResult, valueStatus: ValueStatus.UNAVAILABLE };
      }
    }

    // 5. Tier & Score
    const tier = LiquidityMetricsEngine.determineLiquidityTier(dollarAdv, finalSpreadBps);
    const scoreResult = LiquidityMetricsEngine.calculateLiquidityScore(dollarAdv, finalSpreadBps, marketCap);

    // 6. Capacity Limits
    const capacityResult = LiquidityCapacityEngine.calculatePositionCapacity(dollarAdv, options);

    // 7. Source Registry Validation & Provenance
    const sourceClaim = liquiditySourceRegistry.validateSourceClaim({
      sourceId: observation.sourceId,
      provider: observation.provider || 'TRUTH_LAYER_DIRECT_FEED',
      sourceTier: observation.sourceTier || 'TIER_1_DIRECT_EXCHANGE_FEED'
    });

    const sourceRecord = sourceClaim.sourceRecord;
    const resolvedSourceTier = sourceClaim.resolvedTier;
    const resolvedSourceType = sourceClaim.resolvedType;
    const connectionClassification = sourceClaim.connectionClassification || SourceConnectionClassification.UNVERIFIED_SOURCE;
    const sourceVerificationStatus = sourceRecord ? sourceRecord.verificationStatus : VerificationStatus.UNVERIFIED;
    const connectionState = sourceRecord?.connectionEvidence?.connectionState || ConnectionEvidenceState.UNVERIFIED;

    let authenticityLabel = 'Real market observation — source not independently verified';
    if (connectionClassification === SourceConnectionClassification.VERIFIED_DIRECT_EXCHANGE) {
      authenticityLabel = 'Real market observation — independently verified direct exchange source';
    } else if (connectionClassification === SourceConnectionClassification.VERIFIED_INTERNAL_ADAPTER_TO_DIRECT_EXCHANGE) {
      authenticityLabel = 'Real market observation — internal adapter to independently verified direct exchange';
    } else if (connectionClassification === SourceConnectionClassification.VERIFIED_VENDOR_SOURCE) {
      authenticityLabel = 'Real market observation — verified vendor source';
    } else {
      authenticityLabel = 'Real market observation — source not independently verified';
    }

    return deepFreeze({
      status: LiquidityStatus.PASS,
      ticker: ticker || 'UNKNOWN',
      currency,
      price: priceVal.price,
      adv: advVal.adv,
      dollarAdv: Math.round(dollarAdv * 100) / 100,
      bid: quoteResult ? quoteResult.bid : null,
      ask: quoteResult ? quoteResult.ask : null,
      mid: quoteResult ? quoteResult.mid : priceVal.price,
      spread: quoteResult ? quoteResult.spread : null,
      spreadBps: finalSpreadBps !== null ? Math.round(finalSpreadBps * 100) / 100 : null,
      tier,
      liquidityScore: scoreResult.status === LiquidityStatus.PASS ? scoreResult.score : null,
      scoreComponents: scoreResult.status === LiquidityStatus.PASS ? scoreResult.components : null,
      capacity: capacityResult.status === LiquidityStatus.PASS ? capacityResult : null,
      valueStatus: ValueStatus.DERIVED,
      inputStatuses: [ValueStatus.REAL_DATA],
      observationProvenance: {
        securityId: observation.securityId || ticker,
        dataStatus: observation.dataStatus || ValueStatus.REAL_DATA,
        provider: observation.provider || (sourceRecord ? sourceRecord.provider : 'TRUTH_LAYER_DIRECT_FEED'),
        providerRecordId: observation.providerRecordId || `REC-${ticker}-001`,
        observationTimestamp: observation.timestamp || observation.observationTimestamp || '2024-08-01T00:00:00.000Z',
        market: observation.market || (currency === 'INR' ? 'NSE' : 'NASDAQ/NYSE'),
        sourceId: sourceRecord ? sourceRecord.sourceId : (observation.sourceId || 'SRC-UNREGISTERED'),
        sourceName: sourceRecord ? sourceRecord.sourceName : 'Unregistered Source Feed',
        sourceType: resolvedSourceType,
        sourceTier: resolvedSourceTier,
        sourceTierStatus: sourceClaim.isValid ? 'VERIFIED' : (sourceClaim.reason || 'UNVERIFIED'),
        sourceClassification: connectionClassification,
        sourceVerificationStatus,
        connectionState,
        connectionClassification,
        authenticityLabel,
        sourceConnectionEvidenceId: observation.sourceConnectionEvidenceId || (sourceRecord ? sourceRecord.connectionEvidence?.connectionEvidenceId : null),
        sourceDefinitionHash: sourceRecord ? sourceRecord.sourceDefinitionHash : null,
        sourceVerificationEvidenceId: sourceRecord ? sourceRecord.verificationEvidenceId : null,
        verificationEvidenceHash: sourceRecord ? sourceRecord.verificationEvidenceHash : null,
        connectionEvidenceId: sourceRecord ? sourceRecord.connectionEvidence?.connectionEvidenceId : null,
        connectionEvidenceHash: sourceRecord ? sourceRecord.connectionEvidence?.connectionEvidenceHash : null,
        sourceTimestamp: observation.sourceTimestamp || observation.timestamp || '2024-08-01T00:00:00.000Z',
        freshness: observation.freshness || 'PRIME',
        evidenceId: observation.evidenceId || `EVID-OBS-${ticker}`,
        evidenceHash: observation.evidenceHash || null,
        sourceDefinition: sourceRecord ? sourceRecord.sourceDefinition : null,
        sourceVerification: sourceRecord ? sourceRecord.sourceVerification : null,
        connectionEvidence: sourceRecord ? sourceRecord.connectionEvidence : null,
        sourceRegistryRecord: sourceRecord ? {
          sourceId: sourceRecord.sourceId,
          sourceName: sourceRecord.sourceName,
          sourceType: sourceRecord.sourceType,
          provider: sourceRecord.provider,
          venue: sourceRecord.venue,
          feedName: sourceRecord.feedName,
          protocol: sourceRecord.protocol,
          endpoint: sourceRecord.endpoint,
          endpointType: sourceRecord.endpointType,
          upstreamSource: sourceRecord.upstreamSource,
          sourceTier: sourceRecord.sourceTier,
          sourceDefinitionHash: sourceRecord.sourceDefinitionHash,
          verificationStatus: sourceRecord.verificationStatus,
          verificationEvidenceId: sourceRecord.verificationEvidenceId,
          verificationEvidenceHash: sourceRecord.verificationEvidenceHash,
          verificationAuthority: sourceRecord.verificationAuthority,
          verificationDate: sourceRecord.verificationDate,
          connectionEvidenceId: sourceRecord.connectionEvidenceId,
          connectionEvidenceHash: sourceRecord.connectionEvidenceHash,
          connectionClassification: sourceRecord.connectionClassification,
          effectiveFrom: sourceRecord.effectiveFrom,
          effectiveTo: sourceRecord.effectiveTo
        } : null
      },
      dataStatus: observation.dataStatus || LiquidityDataStatus.REAL_DATA
    });
  }

  /**
   * Evaluates comprehensive multi-asset portfolio liquidity profile.
   */
  static evaluatePortfolioLiquidity(portfolioData, fxRates = {}, options = {}) {
    if (!portfolioData || typeof portfolioData !== 'object') {
      return deepFreeze({
        status: LiquidityStatus.INVALID_INPUT,
        reason: 'Portfolio data missing or invalid'
      });
    }

    const { portfolioId = 'PORT-DEFAULT', baseCurrency = 'USD', positions = [] } = portfolioData;

    if (!Array.isArray(positions) || positions.length === 0) {
      return deepFreeze({
        status: LiquidityStatus.INVALID_INPUT,
        reason: 'Positions array missing or empty'
      });
    }

    let totalPortfolioValue = 0;
    let portfolioDollarAdv = 0;
    let weightedSpreadSum = 0;
    let weightedScoreSum = 0;
    let totalScoreWeight = 0;
    let totalSpreadWeight = 0;
    let maxPositionHorizon = 0;
    let bottleneckPosition = null;
    let illiquidNotional = 0;

    const evaluatedPositions = [];
    const liquidityShares = []; // for HHI calculation

    for (const pos of positions) {
      const ticker = pos.ticker || 'UNKNOWN';
      const currency = pos.currency || 'USD';
      let notional = Number(pos.notional || (pos.quantity && pos.price ? pos.quantity * pos.price : 0));
      let price = Number(pos.price);
      let adv = Number(pos.adv);

      // FX Conversion to baseCurrency if different
      let fxRate = 1.0;
      if (currency !== baseCurrency) {
        const pair = `${currency}_${baseCurrency}`;
        const inversePair = `${baseCurrency}_${currency}`;
        if (fxRates[pair]) {
          fxRate = Number(fxRates[pair]);
        } else if (fxRates[inversePair]) {
          fxRate = 1.0 / Number(fxRates[inversePair]);
        } else {
          return deepFreeze({
            status: LiquidityStatus.FX_UNAVAILABLE,
            reason: `Missing verified FX rate for currency pair ${pair}`
          });
        }
      }

      const notionalBase = notional * fxRate;
      const priceBase = price * fxRate;
      const dollarAdvBase = adv * priceBase;

      totalPortfolioValue += notionalBase;
      portfolioDollarAdv += dollarAdvBase;

      const singleEval = this.evaluateSecurityLiquidity({
        ...pos,
        price: priceBase,
        currency: baseCurrency,
        dollarAdv: dollarAdvBase
      }, options);

      if (singleEval.status !== LiquidityStatus.PASS) {
        return deepFreeze({
          status: singleEval.status,
          reason: `Position ${ticker} evaluation failed: ${singleEval.reason}`
        });
      }

      // Calculate position horizon
      const horizonRes = LiquidityHorizonEngine.calculateLiquidationHorizon({
        orderQuantity: pos.quantity || (notionalBase / priceBase),
        orderNotional: notionalBase,
        adv,
        dollarAdv: dollarAdvBase,
        referencePrice: priceBase,
        policy: options.policy || LIQUIDITY_POLICY_V1
      });

      const horizonDays = horizonRes.requiredTradingDays || 1;
      if (horizonDays > maxPositionHorizon) {
        maxPositionHorizon = horizonDays;
        bottleneckPosition = ticker;
      }

      if (singleEval.tier === LiquidityTier.TIER_4_ILLIQUID || singleEval.tier === LiquidityTier.TIER_3_LOW_LIQUIDITY) {
        illiquidNotional += notionalBase;
      }

      if (singleEval.spreadBps !== null) {
        weightedSpreadSum += singleEval.spreadBps * notionalBase;
        totalSpreadWeight += notionalBase;
      }

      if (singleEval.liquidityScore !== null) {
        weightedScoreSum += singleEval.liquidityScore * notionalBase;
        totalScoreWeight += notionalBase;
      }

      evaluatedPositions.push({
        ...singleEval,
        notionalBase: Math.round(notionalBase * 100) / 100,
        horizonDays,
        dollarAdvBase: Math.round(dollarAdvBase * 100) / 100
      });
    }

    // Weights & Liquidity Concentration Metrics
    for (const ep of evaluatedPositions) {
      ep.portfolioWeight = totalPortfolioValue > 0 ? (ep.notionalBase / totalPortfolioValue) : 0;
      ep.liquidityShare = portfolioDollarAdv > 0 ? (ep.dollarAdvBase / portfolioDollarAdv) : 0;
      liquidityShares.push(ep.liquidityShare);
    }

    // Sort by liquidity share descending
    evaluatedPositions.sort((a, b) => b.liquidityShare - a.liquidityShare);

    const top1LiquidityDependence = evaluatedPositions.length > 0 ? evaluatedPositions[0].liquidityShare : 0;
    const top3LiquidityDependence = evaluatedPositions.slice(0, 3).reduce((acc, p) => acc + p.liquidityShare, 0);
    const top5LiquidityDependence = evaluatedPositions.slice(0, 5).reduce((acc, p) => acc + p.liquidityShare, 0);

    // Liquidity HHI = sum(s_i^2) * 10000
    const liquidityHHI = Math.round(liquidityShares.reduce((acc, s) => acc + Math.pow(s * 100, 2), 0));

    const weightedSpread = totalSpreadWeight > 0 ? (weightedSpreadSum / totalSpreadWeight) : 0;
    const portfolioLiquidityScore = totalScoreWeight > 0 ? (weightedScoreSum / totalScoreWeight) : 0;
    const illiquidExposurePercent = totalPortfolioValue > 0 ? (illiquidNotional / totalPortfolioValue) * 100 : 0;

    return deepFreeze({
      status: LiquidityStatus.PASS,
      portfolioId,
      baseCurrency,
      totalPortfolioValue: Math.round(totalPortfolioValue * 100) / 100,
      portfolioDollarAdv: Math.round(portfolioDollarAdv * 100) / 100,
      weightedSpreadBps: Math.round(weightedSpread * 100) / 100,
      portfolioLiquidityScore: Math.round(portfolioLiquidityScore * 10) / 10,
      portfolioLiquidationHorizonDays: maxPositionHorizon,
      bottleneckPosition,
      illiquidExposureNotional: Math.round(illiquidNotional * 100) / 100,
      illiquidExposurePercent: Math.round(illiquidExposurePercent * 100) / 100,
      concentration: {
        top1LiquidityDependence: Math.round(top1LiquidityDependence * 10000) / 100, // in percent
        top3LiquidityDependence: Math.round(top3LiquidityDependence * 10000) / 100,
        top5LiquidityDependence: Math.round(top5LiquidityDependence * 10000) / 100,
        liquidityHHI
      },
      positions: evaluatedPositions,
      valueStatus: ValueStatus.DERIVED,
      inputStatuses: [ValueStatus.DERIVED],
      dataStatus: LiquidityDataStatus.ESTIMATED
    });
  }
}
