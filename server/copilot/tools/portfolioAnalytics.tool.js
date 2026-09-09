/**
 * @file portfolioAnalytics.tool.js
 * Deterministic tool adapter for Phase 12 Portfolio Intelligence Packages.
 * AI consumes only sealed packages; cannot calculate or alter metrics.
 */

import { portfolioIntelligencePackageBuilder } from '../../portfolioAnalytics/portfolioIntelligencePackage.js';

/**
 * Retrieves sealed portfolio intelligence package for a given portfolio/workspace.
 * @param {string} portfolioId
 * @returns {Object} Sealed PortfolioIntelligencePackage
 */
export async function getPortfolioIntelligencePackage(portfolioId = 'DEFAULT_PORTFOLIO', customData = {}) {
    const pkg = portfolioIntelligencePackageBuilder.buildPackage({
        portfolioId,
        ...customData
    });

    return {
        packageId: pkg.packageId,
        portfolioId: pkg.portfolioId,
        baseCurrency: pkg.baseCurrency,
        timestamp: pkg.timestamp,
        packageHash: pkg.seal.packageHash,
        performance: pkg.performance,
        attribution: pkg.attribution,
        benchmark: pkg.benchmark,
        factorExposures: pkg.factorExposures,
        drawdownIntelligence: pkg.drawdownIntelligence,
        thesisAttribution: pkg.thesisAttribution,
        driftAndRebalancing: pkg.driftAndRebalancing,
        governance: pkg.governance
    };
}
