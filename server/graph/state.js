import { Annotation } from "@langchain/langgraph";

export const GraphState = Annotation.Root({
    companyName: Annotation(),
    companyProfile: Annotation(),
    financials: Annotation(),
    stockData: Annotation(),
    newsData: Annotation(),
    competitors: Annotation(),
    risks: Annotation(),
    valuation: Annotation(),
    investorProfile: Annotation(),
    truthPackage: Annotation(),
    provenance: Annotation(),
    companyQualityScore: Annotation(),
    stockAttractivenessScore: Annotation(),
    investorFitScore: Annotation(),
    investmentScore: Annotation(),
    pros: Annotation(),
    cons: Annotation(),
    keyFactors: Annotation(),
    investmentHorizon: Annotation(),
    opportunities: Annotation(),
    recommendation: Annotation(),
    confidence: Annotation(),
    reasoning: Annotation(),
    progress: Annotation(),
    errors: Annotation()
});