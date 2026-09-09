/**
 * server/riskAttribution/riskAttribution.engine.js
 * 
 * Phase 32: Institutional Risk Attribution & Explainability Engine
 * Canonical calculation engine decomposing portfolio risk across all required institutional dimensions.
 */

import { AttributionType, ConfidenceStatus, CovarianceAllocationConvention, ResidualPolicy, deepFreeze } from './riskAttribution.types.js';
import { RiskAttributionConfig } from './riskAttribution.config.js';
import { RiskAttributionValidation } from './riskAttribution.validation.js';

export class RiskAttributionEngine {
  /**
   * Run Comprehensive Canonical Portfolio Risk Attribution
   */
  static runComprehensiveAttribution({
    symbols = [],
    weights = [],
    covarianceMatrix = [],
    benchmarkWeights = null,
    sectors = {},
    geographies = {},
    sleeves = {},
    factorExposures = null,    // { factorNames: string[], exposures: { [sym]: number[] }, factorCovariance: number[][], idiosyncraticVariances: { [sym]: number } }
    historicalReturns = null,  // number[][] (N assets x T periods) or null
    periodsPerYear = RiskAttributionConfig.DEFAULT_PARAMS.DEFAULT_PERIODS_PER_YEAR,
    confidence = RiskAttributionConfig.DEFAULT_PARAMS.CONFIDENCE_LEVEL,
    covarianceConvention = CovarianceAllocationConvention.MARGINAL_SPLIT,
    asOf = new Date().toISOString()
  } = {}) {
    RiskAttributionValidation.validatePortfolioInputs(symbols, weights);
    const n = symbols.length;

    let effectiveCov = covarianceMatrix;
    if ((!Array.isArray(effectiveCov) || effectiveCov.length !== n) && factorExposures && Array.isArray(factorExposures.factorNames)) {
      const { factorNames, exposures, factorCovariance, idiosyncraticVariances } = factorExposures;
      const k = factorNames.length;
      effectiveCov = [];
      for (let i = 0; i < n; i++) {
        effectiveCov[i] = [];
        const s_i = symbols[i];
        const b_i = (exposures && exposures[s_i]) || new Array(k).fill(0);
        for (let j = 0; j < n; j++) {
          const s_j = symbols[j];
          const b_j = (exposures && exposures[s_j]) || new Array(k).fill(0);
          let sys_ij = 0;
          for (let f1 = 0; f1 < k; f1++) {
            for (let f2 = 0; f2 < k; f2++) {
              sys_ij += b_i[f1] * factorCovariance[f1][f2] * b_j[f2];
            }
          }
          const idio_ij = (i === j && idiosyncraticVariances && idiosyncraticVariances[s_i] !== undefined) ? idiosyncraticVariances[s_i] : 0;
          effectiveCov[i][j] = sys_ij + idio_ij;
        }
      }
    }

    RiskAttributionValidation.validateCovarianceMatrix(effectiveCov, n);
    covarianceMatrix = effectiveCov;

    const ppy = periodsPerYear || RiskAttributionConfig.PERIODS_PER_YEAR.DAILY;
    const annFactor = Math.sqrt(ppy);

    // 1. Portfolio Volatility & Variance
    const periodVariance = RiskAttributionValidation.quadraticForm(weights, covarianceMatrix);
    const safePeriodVar = Math.max(0, periodVariance);
    const periodVol = Math.sqrt(safePeriodVar);
    const annualizedVol = periodVol * annFactor;
    const annualizedVariance = safePeriodVar * ppy;

    const isZeroRisk = periodVol < RiskAttributionConfig.TOLERANCES.ZERO_VOLATILITY_EPSILON;

    // 2. Position-Level Marginal, Component, and Percentage Risk Contributions (Euler)
    const Sw = RiskAttributionValidation.matrixVectorMultiply(covarianceMatrix, weights);
    const positions = [];
    let sumCRC = 0;
    let sumPRC = 0;
    let sumVarCont = 0;
    let sumStandaloneVar = 0;
    let sumCrossCov = 0;
    let sumUndiversifiedVol = 0;

    for (let i = 0; i < n; i++) {
      const sym = symbols[i];
      const w = weights[i];
      const Sw_i = Sw[i];
      const assetVar = covarianceMatrix[i][i];
      const assetVolPeriod = Math.sqrt(Math.max(0, assetVar));
      const assetVolAnnualized = assetVolPeriod * annFactor;

      // Marginal Risk Contribution
      const mrcPeriod = isZeroRisk ? 0 : Sw_i / periodVol;
      const mrcAnnualized = mrcPeriod * annFactor;

      // Component Risk Contribution
      const crcPeriod = isZeroRisk ? 0 : w * mrcPeriod;
      const crcAnnualized = crcPeriod * annFactor;

      // Percentage Risk Contribution
      const prc = isZeroRisk ? (1.0 / n) : (safePeriodVar > 0 ? (w * Sw_i) / safePeriodVar : 0);

      // Variance Contribution: w_i * (Sigma * w)_i
      const varContPeriod = w * Sw_i;
      const varContAnnualized = varContPeriod * ppy;

      // Standalone vs Cross-Covariance
      const standaloneVarPeriod = w * w * assetVar;
      const standaloneVarAnnualized = standaloneVarPeriod * ppy;
      const crossCovPeriod = varContPeriod - standaloneVarPeriod;
      const crossCovAnnualized = crossCovPeriod * ppy;

      sumCRC += crcAnnualized;
      sumPRC += prc;
      sumVarCont += varContAnnualized;
      sumStandaloneVar += standaloneVarAnnualized;
      sumCrossCov += crossCovAnnualized;
      sumUndiversifiedVol += Math.abs(w) * assetVolAnnualized;

      positions.push({
        symbol: sym,
        weight: w,
        sector: sectors[sym] || 'Unclassified',
        geography: geographies[sym] || 'Unclassified',
        sleeve: sleeves[sym] || 'Main',
        standaloneVolatility: assetVolAnnualized,
        marginalRiskContribution: mrcAnnualized,
        componentRiskContribution: crcAnnualized,
        percentageRiskContribution: prc,
        percentageRiskContributionPercent: prc * 100,
        varianceContribution: varContAnnualized,
        standaloneVarianceContribution: standaloneVarAnnualized,
        crossCovarianceContribution: crossCovAnnualized,
        status: isZeroRisk ? ConfidenceStatus.DERIVED : ConfidenceStatus.CALCULATED
      });
    }

    // 3. Diversification & Correlation Metrics
    const diversificationRatio = annualizedVol > 0 ? sumUndiversifiedVol / annualizedVol : 1.0;
    const diversificationBenefit = Math.max(0, sumUndiversifiedVol - annualizedVol);
    const correlationRiskRatio = annualizedVariance > 0 ? sumCrossCov / annualizedVariance : 0;

    // 4. Concentration Attribution (Weight vs Risk Concentration)
    const weightHHI = weights.reduce((acc, w) => acc + (w * w), 0);
    const riskHHI = positions.reduce((acc, p) => acc + (p.percentageRiskContribution * p.percentageRiskContribution), 0);
    const encWeight = weightHHI > 0 ? 1.0 / weightHHI : n;
    const encRisk = riskHHI > 0 ? 1.0 / riskHHI : n;

    // Top-1, Top-3, Top-5 Concentrations
    const sortedByWeight = [...positions].sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
    const sortedByRisk = [...positions].sort((a, b) => b.componentRiskContribution - a.componentRiskContribution);

    const top1Weight = sortedByWeight.slice(0, 1).reduce((s, p) => s + Math.abs(p.weight), 0);
    const top3Weight = sortedByWeight.slice(0, 3).reduce((s, p) => s + Math.abs(p.weight), 0);
    const top5Weight = sortedByWeight.slice(0, 5).reduce((s, p) => s + Math.abs(p.weight), 0);

    const top1Risk = sortedByRisk.slice(0, 1).reduce((s, p) => s + p.percentageRiskContribution, 0);
    const top3Risk = sortedByRisk.slice(0, 3).reduce((s, p) => s + p.percentageRiskContribution, 0);
    const top5Risk = sortedByRisk.slice(0, 5).reduce((s, p) => s + p.percentageRiskContribution, 0);

    const concentrationAttribution = {
      status: ConfidenceStatus.CALCULATED,
      weightHHI,
      riskHHI,
      effectiveNumberOfConstituentsWeight: encWeight,
      effectiveNumberOfConstituentsRisk: encRisk,
      top1Weight,
      top3Weight,
      top5Weight,
      top1Risk,
      top3Risk,
      top5Risk,
      concentrationVsRiskDivergence: riskHHI - weightHHI,
      topRiskDriver: sortedByRisk[0] ? sortedByRisk[0].symbol : null
    };

    // 5. Factor Risk Attribution (if factor model supplied)
    let factorAttribution = null;
    if (factorExposures && Array.isArray(factorExposures.factorNames) && factorExposures.factorNames.length > 0) {
      factorAttribution = this.decomposeFactorRisk({
        symbols,
        weights,
        factorExposures,
        totalVariance: annualizedVariance,
        periodsPerYear: ppy
      });
    }

    // 6. Sector, Geography & Sleeve Rollups
    const sectorAttribution = this.aggregateGroupAttribution(positions, 'sector', annualizedVol, annualizedVariance);
    const geographyAttribution = this.aggregateGroupAttribution(positions, 'geography', annualizedVol, annualizedVariance);
    const sleeveAttribution = this.aggregateGroupAttribution(positions, 'sleeve', annualizedVol, annualizedVariance);

    // 7. Active / Benchmark-Relative Tracking Error Attribution (if benchmark supplied)
    let activeRiskAttribution = null;
    if (Array.isArray(benchmarkWeights) && benchmarkWeights.length === n) {
      activeRiskAttribution = this.decomposeActiveRisk({
        symbols,
        weights,
        benchmarkWeights,
        covarianceMatrix,
        periodsPerYear: ppy
      });
    }

    // 8. Tail Risk Attribution (Parametric CVaR, Component ES & Historical Tail Attribution)
    const tailRiskAttribution = this.decomposeTailRisk({
      positions,
      annualizedVol,
      confidence,
      historicalReturns,
      symbols,
      weights,
      periodsPerYear: ppy
    });

    // 9. Stress Risk Attribution
    const stressAttribution = this.decomposeStressRisk({
      symbols,
      weights,
      covarianceMatrix,
      baseVol: annualizedVol,
      periodsPerYear: ppy
    });

    // 10. Regime Risk Attribution
    const regimeAttribution = this.decomposeRegimeRisk({
      symbols,
      weights,
      covarianceMatrix,
      baseVol: annualizedVol,
      periodsPerYear: ppy
    });

    // 11. Reconciliation Audit
    const crcReconciliationGap = Math.abs(sumCRC - annualizedVol);
    const prcReconciliationGap = Math.abs(sumPRC - 1.0);
    const varReconciliationGap = Math.abs(sumVarCont - annualizedVariance);

    const isReconciled = crcReconciliationGap <= RiskAttributionConfig.TOLERANCES.ABSOLUTE_RECONCILIATION &&
                         (isZeroRisk || prcReconciliationGap <= RiskAttributionConfig.TOLERANCES.PERCENTAGE_SUM_TOLERANCE) &&
                         varReconciliationGap <= RiskAttributionConfig.TOLERANCES.VARIANCE_SUM_TOLERANCE;

    const residual = {
      policy: isReconciled ? ResidualPolicy.RECONCILED_WITHIN_TOLERANCE : ResidualPolicy.EXPLICIT_RESIDUAL,
      crcGap: crcReconciliationGap,
      prcGap: prcReconciliationGap,
      varianceGap: varReconciliationGap,
      tolerance: RiskAttributionConfig.TOLERANCES.ABSOLUTE_RECONCILIATION
    };

    return deepFreeze({
      status: isZeroRisk ? ConfidenceStatus.DERIVED : ConfidenceStatus.CALCULATED,
      asOf,
      engineVersion: RiskAttributionConfig.ENGINE_VERSION,
      portfolioMetrics: {
        portfolioVolatility: annualizedVol,
        portfolioVariance: annualizedVariance,
        undiversifiedVolatility: sumUndiversifiedVol,
        diversificationRatio,
        diversificationBenefit,
        periodsPerYear: ppy,
        isZeroRisk
      },
      reconciliation: {
        isReconciled,
        sumComponentRisk: sumCRC,
        sumPercentageRisk: sumPRC,
        sumVarianceContribution: sumVarCont,
        sumStandaloneVariance: sumStandaloneVar,
        sumCrossCovariance: sumCrossCov,
        residual
      },
      positions,
      sectors: sectorAttribution,
      geographies: geographyAttribution,
      sleeves: sleeveAttribution,
      correlationAttribution: {
        status: ConfidenceStatus.CALCULATED,
        convention: covarianceConvention,
        totalVariance: annualizedVariance,
        standaloneVarianceTotal: sumStandaloneVar,
        crossCovarianceTotal: sumCrossCov,
        crossCovarianceRatio: correlationRiskRatio,
        diversificationRatio
      },
      concentrationAttribution,
      factorAttribution,
      activeRiskAttribution,
      tailRiskAttribution,
      stressAttribution,
      regimeAttribution
    });
  }

