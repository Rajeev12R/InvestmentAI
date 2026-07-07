import { getCompetitors } from "../tools/competitor.tool.js";

export async function competitorNode(state) {

    console.log("Running Competitor Node");

    const competitors = await getCompetitors(state.companyProfile);

    return {
        ...state,
        competitors,
        progress: [
            ...state.progress,
            "Competitor research completed"
        ]
    };
}