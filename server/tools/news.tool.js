const GNEWS_BASE_URL = "https://gnews.io/api/v4/search";

function classifyNewsEvent(title = "", description = "") {
    const text = `${title} ${description}`.toLowerCase();

    // Event Classification
    let category = "Corporate Operations";
    if (text.includes("q1") || text.includes("q2") || text.includes("q3") || text.includes("q4") || text.includes("profit") || text.includes("revenue") || text.includes("earnings") || text.includes("results")) {
        category = "Earnings & Financials";
    } else if (text.includes("probe") || text.includes("lawsuit") || text.includes("regulat") || text.includes("fine") || text.includes("court") || text.includes("sec ") || text.includes("antitrust")) {
        category = "Regulatory & Governance";
    } else if (text.includes("launch") || text.includes("unveil") || text.includes("contract") || text.includes("deal") || text.includes("expand") || text.includes("acquisition") || text.includes("partnership")) {
        category = "Growth & Expansion";
    } else if (text.includes("ceo") || text.includes("cfo") || text.includes("board") || text.includes("resigns") || text.includes("appoint")) {
        category = "Leadership & Management";
    }

    // Severity & Sentiment Scoring (-1.0 to +1.0)
    const positiveTerms = ["surge", "record", "growth", "jump", "beat", "upgrade", "outperform", "profit", "win", "expansion", "bullish", "dividend hike"];
    const negativeTerms = ["slump", "loss", "plunge", "miss", "downgrade", "probe", "investigation", "fall", "debt crisis", "lawsuit", "layoffs", "bearish"];

    let posScore = 0;
    let negScore = 0;

    positiveTerms.forEach(term => {
        if (text.includes(term)) posScore += 0.35;
    });

    negativeTerms.forEach(term => {
        if (text.includes(term)) negScore += 0.45;
    });

    let severity = 0.0;
    let sentiment = "NEUTRAL";

    if (negScore > posScore && negScore >= 0.35) {
        sentiment = "NEGATIVE";
        severity = -Math.min(1.0, negScore);
    } else if (posScore > negScore && posScore >= 0.35) {
        sentiment = "POSITIVE";
        severity = Math.min(1.0, posScore);
    }

    return { category, severity: Number(severity.toFixed(2)), sentiment };
}

export async function getCompanyNews(companyName) {
    try {
        if (!companyName) return [];

        let articles = [];

        // Primary: GNews API if key exists
        if (process.env.GNEWS_API_KEY && process.env.GNEWS_API_KEY !== "your_gnews_api_key_here") {
            try {
                const response = await fetch(
                    `${GNEWS_BASE_URL}?q=${encodeURIComponent(companyName)}&lang=en&max=10&apikey=${process.env.GNEWS_API_KEY}`
                );

                if (response.ok) {
                    const data = await response.json();
                    if (data && data.articles) {
                        articles = data.articles.map(a => ({
                            title: a.title,
                            description: a.description,
                            source: a.source?.name || "Financial Wire",
                            publishedAt: a.publishedAt,
                            url: a.url,
                            image: a.image
                        }));
                    }
                }
            } catch (err) {
                console.warn("[News Tool] GNews fetch failed, using fallback:", err.message);
            }
        }

        // Deduplicate & Enrich with Classification
        const seenTitles = new Set();
        const enriched = [];

        for (const item of articles) {
            const cleanTitle = (item.title || "").trim();
            if (!cleanTitle || seenTitles.has(cleanTitle.toLowerCase())) continue;
            seenTitles.add(cleanTitle.toLowerCase());

            const { category, severity, sentiment } = classifyNewsEvent(item.title, item.description);
            enriched.push({
                ...item,
                category,
                severity,
                sentiment
            });
        }

        return enriched;

    } catch (error) {
        console.warn("News Tool Warning (Graceful Fallback):", error.message);
        return [];
    }
}