import yahooFinance from "../services/yahooFinance.service.js";

const TICKER_SYMBOLS = [
  { symbol: '^GSPC', label: 'S&P 500', isIndex: true },
  { symbol: '^IXIC', label: 'NASDAQ', isIndex: true },
  { symbol: '^DJI', label: 'DOW JONES', isIndex: true },
  { symbol: '^NSEI', label: 'NIFTY 50', isIndex: true },
  { symbol: '^BSESN', label: 'SENSEX', isIndex: true },
  { symbol: '^FTSE', label: 'FTSE 100', isIndex: true },
  { symbol: '^N225', label: 'NIKKEI 225', isIndex: true },
  { symbol: '^GDAXI', label: 'DAX 40', isIndex: true },
  { symbol: 'GC=F', label: 'GOLD (OZ)', isCommodity: true },
  { symbol: 'CL=F', label: 'CRUDE OIL', isCommodity: true },
  { symbol: 'BTC-USD', label: 'BITCOIN', isCrypto: true },
  { symbol: 'ETH-USD', label: 'ETHEREUM', isCrypto: true },
  { symbol: 'NVDA', label: 'NVDA', ticker: 'NVDA' },
  { symbol: 'AAPL', label: 'AAPL', ticker: 'AAPL' },
  { symbol: 'MSFT', label: 'MSFT', ticker: 'MSFT' },
  { symbol: 'TSLA', label: 'TSLA', ticker: 'TSLA' },
  { symbol: 'AMZN', label: 'AMZN', ticker: 'AMZN' },
  { symbol: 'GOOGL', label: 'GOOGL', ticker: 'GOOGL' },
  { symbol: 'RELIANCE.NS', label: 'RELIANCE', ticker: 'RELIANCE.NS' },
  { symbol: 'TCS.NS', label: 'TCS', ticker: 'TCS.NS' }
];

let tickerCache = null;
let lastCacheTime = 0;
const CACHE_DURATION = 60 * 1000; // 60 seconds

export const getMarketTickers = async (req, res) => {
  try {
    const now = Date.now();
    if (tickerCache && now - lastCacheTime < CACHE_DURATION) {
      return res.status(200).json({ success: true, data: tickerCache, cached: true });
    }

    const symbols = TICKER_SYMBOLS.map(t => t.symbol);
    
    let quotes = [];
    try {
      quotes = await Promise.all(
        symbols.map(async (sym) => {
          try {
            const q = await yahooFinance.quote(sym);
            return q;
          } catch (e) {
            return null;
          }
        })
      );
    } catch (e) {
      console.warn("Error fetching batch quotes:", e.message);
    }

    const results = TICKER_SYMBOLS.map((item, index) => {
      const q = quotes[index];
      const price = q?.regularMarketPrice ?? q?.postMarketPrice ?? null;
      const changePercent = q?.regularMarketChangePercent ?? 0;
      const change = q?.regularMarketChange ?? 0;
      const currency = q?.currency || 'USD';
      const isUp = change >= 0;

      let formattedPrice = 'N/A';
      if (price !== null) {
        if (currency === 'INR') {
          formattedPrice = `₹${price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
        } else if (currency === 'USD') {
          formattedPrice = `$${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
        } else {
          formattedPrice = `${price.toFixed(2)}`;
        }
      }

      return {
        symbol: item.label,
        rawSymbol: item.symbol,
        price: formattedPrice,
        rawPrice: price,
        change: `${isUp ? '+' : ''}${changePercent.toFixed(2)}%`,
        up: isUp,
        ticker: item.ticker || null,
        isIndex: !!item.isIndex,
        isCommodity: !!item.isCommodity,
        isCrypto: !!item.isCrypto
      };
    }).filter(item => item.rawPrice !== null);

    if (results.length > 0) {
      tickerCache = results;
      lastCacheTime = now;
    }

    return res.status(200).json({ success: true, data: results.length > 0 ? results : tickerCache || [] });
  } catch (err) {
    console.error("Market Ticker Controller Error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch live market tickers", error: err.message });
  }
};
