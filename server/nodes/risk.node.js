export async function riskNode(state) {
    console.log("Running Risk Node");

    return {
        ...state,

        risks: [
            "High competition",
            "Regulatory scrutiny"
        ],

        opportunities: [
            "AI Expansion",
            "Cloud Growth"
        ],

        progress: [
            ...state.progress,
            "Risk analysis completed"
        ]
    };
}