import yahooFinance, { scrapeQuotePage } from "../services/yahooFinance.service.js";

// Curated Sector Peer Mapping for Verified Benchmarking
const SECTOR_PEER_MAP = {
    // Automotive
    "TATAMOTORS.NS": [
        { ticker: "MARUTI.NS", name: "Maruti Suzuki India Limited", sector: "Automotive" },
        { ticker: "M&M.NS", name: "Mahindra & Mahindra Limited", sector: "Automotive" },
        { ticker: "ASHOKLEY.NS", name: "Ashok Leyland Limited", sector: "Commercial Vehicles" },
        { ticker: "BAJAJ-AUTO.NS", name: "Bajaj Auto Limited", sector: "Two-Wheelers" }
    ],
    "TMPV.NS": [
        { ticker: "MARUTI.NS", name: "Maruti Suzuki India Limited", sector: "Automotive" },
        { ticker: "M&M.NS", name: "Mahindra & Mahindra Limited", sector: "Automotive" },
        { ticker: "ASHOKLEY.NS", name: "Ashok Leyland Limited", sector: "Commercial Vehicles" },
        { ticker: "BAJAJ-AUTO.NS", name: "Bajaj Auto Limited", sector: "Two-Wheelers" }
    ],
    "TMCV.NS": [
        { ticker: "ASHOKLEY.NS", name: "Ashok Leyland Limited", sector: "Commercial Vehicles" },
        { ticker: "EICHERMOT.NS", name: "Eicher Motors Limited", sector: "Commercial Vehicles" },
        { ticker: "M&M.NS", name: "Mahindra & Mahindra Limited", sector: "Commercial Vehicles" }
    ],
    "TSLA": [
        { ticker: "RIVN", name: "Rivian Automotive, Inc.", sector: "EV Automotive" },
        { ticker: "F", name: "Ford Motor Company", sector: "Automotive" },
        { ticker: "GM", name: "General Motors Company", sector: "Automotive" },
        { ticker: "BYDDF", name: "BYD Company Limited", sector: "EV Automotive" }
    ],
    // Big Tech & Cloud
    "MSFT": [
        { ticker: "AAPL", name: "Apple Inc.", sector: "Consumer Electronics & Cloud" },
        { ticker: "GOOGL", name: "Alphabet Inc.", sector: "Search & Cloud" },
        { ticker: "AMZN", name: "Amazon.com, Inc.", sector: "E-Commerce & Cloud" },
        { ticker: "ORCL", name: "Oracle Corporation", sector: "Enterprise Cloud" }
    ],
    "AAPL": [
        { ticker: "MSFT", name: "Microsoft Corporation", sector: "Operating Systems & Cloud" },
        { ticker: "GOOGL", name: "Alphabet Inc.", sector: "Mobile OS & Services" },
        { ticker: "SSNLF", name: "Samsung Electronics Co., Ltd.", sector: "Consumer Tech" },
        { ticker: "META", name: "Meta Platforms, Inc.", sector: "Digital Media" }
    ],
    // Indian Conglomerates & Energy
    "RELIANCE.NS": [
        { ticker: "TCS.NS", name: "Tata Consultancy Services Limited", sector: "IT Services" },
        { ticker: "ONGC.NS", name: "Oil and Natural Gas Corporation", sector: "Oil & Gas" },
        { ticker: "BHARTIARTL.NS", name: "Bharti Airtel Limited", sector: "Telecom" },
        { ticker: "IOC.NS", name: "Indian Oil Corporation", sector: "Refining" }
    ],
    // Indian IT Services
    "TCS.NS": [
        { ticker: "INFY.NS", name: "Infosys Limited", sector: "IT Services" },
        { ticker: "WIPRO.NS", name: "Wipro Limited", sector: "IT Services" },
        { ticker: "HCLTECH.NS", name: "HCL Technologies Limited", sector: "IT Services" },
        { ticker: "TECHM.NS", name: "Tech Mahindra Limited", sector: "IT Services" }
    ],
    // Banking
    "JPM": [
        { ticker: "BAC", name: "Bank of America Corporation", sector: "Commercial Banking" },
        { ticker: "WFC", name: "Wells Fargo & Company", sector: "Retail Banking" },
        { ticker: "C", name: "Citigroup Inc.", sector: "Diversified Banking" },
        { ticker: "GS", name: "The Goldman Sachs Group, Inc.", sector: "Investment Banking" }
    ],
    "HDFCBANK.NS": [
        { ticker: "ICICIBANK.NS", name: "ICICI Bank Limited", sector: "Private Banking" },
        { ticker: "SBIN.NS", name: "State Bank of India", sector: "Public Sector Banking" },
        { ticker: "KOTAKBANK.NS", name: "Kotak Mahindra Bank Limited", sector: "Private Banking" },
        { ticker: "AXISBANK.NS", name: "Axis Bank Limited", sector: "Private Banking" }
    ]
};

