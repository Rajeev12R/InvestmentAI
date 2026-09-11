import { getCompanyNews } from "../tools/news.tool.js";

export async function newsNode(state) {
    console.log("Running News Node");
    if (String(state.securityContext?.securityType || '').toUpperCase() === 'IPO') {
        return { newsData: state.securityContext.news || [] };
    }
    const newsData = await getCompanyNews(state.companyName);
    return {
        newsData
    };
}