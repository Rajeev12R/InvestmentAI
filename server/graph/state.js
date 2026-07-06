import { Annotation } from "@langchain/langgraph";

export const GraphState = Annotation.Root({
    companyName: Annotation(),

    companyProfile: Annotation(),

    financials: Annotation(),

    news: Annotation(),

    competitors: Annotation(),

    risks: Annotation(),

    opportunities: Annotation(),

    recommendation: Annotation(),

    confidence: Annotation(),

    reasoning: Annotation(),

    progress: Annotation(),

    errors: Annotation()
});