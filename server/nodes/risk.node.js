import { analyzeRisk } from "../tools/risk.tool.js";

export async function riskNode(state) {
    console.log("Running Risk Node");
    if (String(state.securityContext?.securityType || '').toUpperCase() === 'IPO') {
        return { risks: state.securityContext.riskProfile || { overallRiskLevel: 'UNKNOWN', criticalFlags: [] } };
    }
    const risks = await analyzeRisk(state);
    return {
        risks
    };
}