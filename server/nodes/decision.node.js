export async function decisionNode(state){

    console.log("Running Decision Node");

    return{

        ...state,

        recommendation:"INVEST",
        confidence:87,
        reasoning:"Strong financials with positive market sentiment.",

        progress:[
            ...state.progress,
            "Investment decision generated"
        ]

    }

}