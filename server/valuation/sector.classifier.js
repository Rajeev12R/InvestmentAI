/**
 * Sector Classifier Engine
 * Maps grounded company metadata (GICS/SIC/Yahoo profile) to Canonical Sector & Valuation Frameworks
 */

import { CANONICAL_SECTORS, SECTOR_FRAMEWORKS } from "./sector.types.js";
import { VALUATION_STATUS } from "./valuation.types.js";

/**
 * Deterministically classifies a company into a canonical sector
 * @param {Object} profile - Company profile with sector and industry
 * @param {string} ticker - Asset symbol
 * @returns {Object} Classified sector metadata and applicable framework
 */
export function classifySector(profile = {}, ticker = "") {
    const rawSector = profile?.sector ? String(profile.sector).trim() : null;
    const rawIndustry = profile?.industry ? String(profile.industry).trim() : null;

    if (!rawSector && !rawIndustry) {
        return {
            status: VALUATION_STATUS.UNAVAILABLE,
            canonicalSector: CANONICAL_SECTORS.UNKNOWN,
            rawSector: null,
            rawIndustry: null,
            framework: SECTOR_FRAMEWORKS[CANONICAL_SECTORS.UNKNOWN],
            confidence: "UNAVAILABLE",
            reason: "Insufficient metadata: company profile does not provide sector or industry.",
            provenance: {
                source: "companyProfile",
                rawSector: null,
                rawIndustry: null,
                timestamp: new Date().toISOString()
            }
        };
    }

    const secLower = (rawSector || "").toLowerCase();
    const indLower = (rawIndustry || "").toLowerCase();

    let canonicalSector = CANONICAL_SECTORS.UNKNOWN;

    // Banking & Financial Services
    if (
        secLower.includes("financial") ||
        secLower.includes("bank") ||
        indLower.includes("bank") ||
        indLower.includes("financial") ||
        indLower.includes("asset management") ||
        indLower.includes("insurance") ||
        indLower.includes("capital markets") ||
        indLower.includes("credit services")
    ) {
        canonicalSector = CANONICAL_SECTORS.FINANCIALS;
    }
    // Automotive & Mobility
    else if (
        indLower.includes("auto") ||
        indLower.includes("automotive") ||
        indLower.includes("motorcycle") ||
        indLower.includes("truck") ||
        indLower.includes("vehicle")
    ) {
        canonicalSector = CANONICAL_SECTORS.AUTOMOTIVE;
    }
    // Technology
    else if (
        secLower.includes("technology") ||
        secLower.includes("tech") ||
        indLower.includes("software") ||
        indLower.includes("hardware") ||
        indLower.includes("semiconductor") ||
        indLower.includes("electronics") ||
        indLower.includes("it services")
    ) {
        canonicalSector = CANONICAL_SECTORS.TECHNOLOGY;
    }
    // Energy & Natural Resources
    else if (
        secLower.includes("energy") ||
        indLower.includes("oil") ||
        indLower.includes("gas") ||
        indLower.includes("petroleum") ||
        indLower.includes("refining") ||
        indLower.includes("solar") ||
        indLower.includes("renewable energy")
    ) {
        canonicalSector = CANONICAL_SECTORS.ENERGY;
    }
    // Industrials
    else if (
        secLower.includes("industrial") ||
        secLower.includes("basic materials") ||
        indLower.includes("aerospace") ||
        indLower.includes("defense") ||
        indLower.includes("conglomerate") ||
        indLower.includes("machinery") ||
        indLower.includes("manufacturing") ||
        indLower.includes("metals") ||
        indLower.includes("mining")
    ) {
        canonicalSector = CANONICAL_SECTORS.INDUSTRIALS;
    }
    // Healthcare
    else if (
        secLower.includes("healthcare") ||
        secLower.includes("health") ||
        indLower.includes("pharmaceutical") ||
        indLower.includes("biotechnology") ||
        indLower.includes("medical")
    ) {
        canonicalSector = CANONICAL_SECTORS.HEALTHCARE;
    }
    // Consumer & Retail
    else if (
        secLower.includes("consumer") ||
        indLower.includes("retail") ||
        indLower.includes("apparel") ||
        indLower.includes("beverage") ||
        indLower.includes("food") ||
        indLower.includes("packaging")
    ) {
        canonicalSector = CANONICAL_SECTORS.CONSUMER;
    }
    // Telecommunications
    else if (
        secLower.includes("telecom") ||
        secLower.includes("communication") ||
        indLower.includes("telecom") ||
        indLower.includes("wireless") ||
        indLower.includes("broadband")
    ) {
        canonicalSector = CANONICAL_SECTORS.TELECOM;
    }
    // Utilities
    else if (
        secLower.includes("utilit") ||
        indLower.includes("electric") ||
        indLower.includes("water") ||
        indLower.includes("gas utility")
    ) {
        canonicalSector = CANONICAL_SECTORS.UTILITIES;
    }
    // Real Estate
    else if (
        secLower.includes("real estate") ||
        indLower.includes("reit") ||
        indLower.includes("real estate")
    ) {
        canonicalSector = CANONICAL_SECTORS.REAL_ESTATE;
    }

    const framework = SECTOR_FRAMEWORKS[canonicalSector] || SECTOR_FRAMEWORKS[CANONICAL_SECTORS.UNKNOWN];

    return {
        status: canonicalSector !== CANONICAL_SECTORS.UNKNOWN ? VALUATION_STATUS.CALCULATED : VALUATION_STATUS.UNAVAILABLE,
        canonicalSector,
        rawSector,
        rawIndustry,
        framework,
        confidence: "GROUNDED",
        provenance: {
            source: "companyProfile",
            rawSector,
            rawIndustry,
            timestamp: new Date().toISOString()
        }
    };
}
