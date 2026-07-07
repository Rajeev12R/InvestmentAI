import ai from "../services/gemini.service.js";
import { decisionPrompt } from "../prompts/decision.prompt.js";

export async function generateDecision(state){

    const prompt = `

${decisionPrompt}

Company Profile

${JSON.stringify(state.companyProfile, null, 2)}

Financials

${JSON.stringify(state.financials, null, 2)}

Stock

${JSON.stringify(state.stock, null, 2)}

News

${JSON.stringify(state.news, null, 2)}

Competitors

${JSON.stringify(state.competitors, null, 2)}

Risk Assessment

${JSON.stringify(state.risks, null, 2)}

`;

    const response = await ai.models.generateContent({

        model:"gemini-2.5-flash",

        contents:prompt

    });

    return JSON.parse(response.text);

}