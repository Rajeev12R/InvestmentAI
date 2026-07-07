import ai from "../services/gemini.service.js";
import { riskPrompt } from "../prompts/risk.prompt.js";

export async function analyzeRisk(state){

    const prompt = `
${riskPrompt}

Company:

${JSON.stringify(state.companyProfile)}

Financials:

${JSON.stringify(state.financials)}

Stock:

${JSON.stringify(state.stock)}

News:

${JSON.stringify(state.news)}

Competitors:

${JSON.stringify(state.competitors)}
`;

    const response = await ai.models.generateContent({

        model:"gemini-2.5-flash",

        contents:prompt,

        config: {
            responseMimeType: "application/json"
        }

    });

    return JSON.parse(response.text);

}