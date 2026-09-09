/**
 * InvestmentAI Phase 2B Test Suite
 * Institutional Relative Valuation & Sector Intelligence
 */

import assert from "assert";
import { CANONICAL_SECTORS, SECTOR_FRAMEWORKS, VALUATION_METHODS } from "../valuation/sector.types.js";
import { classifySector } from "../valuation/sector.classifier.js";
import { selectPeers, isProhibitedPeer } from "../valuation/peerSelection.engine.js";
import { normalizePeerMetrics, calculateDistribution, filterMetricOutlier } from "../valuation/peerNormalization.engine.js";
import { calculateZScores } from "../valuation/zScore.engine.js";
import { calculateRelativeValuationRanges } from "../valuation/relativeValuation.engine.js";
import { calculateModelAgreement, DISAGREEMENT_STATUS } from "../valuation/modelAgreement.engine.js";
import { calculateRelativeValuation } from "../valuation/multiples.engine.js";
import { solveReverseDCF } from "../valuation/reverseDcf.engine.js";
import { calculateFCFFDCF } from "../valuation/dcf.engine.js";
import { VALUATION_STATUS } from "../valuation/valuation.types.js";
import { buildEvidenceGraph, sealTruthPackage, validateTruthPackage } from "../tools/evidence.tool.js";

console.log("=== RUNNING PHASE 2B INSTITUTIONAL RELATIVE VALUATION TEST SUITE ===");

let passed = 0;
let failed = 0;

function test(description, fn) {
    try {
        fn();
        console.log(`  ✓ PASS: ${description}`);
        passed++;
    } catch (err) {
        console.error(`  ✗ FAIL: ${description}`);
        console.error(`    Error: ${err.message}`);
        failed++;
    }
}

// -------------------------------------------------------------
// 1. SECTOR CLASSIFICATION TESTS
// -------------------------------------------------------------
console.log("\n[1. Sector Classification Engine]");

test("1.1 Classifies Banks/Financials correctly and assigns banking framework", () => {
    const res = classifySector({ sector: "Financial Services", industry: "Banks - Diversified" }, "JPM");
    assert.strictEqual(res.canonicalSector, CANONICAL_SECTORS.FINANCIALS);
    assert.strictEqual(res.status, VALUATION_STATUS.CALCULATED);
    assert(res.framework.primaryMethods.includes(VALUATION_METHODS.PRICE_TO_BOOK));
    assert(res.framework.primaryMethods.includes(VALUATION_METHODS.PE));
    assert(res.framework.prohibitedMethods.includes(VALUATION_METHODS.EV_EBITDA));
    assert(res.framework.prohibitedMethods.includes(VALUATION_METHODS.DCF));
});

test("1.2 Classifies Technology sector correctly", () => {
    const res = classifySector({ sector: "Technology", industry: "Consumer Electronics" }, "AAPL");
    assert.strictEqual(res.canonicalSector, CANONICAL_SECTORS.TECHNOLOGY);
    assert(res.framework.primaryMethods.includes(VALUATION_METHODS.DCF));
    assert(res.framework.primaryMethods.includes(VALUATION_METHODS.PE));
    assert(res.framework.primaryMethods.includes(VALUATION_METHODS.EV_EBITDA));
});

test("1.3 Classifies Industrials, Automotive, and Energy sectors correctly", () => {
    const ind = classifySector({ sector: "Industrials", industry: "Specialty Industrial Machinery" }, "CAT");
    assert.strictEqual(ind.canonicalSector, CANONICAL_SECTORS.INDUSTRIALS);
    assert(ind.framework.primaryMethods.includes(VALUATION_METHODS.EV_EBITDA));

    const auto = classifySector({ sector: "Consumer Cyclical", industry: "Auto Manufacturers" }, "TMPV.NS");
    assert.strictEqual(auto.canonicalSector, CANONICAL_SECTORS.AUTOMOTIVE);

    const energy = classifySector({ sector: "Energy", industry: "Oil & Gas Integrated" }, "RELIANCE.NS");
    assert.strictEqual(energy.canonicalSector, CANONICAL_SECTORS.ENERGY);
});

