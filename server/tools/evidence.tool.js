import crypto from "crypto";

/**
 * Validates the Canonical Investment Truth Package against the 8 Invariants.
 * Throws or reports integrity violations.
 */
export function validateTruthPackage(truthPackage) {
    const violations = [];

    if (!truthPackage || typeof truthPackage !== "object") {
        return { valid: false, violations: ["Truth package is null or not an object"] };
    }

    const validStatuses = new Set(["GROUNDED", "CALCULATED", "ESTIMATED", "UNAVAILABLE"]);

    // Helper to validate a fact item
    function checkFact(fact, type = "financialFact") {
        if (!fact || typeof fact !== "object") {
            violations.push(`${type} is not an object: ${JSON.stringify(fact)}`);
            return;
        }

        if (!fact.id || typeof fact.id !== "string") {
            violations.push(`${type} missing valid string id: ${JSON.stringify(fact)}`);
        }

        if (!validStatuses.has(fact.status)) {
            violations.push(`${fact.id || type} has invalid status '${fact.status}'. Allowed: ${[...validStatuses].join(", ")}`);
        }

        if (fact.status === "UNAVAILABLE") {
            if (fact.value !== null && fact.value !== undefined) {
                violations.push(`${fact.id} status is UNAVAILABLE but value is not null: ${fact.value}`);
            }
        }

        if (fact.status === "GROUNDED") {
            if (!fact.source || typeof fact.source !== "object" || !fact.source.provider) {
                violations.push(`${fact.id} is GROUNDED but missing valid source metadata object`);
            }
        }

        if (fact.status === "CALCULATED") {
            if (!fact.formula || typeof fact.formula !== "string") {
                violations.push(`${fact.id} is CALCULATED but missing exact mathematical formula`);
            }
            if (!Array.isArray(fact.inputs) || fact.inputs.length === 0) {
                violations.push(`${fact.id} is CALCULATED but missing input references array`);
            }
        }

        if (fact.status === "ESTIMATED") {
            if (!fact.assumption && !fact.formula) {
                violations.push(`${fact.id} is ESTIMATED but missing stated assumption or estimation formula`);
            }
        }

        if (!fact.retrievedAt) {
            violations.push(`${fact.id || type} is missing retrievedAt timestamp`);
        }
    }

    // 1. Validate all financial facts
    (truthPackage.financialFacts || []).forEach(f => checkFact(f, "financialFact"));

    // 2. Validate all calculated metrics
    (truthPackage.calculatedMetrics || []).forEach(m => checkFact(m, "calculatedMetric"));

    // 3. Validate Valuation Models
    const dcf = truthPackage.valuationModels?.dcf;
    if (dcf) {
        if (dcf.status && !validStatuses.has(dcf.status)) {
            violations.push(`valuationModels.dcf has invalid status '${dcf.status}'`);
        }
        if (dcf.status === "UNAVAILABLE" && dcf.fairValue !== null) {
            violations.push("valuationModels.dcf is UNAVAILABLE but fairValue is not null");
        }
    }

    // 4. Validate Provenance integrity
    (truthPackage.provenance || []).forEach(p => {
        if (!p.id || !p.status || !validStatuses.has(p.status)) {
            violations.push(`Provenance item ${p.id || "unnamed"} has invalid status`);
        }
    });

    return {
        valid: violations.length === 0,
        violations,
        errors: violations
    };

}

/**
 * Generates a deterministic canonical JSON string and SHA-256 package hash to seal the Truth Package.
 */
export function sealTruthPackage(truthPackage) {
    function canonicalize(obj) {
        if (obj === null || typeof obj !== "object") {
            return obj;
        }
        if (Array.isArray(obj)) {
            return obj.map(canonicalize);
        }
        const sorted = {};
        Object.keys(obj)
            .filter(k => k !== "integrity") // Exclude integrity node to avoid circular hash
            .sort()
            .forEach(k => {
                sorted[k] = canonicalize(obj[k]);
            });
        return sorted;
    }

    const canonicalJson = JSON.stringify(canonicalize(truthPackage));
    const packageHash = crypto.createHash("sha256").update(canonicalJson).digest("hex");

    return {
        valid: true,
        packageHash,
        algorithm: "SHA-256",
        sealedAt: new Date().toISOString()
    };
}

/**
 * Verifies the integrity of a sealed Truth Package.
 */
