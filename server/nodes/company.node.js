import { getCompanyProfile } from "../tools/company.tool.js";

export async function companyNode(state){
    console.log("Running Company Node");

    const companyProfile = await getCompanyProfile(state.companyName);
    return {
        ...state,

        companyProfile,

        progress:[
            ...state.progress,
            "Company research completed"
        ]
    };
    
}