test("1.4 Rejects ungrounded/missing metadata and returns UNAVAILABLE without guessing", () => {
    const unk = classifySector({ sector: null, industry: null }, "UNKNOWN_TICKER");
    assert.strictEqual(unk.canonicalSector, CANONICAL_SECTORS.UNKNOWN);
    assert.strictEqual(unk.status, VALUATION_STATUS.UNAVAILABLE);
    assert.strictEqual(unk.framework.primaryMethods.length, 0);
    assert(unk.reason.includes("Insufficient metadata"));
});

// -------------------------------------------------------------
// 2. REAL PEER SELECTION & PROHIBITED ASSET FILTERING
// -------------------------------------------------------------
console.log("\n[2. Real Peer Selection & Filtering Engine]");

test("2.1 Strictly identifies and rejects benchmark indexes, ETFs, and composite funds", () => {
    assert.strictEqual(isProhibitedPeer("^GSPC"), true);
    assert.strictEqual(isProhibitedPeer("^NSEI"), true);
    assert.strictEqual(isProhibitedPeer("SPY"), true);
    assert.strictEqual(isProhibitedPeer("QQQ"), true);
    assert.strictEqual(isProhibitedPeer("XLF"), true);
    assert.strictEqual(isProhibitedPeer("VOO"), true);
    assert.strictEqual(isProhibitedPeer("AAPL"), false);
    assert.strictEqual(isProhibitedPeer("MARUTI.NS"), false);
});

test("2.2 Filters candidate peer list: excludes target company, duplicates, and ETFs", () => {
    const candidatePeers = [
        { ticker: "AAPL", name: "Apple Inc." }, // Self
        { ticker: "MSFT", name: "Microsoft Corporation", pe: 32.5, evEbitda: 22.0 },
        { ticker: "MSFT", name: "Microsoft Corporation (Duplicate)", pe: 32.5 },
        { ticker: "SPY", name: "SPDR S&P 500 ETF Trust", pe: 25.0 },
        { ticker: "^IXIC", name: "Nasdaq Composite" },
        { ticker: "GOOGL", name: "Alphabet Inc.", pe: 24.8, evEbitda: 17.5 },
        { ticker: "META", name: "Meta Platforms", pe: 26.2, evEbitda: 18.2 }
    ];

    const selection = selectPeers({ ticker: "AAPL", sector: "Technology" }, candidatePeers);
    assert.strictEqual(selection.status, VALUATION_STATUS.CALCULATED);
    assert.strictEqual(selection.peerCount, 3); // MSFT, GOOGL, META
    const tickers = selection.selectedPeers.map(p => p.ticker);
    assert.deepStrictEqual(tickers, ["MSFT", "GOOGL", "META"]);

    // Excluded audit must track reason
    assert.strictEqual(selection.excludedPeers.length, 4);
    assert(selection.excludedPeers.some(p => p.ticker === "SPY" && p.reason.includes("ETF")));
    assert(selection.excludedPeers.some(p => p.ticker === "AAPL" && p.reason.includes("identical to target")));
});

test("2.3 Returns UNAVAILABLE when valid peer count is below minimum threshold", () => {
    const sparseCandidates = [
        { ticker: "SPY", name: "S&P 500 ETF" },
        { ticker: "MSFT", name: "Microsoft Corporation", pe: 32.0 }
    ];
    const selection = selectPeers({ ticker: "AAPL", sector: "Technology" }, sparseCandidates, { minPeers: 2 });
    assert.strictEqual(selection.status, VALUATION_STATUS.UNAVAILABLE);
    assert.strictEqual(selection.peerCount, 1);
    assert(selection.reason.includes("Insufficient operating peers"));
});

// -------------------------------------------------------------
// 3. PEER NORMALIZATION & OUTLIER FILTERING
// -------------------------------------------------------------
console.log("\n[3. Peer Normalization & Outlier Filtering]");

