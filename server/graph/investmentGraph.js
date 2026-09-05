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

const graphBuilder = new StateGraph(GraphState);

// 1. Register All Nodes
graphBuilder.addNode("company", companyNode);
graphBuilder.addNode("financial", financialNode);
graphBuilder.addNode("stock", stockNode);
graphBuilder.addNode("news", newsNode);
graphBuilder.addNode("competitor", competitorNode);
graphBuilder.addNode("risk", riskNode);
graphBuilder.addNode("valuationStep", valuationNode);
graphBuilder.addNode("evidenceStep", evidenceNode);
graphBuilder.addNode("decision", decisionNode);

// 2. Parallel Flow Architecture:
// Step 1: START -> company
graphBuilder.addEdge(START, "company");

// Step 2: Parallel fan-out from company to financial, stock, news
graphBuilder.addEdge("company", "financial");
graphBuilder.addEdge("financial", "stock");
graphBuilder.addEdge("stock", "news");

// Step 3: competitor -> risk -> valuation
graphBuilder.addEdge("news", "competitor");
graphBuilder.addEdge("competitor", "risk");
graphBuilder.addEdge("risk", "valuationStep");

// Step 4: valuation -> evidenceStep (Truth Layer Registry) -> decision (AI reasoning) -> END
graphBuilder.addEdge("valuationStep", "evidenceStep");
graphBuilder.addEdge("evidenceStep", "decision");
graphBuilder.addEdge("decision", END);

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
        companyQualityScore: 0,
        stockAttractivenessScore: 0,
        investorFitScore: 0,
        investmentScore: 0,
        opportunities: [],
        recommendation: null,
        confidence: 0,
        reasoning: "",
        pros: [],
        cons: [],
        keyFactors: [],
        investmentHorizon: "3-5 Years",
        progress: [],
        errors: []
    });

    return result;
}