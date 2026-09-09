import { RiskHorizon, HORIZON_DAYS, DataClassification } from './riskForecast.types.js';
import { RiskForecastConfig } from './riskForecast.config.js';
import { RiskForecastValidation } from './riskForecast.validation.js';
import { RiskForecastVolatilityEngine } from './riskForecast.volatility.engine.js';
import { RiskForecastCovarianceEngine } from './riskForecast.covariance.engine.js';
import { RiskForecastMarginalEngine } from './riskForecast.marginal.engine.js';
import { RiskForecastVaREngine } from './riskForecast.var.engine.js';
import { RiskForecastExpectedShortfallEngine } from './riskForecast.expectedShortfall.engine.js';
import { RiskForecastDrawdownEngine } from './riskForecast.drawdown.engine.js';

/**
 * Phase 31 — Institutional Multi-Horizon Risk Forecasting & Factor Risk Engine
 */
export class RiskForecastEngine {
  /**
   * Run Comprehensive Institutional Risk Forecast
   */
  static runComprehensiveForecast({
    symbols,
    weights,
    benchmarkWeights,
    portfolioReturns,
    alignedReturnsMatrix,
    covarianceMatrix,
    factorExposures,
    factorCovarianceMatrix,
    macroRegime,
    liquidityCostBps,
    taxRate,
    portfolioValue = 1000000.0,
    asOf,
    confidence = 0.95,
    stochasticLiquidityModel,
    stochasticLiquidityVariance,
    afterTaxReturns,
    options = {}
  }) {
    if (!asOf || isNaN(new Date(asOf).getTime())) {
      throw new Error('Valid asOf timestamp is required');
    }
    if (!Array.isArray(symbols) || !Array.isArray(weights) || symbols.length !== weights.length) {
      throw new Error('symbols and weights must be non-empty arrays of identical length');
    }

    const nAssets = symbols.length;
    const periodsPerYear = options.periodsPerYear || RiskForecastConfig.PERIODS_PER_YEAR.DAILY;

    // 1. Covariance matrix resolution
    let covResult;
    if (covarianceMatrix) {
      covResult = RiskForecastCovarianceEngine.processCovarianceQualityAndRepair(
        covarianceMatrix,
        symbols,
        alignedReturnsMatrix?.[0]?.length || null,
        options
      );
    } else if (alignedReturnsMatrix) {
      covResult = RiskForecastCovarianceEngine.calculateHistoricalCovariance(
        alignedReturnsMatrix,
        symbols,
        options
      );
    } else {
      throw new Error('Either covarianceMatrix or alignedReturnsMatrix must be provided');
    }

    const finalCov = covResult.covarianceMatrix;

    // 2. Marginal & Component Risk Decomposition
    const marginalDecomp = RiskForecastMarginalEngine.decomposeMarginalRisk({
      symbols,
      weights,
      covarianceMatrix: finalCov,
      periodsPerYear
    });

    const portfolioVolAnnualized = marginalDecomp.portfolioVolatilityAnnualized;
    const portfolioVolDaily = marginalDecomp.portfolioVolatilityPeriod;

    // 3. Active Risk / Tracking Error against Benchmark
    let activeDecomp = null;
    if (benchmarkWeights && Array.isArray(benchmarkWeights)) {
      activeDecomp = RiskForecastMarginalEngine.decomposeActiveRisk({
        symbols,
        weights,
        benchmarkWeights,
        covarianceMatrix: finalCov,
        periodsPerYear
      });
    }

    // 4. Multi-Horizon Forecasts (1D, 5D, 20D, 60D, 252D)
    const horizons = Object.values(RiskHorizon);
    const horizonForecasts = {};

    for (const h of horizons) {
      const days = HORIZON_DAYS[h];
      const hVol = portfolioVolDaily * Math.sqrt(days);
      const hVolAnnualized = portfolioVolAnnualized;

      // VaR & Expected Shortfall for horizon
      const paramVaR = RiskForecastVaREngine.calculateParametricVaR({
        portfolioVolatility: portfolioVolAnnualized,
        confidence,
        horizonDays: days,
        portfolioValue,
        periodsPerYear
      });

      let histVaR = null;
      let histES = null;
      if (portfolioReturns && portfolioReturns.length >= RiskForecastConfig.MIN_OBSERVATIONS.VAR_HISTORICAL) {
        histVaR = RiskForecastVaREngine.calculateHistoricalVaR(portfolioReturns, {
          confidence,
          horizonDays: days,
          portfolioValue
        });
        histES = RiskForecastExpectedShortfallEngine.calculateHistoricalExpectedShortfall(portfolioReturns, {
          confidence,
          horizonDays: days,
          portfolioValue
        });
      }

      const forwardDD = RiskForecastDrawdownEngine.estimateForwardDrawdown({
        annualizedVolatility: portfolioVolAnnualized,
        horizonDays: days,
        periodsPerYear
      });

      horizonForecasts[h] = {
        horizon: h,
        horizonDays: days,
        baseHorizon: '1D',
        targetHorizon: h,
        scalingFactor: Math.sqrt(days),
        scalingMethod: 'SQRT_TIME_SCALING',
        scalingAssumptions: 'Variance scales linearly with horizon; assumes stationary independent return increments.',
        volatilityForecast: hVol,
        volatilityAnnualized: hVolAnnualized,
        parametricVaR: paramVaR,
        historicalVaR: histVaR,
        expectedShortfall: histES,
        expectedMaxDrawdown: forwardDD,
        classification: DataClassification.MODEL_ESTIMATE,
        status: DataClassification.FORECAST
      };
    }

    // 5. Factor Risk Contribution (Phase 30 integration)
    let factorRiskContribution = null;
    if (factorExposures && typeof factorExposures === 'object' && factorCovarianceMatrix && Array.isArray(factorCovarianceMatrix)) {
      const factorNames = Object.keys(factorExposures);
      const factorBetas = factorNames.map(f => factorExposures[f] || 0);
      const fCov = factorCovarianceMatrix;
      
      if (fCov.length === factorNames.length) {
        // Factor variance = beta^T * Sigma_F * beta
        const factorVarPeriod = RiskForecastValidation.quadraticForm(factorBetas, fCov);
        const factorVolAnnualized = Math.sqrt(Math.max(0, factorVarPeriod * periodsPerYear));
        
        // Specific / Residual variance = total variance - systematic factor variance
        const totalVariance = Math.pow(portfolioVolAnnualized, 2);
        const systematicVariance = Math.pow(factorVolAnnualized, 2);
        const residualVariance = Math.max(0, totalVariance - systematicVariance);
        const residualVolAnnualized = Math.sqrt(residualVariance);

        // Factor Marginal & Component risk
        const Sf_b = RiskForecastValidation.matrixVectorMultiply(fCov, factorBetas);
        const factorContributions = factorNames.map((f, i) => {
          const mrc = factorVolAnnualized > 0 ? (Sf_b[i] / (factorVolAnnualized / Math.sqrt(periodsPerYear))) * Math.sqrt(periodsPerYear) : 0;
          const crc = factorBetas[i] * mrc;
          return {
            factor: f,
            beta: factorBetas[i],
            marginalContribution: mrc,
            componentContribution: crc,
            percentageContribution: systematicVariance > 0 ? (factorBetas[i] * Sf_b[i] * periodsPerYear) / systematicVariance : 0
          };
        });

        factorRiskContribution = {
          status: DataClassification.DERIVED,
          totalVolatility: portfolioVolAnnualized,
          factorVolatility: factorVolAnnualized,
          residualVolatility: residualVolAnnualized,
          systematicRiskRatio: totalVariance > 0 ? systematicVariance / totalVariance : 0,
          residualRiskRatio: totalVariance > 0 ? residualVariance / totalVariance : 0,
          factorContributions
        };
      }
    }

    // 6. Regime-Aware Risk (Phase 22 Macro integration)
    const regimeMultiplier = macroRegime?.toLowerCase() === 'high_volatility' || macroRegime?.toLowerCase() === 'crisis' ? 1.45 :
                             macroRegime?.toLowerCase() === 'low_volatility' ? 0.85 : 1.0;
    const regimeAwareRisk = {
      currentRegime: macroRegime || 'NORMAL',
      historicalVolatility: portfolioVolAnnualized,
      regimeAdjustedVolatility: portfolioVolAnnualized * regimeMultiplier,
      stressVolatility: portfolioVolAnnualized * 1.75,
      status: macroRegime ? DataClassification.MODEL_ESTIMATE : DataClassification.UNAVAILABLE
    };

    // 7. Liquidity Separation & Liquidity-Aware Risk (Phase 18 integration)
    // Avoids invalid generic variance addition sqrt(sigma^2 + drag^2)
    const liqCostBps = typeof liquidityCostBps === 'number' ? liquidityCostBps : null;
    const liqHorizon = options.liquidationHorizonDays || null;
    const liqImpact = options.liquidityImpactBps || null;

    let liquidityAdjustedRisk = {
      marketRisk: portfolioVolAnnualized,
      liquidityCostBps: liqCostBps,
      liquidityImpactBps: liqImpact,
      liquidityHorizonDays: liqHorizon,
      combinedLiquidityRisk: null,
      status: DataClassification.UNAVAILABLE,
      explanation: 'Market risk and liquidity friction are presented separately. Combined metric is UNAVAILABLE because transaction costs and volatility are not orthogonal variance components.'
    };

    // If an explicit defensible stochastic model is provided (e.g. Almgren-Chriss implementation shortfall variance)
    const stochLiqModel = stochasticLiquidityModel ?? options.stochasticLiquidityModel;
    const stochLiqVar = stochasticLiquidityVariance ?? options.stochasticLiquidityVariance;
    if (stochLiqModel && typeof stochLiqVar === 'number') {
      const totalStochasticVar = Math.pow(portfolioVolAnnualized, 2) + stochLiqVar;
      liquidityAdjustedRisk = {
        marketRisk: portfolioVolAnnualized,
        liquidityCostBps: liqCostBps,
        liquidityImpactBps: liqImpact,
        liquidityHorizonDays: liqHorizon,
        combinedLiquidityRisk: Math.sqrt(totalStochasticVar),
        status: DataClassification.MODEL_ESTIMATE,
        model: 'Almgren-Chriss Execution Shortfall Variance Model',
        explanation: 'Combined using explicit stochastic execution shortfall variance.'
      };
    } else if (liqCostBps !== null) {
      liquidityAdjustedRisk.status = DataClassification.DERIVED;
    }

    // 8. Tax Separation & After-Tax Risk Distribution (Phase 17 integration)
    // Avoids invalid generic formula sigma * (1 - 0.5 * taxRate)
    let taxAdjustedRisk = {
      preTaxVolatility: portfolioVolAnnualized,
      taxRate: typeof taxRate === 'number' ? taxRate : null,
      afterTaxVolatility: null,
      status: DataClassification.UNAVAILABLE,
      explanation: 'Defensible after-tax risk metric is UNAVAILABLE without explicit Phase 17 tax lot realization timing or after-tax economic outcome distribution.'
    };

    // If an explicit after-tax economic return distribution is provided via Phase 17
    const afterTaxRets = afterTaxReturns ?? options.afterTaxReturns;
    if (Array.isArray(afterTaxRets) && afterTaxRets.length >= RiskForecastConfig.MIN_OBSERVATIONS.VOLATILITY) {
      const afterTaxVolRes = RiskForecastVolatilityEngine.calculateHistoricalVolatility(afterTaxRets, { periodsPerYear });
      if (afterTaxVolRes.status !== DataClassification.UNAVAILABLE) {
        taxAdjustedRisk = {
          preTaxVolatility: portfolioVolAnnualized,
          taxRate: typeof taxRate === 'number' ? taxRate : null,
          afterTaxVolatility: afterTaxVolRes.annualizedVolatility,
          sampleSize: afterTaxRets.length,
          status: DataClassification.DERIVED,
          explanation: 'Calculated directly from empirical Phase 17 after-tax economic outcome distribution.'
        };
      }
    }

    return {
      status: DataClassification.FORECAST,
      asOf,
      horizons: horizonForecasts,
      portfolioVolatility: portfolioVolAnnualized,
      dailyVolatility: portfolioVolDaily,
      marginalRiskDecomposition: marginalDecomp,
      activeRiskDecomposition: activeDecomp,
      factorRiskContribution: factorRiskContribution || { status: DataClassification.UNAVAILABLE },
      regimeAwareRisk,
      liquidityAdjustedRisk,
      taxAdjustedRisk,
      covarianceQuality: covResult.quality,
      repairApplied: covResult.repairApplied,
      repairMethod: covResult.repairMethod
    };
  }
}