/**
 * Enriches a raw peer record with grounded valuation multiples from Yahoo Finance
 * @param {Object} peer - Raw peer candidate
 * @returns {Promise<Object>} Enriched peer record
 */
async function enrichPeerData(peer) {
    try {
        const rawData = await scrapeQuotePage(peer.ticker);
        const quote = rawData?.quote || {};
        const summary = rawData?.quoteSummary || {};
        const defaultKey = summary.defaultKeyStatistics || {};
        const finData = summary.financialData || {};
        const sumDetail = summary.summaryDetail || {};

        const pe = quote.trailingPE ?? sumDetail.trailingPE ?? defaultKey.trailingPE ?? null;
        const evEbitda = defaultKey.enterpriseToEbitda ?? finData.enterpriseToEbitda ?? null;
        const pb = quote.priceToBook ?? defaultKey.priceToBook ?? null;
        const evRevenue = defaultKey.enterpriseToRevenue ?? finData.enterpriseToRevenue ?? null;
        const marketCap = quote.marketCap ?? sumDetail.marketCap ?? null;
        const revenueGrowth = finData.revenueGrowth ?? null;
        const ebitdaMargin = finData.ebitdaMargins ?? null;
        const roe = finData.returnOnEquity ?? defaultKey.returnOnEquity ?? null;

        return {
            ...peer,
            marketCap: typeof marketCap === "number" ? marketCap : null,
            pe: typeof pe === "number" && pe > 0 ? Number(pe.toFixed(2)) : null,
            evEbitda: typeof evEbitda === "number" && evEbitda > 0 ? Number(evEbitda.toFixed(2)) : null,
            pb: typeof pb === "number" && pb > 0 ? Number(pb.toFixed(2)) : null,
            evRevenue: typeof evRevenue === "number" && evRevenue > 0 ? Number(evRevenue.toFixed(2)) : null,
            revenueGrowth: typeof revenueGrowth === "number" ? Number(revenueGrowth.toFixed(4)) : null,
            ebitdaMargin: typeof ebitdaMargin === "number" ? Number(ebitdaMargin.toFixed(4)) : null,
            roe: typeof roe === "number" ? Number(roe.toFixed(4)) : null,
            provenance: {
                source: "yahooFinance.quoteSummary",
                timestamp: new Date().toISOString()
            }
        };
    } catch (err) {
        return {
            ...peer,
            pe: null,
            evEbitda: null,
            pb: null,
            provenance: {
                source: "yahooFinance (failed)",
                timestamp: new Date().toISOString()
            }
        };
    }
}

export async function getCompetitors(companyProfile = {}) {
    try {
        const rawTicker = String(companyProfile.ticker || "").toUpperCase().trim();
        let candidatePeers = [];

        // 1. Direct Curated Sector Mapping
        if (SECTOR_PEER_MAP[rawTicker]) {
            candidatePeers = SECTOR_PEER_MAP[rawTicker];
        } else {
            // 2. Dynamic Industry/Sector Search via Yahoo Finance
            const searchQuery = companyProfile.industry || companyProfile.sector || companyProfile.name;
            if (searchQuery) {
                const searchResult = await yahooFinance.search(searchQuery);
                if (searchResult && searchResult.quotes && searchResult.quotes.length) {
                    candidatePeers = searchResult.quotes
                        .filter(quote =>
                            quote.symbol !== rawTicker &&
                            quote.quoteType === "EQUITY" &&
                            (quote.shortname || quote.longname) &&
                            !quote.symbol.startsWith("^")
                        )
                        .slice(0, 4)
                        .map(quote => ({
                            name: quote.shortname || quote.longname || quote.symbol,
                            ticker: quote.symbol,
                            sector: quote.sector || companyProfile.sector || "Industry Peer"
                        }));
                }
            }
        }

        // Enrich all peers with grounded fundamentals in parallel
        const enrichedCompetitors = await Promise.all(
            candidatePeers.map(peer => enrichPeerData(peer))
        );

        return {
            sector: companyProfile.sector || "Industry Peers",
            primaryCompetitors: enrichedCompetitors
        };

    } catch (error) {
        console.warn("Competitor Extraction Error (Graceful Fallback):", error.message);
        return {
            sector: companyProfile.sector || "Industry Peers",
            primaryCompetitors: []
        };
    }
}