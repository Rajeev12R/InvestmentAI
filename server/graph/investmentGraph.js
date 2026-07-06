import { START, END, StateGraph } from "@langchain/langgraph";
import {GraphState} from "./state.js";

import {companyNode} from "../nodes/company.node.js";
import {financialNode} from "../nodes/financial.node.js";
import {newsNode} from "../nodes/news.node.js";
import {competitorNode} from "../nodes/competitor.node.js";
import {riskNode} from "../nodes/risk.node.js";
import {decisionNode} from "../nodes/decision.node.js";

const graphBuilder = new StateGraph(GraphState);

graphBuilder.addNode("company", companyNode);
graphBuilder.addNode("financial", financialNode);
graphBuilder.addNode("news", newsNode);
graphBuilder.addNode("competitor", competitorNode);
graphBuilder.addNode("risk", riskNode);
graphBuilder.addNode("decision", decisionNode);

graphBuilder.addEdge(START, "company");
graphBuilder.addEdge("company", "financial");
graphBuilder.addEdge("financial", "news");
graphBuilder.addEdge("news", "competitor");
graphBuilder.addEdge("competitor", "risk");
graphBuilder.addEdge("risk", "decision");
graphBuilder.addEdge("decision", END);

export const investmentGraph = graphBuilder.compile();

export async function analyzeCompany(companyName){

    const result = await investmentGraph.invoke({

        companyName,

        companyProfile:null,

        financials:null,

        news:[],

        competitors:[],

        risks:[],

        opportunities:[],

        recommendation:null,

        confidence:0,

        reasoning:"",

        progress:[],

        errors:[]

    });

    return result;

}