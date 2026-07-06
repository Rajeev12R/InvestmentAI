export async function financialNode(state) {

    console.log("Running Financial Node");

    return {

        ...state,

        financials: {
            revenue: "100B",
            profit: "25B",
            debt: null,
            cashFlow: null,
            peRatio: null,
            marketCap: null
        },
        progress: [
            ...state.progress,
            "Financial research completed"
        ]

    }

}