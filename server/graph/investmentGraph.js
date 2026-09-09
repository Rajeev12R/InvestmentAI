import { START, END, StateGraph } from "@langchain/langgraph";
import { GraphState } from "./state.js";

import { companyNode } from "../nodes/company.node.js";
import { financialNode } from "../nodes/financial.node.js";
import { stockNode } from "../nodes/stock.node.js";
import { newsNode } from "../nodes/news.node.js";
import { competitorNode } from "../nodes/competitor.node.js";
import { riskNode } from "../nodes/risk.node.js";
import { valuationNode } from "../nodes/valuation.node.js";
import { evidenceNode } from "../nodes/evidence.node.js";
import { decisionNode } from "../nodes/decision.node.js";
import { researchNode } from "../nodes/research.node.js";

const graphBuilder = new StateGraph(GraphState);

// 1. Register Graph Nodes
graphBuilder.addNode("company", companyNode);
graphBuilder.addNode("financial", financialNode);
graphBuilder.addNode("stock", stockNode);
graphBuilder.addNode("news", newsNode);
graphBuilder.addNode("competitor", competitorNode);
graphBuilder.addNode("risk", riskNode);
graphBuilder.addNode("valuationStep", valuationNode);
graphBuilder.addNode("evidenceStep", evidenceNode);
graphBuilder.addNode("decisionStep", decisionNode);
graphBuilder.addNode("researchStep", researchNode);

// 2. Genuine Parallel Execution Architecture:
// Step 1: START -> Company Resolution
graphBuilder.addEdge(START, "company");

// Step 2: Parallel fan-out from company to financial, stock, and news ingestion
graphBuilder.addEdge("company", "financial");
graphBuilder.addEdge("company", "stock");
graphBuilder.addEdge("company", "news");

// Step 3: Fan-in to competitor peer benchmarking
graphBuilder.addEdge("financial", "competitor");
graphBuilder.addEdge("stock", "competitor");
graphBuilder.addEdge("news", "competitor");

// Step 4: Parallel quantitative analysis (risk and valuation engines)
graphBuilder.addEdge("competitor", "risk");
graphBuilder.addEdge("competitor", "valuationStep");

// Step 5: Fan-in to Evidence & Truth Layer Assembler / Sealer
graphBuilder.addEdge("risk", "evidenceStep");
graphBuilder.addEdge("valuationStep", "evidenceStep");

// Step 6: Air-Gapped Decision & AI Reasoning over Sealed Truth Package
graphBuilder.addEdge("evidenceStep", "decisionStep");
graphBuilder.addEdge("decisionStep", "researchStep");
graphBuilder.addEdge("researchStep", END);

export const investmentGraph = graphBuilder.compile();

export async function analyzeCompany(companyName, investorProfile = null) {
    const result = await investmentGraph.invoke({
        companyName,
        companyProfile: null,
        financials: null,
        stockData: null,
        newsData: [],
        competitors: [],
        risks: {},
        valuation: null,
        investorProfile: investorProfile || {
            horizon: "Long (3-5 Years)",
            riskTolerance: "Moderate / Balanced",
            goal: "Capital Growth & Compounding"
        },
        truthPackage: null,
        provenance: [],
        companyQualityScore: null,
        stockAttractivenessScore: null,
        stockAttractivenessStatus: "UNAVAILABLE",
        investorFitScore: null,
        investmentScore: null,
        opportunities: [],
        recommendation: null,
        confidence: null,
        reasoning: "",
        pros: [],
        cons: [],
        keyFactors: [],
        investmentHorizon: "3-5 Years",
        phase3Decision: null,
        decision: null,
        research: null,
        progress: [],
        errors: []
    });

    return result;
}

export const runInvestmentPipeline = analyzeCompany;