test("3.1 Correctly computes statistical distributions (min, p25, median, p75, max, mean, stdDev)", () => {
    const values = [10, 20, 30, 40, 50];
    const dist = calculateDistribution(values);
    assert.strictEqual(dist.count, 5);
    assert.strictEqual(dist.min, 10);
    assert.strictEqual(dist.p25, 20);
    assert.strictEqual(dist.median, 30);
    assert.strictEqual(dist.p75, 40);
    assert.strictEqual(dist.max, 50);
    assert.strictEqual(dist.mean, 30);
    assert.strictEqual(Number(dist.stdDev.toFixed(2)), 15.81);
});

test("3.2 Excludes negative P/E and extreme multiple anomalies with explicit audit reasons", () => {
    assert.strictEqual(filterMetricOutlier("pe", -15.4).isValid, false);
    assert(filterMetricOutlier("pe", -15.4).reason.includes("non-positive"));
    assert.strictEqual(filterMetricOutlier("pe", 350.0).isValid, false);
    assert(filterMetricOutlier("pe", 350.0).reason.includes("distortion"));
    assert.strictEqual(filterMetricOutlier("pe", 28.5).isValid, true);

    const rawPeers = [
        { ticker: "CO_A", name: "Company A", pe: 25.0, evEbitda: 15.0 },
        { ticker: "CO_B", name: "Company B (Loss making)", pe: -12.0, evEbitda: 18.0 },
        { ticker: "CO_C", name: "Company C", pe: 30.0, evEbitda: -5.0 }
    ];

    const norm = normalizePeerMetrics(rawPeers);
    assert.strictEqual(norm.distributions.pe.count, 2); // Only CO_A and CO_C
    assert.strictEqual(norm.distributions.evEbitda.count, 2); // Only CO_A and CO_B
    assert.strictEqual(norm.outlierAudit.length, 2);
    assert(norm.outlierAudit.some(a => a.ticker === "CO_B" && a.metric === "pe"));
    assert(norm.outlierAudit.some(a => a.ticker === "CO_C" && a.metric === "evEbitda"));
});

// -------------------------------------------------------------
// 4. STATISTICAL Z-SCORE BENCHMARKING
// -------------------------------------------------------------
console.log("\n[4. Statistical Z-Score Benchmarking Engine]");

test("4.1 Calculates directional Z-scores and percentiles for company vs peers", () => {
    const distributions = {
        pe: { status: VALUATION_STATUS.CALCULATED, count: 5, mean: 25.0, median: 24.0, stdDev: 5.0 },
        ebitdaMargin: { status: VALUATION_STATUS.CALCULATED, count: 5, mean: 0.20, median: 0.20, stdDev: 0.05 }
    };

    const companyMetrics = {
        pe: 15.0, // 2 sigma below mean (discount)
        ebitdaMargin: 0.30 // 2 sigma above mean (outperformance)
    };

    const zScores = calculateZScores(companyMetrics, distributions);
    assert.strictEqual(zScores.pe.status, VALUATION_STATUS.CALCULATED);
    assert.strictEqual(zScores.pe.zScore, -2.0);
    assert(zScores.pe.interpretation.includes("multiple discount"));

    assert.strictEqual(zScores.ebitdaMargin.status, VALUATION_STATUS.CALCULATED);
    assert.strictEqual(zScores.ebitdaMargin.zScore, 2.0);
    assert(zScores.ebitdaMargin.interpretation.includes("Significant outperformance"));
});

test("4.2 Safely handles zero standard deviation without NaN or crash", () => {
    const distributions = {
        pe: { status: VALUATION_STATUS.CALCULATED, count: 3, mean: 20.0, median: 20.0, stdDev: 0.0 }
    };
    const zScores = calculateZScores({ pe: 20.0 }, distributions);
    assert.strictEqual(zScores.pe.status, VALUATION_STATUS.CALCULATED);
    assert.strictEqual(zScores.pe.zScore, 0);
    assert.strictEqual(isNaN(zScores.pe.zScore), false);
});

