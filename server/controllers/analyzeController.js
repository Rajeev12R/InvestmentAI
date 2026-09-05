import { analyzeCompany } from "../graph/investmentGraph.js";

// High-performance 24-Hour Cache for high-traffic scalability & zero API quota waste
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 Hours
const analysisCache = new Map();

export const analyzecontroller = async (req, res) => {
    try {
        const { companyName, forceRefresh } = req.body;

        if (!companyName) {
            return res.status(400).json({
                success: false,
                message: "Company name is required."
            });
        }

        const normalizedKey = companyName.trim().toUpperCase();
        const now = Date.now();

        // Check cache unless forceRefresh requested
        if (!forceRefresh && analysisCache.has(normalizedKey)) {
            const cachedEntry = analysisCache.get(normalizedKey);
            if (now - cachedEntry.timestamp < CACHE_TTL_MS) {
                console.log(`[Cache Hit] Serving cached analysis for ${normalizedKey} (${Math.round((now - cachedEntry.timestamp)/60000)}m old)`);
                return res.status(200).json({
                    success: true,
                    data: cachedEntry.data,
                    isCached: true,
                    cachedAt: new Date(cachedEntry.timestamp).toISOString()
                });
            } else {
                analysisCache.delete(normalizedKey);
            }
        }

        console.log(`[Cache Miss] Running full AI synthesis pipeline for ${normalizedKey}...`);
        const result = await analyzeCompany(companyName);

        // Store in cache
        if (result && result.companyProfile) {
            analysisCache.set(normalizedKey, {
                timestamp: now,
                data: result
            });
            // Also store under resolved ticker if different
            if (result.companyProfile.ticker && result.companyProfile.ticker.toUpperCase() !== normalizedKey) {
                analysisCache.set(result.companyProfile.ticker.toUpperCase(), {
                    timestamp: now,
                    data: result
                });
            }
        }

        return res.status(200).json({ success: true, data: result, isCached: false });
    } catch (error) {
        console.error("Analyze Controller Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to analyze company.",
            error: error.message
        });
    }
};