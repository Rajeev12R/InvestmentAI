import ai from "../services/gemini.service.js";
import { decisionPrompt } from "../prompts/decision.prompt.js";

export async function generateDecision(state) {

    const prompt = `

${decisionPrompt}

Company Profile

${JSON.stringify(state.companyProfile, null, 2)}

Financials

${JSON.stringify(state.financials, null, 2)}

Stock

${JSON.stringify(state.stockData, null, 2)}

News

${JSON.stringify(state.newsData, null, 2)}

Competitors

${JSON.stringify(state.competitors, null, 2)}

Risk Assessment

${JSON.stringify(state.risks, null, 2)}

`;

    const response = await ai.models.generateContent({

        model: "gemini-2.5-flash",

        contents: prompt,

        config: {
            responseMimeType: "application/json"
        }

    });

    const cleanedText = response.text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanedText);

}