import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { canonicalStringify } from '../utils/canonicalJson.js';

const DATA_DIR = path.resolve(process.cwd(), 'server', 'data');
const RAW_STORE_FILE = path.join(DATA_DIR, 'raw_event_store.json');

function initRawStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(RAW_STORE_FILE)) {
    fs.writeFileSync(RAW_STORE_FILE, JSON.stringify({ records: {}, version: 1 }, null, 2), 'utf-8');
  }
}

class RawEventStore {
  constructor() {
    initRawStore();
    this.state = this._read();
  }

  _read() {
    try {
      initRawStore();
      const content = fs.readFileSync(RAW_STORE_FILE, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      console.error('[RawEventStore] Read error:', err);
      return { records: {}, version: 1 };
    }
  }

  _write() {
    try {
      initRawStore();
      const tempFile = `${RAW_STORE_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempFile, JSON.stringify(this.state, null, 2), 'utf-8');
      fs.renameSync(tempFile, RAW_STORE_FILE);
    } catch (err) {
      console.error('[RawEventStore] Write error:', err);
    }
  }

  /**
   * Stores a raw source record immutably with SHA-256 content hashing.
   */
  storeRawRecord({
    ticker,
    company = '',
    sourceType,
    sourceId = '',
    sourceUrl = '',
    publishedAt,
    rawPayload = {}
  }) {
    if (!ticker) throw new Error('Ticker is required for raw record storage');

    const contentString = canonicalStringify(rawPayload);
    const contentHash = crypto.createHash('sha256').update(contentString).digest('hex');

    const rawRecordId = `RAW_${ticker.toUpperCase()}_${contentHash.substring(0, 12)}`;

    // Idempotency: Return existing if identical
    if (this.state.records[rawRecordId]) {
      return JSON.parse(JSON.stringify(this.state.records[rawRecordId]));
    }

    const record = {
      rawRecordId,
      ticker: ticker.toUpperCase(),
      company,
      source: sourceType,
      sourceType,
      sourceId,
      sourceUrl,
      retrievedAt: new Date().toISOString(),
      publishedAt: publishedAt || new Date().toISOString(),
      contentHash,
      rawPayload,
      parserVersion: '1.0.0'
    };

    this.state.records[rawRecordId] = record;
    this._write();

    return JSON.parse(JSON.stringify(record));
  }

  getRawRecord(rawRecordId) {
    return this.state.records[rawRecordId] ? JSON.parse(JSON.stringify(this.state.records[rawRecordId])) : null;
  }

  getAllRecords(ticker = null) {
    let list = Object.values(this.state.records);
    if (ticker) {
      list = list.filter(r => r.ticker === ticker.toUpperCase());
    }
    return list.sort((a, b) => new Date(b.retrievedAt).getTime() - new Date(a.retrievedAt).getTime());
  }

  getRawRecordCount() {
    return Object.keys(this.state.records || {}).length;
  }

  clearAll() {
    this.state = { records: {}, version: 1 };
    this._write();
  }
}


export const rawEventStore = new RawEventStore();
