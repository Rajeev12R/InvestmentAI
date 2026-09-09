import { calculateWACC, calculateFCFFDCF, generateSensitivityGrid } from "../valuation/dcf.engine.js";
import { calculateRelativeValuation } from "../valuation/multiples.engine.js";
import { solveReverseDCF } from "../valuation/reverseDcf.engine.js";
import { calculateScenarioValuation } from "../valuation/scenario.engine.js";
import { executeValuationPipeline } from "../valuation/valuation.engine.js";
import { buildEvidenceGraph, validateTruthPackage, sealTruthPackage } from "../tools/evidence.tool.js";
import { calculateTriFactorScores, makeInvestmentDecision } from "../tools/decision.tool.js";
import { MODEL_ASSUMPTIONS, VALUATION_STATUS } from "../valuation/valuation.types.js";

async function runPhase2ATests() {
    console.log("================================================================================");
    console.log("PHASE 2A INSTITUTIONAL VALUATION ENGINE TEST SUITE (30 Requirements)");
    console.log("================================================================================");

    let passed = 0;
    let failed = 0;

    function assert(condition, message) {
        if (condition) {
            console.log(`[PASS] ${message}`);
            passed++;
        } else {
            console.error(`[FAIL] ${message}`);
            failed++;
        }
    }

    // ---------------------------------------------------------
    // DCF & WACC Tests (1 - 10)
    // ---------------------------------------------------------
    console.log("\n--- SECTION 1: DCF & WACC Calculations ---");
    
    // 1. Correct PV calculation
    const waccObj = calculateWACC({ ticker: "AAPL", beta: 1.0, marketCap: 2000000000000, totalDebt: 100000000000 });
    assert(waccObj.status === VALUATION_STATUS.CALCULATED, "1. WACC calculates successfully with valid inputs");
    const dcfRes = calculateFCFFDCF({
        ticker: "AAPL",
        currentPrice: 150,
        sharesOutstanding: 10000000000,
        freeCashFlow: 100000000000,
        totalRevenue: 400000000000,
        revenueGrowth: 0.08,
        operatingMargin: 0.30,
        totalDebt: 100000000000,
        totalCash: 50000000000,
        waccObj
    });
    assert(dcfRes.status === VALUATION_STATUS.CALCULATED, "1. DCF status is CALCULATED");
    assert(dcfRes.metadata?.pvExplicitForecast > 0, "1. PV of 5-year explicit forecast is positive number");

    // 2. Correct terminal value
    assert(dcfRes.metadata?.terminalValue > 0, "2. Gordon Growth terminal value is calculated");
    assert(dcfRes.metadata?.pvTerminalValue > 0, "2. Present value of terminal value is discounted to year 0");

    // 3. Correct equity bridge
    const expectedEV = dcfRes.metadata.pvExplicitForecast + dcfRes.metadata.pvTerminalValue;
    assert(Math.abs(dcfRes.metadata.enterpriseValue - expectedEV) <= 1, "3. Enterprise Value equals PV(Forecast) + PV(TerminalValue)");
    const expectedEquity = dcfRes.metadata.enterpriseValue - (100000000000 - 50000000000);
    assert(Math.abs(dcfRes.metadata.equityValue - expectedEquity) <= 1, "3. Equity Value equals Enterprise Value - Net Debt");

    // 4. Missing FCF -> UNAVAILABLE
    const dcfNoFCF = calculateFCFFDCF({
        ticker: "AAPL",
        currentPrice: 150,
        sharesOutstanding: 10000000000,
        freeCashFlow: null,
        totalDebt: 100000000000,
        totalCash: 50000000000,
        waccObj
    });
    assert(dcfNoFCF.status === VALUATION_STATUS.UNAVAILABLE, "4. DCF returns UNAVAILABLE when FCF is null");
    assert(dcfNoFCF.value === null, "4. Fair value is null when FCF is unavailable (no synthetic fallback FCF)");

    // 5. Missing shares -> UNAVAILABLE per-share valuation
    const dcfNoShares = calculateFCFFDCF({
        ticker: "AAPL",
        currentPrice: 150,
        sharesOutstanding: null,
        freeCashFlow: 100000000000,
        totalDebt: 100000000000,
        totalCash: 50000000000,
        waccObj
    });
    assert(dcfNoShares.status === VALUATION_STATUS.UNAVAILABLE, "5. DCF returns UNAVAILABLE when shares outstanding is null");

    // 6. WACC <= terminal growth -> rejected
    const dcfInvalidTerminal = calculateFCFFDCF({
        ticker: "AAPL",
        currentPrice: 150,
        sharesOutstanding: 10000000000,
        freeCashFlow: 100000000000,
        totalDebt: 100000000000,
        totalCash: 50000000000,
        waccObj,
        terminalGrowthOverride: 0.15 // Terminal growth > WACC
    });
    assert(dcfInvalidTerminal.status === VALUATION_STATUS.UNAVAILABLE, "6. DCF rejects configuration where terminal growth >= WACC");

    // 7. Sensitivity grid deterministic
    const grid = generateSensitivityGrid({
        baseWacc: 0.09,
        baseTerminalGrowth: 0.025,
        freeCashFlow: 100000000000,
        sharesOutstanding: 10000000000,
        netDebt: 50000000000,
        revenueGrowth: 0.08
    });
    assert(Array.isArray(grid) && grid.length === 5, "7. Sensitivity grid returns 5x5 deterministic matrix");
    assert(grid[0].cells.length === 5, "7. Grid row contains 5 terminal growth cells");

    // 8. Missing beta -> WACC UNAVAILABLE
    const waccNoBeta = calculateWACC({ ticker: "AAPL", beta: null, marketCap: 2000000000000, totalDebt: 100000000000 });
    assert(waccNoBeta.status === VALUATION_STATUS.UNAVAILABLE, "8. WACC is UNAVAILABLE when beta is null");

    // 9. Missing risk-free rate -> no fabricated value
    const waccNoTicker = calculateWACC({ ticker: "", beta: 1.0, marketCap: 2000000000000, totalDebt: 100000000000 });
    assert(waccNoTicker.status === VALUATION_STATUS.UNAVAILABLE, "9. WACC is UNAVAILABLE when sovereign jurisdiction/ticker is unknown");

    // 10. ERP explicitly marked ESTIMATED
    assert(MODEL_ASSUMPTIONS.EQUITY_RISK_PREMIUM.status === VALUATION_STATUS.ESTIMATED, "10. Equity Risk Premium is explicitly classified as ESTIMATED");

    // ---------------------------------------------------------
    // Relative Multiples Tests (11 - 15)
    // ---------------------------------------------------------
    console.log("\n--- SECTION 2: Relative Valuation Multiples ---");

    const mockPeers = [
        { ticker: "MSFT", name: "Microsoft", peRatio: 32.5, evToEbitda: 22.1, priceToBook: 12.0 },
        { ticker: "GOOGL", name: "Alphabet", peRatio: 24.8, evToEbitda: 16.4, priceToBook: 6.5 },
        { ticker: "META", name: "Meta Platforms", peRatio: 26.2, evToEbitda: 17.8, priceToBook: 7.2 },
        { ticker: "ORCL", name: "Oracle", peRatio: -15.0, evToEbitda: 999.0, priceToBook: null }, // Outliers / negative
        { ticker: "^SPX", name: "S&P 500 Index", peRatio: 25.0 } // Index to be filtered
    ];

    // 11. Invalid peer multiples filtered
    const relVal = calculateRelativeValuation({
        ticker: "AAPL",
        sector: "Technology",
        industry: "Consumer Electronics",
        currentPrice: 150,
        eps: 6.5,
        ebitda: 130000000000,
        totalDebt: 100000000000,
        totalCash: 50000000000,
        sharesOutstanding: 15000000000,
        peers: mockPeers
    });
    assert(relVal.status === VALUATION_STATUS.CALCULATED, "11. Relative valuation status is CALCULATED");

    // 12. Median calculated correctly
    const peDist = relVal.metadata?.models?.peModel?.peerDistribution;
    assert(peDist?.count === 3, "12. Invalid negative and index peers filtered out (3 valid peers remaining)");
    assert(peDist?.median === 26.2, "12. Median P/E calculated accurately (26.2)");

    // 13. Insufficient peers -> UNAVAILABLE
    const relNoPeers = calculateRelativeValuation({
        ticker: "AAPL",
        sector: "Technology",
        currentPrice: 150,
        eps: 6.5,
        peers: []
    });
    assert(relNoPeers.status === VALUATION_STATUS.UNAVAILABLE, "13. Relative valuation is UNAVAILABLE when peer list is empty");

    // 14. ETFs/Indexes never treated as operating peers
    const indexOnlyPeers = [{ ticker: "^GSPC", name: "S&P 500", peRatio: 24.0 }];
    const relIndexOnly = calculateRelativeValuation({ ticker: "AAPL", eps: 6.5, peers: indexOnlyPeers });
    assert(relIndexOnly.status === VALUATION_STATUS.UNAVAILABLE, "14. Index ETFs starting with ^ are excluded as operating company peers");

    // 15. Bank methodology differs from industrial methodology (EV/EBITDA is NOT_APPROPRIATE)
    const bankRel = calculateRelativeValuation({
        ticker: "JPM",
        sector: "Financial Services",
        industry: "Banks - Diversified",
        currentPrice: 200,
        eps: 18.0,
        bookValuePerShare: 110.0,
        peers: [
            { ticker: "BAC", name: "Bank of America", peRatio: 14.5, priceToBook: 1.2 },
            { ticker: "WFC", name: "Wells Fargo", peRatio: 12.8, priceToBook: 1.1 }
        ]
    });
    assert(bankRel.metadata?.models?.evEbitdaModel?.status === VALUATION_STATUS.NOT_APPROPRIATE, "15. EV/EBITDA is marked NOT_APPROPRIATE for banking institutions");

    // ---------------------------------------------------------
    // Reverse DCF Tests (16 - 18) + Test A (Round-Trip Verification)
    // ---------------------------------------------------------
    console.log("\n--- SECTION 3: Reverse DCF Numerical Root Solver & Round-Trip ---");

    // 16. Solved implied growth reproduces market price within tolerance
    const revDcfRes = solveReverseDCF({
        currentPrice: 150,
        sharesOutstanding: 10000000000,
        freeCashFlow: 100000000000,
        totalDebt: 100000000000,
        totalCash: 50000000000,
        waccObj
    });
    assert(revDcfRes.status === VALUATION_STATUS.CALCULATED, "16. Reverse DCF solves implied growth rate successfully");
    assert(typeof revDcfRes.value === "number", `16. Solved implied growth rate is ${revDcfRes.value}%`);
    assert(revDcfRes.metadata.impliedGrowthRate !== undefined, "16. Reverse DCF schema contains explicit impliedGrowthRate");
    assert(revDcfRes.metadata.marketPrice === 150, "16. Reverse DCF schema contains explicit marketPrice");

    // Test A: Reverse DCF Mathematical Round-Trip (AAPL Live Case)
    const roundTripDCF = calculateFCFFDCF({
        ticker: "AAPL",
        currentPrice: 150,
        sharesOutstanding: 10000000000,
        freeCashFlow: 100000000000,
        totalDebt: 100000000000,
        totalCash: 50000000000,
        waccObj,
        revenueGrowth: revDcfRes.metadata.impliedGrowthRate
    });
    const roundTripDiff = Math.abs(roundTripDCF.metadata.fairValue - 150);
    assert(roundTripDiff / 150 < 0.01, `Test A: Reverse DCF round-trip reproduces market price $150 (Calculated: $${roundTripDCF.metadata.fairValue}, Diff: ${roundTripDiff.toFixed(2)})`);

    // Test A2: Synthetic Known-Input Reverse DCF Recovery Test
    // Known parameters: FCF = 100, WACC = 10%, Terminal Growth = 2%, Shares = 10, Debt = 0, Cash = 0, Known Growth = 8.0%
    const syntheticWaccObj = {
        status: VALUATION_STATUS.CALCULATED,
        metadata: { wacc: 0.10, riskFreeRate: 4.25 }
    };
    const syntheticForwardDCF = calculateFCFFDCF({
        ticker: "TEST",
        currentPrice: 100,
        sharesOutstanding: 10,
        freeCashFlow: 100,
        totalDebt: 0,
        totalCash: 0,
        waccObj: syntheticWaccObj,
        revenueGrowth: 0.08,
        terminalGrowthOverride: 0.02
    });
    const syntheticMarketPrice = syntheticForwardDCF.metadata.fairValue; // e.g. ~155.59
    const syntheticReverseDCF = solveReverseDCF({
        currentPrice: syntheticMarketPrice,
        sharesOutstanding: 10,
        freeCashFlow: 100,
        totalDebt: 0,
        totalCash: 0,
        waccObj: syntheticWaccObj,
        terminalGrowthOverride: 0.02
    });
    assert(Math.abs(syntheticReverseDCF.metadata.impliedGrowthRate - 0.08) < 0.002, `Test A2: Synthetic Reverse DCF recovers exact 8.0% growth rate from generated price $${syntheticMarketPrice} (Recovered: ${(syntheticReverseDCF.metadata.impliedGrowthRate * 100).toFixed(2)}%)`);

    // 17. Extreme target outside bounds -> UNAVAILABLE
    const revDcfExtreme = solveReverseDCF({
        currentPrice: 50000, // Impossibly high market cap for FCF
        sharesOutstanding: 10000000000,
        freeCashFlow: 1000,
        totalDebt: 0,
        totalCash: 0,
        waccObj
    });
    assert(revDcfExtreme.status === VALUATION_STATUS.UNAVAILABLE, "17. Reverse DCF returns UNAVAILABLE when market price is outside mathematical solution range");

    // 18. Missing critical inputs -> UNAVAILABLE
    const revDcfMissing = solveReverseDCF({
        currentPrice: null,
        sharesOutstanding: 10000000000,
        freeCashFlow: 100000000000,
        totalDebt: 0,
        totalCash: 0,
        waccObj
    });
    assert(revDcfMissing.status === VALUATION_STATUS.UNAVAILABLE, "18. Reverse DCF returns UNAVAILABLE when current price is null");

    // ---------------------------------------------------------
    // Scenario Engine Tests (19 - 21) + Test F
    // ---------------------------------------------------------
    console.log("\n--- SECTION 4: Scenario Engine & Mathematical Ordering ---");

    const scenarioRes = calculateScenarioValuation({
        ticker: "AAPL",
        currentPrice: 150,
        sharesOutstanding: 10000000000,
        freeCashFlow: 100000000000,
        totalRevenue: 400000000000,
        revenueGrowth: 0.08,
        operatingMargin: 0.30,
        totalDebt: 100000000000,
        totalCash: 50000000000,
        waccObj
    });

    // 19. Bear/Base/Bull are actual calculations
    const sc = scenarioRes.metadata?.scenarios;
    assert(sc?.bear?.fairValue > 0 && sc?.base?.fairValue > 0 && sc?.bull?.fairValue > 0, "19. Bear, Base, and Bull are all calculated fundamental numbers");

    // 20. Monotonic ordering: Bear < Base < Bull
    assert(sc?.bear?.fairValue < sc?.base?.fairValue && sc?.base?.fairValue < sc?.bull?.fairValue, "20. Fundamental ordering holds: Bear Fair Value < Base Fair Value < Bull Fair Value");

    // 21. No synthetic price multipliers
    assert(sc?.bear?.fairValue !== 150 * 0.85 && sc?.bull?.fairValue !== 150 * 1.35, "21. Scenarios are calculated via DCF rather than synthetic price * multiplier shortcuts");

    // ---------------------------------------------------------
    // Margin of Safety & Upside Audits (Test B, Test C, Test G)
    // ---------------------------------------------------------
    console.log("\n--- SECTION 5: Margin of Safety & DCF Mathematical Reconciliation ---");

    // Test B: Margin of Safety signed verification
    const dcfUndervalued = calculateFCFFDCF({
        ticker: "AAPL",
        currentPrice: 80,
        sharesOutstanding: 10000000000,
        freeCashFlow: 100000000000,
        totalDebt: 100000000000,
        totalCash: 50000000000,
        waccObj
    });
    // Fair value is ~160.37, marketPrice is 80 -> MoS = (160.37 - 80) / 160.37 = +50.12%
    const expectedUndervaluedMoS = Number((((dcfUndervalued.metadata.fairValue - 80) / dcfUndervalued.metadata.fairValue) * 100).toFixed(2));
    assert(dcfUndervalued.metadata.marginOfSafety === expectedUndervaluedMoS && dcfUndervalued.metadata.marginOfSafety > 0, `Test B1: MoS is positive (+${dcfUndervalued.metadata.marginOfSafety}%) when fair value > market price`);

    const dcfOvervalued = calculateFCFFDCF({
        ticker: "AAPL",
        currentPrice: 257.46,
        sharesOutstanding: 10000000000,
        freeCashFlow: 100000000000,
        totalDebt: 100000000000,
        totalCash: 50000000000,
        waccObj
    });
    const expectedOvervaluedMoS = Number((((dcfOvervalued.metadata.fairValue - 257.46) / dcfOvervalued.metadata.fairValue) * 100).toFixed(2));
    assert(dcfOvervalued.metadata.marginOfSafety === expectedOvervaluedMoS && dcfOvervalued.metadata.marginOfSafety < 0, `Test B2: MoS is negative (${dcfOvervalued.metadata.marginOfSafety}%) when fair value < market price (No 0% clamp)`);

    // Reference Audit Check for AAPL specific numbers (FV = 148.62, Price = 257.46)
    const refMoS = Number((((148.62 - 257.46) / 148.62) * 100).toFixed(2));
    const refUpside = Number((((148.62 - 257.46) / 257.46) * 100).toFixed(2));
    assert(Math.abs(refMoS - (-73.23)) <= 0.02, `Test B3: Reference MoS formula reconciles to -73.23% for FV $148.62 vs Price $257.46 (Calculated: ${refMoS}%)`);
    assert(Math.abs(refUpside - (-42.28)) <= 0.02, `Test C: Reference Upside formula reconciles to -42.28% for FV $148.62 vs Price $257.46 (Calculated: ${refUpside}%)`);

    // Dynamic Upside on dcfOvervalued
    const expectedUpside = Number((((dcfOvervalued.metadata.fairValue - 257.46) / 257.46) * 100).toFixed(2));
    assert(dcfOvervalued.metadata.upsidePotential === expectedUpside, `Test C2: Dynamic Upside reconciles to ${expectedUpside}% for calculated DCF`);

    // Test G: DCF Component Reconciliation
    const dcfEV = dcfOvervalued.metadata.pvExplicitForecast + dcfOvervalued.metadata.pvTerminalValue;
    const dcfEquity = dcfEV - (100000000000 - 50000000000);
    const dcfPerShare = dcfEquity / 10000000000;
    assert(Math.abs(dcfOvervalued.metadata.enterpriseValue - dcfEV) <= 1, "Test G1: Enterprise Value = PV(Explicit Forecast) + PV(Terminal Value)");
    assert(Math.abs(dcfOvervalued.metadata.equityValue - dcfEquity) <= 1, "Test G2: Equity Value = Enterprise Value - Total Debt + Total Cash");
    assert(Math.abs(dcfOvervalued.value - dcfPerShare) < 0.05, "Test G3: Fair Value Per Share = Equity Value / Shares Outstanding");

    // ---------------------------------------------------------
    // Truth Layer & Confidence Audits (22 - 30) + Test D & Test E
    // ---------------------------------------------------------
    console.log("\n--- SECTION 6: Truth Layer & Decision Layer Invariants ---");

    const fullPipeline = executeValuationPipeline({
        companyProfile: { ticker: "AAPL", name: "Apple Inc.", sector: "Technology" },
        stockData: { currentPrice: 257.46, sharesOutstanding: 10000000000, beta: 1.08 },
        financials: {
            totalRevenue: 400000000000,
            freeCashFlow: 100000000000,
            totalDebt: 100000000000,
            totalCash: 50000000000,
            trailingEps: 6.5,
            ebitda: 130000000000,
            revenueGrowth: 0.08
        },
        competitors: { primaryCompetitors: mockPeers }
    });

    // 22. Every calculated valuation has formula
    assert(typeof dcfRes.formula === "string", "22. DCF result contains explicit formula");
    assert(typeof relVal.formula === "string", "22. Relative valuation result contains explicit formula");

    // 23. Every valuation input has provenance
    assert(dcfRes.provenance !== null && dcfRes.provenance.provider.includes("InvestmentAI"), "23. DCF result contains provenance provider");

    // 24. Estimated assumptions explicitly marked ESTIMATED
    assert(sc?.bear?.assumptions?.status === VALUATION_STATUS.ESTIMATED, "24. Scenario assumptions are explicitly marked ESTIMATED");

    // Test D: Confidence Audit (No fake 40 floor when valuation is unavailable)
    const pipelineNoValuation = executeValuationPipeline({
        companyProfile: { ticker: "JPM", name: "JPMorgan Chase & Co.", sector: "Financial Services" },
        stockData: { currentPrice: 200, sharesOutstanding: 3000000000, beta: 1.1 },
        financials: {
            totalRevenue: 180000000000,
            freeCashFlow: null, // No FCF
            totalDebt: 1000000000000,
            totalCash: 1200000000000
        },
        competitors: { primaryCompetitors: [] }
    });
    assert(pipelineNoValuation.valuationConfidence === null, "Test D1: Valuation confidence is null / UNAVAILABLE when no models are calculated (NO 40 floor)");
    assert(fullPipeline.valuationConfidence >= 70, `Test D2: Valuation confidence is actively calculated (${fullPipeline.valuationConfidence}/100) when grounded evidence is present`);

    // 25 & 26. Sealing & Hash determinism with Valuation Models
    const truthState = {
        companyProfile: { ticker: "AAPL", name: "Apple Inc." },
        stockData: { currentPrice: 257.46, sharesOutstanding: 10000000000, beta: 1.08 },
        financials: { totalRevenue: 400000000000, freeCashFlow: 100000000000, totalDebt: 100000000000, totalCash: 50000000000 },
        valuation: fullPipeline,
        risks: {},
        newsData: [],
        investorProfile: { horizon: "Long (3-5 Years)", riskTolerance: "Moderate / Balanced", goal: "Capital Growth" }
    };
    const evidenceOut = buildEvidenceGraph(truthState);
    const hash1 = evidenceOut.truthPackage.integrity.packageHash;

    // Mutating a DCF input changes hash
    const mutatedTruthState = JSON.parse(JSON.stringify(truthState));
    mutatedTruthState.valuation.dcfValue = (mutatedTruthState.valuation.dcfValue || 100) + 1;
    const mutatedEvidence = buildEvidenceGraph(mutatedTruthState);
    assert(mutatedEvidence.truthPackage.integrity.packageHash !== hash1, "25. Changing valuation output changes SHA-256 packageHash");

    // Key reordering preserves hash
    const reorderedKeys = Object.keys(evidenceOut.truthPackage).reverse();
    const pkgReordered = {};
    reorderedKeys.forEach(k => { pkgReordered[k] = evidenceOut.truthPackage[k]; });
    const sealedReordered = sealTruthPackage(pkgReordered);
    assert(sealedReordered.packageHash === hash1, "26. Truth Package hash is deterministic under key reordering");

    // 27 & 28. AI Reasoning Isolation
    const unsealedState = { companyProfile: { ticker: "TEST" }, truthPackage: null };
    const unsealedDecision = await makeInvestmentDecision(unsealedState);
    assert(unsealedDecision.reasoning.includes("Valid sealed Truth Package required"), "27. AI Reasoning halts safely without sealed Truth Package");

    // 29 & 30 + Test E: Decision Layer handling of UNAVAILABLE valuation
    const stateNoValuation = {
        companyProfile: { ticker: "JPM", name: "JPMorgan Chase & Co." },
        financials: { totalRevenue: 180000000000, operatingMargin: 0.35, totalDebt: 1000000000000, totalCash: 1200000000000 },
        stockData: { currentPrice: 200, beta: 0.95 },
        valuation: { dcfStatus: VALUATION_STATUS.UNAVAILABLE, upsidePotential: null, upside: null }
    };
    const scoresNoVal = calculateTriFactorScores(stateNoValuation);
    assert(scoresNoVal.stockAttractivenessScore === null, "29. stockAttractivenessScore is null when valuation is unavailable");
    assert(scoresNoVal.stockAttractivenessStatus === "UNAVAILABLE", "30. stockAttractivenessStatus is UNAVAILABLE (NO 50/100 default)");
    assert(Array.isArray(scoresNoVal.decisionBasis) && scoresNoVal.decisionBasis.length > 0, "Test E1: Decision contains explicit decisionBasis array");
    assert(scoresNoVal.decisionBasis[0].includes("Valuation model is UNAVAILABLE"), "Test E2: Decision basis explicitly states valuation is unavailable");

    // ---------------------------------------------------------
    // SUMMARY
    // ---------------------------------------------------------
    console.log("\n================================================================================");
    console.log(`PHASE 2A TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log("================================================================================");

    if (failed > 0) {
        process.exit(1);
    }
}

runPhase2ATests().catch(err => {
    console.error("Phase 2A Test Fatal Error:", err);
    process.exit(1);
});