test("4.3 Sets status to UNAVAILABLE when company metric is missing", () => {
    const distributions = {
        pe: { status: VALUATION_STATUS.CALCULATED, count: 3, mean: 20.0, median: 20.0, stdDev: 4.0 }
    };
    const zScores = calculateZScores({ pe: null }, distributions);
    assert.strictEqual(zScores.pe.status, VALUATION_STATUS.UNAVAILABLE);
    assert(zScores.pe.reason.includes("unavailable"));
});

// -------------------------------------------------------------
// 5. RELATIVE VALUATION RANGES & MULTIPLES
// -------------------------------------------------------------
console.log("\n[5. Relative Valuation Multi-Range Calculations]");

test("5.1 Calculates P/E, EV/EBITDA, and composite 3-point ranges for Tech", () => {
    const framework = SECTOR_FRAMEWORKS[CANONICAL_SECTORS.TECHNOLOGY];
    const distributions = {
        pe: { status: VALUATION_STATUS.CALCULATED, count: 3, p25: 20.0, median: 25.0, p75: 30.0 },
        evEbitda: { status: VALUATION_STATUS.CALCULATED, count: 3, p25: 12.0, median: 15.0, p75: 18.0 }
    };

    const res = calculateRelativeValuationRanges({
        ticker: "TECH_CO",
        eps: 5.0,
        ebitda: 1000,
        totalDebt: 500,
        totalCash: 1500, // Net Debt = -1000
        shares: 100,
        framework,
        distributions
    });

    assert.strictEqual(res.status, VALUATION_STATUS.CALCULATED);
    // P/E values: 5 * 20 = 100, 5 * 25 = 125, 5 * 30 = 150
    assert.strictEqual(res.methods[VALUATION_METHODS.PE].impliedValues.base, 125.0);
    // EV/EBITDA: (1000 * 15 - (-1000)) / 100 = (15000 + 1000) / 100 = 160.0
    assert.strictEqual(res.methods[VALUATION_METHODS.EV_EBITDA].impliedValues.base, 160.0);

    // Composite uses normalized framework weights: PE=0.30/0.50=0.60, EV/EBITDA=0.20/0.50=0.40
    // Base: 125 * 0.60 + 160 * 0.40 = 75 + 64 = 139.0
    assert.strictEqual(res.compositeRange.base, 139.0);
});

test("5.2 Rejects EV/EBITDA for Banks with NOT_APPROPRIATE status and values via P/B & P/E", () => {
    const framework = SECTOR_FRAMEWORKS[CANONICAL_SECTORS.FINANCIALS];
    const distributions = {
        pe: { status: VALUATION_STATUS.CALCULATED, count: 3, p25: 10.0, median: 12.0, p75: 14.0 },
        pb: { status: VALUATION_STATUS.CALCULATED, count: 3, p25: 1.2, median: 1.5, p75: 1.8 },
        evEbitda: { status: VALUATION_STATUS.CALCULATED, count: 3, p25: 8.0, median: 10.0, p75: 12.0 }
    };

    const res = calculateRelativeValuationRanges({
        ticker: "JPM",
        eps: 15.0,
        bookValuePerShare: 100.0,
        ebitda: 50000,
        totalDebt: 300000,
        totalCash: 50000,
        shares: 3000,
        framework,
        distributions
    });

    assert.strictEqual(res.status, VALUATION_STATUS.CALCULATED);
    assert.strictEqual(res.methods[VALUATION_METHODS.EV_EBITDA].status, VALUATION_STATUS.NOT_APPROPRIATE);
    assert.strictEqual(res.methods[VALUATION_METHODS.PRICE_TO_BOOK].impliedValues.base, 150.0); // 100 * 1.5
    assert.strictEqual(res.methods[VALUATION_METHODS.PE].impliedValues.base, 180.0); // 15 * 12
    // Composite 50/50: (150 + 180) / 2 = 165.0
    assert.strictEqual(res.compositeRange.base, 165.0);
});

