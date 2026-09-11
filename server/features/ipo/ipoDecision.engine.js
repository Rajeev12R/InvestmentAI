const IPO_REVIEW = 'IPO_REVIEW';

const numberOrNull = (value) => (
    value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))
        ? Number(value)
        : null
);

const percent = (value) => {
    const numericValue = numberOrNull(value);
    return numericValue === null ? null : Math.abs(numericValue) <= 1 ? numericValue * 100 : numericValue;
};

const pick = (source, keys) => {
    for (const key of keys) {
        if (source?.[key] !== undefined && source[key] !== null && source[key] !== '') return source[key];
    }
    return null;
};

const clamp = (value) => Math.max(0, Math.min(100, Math.round(value)));

const add = (items, value) => {
    if (value && !items.includes(value)) items.push(value);
};

function normalize(securityContext) {
    const financials = securityContext.financials || securityContext.financialFacts || {};
    const balanceSheet = securityContext.balanceSheet || {};
    const offer = securityContext.offer || {};
    const promoter = securityContext.governance || securityContext.promoter || {};
    const anchors = securityContext.anchorBook || securityContext.anchors || {};
    const proceeds = securityContext.useOfProceeds || securityContext.freshIssueUse || {};
    const operations = securityContext.operations || {};

    return {
        lifecycleStatus: String(securityContext.lifecycleStatus || 'ANNOUNCED').toUpperCase(),
        filingStatus: String(pick(securityContext, ['filingStatus', 'prospectusStatus']) || '').toUpperCase(),
        domain: pick(securityContext, ['domain', 'sector', 'industry']),
        businessDescription: pick(securityContext, ['businessDescription', 'businessModel', 'actualOperations']) || operations.description,
        yearsOperating: numberOrNull(pick(securityContext, ['yearsOperating', 'operatingYears']) ?? operations.yearsOperating),
        revenue: numberOrNull(pick(financials, ['revenue', 'latestRevenue', 'revenueTtm'])),
        priorRevenue: numberOrNull(pick(financials, ['priorRevenue', 'previousRevenue', 'revenuePreviousYear'])),
        revenueGrowth: percent(pick(financials, ['revenueGrowth', 'revenueGrowthPct'])),
        operatingMargin: percent(pick(financials, ['operatingMargin', 'ebitMargin'])),
        netMargin: percent(pick(financials, ['netMargin', 'netProfitMargin'])),
        netProfit: numberOrNull(pick(financials, ['netProfit', 'profitAfterTax', 'pat'])),
        freeCashFlow: numberOrNull(pick(financials, ['freeCashFlow', 'fcf'])),
        assets: numberOrNull(pick(balanceSheet, ['totalAssets', 'assets']) ?? pick(financials, ['totalAssets', 'assets'])),
        liabilities: numberOrNull(pick(balanceSheet, ['totalLiabilities', 'liabilities']) ?? pick(financials, ['totalLiabilities', 'liabilities'])),
        debt: numberOrNull(pick(balanceSheet, ['totalDebt', 'debt']) ?? pick(financials, ['totalDebt', 'debt'])),
        equity: numberOrNull(pick(balanceSheet, ['equity', 'shareholdersEquity', 'netWorth']) ?? pick(financials, ['equity', 'netWorth'])),
        debtToEquity: numberOrNull(pick(balanceSheet, ['debtToEquity', 'debtEquity']) ?? pick(financials, ['debtToEquity', 'debtEquity'])),
        promoterName: pick(promoter, ['promoterName', 'promoters']) ?? pick(securityContext, ['promoterName', 'promoters']),
        promoterTrackRecord: pick(promoter, ['promoterTrackRecord', 'trackRecord']),
        promoterPledgePct: percent(pick(promoter, ['promoterPledgePct', 'pledgedSharesPct'])),
        anchorCount: numberOrNull(pick(anchors, ['anchorCount', 'count'])),
        anchorAmount: numberOrNull(pick(anchors, ['anchorAmount', 'amount'])),
        anchorQuality: pick(anchors, ['quality', 'investorQuality']),
        offerPrice: numberOrNull(pick(offer, ['offerPrice', 'finalPrice']) ?? pick(securityContext, ['offerPrice', 'finalOfferPrice'])),
        priceRangeHigh: numberOrNull(pick(offer, ['priceRangeHigh', 'high']) ?? securityContext.priceRangeHigh),
        postMoneyShares: numberOrNull(pick(offer, ['postMoneyShares', 'postIssueShares']) ?? securityContext.postMoneyShares),
        sharesOffered: numberOrNull(pick(offer, ['sharesOffered', 'issueShares']) ?? securityContext.sharesOffered),
        freshIssuePct: percent(pick(offer, ['freshIssuePct', 'freshIssuePercentage']) ?? securityContext.freshIssuePct),
        ofsPct: percent(pick(offer, ['ofsPct', 'offerForSalePct']) ?? securityContext.ofsPct),
        issueSize: numberOrNull(pick(offer, ['issueSize', 'ipoSize']) ?? securityContext.issueSize),
        useOfProceeds: pick(proceeds, ['summary', 'description', 'categories']) ?? proceeds,
        debtRepaymentPct: percent(pick(proceeds, ['debtRepaymentPct', 'debtRepaymentPercentage'])),
        capexPct: percent(pick(proceeds, ['capexPct', 'capexPercentage'])),
        workingCapitalPct: percent(pick(proceeds, ['workingCapitalPct', 'workingCapitalPercentage'])),
        lockupDays: numberOrNull(pick(securityContext, ['lockupDays', 'lockInDays'])),
        litigationRisk: pick(securityContext, ['litigationRisk', 'materialLitigation']),
        relatedPartyRisk: pick(securityContext, ['relatedPartyRisk', 'relatedPartyTransactions']),
        riskFlags: Array.isArray(securityContext.riskFlags) ? securityContext.riskFlags : []
    };
}

