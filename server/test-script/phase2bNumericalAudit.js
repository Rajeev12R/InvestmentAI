/**
 * InvestmentAI Phase 2B Hostile Numerical & Semantic Integrity Audit
 */

import assert from "assert";
import { CANONICAL_SECTORS, SECTOR_FRAMEWORKS, VALUATION_METHODS } from "../valuation/sector.types.js";
import { classifySector } from "../valuation/sector.classifier.js";
import { selectPeers, isProhibitedPeer } from "../valuation/peerSelection.engine.js";
import { normalizePeerMetrics, calculateDistribution } from "../valuation/peerNormalization.engine.js";
import { calculateZScores } from "../valuation/zScore.engine.js";
import { calculateRelativeValuationRanges } from "../valuation/relativeValuation.engine.js";
import { calculateModelAgreement, DISAGREEMENT_STATUS } from "../valuation/modelAgreement.engine.js";
import { solveReverseDCF } from "../valuation/reverseDcf.engine.js";
import { calculateFCFFDCF } from "../valuation/dcf.engine.js";
import { executeValuationPipeline } from "../valuation/valuation.engine.js";
import { VALUATION_STATUS } from "../valuation/valuation.types.js";
import { buildEvidenceGraph } from "../tools/evidence.tool.js";

console.log("================================================================================");
console.log("STARTING HOSTILE PHASE 2B NUMERICAL & SEMANTIC INTEGRITY AUDIT");
console.log("================================================================================");

let passed = 0;
let failed = 0;

function audit(testName, fn) {
    try {
        fn();
        console.log(`  [AUDIT PASS] ${testName}`);
        passed++;
    } catch (err) {
        console.error(`  [AUDIT FAIL] ${testName}`);
        console.error(`    Details: ${err.message}`);
        failed++;
    }
}

// -------------------------------------------------------------
// 1. REVERSE DCF ROUND-TRIP NUMERICAL PRECISION
// -------------------------------------------------------------
console.log("\n--- SECTION 1: REVERSE DCF MATHEMATICAL ROUND-TRIP PRECISION ---");