test("5.3 Gracefully marks multiple UNAVAILABLE when debt/cash or shares are missing", () => {
    const framework = SECTOR_FRAMEWORKS[CANONICAL_SECTORS.INDUSTRIALS];
    const distributions = {
        evEbitda: { status: VALUATION_STATUS.CALCULATED, count: 3, p25: 8.0, median: 10.0, p75: 12.0 }
    };

    const res = calculateRelativeValuationRanges({
        ticker: "IND_CO",
        ebitda: 500,
        totalDebt: null, // Missing debt
        totalCash: 100,
        shares: 50,
        framework,
        distributions
    });

    assert.strictEqual(res.methods[VALUATION_METHODS.EV_EBITDA].status, VALUATION_STATUS.UNAVAILABLE);
    assert(res.methods[VALUATION_METHODS.EV_EBITDA].reason.includes("net debt"));
});

// -------------------------------------------------------------
// 6. MODEL AGREEMENT & VALUATION DISPERSION
// -------------------------------------------------------------
console.log("\n[6. Model Agreement & Dispersion Engine]");

test("6.1 Calculates CV and dispersion across valid models, excluding UNAVAILABLE models", () => {
    const models = {
        DCF: { status: VALUATION_STATUS.CALCULATED, fairValue: 150.0 },
        Relative: { status: VALUATION_STATUS.CALCULATED, fairValue: 170.0 },
        ReverseDCF: { status: VALUATION_STATUS.UNAVAILABLE, reason: "Negative starting FCF" }
    };

    const agreement = calculateModelAgreement(models);
    assert.strictEqual(agreement.status, VALUATION_STATUS.CALCULATED);
    assert.strictEqual(agreement.validModelCount, 2);
    assert.strictEqual(agreement.mean, 160.0);
    assert.strictEqual(agreement.median, 160.0);
    assert.strictEqual(agreement.min, 150.0);
    assert.strictEqual(agreement.max, 170.0);
    assert.strictEqual(agreement.disagreementStatus, DISAGREEMENT_STATUS.LOW_DISAGREEMENT);
    assert(agreement.unavailableModels.ReverseDCF !== undefined);
});

test("6.2 Correctly classifies High Disagreement when CV > 30%", () => {
    const models = {
        DCF: { status: VALUATION_STATUS.CALCULATED, fairValue: 100.0 },
        Relative: { status: VALUATION_STATUS.CALCULATED, fairValue: 220.0 }
    };

    const agreement = calculateModelAgreement(models);
    assert.strictEqual(agreement.status, VALUATION_STATUS.CALCULATED);
    assert.strictEqual(agreement.disagreementStatus, DISAGREEMENT_STATUS.HIGH_DISAGREEMENT);
    assert(agreement.coefficientOfVariation > 0.30);
});

test("6.3 Handles single valid model and zero models cleanly", () => {
    const single = calculateModelAgreement({
        DCF: { status: VALUATION_STATUS.CALCULATED, fairValue: 150.0 },
        Relative: { status: VALUATION_STATUS.UNAVAILABLE }
    });
    assert.strictEqual(single.validModelCount, 1);
    assert.strictEqual(single.disagreementStatus, DISAGREEMENT_STATUS.INSUFFICIENT_MODELS);

    const zero = calculateModelAgreement({
        DCF: { status: VALUATION_STATUS.UNAVAILABLE },
        Relative: { status: VALUATION_STATUS.UNAVAILABLE }
    });
    assert.strictEqual(zero.status, VALUATION_STATUS.UNAVAILABLE);
    assert.strictEqual(zero.validModelCount, 0);
});

// -------------------------------------------------------------
// 7. MANDATORY PRECONDITION REVERSE DCF ROUND-TRIP TEST
// -------------------------------------------------------------
console.log("\n[7. Mandatory Precondition: Reverse DCF Round-Trip Reconciliation]");