  /**
   * Aggregate canonical position-level attribution into higher hierarchical groups (Sector, Geography, Sleeve)
   */
  static aggregateGroupAttribution(positions, groupKey, portfolioVol, portfolioVar) {
    const groupMap = {};

    for (const pos of positions) {
      const gName = pos[groupKey] || 'Unclassified';
      if (!groupMap[gName]) {
        groupMap[gName] = {
          name: gName,
          weight: 0,
          componentRiskContribution: 0,
          percentageRiskContribution: 0,
          varianceContribution: 0,
          standaloneVarianceContribution: 0,
          crossCovarianceContribution: 0,
          positions: []
        };
      }
      const g = groupMap[gName];
      g.weight += pos.weight;
      g.componentRiskContribution += pos.componentRiskContribution;
      g.percentageRiskContribution += pos.percentageRiskContribution;
      g.varianceContribution += pos.varianceContribution;
      g.standaloneVarianceContribution += pos.standaloneVarianceContribution;
      g.crossCovarianceContribution += pos.crossCovarianceContribution;
      g.positions.push(pos.symbol);
    }

    const groups = Object.values(groupMap).map(g => ({
      name: g.name,
      weight: g.weight,
      componentRiskContribution: g.componentRiskContribution,
      percentageRiskContribution: g.percentageRiskContribution,
      percentageRiskContributionPercent: g.percentageRiskContribution * 100,
      varianceContribution: g.varianceContribution,
      standaloneVarianceContribution: g.standaloneVarianceContribution,
      crossCovarianceContribution: g.crossCovarianceContribution,
      positionCount: g.positions.length,
      positions: g.positions,
      status: ConfidenceStatus.DERIVED
    }));

    const sumCRC = groups.reduce((s, g) => s + g.componentRiskContribution, 0);
    const sumPRC = groups.reduce((s, g) => s + g.percentageRiskContribution, 0);
    const sumVar = groups.reduce((s, g) => s + g.varianceContribution, 0);

    return {
      status: ConfidenceStatus.DERIVED,
      groupKey,
      groups,
      sumComponentRisk: sumCRC,
      sumPercentageRisk: sumPRC,
      sumVarianceContribution: sumVar,
      reconciliationError: Math.abs(sumCRC - portfolioVol)
    };
  }