export function verifyTruthPackageSeal(truthPackage) {
    if (!truthPackage || !truthPackage.integrity || !truthPackage.integrity.packageHash) {
        return { valid: false, reason: "MISSING_INTEGRITY_SEAL" };
    }

    const expectedSeal = sealTruthPackage(truthPackage);
    const valid = expectedSeal.packageHash === truthPackage.integrity.packageHash;

    return {
        valid,
        packageHash: truthPackage.integrity.packageHash,
        calculatedHash: expectedSeal.packageHash,
        reason: valid ? "INTEGRITY_VERIFIED" : "HASH_MISMATCH_TAMPER_DETECTED"
    };
}

/**
 * Builds and seals the Canonical Investment Truth Package from state facts.
 */
export function buildEvidenceGraph(state) {
    const profile = state.companyProfile || {};
    const fin = state.financials || {};
    const stock = state.stockData || {};
    const valuation = state.valuation || {};
    const risks = state.risks || {};
    const news = state.newsData || [];
    const timestamp = new Date().toISOString();
    const currency = stock.currency || fin.currency || "$";

    const provenance = [];
    const financialFacts = [];
    const calculatedMetrics = [];

    // Helper to format currency or percentage amounts cleanly
    function formatValue(val, type = "currency") {
        if (val === null || val === undefined || isNaN(Number(val))) return "UNAVAILABLE";
        const num = Number(val);
        if (type === "currency") {
            if (Math.abs(num) >= 1e9) return `${currency}${(num / 1e9).toFixed(2)}B`;
            if (Math.abs(num) >= 1e6) return `${currency}${(num / 1e6).toFixed(2)}M`;
            return `${currency}${num.toFixed(2)}`;
        }
        if (type === "percent") {
            const pct = Math.abs(num) < 1 && num !== 0 ? num * 100 : num;
            return `${pct.toFixed(2)}%`;
        }
        if (type === "ratio") {
            return `${num.toFixed(2)}x`;
        }
        return String(num);
    }

    // Ingest facts from the canonical financial fact registry
    const rawFacts = fin.facts || {};

    Object.values(rawFacts).forEach(fact => {
        const item = {
            id: fact.id,
            metric: fact.id.replace("financial.", "").replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase()),
            value: fact.value,
            formattedValue: fact.value !== null ? formatValue(fact.value, fact.id.includes("Growth") || fact.id.includes("Margin") || fact.id.includes("return") || fact.id.includes("roic") ? "percent" : fact.id.includes("Ratio") ? "ratio" : "currency") : "UNAVAILABLE",
            status: fact.status,
            source: fact.source,
            period: fact.period,
            retrievedAt: fact.retrievedAt || timestamp,
            formula: fact.formula || null,
            inputs: fact.inputs || null,
            assumption: fact.assumption || null
        };

        provenance.push(item);
        if (fact.status === "CALCULATED" || fact.status === "ESTIMATED" || fact.formula) {
            calculatedMetrics.push(item);
        } else {
            financialFacts.push(item);
        }
    });

    // Ingest Market Facts
    const betaFact = {
        id: "market.beta",
        metric: "5Y Monthly Beta",
        value: stock.beta !== null && stock.beta !== undefined ? Number(stock.beta) : null,
        formattedValue: stock.beta !== null && stock.beta !== undefined ? Number(stock.beta).toFixed(2) : "UNAVAILABLE",
        status: stock.beta !== null && stock.beta !== undefined ? "GROUNDED" : "UNAVAILABLE",
        source: {
            provider: "Yahoo Finance",
            sourceType: "AGGREGATED_FINANCIAL_DATA",
            sourceId: "summaryDetail.beta",
            hierarchyRank: 4
        },
        period: { type: "60_MONTH_TRAILING", startDate: null, endDate: null },
        retrievedAt: timestamp,
        formula: null,
        inputs: null,
        assumption: null
    };
    provenance.push(betaFact);
    financialFacts.push(betaFact);

    // Ingest Valuation Facts (WACC, DCF, Reverse DCF)
    const waccBreakdown = valuation.waccBreakdown || {};
    const waccFact = {
        id: "valuation.wacc",
        metric: "Weighted Average Cost of Capital (WACC)",
        value: valuation.assumptions?.discountRate ? valuation.assumptions.discountRate / 100 : null,
        formattedValue: valuation.assumptions?.discountRate ? `${valuation.assumptions.discountRate.toFixed(2)}%` : "UNAVAILABLE",
        status: valuation.assumptions?.discountRate ? "CALCULATED" : "UNAVAILABLE",
        source: {
            provider: "InvestmentAI Valuation Engine",
            sourceType: "DERIVED_CALCULATION",
            sourceId: "CAPM Capital Structure Weighting",
            hierarchyRank: 6
        },
        period: { type: "REALTIME", startDate: null, endDate: null },
        retrievedAt: timestamp,
        formula: "WACC = (Equity_Weight * Cost_of_Equity) + (Debt_Weight * Cost_of_Debt * (1 - Tax_Rate))",
        inputs: ["market.beta", "financial.marketCap", "financial.totalDebt"],
        rawInput: waccBreakdown
    };
    provenance.push(waccFact);
    calculatedMetrics.push(waccFact);

    const dcfFact = {
        id: "valuation.dcfFairValue",
        metric: "DCF Intrinsic Fair Value per Share",
        value: valuation.dcfValue !== null && valuation.dcfValue !== undefined ? Number(valuation.dcfValue) : null,
        formattedValue: valuation.dcfValue !== null && valuation.dcfValue !== undefined ? `${currency}${Number(valuation.dcfValue).toFixed(2)}` : "UNAVAILABLE",
        status: valuation.dcfStatus || (valuation.dcfValue !== null && valuation.dcfValue !== undefined ? "CALCULATED" : "UNAVAILABLE"),
        source: {
            provider: "InvestmentAI Valuation Engine",
            sourceType: valuation.dcfStatus === "ESTIMATED" ? "ESTIMATE" : "DERIVED_CALCULATION",
            sourceId: "5-Year Discrete FCFF Model",
            hierarchyRank: valuation.dcfStatus === "ESTIMATED" ? 7 : 6
        },
        period: { type: "5_YEAR_FORECAST", startDate: null, endDate: null },
        retrievedAt: timestamp,
        formula: "Fair Value = (PV of 5-Yr Projected FCFs + PV of Terminal Value - Net Debt) / Shares Outstanding",
        inputs: ["financial.freeCashFlow", "valuation.wacc", "financial.netDebt"],
        assumption: valuation.dcfStatus === "ESTIMATED" ? "Estimated cash flows derived via normalized conversion" : null
    };
    provenance.push(dcfFact);
    calculatedMetrics.push(dcfFact);

    const relFact = {
        id: "valuation.relativeFairValue",
        metric: "Sector-Adjusted Relative Fair Value per Share",
        value: valuation.relativeValuation?.fairValue !== null && valuation.relativeValuation?.fairValue !== undefined ? Number(valuation.relativeValuation.fairValue) : null,
        formattedValue: valuation.relativeValuation?.fairValue !== null && valuation.relativeValuation?.fairValue !== undefined ? `${currency}${Number(valuation.relativeValuation.fairValue).toFixed(2)}` : "UNAVAILABLE",
        status: valuation.relativeValuation?.status || "UNAVAILABLE",
        source: {
            provider: "InvestmentAI Phase 2B Relative Valuation Engine",
            sourceType: "DERIVED_CALCULATION",
            sourceId: "Sector Multiple Synthesis",
            hierarchyRank: 6
        },
        period: { type: "PEER_BENCHMARK", startDate: null, endDate: null },
        retrievedAt: timestamp,
        formula: "Weighted Average of Sector Multiples (P/E, EV/EBITDA, P/B, EV/Revenue)",
        inputs: ["peer.distributions", "financial.facts"]
    };
    provenance.push(relFact);
    calculatedMetrics.push(relFact);

    // Confidence Calculation with Critical Penalties
    const coreFactKeys = [
        "financial.totalRevenue", "financial.netIncome", "financial.operatingCashFlow",
        "financial.freeCashFlow", "financial.totalDebt", "financial.totalCash", "market.beta"
    ];
    const availableCount = coreFactKeys.filter(k => rawFacts[k] && rawFacts[k].status !== "UNAVAILABLE").length;
    const completenessRatio = availableCount / coreFactKeys.length;

    let criticalPenalty = 1.0;
    if (!rawFacts["financial.freeCashFlow"] || rawFacts["financial.freeCashFlow"].status === "UNAVAILABLE") {
        criticalPenalty *= 0.75; // Missing FCF penalizes valuation confidence
    }
    if (!rawFacts["financial.totalDebt"] || rawFacts["financial.totalDebt"].status === "UNAVAILABLE") {
        criticalPenalty *= 0.85; // Missing debt penalizes balance sheet confidence
    }

    const dataCompleteness = Math.round(completenessRatio * 100);
    const sourceQuality = 90;
    const freshness = 95;
    const modelAgreement = valuation.valuationSpread ? Math.max(40, Math.min(95, Math.round(100 - valuation.valuationSpread))) : 75;
    const calculationIntegrity = 95;

    const rawConfidence = (dataCompleteness * 0.30) + (sourceQuality * 0.25) + (freshness * 0.15) + (modelAgreement * 0.15) + (calculationIntegrity * 0.15);
    const overallConfidence = Math.max(25, Math.min(98, Math.round(rawConfidence * criticalPenalty)));

    // Assemble Canonical Investment Truth Package
    const truthPackage = {
        company: {
            name: profile.name || state.companyName || "Unknown Entity",
            ticker: profile.ticker || state.companyName,
            sector: profile.sector || "General Equity",
            industry: profile.industry || "General",
            exchange: profile.exchange || stock.exchange || "Exchange Listed",
            currency
        },
        financialFacts,
        calculatedMetrics,
        valuationModels: {
            dcf: valuation.dcf || {
                fairValue: null,
                upside: null,
                wacc: null,
                terminalGrowth: null,
                method: "5-Year Discrete FCFF Model",
                status: "UNAVAILABLE"
            },
            relativeMultiples: valuation.relativeValuation || {
                fairValue: null,
                upside: null,
                status: "UNAVAILABLE"
            },
            relativeValuation: valuation.relativeValuation || {
                sector: profile.sector || "General Equity",
                framework: null,
                peers: [],
                normalizedMetrics: [],
                zScores: {},
                distributions: {},
                valuationRanges: null,
                modelAgreement: valuation.modelAgreement || null,
                status: "UNAVAILABLE",
                provenance: {
                    source: "relativeValuation.engine",
                    timestamp
                }
            },
            reverseDcf: valuation.reverseDcf || {
                impliedGrowthRate: null,
                marketPrice: stock.currentPrice || null,
                status: "UNAVAILABLE"
            },
            scenarios: valuation.scenarios || null,
            sensitivity: valuation.sensitivityGrid || null,
            valuationRange: valuation.valuationRange || null,
            marginOfSafety: valuation.marginOfSafety !== undefined ? valuation.marginOfSafety : null,
            modelAgreement: valuation.modelAgreement || null,
            confidence: valuation.valuationConfidence || null
        },
        riskSignals: {
            overallScore: risks.score ?? null,
            overallRiskLevel: risks.riskLevel || "UNKNOWN",
            criticalFlags: risks.criticalFlags || [],
            categoryBreakdowns: risks.riskProfile?.categoryBreakdowns || {},
            riskProfile: risks.riskProfile || null,
            financialRisk: risks.financialRisk || {},
            marketRisk: risks.marketRisk || {},
            earningsRisk: risks.earningsRisk || {},
            liquidityRisk: risks.liquidityRisk || {},
            growthRisk: risks.growthRisk || {},
            governanceRisk: risks.governanceRisk || { status: "UNAVAILABLE" },
            flags: risks.flags || []
        },
        peerBenchmarks: state.competitors || {
            sector: profile.sector || "General Equity",
            peers: []
        },
        newsEvents: (news || []).map(item => ({
            title: item.title,
            source: item.source?.name || item.source || "News Feed",
            publishedAt: item.publishedAt || "Recent",
            category: item.category || "Corporate Operations",
            severity: item.severity !== undefined ? item.severity : 0.0,
            sentiment: item.sentiment || "NEUTRAL"
        })),
        investorProfile: state.investorProfile || {
            horizon: "Long (3-5 Years)",
            riskTolerance: "Moderate / Balanced",
            goal: "Capital Growth & Compounding"
        },
        scores: {
            companyQualityScore: state.companyQualityScore || null,
            stockAttractivenessScore: state.stockAttractivenessScore || null,
            investorFitScore: state.investorFitScore || null
        },
        confidence: {
            overall: overallConfidence,
            dataCompleteness,
            sourceQuality,
            freshness,
            modelAgreement,
            calculationIntegrity,
            integrityCheck: true,
            criticalPenaltyApplied: criticalPenalty < 1.0
        },
        provenance
    };

    // Validate Package
    const validation = validateTruthPackage(truthPackage);
    truthPackage.confidence.integrityCheck = validation.valid;

    // Seal Package with SHA-256 Hash
    const integrity = sealTruthPackage(truthPackage);
    truthPackage.integrity = integrity;

    return {
        truthPackage,
        provenance,
        confidence: truthPackage.confidence,
        integrity
    };
}
