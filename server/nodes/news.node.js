import { getCompanyNews } from "../tools/news.tool.js";

export async function newsNode(state) {

    console.log("Running News Node");

    const newsData = await getCompanyNews(state.companyName);

    return {
        ...state,
        newsData,
        progress: [
            ...state.progress,
            "News research completed"
        ]

    }

}