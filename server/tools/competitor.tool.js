import ai from "../services/gemini.service.js";
import { competitorPrompt } from "../prompts/competitor.prompt.js";

export async function getCompetitors(companyProfile) {

    const prompt = `
${competitorPrompt}

Company:

${JSON.stringify(companyProfile, null, 2)}
`;

    const response = await ai.models.generateContent({

        model: "gemini-2.5-flash",

        contents: prompt,

        config: {
            responseMimeType: "application/json"
        }

    });

    return JSON.parse(response.text);

}