test("7.1 Solves Reverse DCF implied growth and exactly reconciles back in Forward DCF", () => {
    const marketPrice = 257.46;
    const shares = 15204.14;
    const freeCashFlow = 107724;
    const totalDebt = 106037;
    const totalCash = 34586;
    const waccObj = { status: VALUATION_STATUS.CALCULATED, metadata: { wacc: 0.1013 } };

    // 1. Solve Implied Growth
    const revResult = solveReverseDCF({
        currentPrice: marketPrice,
        sharesOutstanding: shares,
        freeCashFlow,
        totalDebt,
        totalCash,
        waccObj
    });

    assert.strictEqual(revResult.status, VALUATION_STATUS.CALCULATED);
    const solvedGrowth = revResult.metadata.impliedGrowthRate;
    assert(typeof solvedGrowth === "number");

    // 2. Feed solved growth back into Forward DCF
    const fwdResult = calculateFCFFDCF({
        ticker: "AAPL",
        currentPrice: marketPrice,
        sharesOutstanding: shares,
        freeCashFlow,
        totalRevenue: 391035,
        revenueGrowth: solvedGrowth,
        operatingMargin: 0.31,
        totalDebt,
        totalCash,
        waccObj
    });

    assert.strictEqual(fwdResult.status, VALUATION_STATUS.CALCULATED);
    const roundTripPrice = fwdResult.metadata.fairValue;
    const absDiff = Math.abs(roundTripPrice - marketPrice);
    const relDiff = absDiff / marketPrice;

    console.log(`    Reverse DCF Solved Growth: ${(solvedGrowth * 100).toFixed(2)}%`);
    console.log(`    Market Price: $${marketPrice} | Round-Trip DCF: $${roundTripPrice} (Diff: $${absDiff.toFixed(2)}, ${(relDiff * 100).toFixed(3)}%)`);

    assert(relDiff < 0.005, `Round-trip fair value ($${roundTripPrice}) must reconcile with market price ($${marketPrice}) within 0.5%`);
});

// -------------------------------------------------------------
// 8. TRUTH PACKAGE SEALING & INTEGRITY
// -------------------------------------------------------------
console.log("\n[8. Truth Package Sealing & Tamper Evidence]");

test("8.1 Canonical Truth Package seals Phase 2B structures and detects tampering", () => {
    const mockState = {
        companyName: "Apple Inc.",
        companyProfile: { ticker: "AAPL", sector: "Technology", industry: "Consumer Electronics" },
        financials: {
            totalRevenue: 391035000000,
            netIncome: 93736000000,
            freeCashFlow: 107724000000,
            totalDebt: 106037000000,
            totalCash: 34586000000,
            trailingEps: 6.08,
            ebitda: 130000000000
        },
        stockData: { currentPrice: 257.46, sharesOutstanding: 15204140000, beta: 1.1 },
        competitors: {
            primaryCompetitors: [
                { ticker: "MSFT", name: "Microsoft", peRatio: 33.0, evToEbitda: 22.0 },
                { ticker: "GOOGL", name: "Alphabet", peRatio: 25.0, evToEbitda: 18.0 },
                { ticker: "META", name: "Meta", peRatio: 26.0, evToEbitda: 19.0 }
            ]
        }
    };

    const pkgResult = buildEvidenceGraph(mockState);
    assert(pkgResult.truthPackage !== undefined);
    assert(pkgResult.truthPackage.valuationModels.relativeValuation !== undefined);
    assert.strictEqual(pkgResult.integrity.valid, true);
    assert(typeof pkgResult.integrity.packageHash === "string" && pkgResult.integrity.packageHash.length === 64);

    // Tamper test: Alter relative valuation fair value and verify hash mutation
    const tampered = JSON.parse(JSON.stringify(pkgResult.truthPackage));
    tampered.valuationModels.relativeValuation.fairValue = 999.99;
    const resealed = sealTruthPackage(tampered);
    assert.notStrictEqual(resealed.packageHash, pkgResult.integrity.packageHash, "Tampered relative valuation must alter SHA-256 seal hash");
});

console.log(`\n======================================================`);
console.log(`PHASE 2B TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log(`======================================================\n`);

if (failed > 0) {
    process.exit(1);
}
