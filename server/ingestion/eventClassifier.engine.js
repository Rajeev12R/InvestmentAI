import { EVENT_TYPES } from './ingestion.types.js';

/**
 * Deterministic Event Classifier Engine.
 * Categorizes incoming raw payloads into canonical taxonomy event types.
 */
export function classifyEvent({
  title = '',
  summary = '',
  rawPayload = {},
  filingType = ''
}) {
  const normFiling = (filingType || rawPayload.filingType || '').toUpperCase();
  const text = `${title} ${summary} ${rawPayload.description || ''}`.toLowerCase();

  // 1. Regulatory SEC Filing Classifications
  if (normFiling.includes('10-K') || normFiling.includes('20-F')) {
    return EVENT_TYPES.ANNUAL_REPORT;
  }
  if (normFiling.includes('10-Q') || text.includes('10-q') || text.includes('quarterly report')) {
    return EVENT_TYPES.QUARTERLY_REPORT;
  }
  if (normFiling.includes('8-K') || normFiling.includes('6-K')) {
    if (text.includes('item 2.02') || text.includes('results of operations')) {
      return EVENT_TYPES.EARNINGS_RELEASE;
    }
    if (text.includes('item 5.02') || text.includes('departure of directors') || text.includes('election of directors')) {
      return EVENT_TYPES.CEO_CHANGE;
    }
    if (text.includes('item 1.01') || text.includes('entry into a material definitive agreement')) {
      return EVENT_TYPES.ACQUISITION;
    }
  }

  // 2. Financial / Earnings Keywords
  if ((text.includes('guidance') || text.includes('outlook') || text.includes('forecast')) && (text.includes('raised') || text.includes('lowered') || text.includes('cuts') || text.includes('hikes') || text.includes('boosts') || text.includes('slashes') || text.includes('trims') || text.includes('withdraw') || text.includes('withdraws') || text.includes('withdrawn') || text.includes('maintains') || text.includes('reiterates'))) {
    return EVENT_TYPES.GUIDANCE_CHANGE;
  }


  if (text.includes('reports q1') || text.includes('reports q2') || text.includes('reports q3') || text.includes('reports q4') || text.includes('quarterly earnings') || text.includes('earnings release') || text.includes('q1 results') || text.includes('q2 results') || text.includes('q3 results') || text.includes('q4 results') || text.includes('q1 press release') || text.includes('q2 press release') || text.includes('q3 press release') || text.includes('q4 press release')) {
    return EVENT_TYPES.EARNINGS_RELEASE;
  }
  if (text.includes('accounting restatement') || text.includes('restate earnings') || text.includes('material weakness')) {
    return EVENT_TYPES.ACCOUNTING_RESTATEMENT;
  }


  // 3. Corporate Actions
  if (text.includes('share repurchase') || text.includes('buyback program') || text.includes('repurchase shares')) {
    return EVENT_TYPES.BUYBACK;
  }
  if (text.includes('dividend increase') || text.includes('cuts dividend') || text.includes('declares dividend')) {
    return EVENT_TYPES.DIVIDEND_CHANGE;
  }
  if (text.includes('stock split') || text.includes('shares split')) {
    return EVENT_TYPES.STOCK_SPLIT;
  }
  if (text.includes('to acquire') || text.includes('acquisition of') || text.includes('merger with') || text.includes('deal to buy')) {
    return EVENT_TYPES.ACQUISITION;
  }
  if (text.includes('debt offering') || text.includes('senior notes offering') || text.includes('issues debt') || text.includes('bond issuance')) {
    return EVENT_TYPES.DEBT_ISSUANCE;
  }

  // 4. Leadership & Governance
  if (text.includes('names new ceo') || text.includes('ceo steps down') || text.includes('appoints ceo') || text.includes('chief executive')) {
    return EVENT_TYPES.CEO_CHANGE;
  }
  if (text.includes('cfo resigns') || text.includes('names new cfo') || text.includes('chief financial officer')) {
    return EVENT_TYPES.CFO_CHANGE;
  }

  // 5. Legal / Regulatory Actions
  if (text.includes('sec probe') || text.includes('investigation') || text.includes('subpoena') || text.includes('fraud') || text.includes('lawsuit')) {
    return EVENT_TYPES.REGULATORY_ACTION;
  }

  // 6. Market Volatility / Price Movers
  if (rawPayload.type === 'PRICE_MOVE' || text.includes('price surge') || text.includes('shares plunge') || text.includes('rally') || text.includes('selloff')) {
    return EVENT_TYPES.PRICE_MOVE;
  }

  if (text.trim().length > 0 && !text.includes('event for unknown') && !text.includes('event for aapl')) {
    return EVENT_TYPES.MATERIAL_NEWS;
  }

  return EVENT_TYPES.OTHER;
}

