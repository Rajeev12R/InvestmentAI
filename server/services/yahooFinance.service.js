import YahooFinance from "yahoo-finance2";

// Used a browser-like User-Agent to avoid Yahoo rate-limiting/429 blocks in datacenter environments (like Render).
const browserUserAgent = process.env.YAHOO_USER_AGENT || 
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const yahooFinance = new YahooFinance({
  fetchOptions: {
    headers: {
      "User-Agent": browserUserAgent
    }
  }
});

export default yahooFinance;
