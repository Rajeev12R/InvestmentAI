export async function competitorNode(state) {
    console.log("Running Competitor Node");

    return {
        ...state,

        competitors: [
            "Google",
            "Amazon",
            "Oracle"
        ],

        progress: [
            ...state.progress,
            "Competitor research completed"
        ]
    };
}