  /**
   * Factor Risk Attribution (Σ = B F Bᵀ + D)
   */
  static decomposeFactorRisk({ symbols, weights, factorExposures, totalVariance, periodsPerYear = 252 }) {
    const { factorNames, exposures, factorCovariance, idiosyncraticVariances } = factorExposures;
    const k = factorNames.length;
    const n = symbols.length;

    // 1. Calculate Portfolio Factor Exposures w_F = B^T * w (k x 1)
    const w_F = new Array(k).fill(0);
    for (let f = 0; f < k; f++) {
      let fBeta = 0;
      for (let i = 0; i < n; i++) {
        const sym = symbols[i];
        const beta = (exposures[sym] && exposures[sym][f]) !== undefined ? exposures[sym][f] : 0;
        fBeta += weights[i] * beta;
      }
      w_F[f] = fBeta;
    }

    // 2. Factor Covariance Multiplication: F * w_F
    const F_w_F = RiskAttributionValidation.matrixVectorMultiply(factorCovariance, w_F);

    // 3. Systematic Factor Variance Contributions
    const factorContributions = [];
    let systematicVariance = 0;

    for (let f = 0; f < k; f++) {
      const fName = factorNames[f];
      const factorVarContPeriod = w_F[f] * F_w_F[f];
      const factorVarContAnnualized = factorVarContPeriod * periodsPerYear;
      systematicVariance += factorVarContAnnualized;

      factorContributions.push({
        factorName: fName,
        portfolioExposure: w_F[f],
        varianceContribution: factorVarContAnnualized,
        percentageContribution: totalVariance > 0 ? factorVarContAnnualized / totalVariance : 0,
        status: ConfidenceStatus.CALCULATED
      });
    }

    // 4. Idiosyncratic / Specific Risk Contribution: sum(w_i^2 * D_ii)
    let idiosyncraticVariance = 0;
    const idiosyncraticContributions = [];
    for (let i = 0; i < n; i++) {
      const sym = symbols[i];
      const specVarPeriod = (idiosyncraticVariances && idiosyncraticVariances[sym] !== undefined) ? idiosyncraticVariances[sym] : 0;
      const specVarAnnualized = weights[i] * weights[i] * specVarPeriod * periodsPerYear;
      idiosyncraticVariance += specVarAnnualized;

      idiosyncraticContributions.push({
        symbol: sym,
        weight: weights[i],
        idiosyncraticVarianceContribution: specVarAnnualized,
        status: ConfidenceStatus.CALCULATED
      });
    }

    const calculatedTotalVar = systematicVariance + idiosyncraticVariance;
    const factorReconciliationGap = Math.abs(calculatedTotalVar - totalVariance);

    return {
      status: ConfidenceStatus.MODEL_BASED,
      modelType: 'LINEAR_FACTOR_MODEL_APT',
      formula: 'Sigma_p^2 = w_F^T * F * w_F + sum(w_i^2 * D_ii)',
      portfolioFactorExposures: factorNames.map((f, idx) => ({ factor: f, beta: w_F[idx] })),
      systematicVariance,
      idiosyncraticVariance,
      totalCalculatedVariance: calculatedTotalVar,
      systematicVariancePercentage: totalVariance > 0 ? (systematicVariance / totalVariance) * 100 : 0,
      idiosyncraticVariancePercentage: totalVariance > 0 ? (idiosyncraticVariance / totalVariance) * 100 : 0,
      factorContributions,
      idiosyncraticContributions,
      factorReconciliationGap,
      isReconciled: factorReconciliationGap <= RiskAttributionConfig.TOLERANCES.VARIANCE_SUM_TOLERANCE
    };
  }

