/**
 * @file copilot.intentClassifier.js
 * Intent classification engine mapping investor queries into the canonical CopilotIntent taxonomy.
 * Uses deterministic pattern matching and entity extraction.
 */

import { CopilotIntent } from './copilot.types.js';

const INTENT_PATTERNS = [
  { intent: CopilotIntent.PORTFOLIO_QUERY, patterns: [/\bportfolio\b/i, /\bconcentration\b/i, /\bhhi\b/i, /\bexposure\b/i, /\bholdings\b/i, /\bcorrelated?\b/i, /\bbets\b/i] },
  { intent: CopilotIntent.COMPANY_COMPARISON, patterns: [/\bcompare\b/i, /\bvs\.?\b/i, /\bversus\b/i, /\bbetween\s+([A-Z0-9.]+)\s+and\s+([A-Z0-9.]+)/i] },
  { intent: CopilotIntent.THESIS_BREAKER_QUERY, patterns: [/\bbreaker\b/i, /\bcondition\b/i, /\binvalidate\b/i, /\bthesis\s+break/i] },
  { intent: CopilotIntent.CATALYST_QUERY, patterns: [/\bcatalyst\b/i, /\bupcoming\s+event\b/i, /\bdriver\b/i] },
  { intent: CopilotIntent.THESIS_EXPLANATION, patterns: [/\bthesis\b/i, /\bbull\s+case\b/i, /\bbear\s+case\b/i, /\bpremise\b/i] },
  { intent: CopilotIntent.VALUATION_EXPLANATION, patterns: [/\bvaluation\b/i, /\bdcf\b/i, /\bfair\s+value\b/i, /\bdiscounted\s+cash\b/i, /\bmargin\s+of\s+safety\b/i, /\bmultiples?\b/i, /\bpe\s+ratio\b/i] },
  { intent: CopilotIntent.RISK_EXPLANATION, patterns: [/\brisk\b/i, /\bdanger\b/i, /\bthreat\b/i, /\bvulnerability\b/i, /\bdownside\b/i] },
  { intent: CopilotIntent.DECISION_EXPLANATION, patterns: [/\bwhy\s+is\b.*\b(buy|hold|watch|avoid)\b/i, /\bdecision\b/i, /\bconviction\b/i, /\brecommendation\b/i, /\brationale\b/i] },
  { intent: CopilotIntent.ATTENTION_QUERY, patterns: [/\battention\b/i, /\bpriority\b/i, /\bmatters?\s+most\b/i, /\burgent\b/i, /\bcritical\b/i] },
  { intent: CopilotIntent.CHANGE_QUERY, patterns: [/\bwhat\s+changed\b/i, /\bdelta\b/i, /\bdrift\b/i, /\bsince\s+last\b/i, /\bshift\b/i] },
  { intent: CopilotIntent.HISTORICAL_CHANGE_QUERY, patterns: [/\btimeline\b/i, /\bhistory\b/i, /\bover\s+time\b/i, /\bpast\s+snapshots?\b/i] },
  { intent: CopilotIntent.NEWS_QUERY, patterns: [/\bnews\b/i, /\bevent\b/i, /\bearnings\s+call\b/i, /\bpress\s+release\b/i, /\bsec\s+filing\b/i, /\b10-?k\b/i, /\b10-?q\b/i] },
  { intent: CopilotIntent.EVIDENCE_QUERY, patterns: [/\bevidence\b/i, /\bproof\b/i, /\bsource\b/i, /\bcitation\b/i, /\bgrounding\b/i] },
  { intent: CopilotIntent.RESEARCH_REQUEST, patterns: [/\binvestigate\b/i, /\bresearch\b/i, /\bdeep\s+dive\b/i, /\bexplore\b/i] },
  { intent: CopilotIntent.DECISION_REVIEW, patterns: [/\breview\s+queue\b/i, /\bconsider\s+exit\b/i, /\breview\s+action\b/i, /\bdismiss\b/i, /\bresolve\b/i] },
  { intent: CopilotIntent.WORKFLOW_STATUS, patterns: [/\bworkflow\b/i, /\bstatus\b/i, /\bfollow-?up\b/i, /\btask\b/i] },
  { intent: CopilotIntent.FACT_LOOKUP, patterns: [/\brevenue\b/i, /\beps\b/i, /\bdebt\b/i, /\bcash\b/i, /\bmargin\b/i, /\bshares?\b/i, /\bprice\b/i, /\bbeta\b/i] }
];

