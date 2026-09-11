import { getCompetitors } from "../tools/competitor.tool.js";

export async function competitorNode(state) {
    console.log("Running Competitor Node");
    if (String(state.securityContext?.securityType || '').toUpperCase() === 'IPO') {
        return { competitors: [] };
    }
    const competitors = await getCompetitors(state.companyProfile);
    return {
        competitors
    };
}