function scoreFinancials(facts, pros, cons, missing) {
    const scores = [];
    if (facts.revenueGrowth !== null) {
        scores.push(facts.revenueGrowth >= 20 ? 100 : facts.revenueGrowth >= 10 ? 75 : facts.revenueGrowth >= 0 ? 50 : 15);
        if (facts.revenueGrowth >= 15) add(pros, `Revenue growth is ${facts.revenueGrowth.toFixed(1)}%.`);
        if (facts.revenueGrowth < 0) add(cons, 'Revenue is contracting before the IPO.');
    } else missing.push('revenue growth');

    [[facts.operatingMargin, 'operating margin', 15], [facts.netMargin, 'net margin', 10]].forEach(([value, label, good]) => {
        if (value === null) missing.push(label);
        else {
            scores.push(value >= good ? 100 : value > 0 ? 60 : 20);
            if (value >= good) add(pros, `${label} is ${value.toFixed(1)}%.`);
            if (value <= 0) add(cons, `${label} is zero or negative.`);
        }
    });

    if (facts.netProfit === null) missing.push('net profit or loss');
    else if (facts.netProfit > 0) {
        scores.push(80);
        add(pros, 'The company is profitable before listing.');
    } else {
        scores.push(20);
        add(cons, 'The company is loss-making before listing.');
    }

    return scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : null;
}

