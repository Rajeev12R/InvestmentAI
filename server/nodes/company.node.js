import { getCompanyProfile } from "../tools/company.tool.js";

export async function companyNode(state) {
    console.log("Running Company Node");
    if (String(state.securityContext?.securityType || '').toUpperCase() === 'IPO') {
        return {
            companyProfile: {
                name: state.securityContext.companyName || state.companyName,
                ticker: state.companyName,
                exchange: state.securityContext.exchange || null,
                sector: state.securityContext.domain || state.securityContext.sector || null,
                description: state.securityContext.businessDescription || null,
                securityType: 'IPO'
            }
        };
    }
    const companyProfile = await getCompanyProfile(state.companyName);
    return {
        companyProfile
    };
}