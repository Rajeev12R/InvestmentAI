import { getCompanyNews } from "../tools/news.tool.js";

export async function newsNode(state){

    console.log("Running News Node");

    const news = await getCompanyNews(state.companyName);

    return{
        ...state,
        news,
        progress:[
            ...state.progress,
            "News research completed"
        ]

    }

}