  /**
   * Active / Tracking Error Risk Attribution
   */
  static decomposeActiveRisk({ symbols, weights, benchmarkWeights, covarianceMatrix, periodsPerYear = 252 }) {
    const n = symbols.length;
    const activeWeights = weights.map((w, i) => w - (benchmarkWeights[i] || 0));
    const ppy = periodsPerYear;
    const annFactor = Math.sqrt(ppy);

    const activeVarPeriod = RiskAttributionValidation.quadraticForm(activeWeights, covarianceMatrix);
    const activeVolPeriod = Math.sqrt(Math.max(0, activeVarPeriod));
    const annualizedTE = activeVolPeriod * annFactor;
    const annualizedActiveVar = activeVarPeriod * ppy;

    const S_active_w = RiskAttributionValidation.matrixVectorMultiply(covarianceMatrix, activeWeights);
    const activePositions = [];
    let sumActiveCRC = 0;

    for (let i = 0; i < n; i++) {
      const sym = symbols[i];
      const aw = activeWeights[i];
      const activeSw = S_active_w[i];

      const activeMRC = annualizedTE > 0 ? (activeSw / activeVolPeriod) * annFactor : 0;
      const activeCRC = aw * activeMRC;
      const activePRC = annualizedActiveVar > 0 ? (aw * activeSw * ppy) / annualizedActiveVar : 0;

      sumActiveCRC += activeCRC;
      activePositions.push({
        symbol: sym,
        portfolioWeight: weights[i],
        benchmarkWeight: benchmarkWeights[i] || 0,
        activeWeight: aw,
        activeMarginalRiskContribution: activeMRC,
        activeComponentRiskContribution: activeCRC,
        activePercentageRiskContribution: activePRC,
        status: ConfidenceStatus.CALCULATED
      });
    }

    return {
      status: ConfidenceStatus.DERIVED,
      trackingErrorAnnualized: annualizedTE,
      activeVarianceAnnualized: annualizedActiveVar,
      activePositions,
      sumActiveComponentRisk: sumActiveCRC,
      reconciliationError: Math.abs(sumActiveCRC - annualizedTE)
    };
  }

