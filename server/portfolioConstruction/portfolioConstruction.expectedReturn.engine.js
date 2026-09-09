import { ExpectedReturnSource, OptimizationStatus } from "./portfolioConstruction.types.js";

/**
 * Deterministic Expected Return Engine for Phase 14
 * Derives expected returns strictly from verified valuation, scenario, or forecast ledger facts.
 * Never invents, guesses, or defaults missing expected returns to synthetic numbers.
 */
export class ExpectedReturnEngine {
  /**
   * Derive expected return for a single security from evidence/facts.
   */
  static deriveSecurityExpectedReturn(securityData, asOfTimestamp) {
    if (!securityData || typeof securityData !== "object") {
      return {
        ticker: securityData?.ticker || "UNKNOWN",
        expectedReturn: null,
        status: OptimizationStatus.UNAVAILABLE,
        source: ExpectedReturnSource.UNAVAILABLE,
        reasonCode: "MISSING_SECURITY_DATA",
        evidenceIds: []
      };
    }

    const { ticker, valuation, scenario, forecastLedger, currentPrice, truthPackageHash } = securityData;

    // 1. Valuation DCF Derivation: (Fair Value / Current Price) - 1
    if (valuation && valuation.fairValue !== undefined && valuation.fairValue !== null && currentPrice) {
      if (typeof valuation.fairValue === "number" && valuation.fairValue > 0 && typeof currentPrice === "number" && currentPrice > 0) {
        // Temporal check on valuation if timestamp provided
        if (valuation.timestamp && asOfTimestamp && new Date(valuation.timestamp).getTime() > new Date(asOfTimestamp).getTime()) {
          return {
            ticker,
            expectedReturn: null,
            status: OptimizationStatus.INVALID_INPUT,
            source: ExpectedReturnSource.UNAVAILABLE,
            reasonCode: "FUTURE_VALUATION_LEAKAGE",
            evidenceIds: valuation.evidenceIds || []
          };
        }

        const rawReturn = (valuation.fairValue / currentPrice) - 1.0;
        return {
          ticker,
          expectedReturn: Number(rawReturn.toFixed(6)),
          status: OptimizationStatus.OPTIMAL,
          source: ExpectedReturnSource.VALUATION_DCF,
          methodology: "DCF_INTRINSIC_UPSIDE",
          formula: "(FairValue / CurrentPrice) - 1",
          fairValue: valuation.fairValue,
          currentPrice,
          evidenceIds: valuation.evidenceIds || [valuation.evidenceId || `EVID-VAL-${ticker}`],
          confidence: valuation.confidence || 0.85,
          timestamp: valuation.timestamp || asOfTimestamp,
          truthPackageHash: truthPackageHash || valuation.truthPackageHash
        };
      }
    }

    // 2. Scenario Probability-Weighted Return
    if (scenario && Array.isArray(scenario.cases) && scenario.cases.length > 0) {
      let expectedSum = 0;
      let probSum = 0;
      let valid = true;

      for (const sc of scenario.cases) {
        if (typeof sc.probability !== "number" || typeof sc.targetReturn !== "number" || sc.probability < 0 || sc.probability > 1.0) {
          valid = false;
          break;
        }
        expectedSum += sc.probability * sc.targetReturn;
        probSum += sc.probability;
      }

      if (valid && Math.abs(probSum - 1.0) < 0.01) {
        return {
          ticker,
          expectedReturn: Number(expectedSum.toFixed(6)),
          status: OptimizationStatus.OPTIMAL,
          source: ExpectedReturnSource.SCENARIO_PROBABILITY_WEIGHTED,
          methodology: "SCENARIO_PROBABILITY_WEIGHTED",
          formula: "SUM(probability_i * targetReturn_i)",
          evidenceIds: scenario.evidenceIds || [`EVID-SCENARIO-${ticker}`],
          confidence: scenario.confidence || 0.80,
          timestamp: scenario.timestamp || asOfTimestamp
        };
      }
    }

    // 3. Process Forecast Ledger Derivation
    if (forecastLedger && typeof forecastLedger.expectedReturn === "number" && isFinite(forecastLedger.expectedReturn)) {
      return {
        ticker,
        expectedReturn: Number(forecastLedger.expectedReturn.toFixed(6)),
        status: OptimizationStatus.OPTIMAL,
        source: ExpectedReturnSource.PROCESS_FORECAST_LEDGER,
        methodology: "PROCESS_FORECAST_LEDGER",
        formula: "FORECAST_LEDGER_PRIMARY_TARGET",
        evidenceIds: forecastLedger.evidenceIds || [`EVID-FC-${ticker}`],
        confidence: forecastLedger.confidence || 0.75,
        timestamp: forecastLedger.timestamp || asOfTimestamp
      };
    }

    // 4. Default: UNAVAILABLE (Never invent an expected return!)
    return {
      ticker,
      expectedReturn: null,
      status: OptimizationStatus.UNAVAILABLE,
      source: ExpectedReturnSource.UNAVAILABLE,
      reasonCode: "NO_VERIFIED_EXPECTED_RETURN_EVIDENCE",
      evidenceIds: []
    };
  }

  /**
   * Derive expected returns for an entire universe of candidate securities.
   */
  static deriveUniverseExpectedReturns(universeSecurities, asOfTimestamp) {
    const results = {};
    let allAvailable = true;
    const unavailableTickers = [];

    for (const sec of universeSecurities) {
      const derived = this.deriveSecurityExpectedReturn(sec, asOfTimestamp);
      results[sec.ticker] = derived;
      if (derived.status !== OptimizationStatus.OPTIMAL) {
        allAvailable = false;
        unavailableTickers.push(sec.ticker);
      }
    }

    return {
      universeReturns: results,
      allAvailable,
      unavailableTickers,
      status: allAvailable ? OptimizationStatus.OPTIMAL : OptimizationStatus.UNAVAILABLE
    };
  }
}