export function makeIpoInvestmentDecision({ securityContext = {}, riskProfile = {} } = {}) {
    const facts = normalize(securityContext);
    const pros = [];
    const cons = [];
    const missing = [];
    const criticalFlags = [...(riskProfile.criticalFlags || []), ...facts.riskFlags];

    if (!facts.domain) missing.push('business domain and sector');
    if (!facts.businessDescription) missing.push('actual operations and business model');
    if (!facts.promoterName) missing.push('promoter identity and track record');
    if (facts.anchorCount === null && facts.anchorAmount === null) missing.push('anchor book details');
    if (!facts.useOfProceeds && facts.freshIssuePct !== 0) missing.push('fresh-issue use of proceeds');
    if (facts.offerPrice === null && facts.priceRangeHigh === null) missing.push('offer price or price range');
    if (facts.postMoneyShares === null && facts.sharesOffered === null) missing.push('post-issue shares or shares offered');
    if (!facts.filingStatus || facts.filingStatus === 'UNKNOWN') missing.push('prospectus filing status');

    const financialScore = scoreFinancials(facts, pros, cons, missing);

    let balanceSheetScore = null;
    const debtToEquity = facts.debtToEquity ?? (facts.debt !== null && facts.equity > 0 ? facts.debt / facts.equity : null);
    if (debtToEquity === null) missing.push('total debt and equity for debt-to-equity analysis');
    else {
        balanceSheetScore = debtToEquity <= 0.5 ? 100 : debtToEquity <= 1 ? 75 : debtToEquity <= 2 ? 45 : 15;
        if (debtToEquity <= 1) add(pros, `Debt-to-equity is ${debtToEquity.toFixed(2)}x.`);
        if (debtToEquity > 2) add(cons, `High debt-to-equity of ${debtToEquity.toFixed(2)}x.`);
    }
    if (facts.assets !== null && facts.liabilities !== null && facts.liabilities > facts.assets) {
        balanceSheetScore = Math.min(balanceSheetScore ?? 100, 10);
        add(cons, 'Total liabilities exceed total assets.');
    }
    if (facts.freeCashFlow !== null && facts.freeCashFlow < 0) add(cons, 'Free cash flow is negative before the IPO.');

    const offerPrice = facts.offerPrice ?? facts.priceRangeHigh;
    let valuationScore = null;
    let priceToSales = null;
    let priceToEarnings = null;
    if (offerPrice !== null && facts.postMoneyShares !== null && facts.revenue > 0) {
        priceToSales = (offerPrice * facts.postMoneyShares) / facts.revenue;
        valuationScore = priceToSales <= 2 ? 100 : priceToSales <= 5 ? 75 : priceToSales <= 10 ? 45 : 15;
        add(priceToSales <= 5 ? pros : cons, `Implied price-to-sales is ${priceToSales.toFixed(2)}x.`);
    } else if (offerPrice !== null && facts.postMoneyShares !== null && facts.netProfit > 0) {
        priceToEarnings = (offerPrice * facts.postMoneyShares) / facts.netProfit;
        valuationScore = priceToEarnings <= 20 ? 100 : priceToEarnings <= 35 ? 70 : priceToEarnings <= 60 ? 40 : 15;
        add(priceToEarnings <= 35 ? pros : cons, `Implied price-to-earnings is ${priceToEarnings.toFixed(2)}x.`);
    } else missing.push('offer valuation multiple inputs');

    let offerStructureScore = 50;
    if (facts.freshIssuePct !== null || facts.ofsPct !== null) {
        const freshIssuePct = facts.freshIssuePct ?? 100 - facts.ofsPct;
        offerStructureScore = freshIssuePct >= 70 ? 100 : freshIssuePct >= 40 ? 70 : 35;
        if (freshIssuePct >= 70) add(pros, `${freshIssuePct.toFixed(1)}% of the issue is fresh capital.`);
        if (freshIssuePct < 40) add(cons, `Only ${freshIssuePct.toFixed(1)}% of the issue is fresh capital; most shares are secondary.`);
    } else missing.push('fresh issue versus offer-for-sale split');
    if (facts.debtRepaymentPct !== null) add(pros, `${facts.debtRepaymentPct.toFixed(1)}% of fresh proceeds are allocated to debt repayment.`);

    const governanceScore = facts.promoterName ? (facts.promoterPledgePct === null || facts.promoterPledgePct <= 10 ? 80 : 25) : null;
    if (facts.promoterPledgePct > 10) add(cons, `Promoter pledge is ${facts.promoterPledgePct.toFixed(1)}%.`);
    if (facts.promoterTrackRecord) add(pros, `Promoter track record: ${facts.promoterTrackRecord}.`);
    if (facts.anchorCount > 0 || facts.anchorAmount > 0) add(pros, 'Anchor book evidence is available.');
    if (facts.anchorQuality) add(pros, `Anchor quality: ${facts.anchorQuality}.`);
    const anchorScore = facts.anchorCount !== null || facts.anchorAmount !== null ? (facts.anchorQuality ? 85 : 65) : null;
    const operationsScore = facts.businessDescription ? (facts.yearsOperating >= 5 ? 85 : 60) : null;
    if (facts.litigationRisk) add(cons, `Material litigation requires review: ${facts.litigationRisk}.`);
    if (facts.relatedPartyRisk) add(cons, `Related-party risk requires review: ${facts.relatedPartyRisk}.`);

    const weighted = [[financialScore, 0.25], [balanceSheetScore, 0.15], [valuationScore, 0.25], [offerStructureScore, 0.10], [governanceScore, 0.10], [anchorScore, 0.05], [operationsScore, 0.10]];
    const valid = weighted.filter(([score]) => score !== null);
    const totalWeight = valid.reduce((sum, [, weight]) => sum + weight, 0);
    const underwritingScore = totalWeight === 0 ? 0 : clamp(valid.reduce((sum, [score, weight]) => sum + score * weight, 0) / totalWeight);
    const missingEvidence = [...new Set(missing)];

    let decision = IPO_REVIEW;
    if (criticalFlags.length > 0 || riskProfile.overallRiskLevel === 'CRITICAL') decision = 'AVOID';
    else if (missingEvidence.length === 0 && underwritingScore >= 70) decision = 'SUBSCRIBE';
    else if (underwritingScore < 35 || cons.length >= 5) decision = 'AVOID';
    if (missingEvidence.length > 0) add(cons, `Review incomplete until evidence is provided for: ${missingEvidence.join(', ')}.`);

    return {
        decision,
        recommendation: decision,
        convictionLevel: missingEvidence.length === 0 && underwritingScore >= 70 ? 'HIGH' : 'LOW',
        convictionScore: missingEvidence.length === 0 ? underwritingScore : Math.min(underwritingScore, 45),
        primaryDrivers: pros.slice(0, 6),
        keyTradeoffs: [],
        whatCouldChangeThisDecision: [
            'A lower final offer price or stronger earnings evidence could improve the underwriting score.',
            'A prospectus amendment, promoter pledge, dilution change, or weak listing demand should trigger re-underwriting.'
        ],
        pros: pros.slice(0, 8),
        cons: cons.slice(0, 8),
        ipoAnalysis: {
            status: decision === 'AVOID' ? 'BLOCKED' : missingEvidence.length === 0 ? 'READY_FOR_REVIEW' : 'INCOMPLETE',
            lifecycleStatus: facts.lifecycleStatus,
            filingStatus: facts.filingStatus,
            underwritingScore,
            missingEvidence,
            valuation: { offerPrice, priceToSales, priceToEarnings },
            categoryScores: {
                financialQuality: financialScore === null ? null : clamp(financialScore),
                balanceSheet: balanceSheetScore,
                offerValuation: valuationScore,
                offerStructure: offerStructureScore,
                governance: governanceScore,
                anchorBook: anchorScore,
                actualOperations: operationsScore
            },
            facts: {
                domain: facts.domain,
                revenue: facts.revenue,
                revenueGrowth: facts.revenueGrowth,
                operatingMargin: facts.operatingMargin,
                netMargin: facts.netMargin,
                netProfit: facts.netProfit,
                assets: facts.assets,
                liabilities: facts.liabilities,
                debtToEquity,
                freshIssuePct: facts.freshIssuePct,
                ofsPct: facts.ofsPct,
                debtRepaymentPct: facts.debtRepaymentPct,
                lockupDays: facts.lockupDays
            }
        }
    };
}