  /**
   * Tail Risk Attribution (Parametric CVaR, Component ES & Historical Tail Shortfall)
   */
  static decomposeTailRisk({ positions, annualizedVol, confidence = 0.95, historicalReturns = null, symbols = [], weights = [], periodsPerYear = 252 }) {
    const z = RiskAttributionValidation.standardNormalQuantile(confidence);
    const pdf_z = (1.0 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * z * z);
    const es_multiplier = pdf_z / (1.0 - confidence);

    const totalParametricVaR = z * annualizedVol;
    const totalParametricES = es_multiplier * annualizedVol;

    // Component VaR: CVaR_i = z * CRC_i
    // Component ES: CES_i = es_multiplier * CRC_i
    const tailPositions = positions.map(p => {
      const cVaR = z * p.componentRiskContribution;
      const cES = es_multiplier * p.componentRiskContribution;
      return {
        symbol: p.symbol,
        weight: p.weight,
        componentVaR: cVaR,
        componentExpectedShortfall: cES,
        percentageTailRisk: p.percentageRiskContribution,
        status: ConfidenceStatus.CALCULATED
      };
    });

    const sumComponentVaR = tailPositions.reduce((s, p) => s + p.componentVaR, 0);
    const sumComponentES = tailPositions.reduce((s, p) => s + p.componentExpectedShortfall, 0);

    // Empirical / Historical Tail Attribution if returns are supplied
    let empiricalTailAttribution = null;
    if (Array.isArray(historicalReturns) && historicalReturns.length === symbols.length && historicalReturns[0]?.length >= 20) {
      const T = historicalReturns[0].length;
      const portReturns = new Array(T).fill(0);
      for (let t = 0; t < T; t++) {
        for (let i = 0; i < symbols.length; i++) {
          portReturns[t] += weights[i] * historicalReturns[i][t];
        }
      }
      const sortedWithIndex = portReturns.map((r, idx) => ({ r, idx })).sort((a, b) => a.r - b.r);
      const tailCount = Math.max(1, Math.floor(T * (1 - confidence)));
      const tailIndices = sortedWithIndex.slice(0, tailCount).map(item => item.idx);

      const empiricalPositions = symbols.map((sym, i) => {
        let meanTailLoss = 0;
        for (const tidx of tailIndices) {
          meanTailLoss += -historicalReturns[i][tidx];
        }
        meanTailLoss /= tailCount;
        const weightedShortfall = weights[i] * meanTailLoss;
        return {
          symbol: sym,
          weight: weights[i],
          meanTailLossPeriod: meanTailLoss,
          shortfallContributionPeriod: weightedShortfall,
          status: ConfidenceStatus.CALCULATED
        };
      });

      const totalEmpiricalShortfall = empiricalPositions.reduce((s, p) => s + p.shortfallContributionPeriod, 0);
      empiricalTailAttribution = {
        status: ConfidenceStatus.CALCULATED,
        tailObservations: tailCount,
        totalEmpiricalShortfallPeriod: totalEmpiricalShortfall,
        positions: empiricalPositions
      };
    } else {
      empiricalTailAttribution = {
        status: ConfidenceStatus.UNAVAILABLE,
        reason: 'Insufficient historical return observations for non-parametric empirical tail decomposition (requires >= 20 return vectors)'
      };
    }

    return {
      status: ConfidenceStatus.CALCULATED,
      model: 'PARAMETRIC_COVARIANCE_NORMAL',
      signConvention: 'POSITIVE_LOSS_CONVENTION',
      confidence,
      zScore: z,
      esMultiplier: es_multiplier,
      portfolioVaR: totalParametricVaR,
      totalParametricVaR,
      portfolioExpectedShortfall: totalParametricES,
      totalParametricExpectedShortfall: totalParametricES,
      sumComponentVaR,
      sumComponentExpectedShortfall: sumComponentES,
      tailPositions,
      reconciliationErrorVaR: Math.abs(sumComponentVaR - totalParametricVaR),
      reconciliationErrorES: Math.abs(sumComponentES - totalParametricES),
      empiricalTailAttribution
    };
  }

