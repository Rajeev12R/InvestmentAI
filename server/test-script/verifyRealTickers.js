import { analyzeCompany } from "../graph/investmentGraph.js";

const TICKERS = ["AAPL", "JPM", "RELIANCE.NS", "TMPV.NS"];

async function verifyAll() {
    console.log("================================================================================");
    console.log("PHASE 2B INSTITUTIONAL RELATIVE VALUATION & SECTOR INTELLIGENCE REAL-TICKER AUDIT");
    console.log("================================================================================");

    for (const ticker of TICKERS) {
        console.log(`\n>>>>>>>> AUDITING REAL TICKER: ${ticker} <<<<<<<<`);
        try {
            const start = Date.now();
            const result = await analyzeCompany(ticker, {
                horizon: "Long (3-5 Years)",
                riskTolerance: "Moderate / Balanced",
                goal: "Capital Growth & Compounding"
            });
            const duration = ((Date.now() - start) / 1000).toFixed(1);

            console.log(`[Success in ${duration}s] ${result.companyProfile?.name} (${result.companyProfile?.ticker})`);
            console.log(`- Sector / Industry: ${result.companyProfile?.sector} / ${result.companyProfile?.industry}`);
            console.log(`- Exchange: ${result.companyProfile?.exchange} | Currency: ${result.companyProfile?.currency}`);

            // 1. Truth Package & Hash
            const tp = result.truthPackage || {};
            console.log(`- Truth Package Integrity: Sealed = ${tp.integrity?.valid} (${tp.integrity?.algorithm})`);
            console.log(`- Package Hash: ${tp.integrity?.packageHash}`);

            // 2. Phase 2B Sector Classification & Valuation Framework
            const val = result.valuation || {};
            const rel = val.relativeValuation || {};
            const framework = rel.framework || {};
            console.log(`- Sector Intelligence:`);
            console.log(`  * Canonical Sector: ${rel.sectorClassification || "Standard"}`);
            console.log(`  * Primary Methods: ${framework.primaryMethods?.join(", ") || "None"}`);
            console.log(`  * Prohibited Methods: ${framework.prohibitedMethods?.join(", ") || "None"}`);
            console.log(`  * Framework Rationale: ${framework.rationale || "N/A"}`);

            // 3. Grounded Peer Selection
            const peers = rel.peers || [];
            console.log(`- Operating Peer Set (${rel.peerCount || peers.length} Peers):`);
            peers.forEach(p => {
                console.log(`  * ${p.ticker} (${p.name}): P/E = ${p.pe ? p.pe + 'x' : 'N/A'}, EV/EBITDA = ${p.evEbitda ? p.evEbitda + 'x' : 'N/A'}, P/B = ${p.pb ? p.pb + 'x' : 'N/A'}`);
            });
            if (rel.excludedPeers && rel.excludedPeers.length > 0) {
                console.log(`  * Excluded Assets: ${rel.excludedPeers.map(e => `${e.ticker} (${e.reason})`).join("; ")}`);
            }

            // 4. Z-Score Benchmarking
            const zScores = rel.zScores || {};
            console.log(`- Statistical Z-Scores:`);
            ['pe', 'evEbitda', 'pb', 'revenueGrowth', 'ebitdaMargin', 'roe'].forEach(k => {
                const z = zScores[k];
                if (z && z.status === "CALCULATED") {
                    console.log(`  * ${k.toUpperCase()}: Company = ${z.companyValue}, Peer Median = ${z.peerMedian}, z = ${z.zScore}σ -> ${z.interpretation}`);
                }
            });

            // 5. Valuation Models & Agreement
            const dcf = val.dcf || {};
            const revDcf = val.reverseDcf || {};
            const scenarios = val.scenarios || {};
            const agreement = val.modelAgreement || {};

            console.log(`- Valuation Breakdown:`);
            console.log(`  * Current Market Price: ${val.currentPrice ? val.currentPrice + " " + result.companyProfile?.currency : "UNAVAILABLE"}`);
            console.log(`  * DCF Valuation: Status = ${dcf.status} | Fair Value = ${dcf.fairValue ?? 'null'} (WACC: ${dcf.wacc ? dcf.wacc + '%' : 'UNAVAILABLE'}, g: ${dcf.terminalGrowth ? dcf.terminalGrowth + '%' : 'UNAVAILABLE'})`);
            console.log(`  * Relative Valuation: Status = ${rel.status} | Composite Fair Value = ${rel.fairValue ?? 'null'}`);
            if (rel.ranges) {
                console.log(`    - Conservative (P25): ${rel.ranges.conservative} | Base (Median): ${rel.ranges.base} | Optimistic (P75): ${rel.ranges.optimistic}`);
            }
            console.log(`  * Reverse DCF: Status = ${revDcf.status} | Implied Growth Rate = ${revDcf.impliedGrowthPercent !== null && revDcf.impliedGrowthPercent !== undefined ? revDcf.impliedGrowthPercent + '%' : 'null'}`);
            console.log(`  * Scenarios: Bear = ${scenarios.bear?.fairValue ?? 'null'}, Base = ${scenarios.base?.fairValue ?? 'null'}, Bull = ${scenarios.bull?.fairValue ?? 'null'}`);
            console.log(`  * Model Agreement: Status = ${agreement.disagreementStatus || 'UNAVAILABLE'} (CV: ${agreement.coefficientOfVariation !== null && agreement.coefficientOfVariation !== undefined ? (agreement.coefficientOfVariation * 100).toFixed(1) + '%' : 'N/A'}, Valid Models: ${agreement.validModelCount || 0})`);
            console.log(`  * Final Fair Value Target: ${val.fairValuePriceTarget ?? 'UNAVAILABLE'} | Margin of Safety: ${val.marginOfSafety !== null && val.marginOfSafety !== undefined ? val.marginOfSafety + '%' : 'null'}`);

        } catch (err) {
            console.error(`[ERROR] Verification failed for ${ticker}:`, err.message, err.stack);
        }
    }
    console.log("\n================================================================================");
    console.log("REAL-TICKER AUDIT COMPLETE");
    console.log("================================================================================");
}

verifyAll().catch(err => {
    console.error("Fatal:", err);
});
