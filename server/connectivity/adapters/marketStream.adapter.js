/**
 * @file marketStream.adapter.js
 * Streaming Market Data Interface for Phase 10.
 * Explicitly reports STREAMING_UNAVAILABLE when streaming socket is not connected.
 */

export class MarketStreamAdapter {
  constructor() {
    this.isStreamConnected = false;
    this.streamProvider = 'NONE';
  }

  subscribe(ticker, callback) {
    if (!this.isStreamConnected) {
      return {
        status: 'STREAMING_UNAVAILABLE',
        mode: 'POLLING_ACTIVE',
        ticker: Array.isArray(ticker) ? ticker.map(t => t.toUpperCase()) : ticker?.toUpperCase(),
        provider: this.streamProvider,
        message: 'Real-time WebSocket market data stream is not connected. Active mode is HTTP polling.'
      };
    }
    return { status: 'SUBSCRIBED', ticker: ticker.toUpperCase() };
  }

  unsubscribe(ticker) {
    return { status: 'UNSUBSCRIBED', ticker: ticker?.toUpperCase() };
  }

  getStreamStatus() {
    return {
      isStreamConnected: this.isStreamConnected,
      streamProvider: this.streamProvider,
      activeMode: 'HTTP_POLLING',
      supportedStreamEvents: ['QUOTE', 'TRADE', 'BAR', 'HALT', 'AUCTION']
    };
  }
}

export const marketStreamAdapter = new MarketStreamAdapter();
