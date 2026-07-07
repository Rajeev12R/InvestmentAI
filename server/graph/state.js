import { Annotation } from "@langchain/langgraph";

export const GraphState = Annotation.Root({
    companyName: Annotation(),

    companyProfile: Annotation(),

    financials: Annotation(),

    stock: Annotation(),

    news: Annotation(),

    competitors: Annotation(),

    risks: Annotation(),

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