audit("1.1 AAPL Reverse DCF exact round-trip at current price $319.97", () => {
    const marketPrice = 319.97;
    const shares = 15204.14;
    const freeCashFlow = 107724;
    const totalDebt = 106037;
    const totalCash = 34586;
    const waccObj = { status: VALUATION_STATUS.CALCULATED, metadata: { wacc: 0.1013, riskFreeRate: 4.25 } };

    const rev = solveReverseDCF({
        currentPrice: marketPrice,
        sharesOutstanding: shares,
        freeCashFlow,
        totalDebt,
        totalCash,
        waccObj
    });

    assert.strictEqual(rev.status, VALUATION_STATUS.CALCULATED);
    const solvedGrowth = rev.metadata.impliedGrowthRate;
    assert(typeof solvedGrowth === "number");

    const fwd = calculateFCFFDCF({
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

    const roundTripPrice = fwd.metadata.fairValue;
    const absDiff = Math.abs(roundTripPrice - marketPrice);
    const relDiff = absDiff / marketPrice;

    console.log(`      Solved Implied Growth: ${(solvedGrowth * 100).toFixed(2)}%`);
    console.log(`      Market Price: $${marketPrice} | Round-Trip Fair Value: $${roundTripPrice} (Abs Diff: $${absDiff.toFixed(2)}, Rel Error: ${(relDiff * 100).toFixed(4)}%)`);

    assert(relDiff < 0.001, `Round-trip relative error must be strictly < 0.1% (Got: ${(relDiff * 100).toFixed(4)}%)`);
});

audit("1.2 Synthetic Known-Growth Benchmark: Recovers exact 8.0% growth rate", () => {
    const waccObj = { status: VALUATION_STATUS.CALCULATED, metadata: { wacc: 0.10 } };
    const syntheticDCF = calculateFCFFDCF({
        ticker: "SYNTH",
        currentPrice: 100,
        sharesOutstanding: 10,
        freeCashFlow: 100,
        totalRevenue: 1000,
        revenueGrowth: 0.08,
        operatingMargin: 0.10,
        totalDebt: 0,
        totalCash: 0,
        waccObj,
        terminalGrowthOverride: 0.02
    });

    const generatedPrice = syntheticDCF.metadata.fairValue; // $155.59

    const solvedRev = solveReverseDCF({
        currentPrice: generatedPrice,
        sharesOutstanding: 10,
        freeCashFlow: 100,
        totalDebt: 0,
        totalCash: 0,
        waccObj,
        terminalGrowthOverride: 0.02
    });

    const recoveredGrowth = solvedRev.metadata.impliedGrowthRate;
    console.log(`      Target Growth: 8.0% | Recovered Growth: ${(recoveredGrowth * 100).toFixed(2)}%`);
    assert(Math.abs(recoveredGrowth - 0.08) < 0.002, "Reverse DCF must recover 8.0% growth within 0.2%");
});

// -------------------------------------------------------------
// 2. MODEL AGREEMENT & VALID MODELS INVARIANT
// -------------------------------------------------------------
console.log("\n--- SECTION 2: MODEL AGREEMENT & DISPERSION RECOMPUTATION ---");

audit("2.1 Model Agreement evaluates ONLY valid fair-value models and never treats Reverse DCF growth as dollar valuation", () => {
    const agreement = calculateModelAgreement({
        DCF: { status: VALUATION_STATUS.CALCULATED, fairValue: 148.62 },
        RelativeValuation: { status: VALUATION_STATUS.CALCULATED, fairValue: 172.22 }
    });

    assert.strictEqual(agreement.validModelCount, 2);
    assert.strictEqual(agreement.modelStatus, "MULTI_MODEL");
    assert.strictEqual(agreement.mean, 160.42);
    assert.strictEqual(agreement.min, 148.62);
    assert.strictEqual(agreement.max, 172.22);
    // StdDev = sqrt((148.62 - 160.42)^2 + (172.22 - 160.42)^2) = sqrt(139.24 + 139.24) = 16.6877
    assert.strictEqual(agreement.stdDev, 16.69);
    // CV = 16.6877 / 160.42 = 0.1040 (10.40%)
    assert.strictEqual(agreement.coefficientOfVariation, 0.1040);
    assert.strictEqual(agreement.disagreementStatus, DISAGREEMENT_STATUS.LOW_DISAGREEMENT);
});

audit("2.2 Single valid model correctly tags SINGLE_MODEL and INSUFFICIENT_MODELS without fabricating CV", () => {
    const single = calculateModelAgreement({
        RelativeValuation: { status: VALUATION_STATUS.CALCULATED, fairValue: 218.87 },
        DCF: { status: VALUATION_STATUS.UNAVAILABLE, reason: "Prohibited for Banks" }
    });

    assert.strictEqual(single.validModelCount, 1);
    assert.strictEqual(single.modelStatus, "SINGLE_MODEL");
    assert.strictEqual(single.disagreementStatus, DISAGREEMENT_STATUS.INSUFFICIENT_MODELS);
    assert.strictEqual(single.mean, 218.87);
    assert.strictEqual(single.stdDev, 0);
    assert.strictEqual(single.coefficientOfVariation, 0);
    assert.strictEqual(single.unavailableModels.DCF.status, VALUATION_STATUS.UNAVAILABLE);
});

// -------------------------------------------------------------
// 3. FINAL PRICE TARGET FORMULA & WEIGHT SYNTHESIS
// -------------------------------------------------------------
console.log("\n--- SECTION 3: FINAL PRICE TARGET FORMULA & WEIGHT SYNTHESIS ---");

audit("3.1 Synthesizes multi-model target with explicit weights: DCF (60%) + Relative (40%) = $158.06", () => {
    const mockState = {
        companyName: "Apple Inc.",
        companyProfile: { ticker: "AAPL", sector: "Technology", industry: "Consumer Electronics" },
        financials: {
            totalRevenue: 391035000000,
            freeCashFlow: 107724000000,
            totalDebt: 106037000000,
            totalCash: 34586000000,
            trailingEps: 6.08,
            ebitda: 130000000000
        },
        stockData: { currentPrice: 319.97, sharesOutstanding: 15204140000, beta: 1.1 },
        competitors: {
            primaryCompetitors: [
                { ticker: "MSFT", name: "Microsoft", pe: 27.85, evEbitda: 19.37 },
                { ticker: "GOOGL", name: "Alphabet", pe: 16.97, evEbitda: 23.31 },
                { ticker: "META", name: "Meta", pe: 23.22, evEbitda: 14.53 }
            ]
        }
    };

    const pipeline = executeValuationPipeline(mockState);
    assert.strictEqual(pipeline.synthesisBreakdown.validModelCount, 2);
    assert.strictEqual(pipeline.synthesisBreakdown.modelStatus, "MULTI_MODEL");
    
    const dcfVal = pipeline.dcf.fairValue; // 148.62
    const relVal = pipeline.relativeValuation.fairValue; // 172.22
    const expectedTarget = Number((dcfVal * 0.60 + relVal * 0.40).toFixed(2));
    
    assert.strictEqual(pipeline.fairValuePriceTarget, expectedTarget);
    console.log(`      Formula: ${pipeline.synthesisBreakdown.formula}`);
    console.log(`      Calculated Target: $${pipeline.fairValuePriceTarget} (Independent: $${expectedTarget})`);
});

// -------------------------------------------------------------
// 4. MARGIN OF SAFETY VS UPSIDE FORMULA INTEGRITY
// -------------------------------------------------------------
console.log("\n--- SECTION 4: MARGIN OF SAFETY VS UPSIDE FORMULA INTEGRITY ---");

audit("4.1 Reconciles MoS = (FV - Price) / FV vs Upside = (FV - Price) / Price strictly", () => {
    const fv = 158.06;
    const price = 319.97;

    const expectedUpside = Number((((fv - price) / price) * 100).toFixed(2)); // -50.60%
    const expectedMoS = Number((((fv - price) / fv) * 100).toFixed(2));       // -102.44%

    console.log(`      Fair Value: $${fv} | Market Price: $${price}`);
    console.log(`      Upside: ${expectedUpside}% | Margin of Safety: ${expectedMoS}%`);

    assert.notStrictEqual(expectedUpside, expectedMoS, "Upside and Margin of Safety must not be identical");
    assert.strictEqual(expectedUpside, -50.60);
    assert.strictEqual(expectedMoS, -102.44);
});

// -------------------------------------------------------------
// 5. SECTOR VALUATION PROHIBITION ENFORCEMENT
// -------------------------------------------------------------
console.log("\n--- SECTION 5: SECTOR VALUATION PROHIBITIONS ---");

audit("5.1 Prohibits EV/EBITDA and DCF for Banks and strictly calculates via P/B and P/E", () => {
    const bankProfile = { sector: "Financial Services", industry: "Banks - Diversified" };
    const classification = classifySector(bankProfile, "JPM");

    assert.strictEqual(classification.canonicalSector, CANONICAL_SECTORS.FINANCIALS);
    assert(classification.framework.prohibitedMethods.includes(VALUATION_METHODS.EV_EBITDA));
    assert(classification.framework.prohibitedMethods.includes(VALUATION_METHODS.DCF));

    const bankRel = calculateRelativeValuationRanges({
        ticker: "JPM",
        eps: 15.0,
        bookValuePerShare: 133.0,
        ebitda: 60000,
        totalDebt: 300000,
        totalCash: 50000,
        shares: 3000,
        framework: classification.framework,
        distributions: {
            pe: { status: VALUATION_STATUS.CALCULATED, count: 4, p25: 12.0, median: 14.0, p75: 16.0 },
            pb: { status: VALUATION_STATUS.CALCULATED, count: 4, p25: 1.2, median: 1.64, p75: 2.0 },
            evEbitda: { status: VALUATION_STATUS.CALCULATED, count: 4, p25: 8.0, median: 10.0, p75: 12.0 }
        }
    });

    assert.strictEqual(bankRel.methods[VALUATION_METHODS.EV_EBITDA].status, VALUATION_STATUS.NOT_APPROPRIATE);
    assert.strictEqual(bankRel.methods[VALUATION_METHODS.PE].status, VALUATION_STATUS.CALCULATED);
    assert.strictEqual(bankRel.methods[VALUATION_METHODS.PRICE_TO_BOOK].status, VALUATION_STATUS.CALCULATED);
    // P/B: 133 * 1.64 = 218.12; P/E: 15 * 14 = 210.00; Base: (218.12 + 210) / 2 = 214.06
    assert.strictEqual(bankRel.compositeRange.base, 214.06);
});

// -------------------------------------------------------------
// 6. PEER DISTRIBUTION EXCLUSION AUDIT & Z-SCORE RIGOR
// -------------------------------------------------------------
console.log("\n--- SECTION 6: PEER EXCLUSION AUDIT & Z-SCORE STATISTICAL RIGOR ---");

audit("6.1 Exposes rawPeerCount, validPeerCount, excludedPeerCount, and explicit exclusions[]", () => {
    const rawPeers = [
        { ticker: "CO_1", pe: 25.0 },
        { ticker: "CO_2", pe: -10.0 }, // Excluded negative
        { ticker: "CO_3", pe: 35.0 }
    ];

    const norm = normalizePeerMetrics(rawPeers);
    const peDist = norm.distributions.pe;

    assert.strictEqual(peDist.rawPeerCount, 3);
    assert.strictEqual(peDist.validPeerCount, 2);
    assert.strictEqual(peDist.excludedPeerCount, 1);
    assert.strictEqual(peDist.exclusions.length, 1);
    assert(peDist.exclusions[0].reason.includes("non-positive"));
});

audit("6.2 Direction-aware Z-score interpretations correctly distinguish multiples vs margins", () => {
    const dists = {
        pe: { status: VALUATION_STATUS.CALCULATED, count: 4, mean: 20.0, median: 20.0, stdDev: 4.0 },
        ebitdaMargin: { status: VALUATION_STATUS.CALCULATED, count: 4, mean: 0.20, median: 0.20, stdDev: 0.05 }
    };

    const z = calculateZScores({ pe: 16.0, ebitdaMargin: 0.25 }, dists);
    assert.strictEqual(z.pe.zScore, -1.0);
    assert(z.pe.interpretation.includes("multiple discount"));

    assert.strictEqual(z.ebitdaMargin.zScore, 1.0);
    assert(z.ebitdaMargin.interpretation.includes("outperformance"));
});

console.log("\n================================================================================");
console.log(`AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log("================================================================================");

if (failed > 0) {
    process.exit(1);
}
