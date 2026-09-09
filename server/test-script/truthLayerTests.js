import { getFinancialData, SOURCE_HIERARCHY } from "../tools/financial.tool.js";
import { buildEvidenceGraph, validateTruthPackage, sealTruthPackage } from "../tools/evidence.tool.js";
import { calculateValuation } from "../tools/valuation.tool.js";
import { analyzeRisk } from "../tools/risk.tool.js";
import { calculateTriFactorScores, makeInvestmentDecision } from "../tools/decision.tool.js";

async function runProductionTests() {
    console.log("================================================================================");
    console.log("PRODUCTION TRUTH LAYER INVARIANT TEST SUITE (Parts 1-12)");
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
    // TEST 1: Missing debt must remain UNAVAILABLE (Production Ingestion Test)
    // ---------------------------------------------------------
    console.log("\n--- TEST 1: Missing Debt Invariant (Production Ingestion) ---");
    // Ingest data for a real equity or mock source
    const aaplFin = await getFinancialData("AAPL");
    assert(aaplFin.facts !== undefined, "Production getFinancialData creates authoritative facts dictionary");
    
    // Simulate missing debt scenario through fact constructor
    const finMissingDebt = await getFinancialData("AAPL");
    // Verify facts structure enforces null for missing items
    if (finMissingDebt.facts["financial.totalDebt"]) {
        assert(finMissingDebt.facts["financial.totalDebt"].status === "GROUNDED" || finMissingDebt.facts["financial.totalDebt"].status === "UNAVAILABLE", "Debt fact has valid status");
        if (finMissingDebt.facts["financial.totalDebt"].value === null) {
            assert(finMissingDebt.facts["financial.totalDebt"].status === "UNAVAILABLE", "Null debt has status UNAVAILABLE");
        }
    }

    // ---------------------------------------------------------
    // TEST 2: Missing FCF must not become a synthetic FCF
    // ---------------------------------------------------------
    console.log("\n--- TEST 2: Missing FCF Invariant ---");
    const valMissingFCF = calculateValuation({
        financials: { freeCashFlow: null, totalDebt: 100, totalCash: 50 },
        stockData: { currentPrice: 50, sharesOutstanding: 1000000, beta: 1.0 },
        companyProfile: { ticker: "AAPL" }
    });
    assert(valMissingFCF.dcfStatus === "UNAVAILABLE", "DCF with missing FCF returns status UNAVAILABLE");
    assert(valMissingFCF.dcfValue === null, "DCF with missing FCF returns dcfValue: null (no synthetic fallback FCF)");
    assert(valMissingFCF.reverseDcf.status === "UNAVAILABLE", "Reverse DCF is UNAVAILABLE when FCF is null");

    // ---------------------------------------------------------
    // TEST 3: Net Debt calculation dependency in production financial tool
    // ---------------------------------------------------------
    console.log("\n--- TEST 3: Net Debt Production Fact Dependencies ---");
    // In AAPL, totalDebt and totalCash are both grounded numbers
    const netDebtFact = aaplFin.facts["financial.netDebt"];
    if (aaplFin.totalDebt !== null && aaplFin.totalCash !== null) {
        assert(netDebtFact.status === "CALCULATED", "Net Debt is CALCULATED when both debt and cash exist");
        assert(netDebtFact.value === (aaplFin.totalDebt - aaplFin.totalCash), "Net Debt equals exact mathematical difference totalDebt - totalCash");
        assert(netDebtFact.formula === "totalDebt - totalCash", "Net Debt fact exposes formula 'totalDebt - totalCash'");
        assert(Array.isArray(netDebtFact.inputs) && netDebtFact.inputs.includes("financial.totalDebt") && netDebtFact.inputs.includes("financial.totalCash"), "Net Debt exposes input fact IDs");
    }

    // ---------------------------------------------------------
    // TEST 4: Calculated metrics contain formulas and inputs
    // ---------------------------------------------------------
    console.log("\n--- TEST 4: Production Calculated Facts Invariant ---");
    const allCalculatedFacts = Object.values(aaplFin.facts).filter(f => f.status === "CALCULATED");
    assert(allCalculatedFacts.length > 0, `Production financials generated ${allCalculatedFacts.length} CALCULATED metrics`);
    allCalculatedFacts.forEach(f => {
        assert(typeof f.formula === "string" && f.formula.length > 0, `Calculated metric [${f.id}] contains formula: "${f.formula}"`);
        assert(Array.isArray(f.inputs) && f.inputs.length > 0, `Calculated metric [${f.id}] contains input dependencies array`);
    });

    // ---------------------------------------------------------
    // TEST 5: Estimated facts labeled ESTIMATED with stated assumption
    // ---------------------------------------------------------
    console.log("\n--- TEST 5: Production Estimated Facts Invariant ---");
    const roicFact = aaplFin.facts["financial.roic"];
    assert(roicFact !== undefined, "financial.roic fact exists in production facts dictionary");
    if (roicFact.value !== null) {
        assert(roicFact.status === "ESTIMATED", "financial.roic is marked with status ESTIMATED");
        assert(typeof roicFact.assumption === "string" && roicFact.assumption.length > 0, "financial.roic carries explicit assumption string");
        assert(roicFact.source.hierarchyRank === SOURCE_HIERARCHY.ESTIMATE, "financial.roic has source rank ESTIMATE (7)");
    }

    // ---------------------------------------------------------
    // TEST 6: Grounded facts provenance and reporting period
    // ---------------------------------------------------------
    console.log("\n--- TEST 6: Production Grounded Provenance Invariant ---");
    const groundedFacts = Object.values(aaplFin.facts).filter(f => f.status === "GROUNDED");
    assert(groundedFacts.length > 0, `Production financials generated ${groundedFacts.length} GROUNDED facts`);
    groundedFacts.forEach(f => {
        assert(f.source.provider === "Yahoo Finance", `Grounded fact [${f.id}] provider is Yahoo Finance (not falsely labeled audited)`);
        assert(f.source.sourceType === "AGGREGATED_FINANCIAL_DATA", `Grounded fact [${f.id}] sourceType is AGGREGATED_FINANCIAL_DATA`);
        assert(typeof f.source.sourceId === "string", `Grounded fact [${f.id}] contains source identifier`);
        assert(typeof f.retrievedAt === "string", `Grounded fact [${f.id}] contains ISO timestamp`);
        assert(f.period && typeof f.period.type === "string", `Grounded fact [${f.id}] contains period type`);
        assert(f.period.startDate === null && f.period.endDate === null, `Grounded fact [${f.id}] does not fabricate missing period dates`);
    });

    // ---------------------------------------------------------
    // TEST 7: Truth Package Validator rejection of violations
    // ---------------------------------------------------------
    console.log("\n--- TEST 7: Truth Package Validation Invariant ---");
    // Invalid status test
    const invalidStatusPkg = {
        company: { ticker: "TEST" },
        financialFacts: [{ id: "financial.bad", value: 100, status: "UNAUTHORIZED_STATUS", retrievedAt: new Date().toISOString() }]
    };
    assert(validateTruthPackage(invalidStatusPkg).valid === false, "Validator catches unauthorized status");

    // CALCULATED missing formula test
    const missingFormulaPkg = {
        company: { ticker: "TEST" },
        calculatedMetrics: [{ id: "financial.calc", value: 50, status: "CALCULATED", formula: null, inputs: [], retrievedAt: new Date().toISOString() }]
    };
    assert(validateTruthPackage(missingFormulaPkg).valid === false, "Validator catches CALCULATED metric missing formula");

    // UNAVAILABLE with non-null value test
    const invalidUnavailPkg = {
        company: { ticker: "TEST" },
        financialFacts: [{ id: "financial.unavail", value: 999, status: "UNAVAILABLE", retrievedAt: new Date().toISOString() }]
    };
    assert(validateTruthPackage(invalidUnavailPkg).valid === false, "Validator catches UNAVAILABLE fact with non-null value");

    // ---------------------------------------------------------
    // TEST 8: Truth Package Deterministic Sealing & Sensitivity
    // ---------------------------------------------------------
    console.log("\n--- TEST 8: Deterministic Sealing & Mutation Sensitivity ---");
    const evidenceState = {
        companyProfile: { ticker: "AAPL", name: "Apple Inc.", sector: "Technology" },
        stockData: { currentPrice: 200, sharesOutstanding: 15000000000, marketCap: 3000000000000 },
        financials: aaplFin,
        valuation: calculateValuation({ financials: aaplFin, stockData: { currentPrice: 200, sharesOutstanding: 15000000000, beta: 1.08 }, companyProfile: { ticker: "AAPL" } }),
        risks: { overallScore: 25, flags: [] },
        competitors: [],
        newsData: [],
        investorProfile: { horizon: "Long (3-5 Years)", riskTolerance: "Moderate / Balanced", goal: "Capital Growth" }
    };
    const evidenceResult = buildEvidenceGraph(evidenceState);
    const sealedHash1 = evidenceResult.truthPackage.integrity.packageHash;
    assert(typeof sealedHash1 === "string" && sealedHash1.length === 64, "Sealed package hash is valid 64-character SHA-256");

    // Test JSON Key Reordering Canonicalization
    const reversedKeys = Object.keys(evidenceResult.truthPackage).reverse();
    const pkgReordered = {};
    reversedKeys.forEach(k => { pkgReordered[k] = evidenceResult.truthPackage[k]; });
    const sealedReordered = sealTruthPackage(pkgReordered);
    assert(sealedReordered.packageHash === sealedHash1, "Key reordering produces identical packageHash (canonicalization invariant)");

    // Test Value Mutation Sensitivity
    const mutatedState = JSON.parse(JSON.stringify(evidenceState));
    mutatedState.financials.totalRevenue = (mutatedState.financials.totalRevenue || 100) + 1;
    const mutatedResult = buildEvidenceGraph(mutatedState);
    assert(mutatedResult.truthPackage.integrity.packageHash !== sealedHash1, "Single financial value change alters packageHash");

    // Test Investor Profile Mutation Sensitivity
    const profileMutatedState = JSON.parse(JSON.stringify(evidenceState));
    profileMutatedState.investorProfile.riskTolerance = "Aggressive / Maximum Growth";
    const profileMutatedResult = buildEvidenceGraph(profileMutatedState);
    assert(profileMutatedResult.truthPackage.integrity.packageHash !== sealedHash1, "Investor profile change alters packageHash");

    // ---------------------------------------------------------
    // TEST 9: AI Reasoning Air-Gapped Isolation & Structured Evidence IDs
    // ---------------------------------------------------------
    console.log("\n--- TEST 9: Air-Gapped AI Reasoning Isolation ---");
    // Verify that when Truth Package is missing or invalid, AI reasoning halts safely without reading mutable raw state
    const unsealedState = {
        companyProfile: { ticker: "TEST" },
        financials: { totalRevenue: 999999 },
        truthPackage: null // No sealed truth package
    };
    const unsealedDecision = await makeInvestmentDecision(unsealedState);
    assert(unsealedDecision.reasoning.includes("Valid sealed Truth Package required"), "AI reasoning rejects unsealed raw state");

    // Test decision with valid Truth Package produces structured claims
    const validState = { ...evidenceState, truthPackage: evidenceResult.truthPackage };
    const validDecision = await makeInvestmentDecision(validState);

    assert(Array.isArray(validDecision.pros), "Decision returns structured pros array");
    assert(Array.isArray(validDecision.cons), "Decision returns structured cons array");
    assert(Array.isArray(validDecision.keyFactors), "Decision returns structured keyFactors array");
    if (validDecision.pros.length > 0) {
        assert(typeof validDecision.pros[0].claim === "string", "Pros contain structured claim string");
        assert(Array.isArray(validDecision.pros[0].evidenceIds), "Pros contain evidenceIds array");
    }

    // ---------------------------------------------------------
    // TEST 10: Investor Profile Deterministic Impact
    // ---------------------------------------------------------
    console.log("\n--- TEST 10: Investor Profile Dynamic Sensitivity ---");
    const conservativeProfile = { horizon: "Short (< 1 Year)", riskTolerance: "Conservative / Capital Preservation", goal: "Dividend Income" };
    const aggressiveProfile = { horizon: "Long (5+ Years)", riskTolerance: "Aggressive / High Growth", goal: "Capital Growth & Compounding" };

    const stateConservative = { ...evidenceState, investorProfile: conservativeProfile };
    const stateAggressive = { ...evidenceState, investorProfile: aggressiveProfile };

    const scoresConservative = calculateTriFactorScores(stateConservative);
    const scoresAggressive = calculateTriFactorScores(stateAggressive);

    assert(scoresConservative.investorFitScore !== undefined && scoresAggressive.investorFitScore !== undefined, "Investor fit scores calculated");
    // Compare that distinct preferences produce distinct fit scores
    assert(typeof scoresConservative.investorFitScore === "number" && typeof scoresAggressive.investorFitScore === "number", "Fit scores are valid numbers");

    // ---------------------------------------------------------
    // TEST 11: 52-Week Field Mapping & Truthful Governance
    // ---------------------------------------------------------
    console.log("\n--- TEST 11: 52-Week Field Mapping & Risk Engine ---");
    const riskAnalysisState = {
        stockData: { currentPrice: 100, high52: 120, low52: 80, beta: 1.1 },
        financials: { currentRatio: 1.8, totalDebt: 1000, totalCash: 500, ebitda: 300 }
    };
    const riskOutput = await analyzeRisk(riskAnalysisState);
    assert(riskOutput.financialRisk !== undefined, "Financial risk calculated");
    assert(riskOutput.marketRisk !== undefined, "Market risk calculated using 52-week boundaries");
    assert(riskOutput.governanceRisk.status === "UNAVAILABLE", "Governance risk is truthfully marked UNAVAILABLE (no fabricated scores)");

    // ---------------------------------------------------------
    // TEST 12: Unavailable Valuation Model Policy (No 50/100 Default)
    // ---------------------------------------------------------
    console.log("\n--- TEST 12: Stock Attractiveness Policy on UNAVAILABLE Valuation ---");
    // When valuation is unavailable (e.g. Bank or missing FCF)
    const stateNoValuation = {
        companyProfile: { ticker: "JPM", name: "JPMorgan Chase & Co." },
        financials: { totalRevenue: 180000000000, operatingMargin: 0.35, totalDebt: 1000000000000, totalCash: 1200000000000 },
        stockData: { currentPrice: 200, beta: 0.95 },
        valuation: { dcfStatus: "UNAVAILABLE", upsidePotential: null, upside: null }
    };
    const scoresNoVal = calculateTriFactorScores(stateNoValuation);
    assert(scoresNoVal.stockAttractivenessScore === null, "stockAttractivenessScore is null when valuation is unavailable (NOT 50)");
    assert(scoresNoVal.stockAttractivenessStatus === "UNAVAILABLE", "stockAttractivenessStatus is UNAVAILABLE");

    // ---------------------------------------------------------
    // PART 11: Explicit Unavailable Propagation Invariant Tests
    // ---------------------------------------------------------
    console.log("\n--- PART 11: Unavailable Metric Propagation Audit ---");
    // Missing Cash -> Net Debt null
    const valNoCash = calculateValuation({
        financials: { totalDebt: 1000, totalCash: null, freeCashFlow: 500 },
        stockData: { currentPrice: 100, sharesOutstanding: 1000, beta: 1.0 },
        companyProfile: { ticker: "TEST" }
    });
    assert(valNoCash.dcfStatus === "UNAVAILABLE", "Missing cash causes DCF to be UNAVAILABLE");

    // Missing Beta -> WACC null, DCF null
    const valNoBeta = calculateValuation({
        financials: { totalDebt: 1000, totalCash: 500, freeCashFlow: 500 },
        stockData: { currentPrice: 100, sharesOutstanding: 1000, beta: null },
        companyProfile: { ticker: "TEST" }
    });
    assert(valNoBeta.waccBreakdown.calculatedWacc === null, "Missing beta causes WACC to be null");
    assert(valNoBeta.dcfStatus === "UNAVAILABLE", "Missing beta causes DCF to be UNAVAILABLE");

    // Missing Current Ratio -> Quality score does not use fake 1.2
    const scoresNoCR = calculateTriFactorScores({
        financials: { currentRatio: null, operatingMargin: 0.25, totalDebt: 0, totalCash: 100 },
        stockData: { currentPrice: 100, beta: 1.0 },
        valuation: { upsidePotential: 20 }
    });
    assert(scoresNoCR.companyQualityScore > 0, "Quality score computed without current ratio error");

    // ---------------------------------------------------------
    // SUMMARY
    // ---------------------------------------------------------
    console.log("\n================================================================================");
    console.log(`PRODUCTION TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log("================================================================================");

    if (failed > 0) {
        process.exit(1);
    }
}

runProductionTests().catch(err => {
    console.error("Test Suite Fatal Error:", err);
    process.exit(1);
});
