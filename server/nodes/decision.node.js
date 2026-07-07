import { generateDecision } from "../tools/decision.tool.js";

export async function decisionNode(state){

    console.log("Running Decision Node");

    const decision = await generateDecision(state);

    return{

        ...state,

        recommendation: decision.recommendation,

        investmentScore: decision.investmentScore,

        confidence: decision.confidence,

        pros: decision.pros,

        cons: decision.cons,

        keyFactors: decision.keyFactors,

        reasoning: decision.reasoning,

        investmentHorizon: decision.investmentHorizon,

        progress:[
            ...state.progress,
            "Investment decision generated"
        ]

    }

}