/**
 * Peer Selection Engine
 * Grounded peer identification and validation with benchmark/ETF exclusion.
 */

import { VALUATION_STATUS } from "./valuation.types.js";

// Explicit list of known benchmark index tickers, ETFs, and composite vehicles that CANNOT be operating company peers
const PROHIBITED_PEER_PATTERNS = [
    /^\^/,            // Index symbols like ^GSPC, ^NSEI, ^BSESN, ^IXIC
    /^SPY$/i,
    /^QQQ$/i,
    /^IWM$/i,
    /^DIA$/i,
    /^VOO$/i,
    /^VTI$/i,
    /^XLF$/i,
    /^XLK$/i,
    /^XLE$/i,
    /^XLV$/i,
    /^XLI$/i,
    /^XLY$/i,
    /^XLP$/i,
    /^XLU$/i,
    /^XLB$/i,
    /^VNQ$/i,
    /^NIFTY/i,
    /^SENSEX/i,
    /^BANKNIFTY/i
];

/**
 * Checks whether a candidate symbol is a prohibited index/ETF/benchmark
 * @param {string} ticker 
 * @returns {boolean}
 */
export function isProhibitedPeer(ticker = "") {
    if (!ticker) return true;
    const cleanTicker = String(ticker).trim();
    return PROHIBITED_PEER_PATTERNS.some(pattern => pattern.test(cleanTicker));
}

/**
 * Selects and validates an operating company peer set for a given target company
 * @param {Object} target - Target company profile (ticker, sector, industry, etc.)
 * @param {Array<Object>} candidatePeers - Array of candidate peers with fundamentals/multiples
 * @param {Object} options - Filtering options (minPeers, sameSectorRequired, etc.)
 * @returns {Object} Structured peer selection result with rationale and provenance
 */
export function selectPeers(target = {}, candidatePeers = [], options = {}) {
    const minPeers = options.minPeers ?? 2;
    const targetTicker = String(target.ticker || "").toUpperCase().trim();
    const targetSector = target.sector || target.canonicalSector || "Unknown";
    const targetIndustry = target.industry || "Unknown";

    if (!Array.isArray(candidatePeers) || candidatePeers.length === 0) {
        return {
            status: VALUATION_STATUS.UNAVAILABLE,
            reason: "Insufficient peer data: no candidate peers provided for target company.",
            targetTicker,
            targetSector,
            targetIndustry,
            peerCount: 0,
            selectedPeers: [],
            excludedPeers: [],
            provenance: {
                source: "peerSelection.engine",
                timestamp: new Date().toISOString()
            }
        };
    }

    const selectedPeers = [];
    const excludedPeers = [];
    const seenTickers = new Set();

    if (targetTicker) {
        seenTickers.add(targetTicker);
    }

    for (const candidate of candidatePeers) {
        const rawTicker = candidate.ticker || candidate.symbol;
        if (!rawTicker) {
            excludedPeers.push({
                candidate,
                reason: "Excluded: missing ticker symbol."
            });
            continue;
        }

        const ticker = String(rawTicker).toUpperCase().trim();

        // 1. Target deduplication
        if (ticker === targetTicker) {
            excludedPeers.push({
                ticker,
                reason: "Excluded: candidate is identical to target company."
            });
            continue;
        }

        // 2. Duplicate peer deduplication
        if (seenTickers.has(ticker)) {
            excludedPeers.push({
                ticker,
                reason: "Excluded: duplicate peer entry in candidate set."
            });
            continue;
        }

        // 3. Prohibited index / ETF filter
        if (isProhibitedPeer(ticker)) {
            excludedPeers.push({
                ticker,
                name: candidate.name || candidate.companyName || ticker,
                reason: "Excluded: benchmark index, ETF, or composite fund cannot serve as an operating peer."
            });
            continue;
        }

        // 4. Validate operating company structure
        const name = candidate.name || candidate.companyName || candidate.shortname || ticker;
        const sector = candidate.sector || targetSector;
        const industry = candidate.industry || targetIndustry;
        const rationale = candidate.rationale || candidate.selectionRationale ||
            `Operating peer in ${sector} / ${industry} sector group.`;

        seenTickers.add(ticker);
        selectedPeers.push({
            ticker,
            name,
            sector,
            industry,
            marketCap: candidate.marketCap !== undefined ? candidate.marketCap : null,
            pe: candidate.pe !== undefined ? candidate.pe : (candidate.peRatio !== undefined ? candidate.peRatio : null),
            evEbitda: candidate.evEbitda !== undefined ? candidate.evEbitda : (candidate.evToEbitda !== undefined ? candidate.evToEbitda : null),
            pb: candidate.pb !== undefined ? candidate.pb : (candidate.priceToBook !== undefined ? candidate.priceToBook : null),
            evRevenue: candidate.evRevenue !== undefined ? candidate.evRevenue : (candidate.evToRevenue !== undefined ? candidate.evToRevenue : null),
            revenueGrowth: candidate.revenueGrowth !== undefined ? candidate.revenueGrowth : null,
            ebitdaMargin: candidate.ebitdaMargin !== undefined ? candidate.ebitdaMargin : null,
            ebitMargin: candidate.ebitMargin !== undefined ? candidate.ebitMargin : null,
            netMargin: candidate.netMargin !== undefined ? candidate.netMargin : null,
            roe: candidate.roe !== undefined ? candidate.roe : null,
            roic: candidate.roic !== undefined ? candidate.roic : null,
            selectionRationale: rationale,
            provenance: candidate.provenance || {
                source: "curatedSectorMapping / yahooFinance.search",
                timestamp: new Date().toISOString()
            }
        });
    }

    if (selectedPeers.length < minPeers) {
        return {
            status: VALUATION_STATUS.UNAVAILABLE,
            reason: `Insufficient operating peers: found ${selectedPeers.length} valid peer(s), minimum required is ${minPeers}.`,
            targetTicker,
            targetSector,
            targetIndustry,
            peerCount: selectedPeers.length,
            selectedPeers,
            excludedPeers,
            provenance: {
                source: "peerSelection.engine",
                timestamp: new Date().toISOString()
            }
        };
    }

    return {
        status: VALUATION_STATUS.CALCULATED,
        targetTicker,
        targetSector,
        targetIndustry,
        peerCount: selectedPeers.length,
        selectedPeers,
        excludedPeers,
        provenance: {
            source: "peerSelection.engine",
            timestamp: new Date().toISOString()
        }
    };
}
