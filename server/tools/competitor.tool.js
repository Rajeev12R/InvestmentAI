import yahooFinance from "../services/yahooFinance.service.js";

// Sector & Industry Peer Mapping for Verified Benchmarking
const SECTOR_PEER_MAP = {
    // Automotive
    "TATAMOTORS.NS": [
        { ticker: "MARUTI.NS", name: "Maruti Suzuki India Limited", sector: "Automotive" },
        { ticker: "M&M.NS", name: "Mahindra & Mahindra Limited", sector: "Automotive" },
        { ticker: "ASHOKLEY.NS", name: "Ashok Leyland Limited", sector: "Commercial Vehicles" },
        { ticker: "BAJAJ-AUTO.NS", name: "Bajaj Auto Limited", sector: "Two-Wheelers" }
    ],
    "TSLA": [
        { ticker: "RIVN", name: "Rivian Automotive, Inc.", sector: "EV Automotive" },
        { ticker: "F", name: "Ford Motor Company", sector: "Automotive" },
        { ticker: "GM", name: "General Motors Company", sector: "Automotive" },
        { ticker: "BYDDF", name: "BYD Company Limited", sector: "EV Automotive" }
    ],
    // Big Tech & Cloud
    "MSFT": [
        { ticker: "AAPL", name: "Apple Inc.", sector: "Consumer Electronics & Services" },
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

export async function getCompetitors(companyProfile) {
    try {
        const rawTicker = String(companyProfile.ticker || "").toUpperCase().trim();
        console.log(`[Competitor Engine] Sourcing sector-aware peers for: ${rawTicker || companyProfile.name}`);

        // 1. Direct Curated Sector Mapping
        if (SECTOR_PEER_MAP[rawTicker]) {
            return {
                sector: companyProfile.sector || "Sector Benchmark",
                primaryCompetitors: SECTOR_PEER_MAP[rawTicker]
            };
        }

        // 2. Dynamic Industry/Sector Search via Yahoo Finance
        const searchQuery = companyProfile.industry || companyProfile.sector || companyProfile.name;
        const searchResult = await yahooFinance.search(searchQuery);

        let primaryCompetitors = [];
        if (searchResult && searchResult.quotes && searchResult.quotes.length) {
            primaryCompetitors = searchResult.quotes
                .filter(quote =>
                    quote.symbol !== rawTicker &&
                    (quote.quoteType === "EQUITY") &&
                    (quote.shortname || quote.longname)
                )
                .slice(0, 4)
                .map(quote => ({
                    name: quote.shortname || quote.longname || quote.symbol,
                    ticker: quote.symbol,
                    sector: quote.sector || companyProfile.sector || "Industry Peer"
                }));
        }

        return {
            sector: companyProfile.sector || "Equities",
            primaryCompetitors: primaryCompetitors.length > 0 ? primaryCompetitors : [
                { ticker: "SPY", name: "S&P 500 Benchmark ETF", sector: "Index" },
                { ticker: "^NSEI", name: "NIFTY 50 Benchmark Index", sector: "Index" }
            ]
        };

    } catch (error) {
        console.warn("Competitor Extraction Error (Graceful Fallback):", error.message);
        return {
            sector: companyProfile.sector || "Equities",
            primaryCompetitors: []
        };
    }
}