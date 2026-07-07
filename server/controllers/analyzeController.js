import { analyzeCompany } from "../graph/investmentGraph.js"

export const analyzecontroller = async(req, res) => {
    try {
        const {companyName} = req.body;

        if (!companyName) {
            return res.status(400).json({
                success: false,
                message: "Company name is required."
            });
        }

        const result = await analyzeCompany(companyName);

        return res.status(200).json({success: true, data: result});
    }catch(error){
        console.error("Analyze Controller Error:", error);

        return res.status(500).json({success: false,message: "Failed to analyze company.", error: error.message});
    }
};