  /**
   * Stress Risk Attribution
   */
  static decomposeStressRisk({ symbols, weights, covarianceMatrix, baseVol, periodsPerYear = 252 }) {
    const n = symbols.length;
    const scenarios = [];

    for (const [sKey, sDef] of Object.entries(RiskAttributionConfig.CANONICAL_STRESS_SCENARIOS)) {
      // Build stressed covariance matrix: Sigma_stressed = (volMultiplier^2) * Sigma_shocked
      const stressedCov = [];
      const volMult = sDef.volMultiplier || 1.5;
      const corrShift = sDef.correlationShift || 0.2;

      for (let i = 0; i < n; i++) {
        stressedCov[i] = [];
        for (let j = 0; j < n; j++) {
          if (i === j) {
            stressedCov[i][j] = covarianceMatrix[i][j] * (volMult * volMult);
          } else {
            const baseCov = covarianceMatrix[i][j];
            const baseStdI = Math.sqrt(Math.max(1e-12, covarianceMatrix[i][i]));
            const baseStdJ = Math.sqrt(Math.max(1e-12, covarianceMatrix[j][j]));
            const baseCorr = baseCov / (baseStdI * baseStdJ);
            const stressedCorr = Math.min(0.99, Math.max(-0.99, baseCorr + corrShift * (1 - Math.abs(baseCorr))));
            const stressedStdI = baseStdI * volMult;
            const stressedStdJ = baseStdJ * volMult;
            stressedCov[i][j] = stressedCorr * stressedStdI * stressedStdJ;
          }
        }
      }

      // Calculate stressed risk
      const stressedVarPeriod = RiskAttributionValidation.quadraticForm(weights, stressedCov);
      const stressedVolAnnualized = Math.sqrt(Math.max(0, stressedVarPeriod)) * Math.sqrt(periodsPerYear);
      const stressedSw = RiskAttributionValidation.matrixVectorMultiply(stressedCov, weights);

      const stressedPositions = symbols.map((sym, i) => {
        const mrc = stressedVolAnnualized > 0 ? (stressedSw[i] / Math.sqrt(stressedVarPeriod)) * Math.sqrt(periodsPerYear) : 0;
        const crc = weights[i] * mrc;
        const prc = stressedVarPeriod > 0 ? (weights[i] * stressedSw[i]) / stressedVarPeriod : 0;
        return {
          symbol: sym,
          weight: weights[i],
          stressedMarginalRiskContribution: mrc,
          stressedComponentRiskContribution: crc,
          stressedPercentageRiskContribution: prc
        };
      });

      const topStressedContributors = [...stressedPositions].sort((a, b) => b.stressedComponentRiskContribution - a.stressedComponentRiskContribution).slice(0, 3);

      scenarios.push({
        scenarioId: sDef.id,
        scenarioName: sDef.name,
        baseVolatility: baseVol,
        stressedVolatility: stressedVolAnnualized,
        volatilityShift: stressedVolAnnualized - baseVol,
        volatilityShiftPercent: baseVol > 0 ? ((stressedVolAnnualized - baseVol) / baseVol) * 100 : 0,
        positions: stressedPositions,
        topStressedContributors,
        status: ConfidenceStatus.SCENARIO
      });
    }

    return {
      status: ConfidenceStatus.SCENARIO,
      scenarios
    };
  }

