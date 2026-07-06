export async function companyNode(state){
    console.log("Running Company Node");

    return {
        ...state,

        companyProfile: {
            name: state.companyName,
            industry: "Technology",
            ceo: "Demo CEO"
        },

        progress: [
            ...state.progress,
            "Company research completed"
        ]
    };
    
}