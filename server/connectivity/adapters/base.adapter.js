/**
 * @file base.adapter.js
 * Standard Provider Adapter Interface for Phase 10 Institutional Connectivity.
 */

export class BaseProviderAdapter {
  constructor({ sourceId, sourceName, tier, category }) {
    this.sourceId = sourceId;
    this.sourceName = sourceName;
    this.tier = tier;
    this.category = category;
  }

  async getQuote(ticker) {
    return { status: 'UNAVAILABLE', reason: `Quote not supported by ${this.sourceName}` };
  }

  async getHistoricalPrices(ticker, options = {}) {
    return { status: 'UNAVAILABLE', reason: `Historical prices not supported by ${this.sourceName}` };
  }

  async getFundamentals(ticker, options = {}) {
    return { status: 'UNAVAILABLE', reason: `Fundamentals not supported by ${this.sourceName}` };
  }

  async getFilings(ticker, options = {}) {
    return { status: 'UNAVAILABLE', reason: `Filings not supported by ${this.sourceName}` };
  }

  async getCorporateActions(ticker, options = {}) {
    return { status: 'UNAVAILABLE', reason: `Corporate actions not supported by ${this.sourceName}` };
  }

  async getNews(ticker, options = {}) {
    return { status: 'UNAVAILABLE', reason: `News not supported by ${this.sourceName}` };
  }

  async getMacroSeries(seriesId, options = {}) {
    return { status: 'UNAVAILABLE', reason: `Macro series not supported by ${this.sourceName}` };
  }

  async getFXRate(base, quote, timestamp = null) {
    return { status: 'UNAVAILABLE', reason: `FX conversion not supported by ${this.sourceName}` };
  }
}
