import ai from "../services/gemini.service.js";

export const testGemini = async (req, res) => {
    try {

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: "Say Hello from Gemini.",
        });

        res.json({
            success: true,
            message: response.text,
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            error: error.message,
        });

    }
};