  /**
   * Regime Risk Attribution
   */
  static decomposeRegimeRisk({ symbols, weights, covarianceMatrix, baseVol, periodsPerYear = 252 }) {
    const n = symbols.length;
    const regimes = [];

    for (const [rKey, rDef] of Object.entries(RiskAttributionConfig.CANONICAL_REGIMES)) {
      const volFactor = rDef.volFactor || 1.0;
      const regimeCov = [];

      for (let i = 0; i < n; i++) {
        regimeCov[i] = [];
        for (let j = 0; j < n; j++) {
          regimeCov[i][j] = covarianceMatrix[i][j] * (volFactor * volFactor);
        }
      }

      const regimeVarPeriod = RiskAttributionValidation.quadraticForm(weights, regimeCov);
      const regimeVolAnnualized = Math.sqrt(Math.max(0, regimeVarPeriod)) * Math.sqrt(periodsPerYear);
      const regimeSw = RiskAttributionValidation.matrixVectorMultiply(regimeCov, weights);

      const regimePositions = symbols.map((sym, i) => {
        const mrc = regimeVolAnnualized > 0 ? (regimeSw[i] / Math.sqrt(regimeVarPeriod)) * Math.sqrt(periodsPerYear) : 0;
        const crc = weights[i] * mrc;
        return {
          symbol: sym,
          weight: weights[i],
          regimeComponentRiskContribution: crc
        };
      });

      regimes.push({
        regimeKey: rKey,
        regimeName: rDef.name,
        volFactor,
        conditionedVolatility: regimeVolAnnualized,
        volatilityDelta: regimeVolAnnualized - baseVol,
        positions: regimePositions,
        status: ConfidenceStatus.SCENARIO
      });
    }

    return {
      status: ConfidenceStatus.SCENARIO,
      regimes
    };
  }
}
