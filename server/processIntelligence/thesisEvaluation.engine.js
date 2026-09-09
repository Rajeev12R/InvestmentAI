/**
 * Phase 13 - Thesis Evaluation Engine
 * 
 * Evaluates thesis status, expected drivers, thesis breakers, and catalyst realization.
 * Distinctly decouples thesis state from stock price movement.
 * Supports WORKING + LOSS and BROKEN + PROFIT.
 */

import {
  deepFreeze,
  computeDeterministicHash,
  ThesisState,
  ThesisBreakerStatus,
  CatalystStatus,
  ForecastStatus
} from './process.types.js';

export class ThesisEvaluationEngine {
  /**
   * Evaluate a thesis version against observed evidence, forecast outcomes, breakers, and catalysts
   */
  evaluateThesis(params) {
    const {
      thesisVersion,
      scoredForecasts = [],
      observedBreakers = [],
      catalystObservations = [],
      fundamentalObservations = [],
      marketReturn = null,
      stockReturn = null
    } = params;

    if (!thesisVersion) {
      throw new Error('ThesisVersion is required for evaluation');
    }

    // 1. Evaluate Breakers
    let isBroken = false;
    const evaluatedBreakers = (thesisVersion.falsificationConditions || []).map(condition => {
      const match = observedBreakers.find(b => b.conditionId === condition.conditionId || b.triggerId === condition.conditionId);
      if (match) {
        if (match.isTriggered) {
          isBroken = true;
          return {
            conditionId: condition.conditionId,
            description: condition.description,
            status: ThesisBreakerStatus.BREAKER_TRIGGERED,
            breachMagnitude: match.breachMagnitude || null,
            breachDate: match.breachDate || null,
            investorAwarenessTimestamp: match.investorAwarenessTimestamp || null,
            actionTaken: match.actionTaken || 'NONE'
          };
        }
        return {
          conditionId: condition.conditionId,
          description: condition.description,
          status: ThesisBreakerStatus.BREAKER_NOT_TRIGGERED
        };
      }
      return {
        conditionId: condition.conditionId,
        description: condition.description,
        status: ThesisBreakerStatus.INSUFFICIENT_DATA
      };
    });

    // 2. Evaluate Catalysts
    let allCatalystsRealized = (thesisVersion.catalystExpectations || []).length > 0;
    const evaluatedCatalysts = (thesisVersion.catalystExpectations || []).map(cat => {
      const match = catalystObservations.find(c => c.catalystId === cat.catalystId);
      if (match) {
        let status = CatalystStatus.UNKNOWN;
        if (match.realized) {
          status = CatalystStatus.REALIZED;
        } else if (match.delayed) {
          status = CatalystStatus.DELAYED;
          allCatalystsRealized = false;
        } else if (match.failed) {
          status = CatalystStatus.FAILED;
          allCatalystsRealized = false;
        } else {
          status = CatalystStatus.PARTIALLY_REALIZED;
          allCatalystsRealized = false;
        }
        return {
          catalystId: cat.catalystId,
          name: cat.name,
          expectedDate: cat.expectedDate || null,
          actualDate: match.actualDate || null,
          status,
          contributionToOutcome: match.contribution || null
        };
      }
      allCatalystsRealized = false;
      return {
        catalystId: cat.catalystId,
        name: cat.name,
        expectedDate: cat.expectedDate || null,
        status: CatalystStatus.EXPECTED
      };
    });

    // 3. Evaluate Forecast Drivers
    let validatedForecastCount = 0;
    let falsifiedForecastCount = 0;
    let totalForecasts = scoredForecasts.length;

    for (const sf of scoredForecasts) {
      if (sf.status === ForecastStatus.VALIDATED || sf.status === ForecastStatus.PARTIALLY_VALIDATED) {
        validatedForecastCount++;
      } else if (sf.status === ForecastStatus.FALSIFIED) {
        falsifiedForecastCount++;
      }
    }

    // 4. Determine Thesis State
    let thesisState = ThesisState.INSUFFICIENT_DATA;
    let score = null;

    if (isBroken) {
      thesisState = ThesisState.BROKEN;
      score = 0.0;
    } else if (totalForecasts === 0 && evaluatedBreakers.length === 0 && evaluatedCatalysts.length === 0) {
      thesisState = ThesisState.INSUFFICIENT_DATA;
      score = null;
    } else {
      const resolvedForecasts = validatedForecastCount + falsifiedForecastCount;
      if (resolvedForecasts > 0) {
        const accuracy = validatedForecastCount / resolvedForecasts;
        score = Math.round(accuracy * 100) / 100;

        if (allCatalystsRealized && accuracy >= 0.75) {
          thesisState = ThesisState.VALIDATED;
        } else if (accuracy >= 0.75) {
          thesisState = ThesisState.STRENGTHENING;
        } else if (accuracy >= 0.45) {
          thesisState = ThesisState.WORKING;
        } else {
          thesisState = ThesisState.WEAKENING;
        }
      } else {
        thesisState = ThesisState.WORKING; // Breakers not tripped, pending forecasts
        score = 0.50;
      }
    }

    // 5. Outcome comparison check: decoupling thesis state from stock price
    const hasFinancialLoss = typeof stockReturn === 'number' && stockReturn < 0;
    const hasFinancialProfit = typeof stockReturn === 'number' && stockReturn > 0;

    const evaluation = {
      thesisVersionId: thesisVersion.thesisVersionId,
      decisionId: thesisVersion.decisionId,
      ticker: thesisVersion.ticker,
      thesisStatement: thesisVersion.thesisStatement,
      thesisState,
      score,
      isBroken,
      allCatalystsRealized,
      forecastAccuracy: (validatedForecastCount + falsifiedForecastCount) > 0 ? validatedForecastCount / (validatedForecastCount + falsifiedForecastCount) : null,
      totalForecasts,
      validatedForecastCount,
      falsifiedForecastCount,
      breakers: evaluatedBreakers,
      catalysts: evaluatedCatalysts,
      stockReturn: typeof stockReturn === 'number' ? stockReturn : null,
      marketReturn: typeof marketReturn === 'number' ? marketReturn : null,
      isWorkingWithLoss: (thesisState === ThesisState.WORKING || thesisState === ThesisState.STRENGTHENING || thesisState === ThesisState.VALIDATED) && hasFinancialLoss,
      isBrokenWithProfit: thesisState === ThesisState.BROKEN && hasFinancialProfit,
      evaluatedAt: new Date().toISOString()
    };

    return deepFreeze(evaluation);
  }
}

export const thesisEvaluationEngine = new ThesisEvaluationEngine();
