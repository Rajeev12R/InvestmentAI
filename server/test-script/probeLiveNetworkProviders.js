/**
 * @file probeLiveNetworkProviders.js
 * Probes live network connectivity to external providers to gather empirical evidence.
 */

import crypto from 'crypto';

async function probeUrl(name, url, headers = {}) {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'InvestmentAI-Forensic-Auditor/1.0 (compliance@investmentai.local)',
        ...headers
      },
      signal: controller.signal
    });
    clearTimeout(timeout);
    const durationMs = Date.now() - start;
    const text = await res.text();
    const hash = crypto.createHash('sha256').update(text).digest('hex');
    return {
      provider: name,
      url,
      success: res.ok,
      status: res.status,
      statusText: res.statusText,
      durationMs,
      responseSize: text.length,
      responseHash: hash,
      snippet: text.slice(0, 150).replace(/\s+/g, ' ')
    };
  } catch (err) {
    return {
      provider: name,
      url,
      success: false,
      status: 'NETWORK_ERROR',
      error: err.name === 'AbortError' ? 'TIMEOUT (8s)' : err.message,
      durationMs: Date.now() - start
    };
  }
}

async function runProbes() {
  console.log('================================================================');
  console.log('INVESTMENTAI — EXTERNAL PROVIDER LIVE NETWORK AUDIT');
  console.log('================================================================\n');

  const probes = [
    {
      name: 'SEC EDGAR (Submissions)',
      url: 'https://data.sec.gov/submissions/CIK0000320193.json',
      headers: { 'User-Agent': 'InvestmentAI-Auditor/1.0 (admin@investmentai.local)' }
    },
    {
      name: 'Yahoo Finance (Chart API)',
      url: 'https://query1.finance.yahoo.com/v8/finance/chart/AAPL',
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }
    },
    {
      name: 'NSE India (Direct Equity Quote)',
      url: 'https://www.nseindia.com/api/quote-equity?symbol=RELIANCE',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        'Accept': 'application/json'
      }
    },
    {
      name: 'ECB FX (Daily Reference Rates XML)',
      url: 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml',
      headers: {}
    },
    {
      name: 'FRED St. Louis Fed (10Y Yield CSV)',
      url: 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS10',
      headers: {}
    },
    {
      name: 'Google News RSS (AAPL Feed)',
      url: 'https://news.google.com/rss/search?q=AAPL&hl=en-US&gl=US&ceid=US:en',
      headers: {}
    }
  ];

  for (const p of probes) {
    console.log(`▶ Probing ${p.name}...`);
    const result = await probeUrl(p.name, p.url, p.headers);
    console.log(JSON.stringify(result, null, 2));
    console.log('----------------------------------------------------------------');
  }
}

runProbes().catch(console.error);