/**
 * Extracts potential ticker symbols from a message string.
 * @param {string} message
 * @returns {string[]} Array of extracted uppercase tickers
 */
export function extractTickers(message) {
  if (!message || typeof message !== 'string') return [];
  // Match $TICKER or standalone word tokens
  const cleanMsg = message.replace(/\$([A-Za-z0-9.]+)/g, ' $1 ');
  const matches = cleanMsg.match(/\b[A-Za-z0-9]{1,10}(\.[A-Za-z]{1,5})?\b/g) || [];
  
  const commonWords = new Set([
    'WHAT', 'WHY', 'HOW', 'WHEN', 'WHO', 'WHICH', 'WHERE', 'THE', 'IS', 'ARE', 'AND', 'OR', 'NOT', 
    'CAN', 'COULD', 'WOULD', 'SHOULD', 'BUY', 'SELL', 'HOLD', 'WATCH', 'AVOID', 'LOW', 'HIGH', 
    'DCF', 'PE', 'EPS', 'HHI', 'TOP', 'ALL', 'NEW', 'NOW', 'ANY', 'FOR', 'WITH', 'ABOUT', 'OUR',
    'DOING', 'CHECK', 'ANALYZE', 'EARNINGS', 'STATUS', 'HEALTH', 'VALUATION', 'RISK', 'PRICE',
    'UPDATE', 'SUMMARY', 'DEEP', 'DIVE', 'FAIR', 'VALUE', 'MARGIN', 'DEBT', 'CASH', 'REVENUE',
    'SHOW', 'TELL', 'FIND', 'GET', 'VIEW', 'LIST', 'LOOK', 'EXPLAIN', 'RECENT', 'NEWS',
    'OF', 'IN', 'ON', 'AT', 'TO', 'BY', 'FROM', 'UP', 'DOWN', 'OVER', 'UNDER', 'AGAIN',
    'AS', 'AN', 'A', 'MY', 'YOUR', 'ITS', 'THEIR', 'OURS', 'HIS', 'HER', 'SOME', 'MANY',
    'MORE', 'MOST', 'LESS', 'DO', 'DOES', 'DID', 'HAS', 'HAVE', 'HAD', 'BE', 'BEEN', 'BEING',
    'SO', 'IF', 'THEN', 'ELSE', 'BUT', 'NOR', 'YET', 'VERY', 'MUCH', 'JUST', 'ONLY', 'ALSO',
    'EVEN', 'STILL', 'ALREADY', 'THIS', 'THAT', 'THESE', 'THOSE', 'ME', 'US', 'THEM', 'HIM',
    'COMPARE', 'COMPARISON', 'VERSUS', 'BETWEEN', 'DIFFERENCE', 'VS'
  ]);
  
  return Array.from(new Set(
    matches
      .map(m => m.toUpperCase())
      .filter(m => !commonWords.has(m) && !/^\d+$/.test(m) && m.length >= 2)
  ));
}

/**
 * Classifies the investor's message intent.
 * @param {string} message
 * @returns {{ intent: string, confidence: number, tickers: string[] }}
 */
export function classifyIntent(message) {
  if (!message || typeof message !== 'string') {
    return { intent: CopilotIntent.UNKNOWN, confidence: 0.0, tickers: [] };
  }

  const tickers = extractTickers(message);

  for (const item of INTENT_PATTERNS) {
    for (const pattern of item.patterns) {
      if (pattern.test(message)) {
        return {
          intent: item.intent,
          confidence: 0.95,
          tickers
        };
      }
    }
  }

  // Default fallback if ticker detected
  if (tickers.length > 0) {
    return {
      intent: CopilotIntent.DECISION_EXPLANATION,
      confidence: 0.70,
      tickers
    };
  }

  return {
    intent: CopilotIntent.UNKNOWN,
    confidence: 0.50,
    tickers: []
  };
}
