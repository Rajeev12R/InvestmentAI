export async function newsNode(state){

    console.log("Running News Node");

    return{
        ...state,

        news:[
            {
                title:"Company launches AI product",
                sentiment:"positive"
            }

        ],
        progress:[
            ...state.progress,
            "News research completed"
        ]

    }

}