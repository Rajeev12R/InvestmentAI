import { compareCompanies } from "../tools/compare.tool.js";

export const compareController = async (req, res) => {
    try {
        const { tickers } = req.body;

        if (!tickers || !Array.isArray(tickers) || tickers.length < 2) {
            return res.status(400).json({
                success: false,
                message: "Please provide an array of at least 2 company tickers to compare."
            });
        }

        const result = await compareCompanies(tickers);

        return res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error("Compare Controller Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to compare companies."
        });
    }
};
