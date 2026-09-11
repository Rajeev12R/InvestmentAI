import { analyzeCompany } from "../graph/investmentGraph.js";

// Tiered Cache: 30 minutes for full analysis freshness
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 Minutes
const analysisCache = new Map();

export const analyzecontroller = async (req, res) => {
    try {
        const { companyName, forceRefresh, investorProfile, securityContext } = req.body;

        if (!companyName) {
            return res.status(400).json({
                success: false,
                message: "Company name or ticker symbol is required."
            });
        }

        const normalizedKey = companyName.trim().toUpperCase();
        const now = Date.now();

        // Check cache unless forceRefresh requested or custom investor profile provided
        if (!forceRefresh && !investorProfile && analysisCache.has(normalizedKey)) {
            const cachedEntry = analysisCache.get(normalizedKey);
            if (now - cachedEntry.timestamp < CACHE_TTL_MS) {
                console.log(`[Cache Hit] Serving fresh analysis for ${normalizedKey} (${Math.round((now - cachedEntry.timestamp)/60000)}m old)`);
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

        console.log(`[Truth Layer Pipeline] Executing institutional research synthesis for ${normalizedKey}...`);
        const result = await analyzeCompany(companyName, investorProfile, securityContext);

        // Store in cache
        if (result && result.companyProfile) {
            analysisCache.set(normalizedKey, {
                timestamp: now,
                data: result
            });
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