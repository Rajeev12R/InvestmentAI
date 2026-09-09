/**
 * Builds an air-gapped constitutional prompt for AI Change Intelligence.
 */
export function buildChangeResearchPrompt({
  changePackage,
  researchQuestion = 'What changed since my last review and does it impact the investment thesis?'
}) {
  const {
    ticker,
    asOfPrevious,
    asOfCurrent,
    materialChanges = [],
    valuationDrift = {},
    riskDrift = {},
    thesisBreakers = [],
    thesisDrift = {},
    decisionDrift = {},
    deterministicSummary
  } = changePackage;

  return `
You are an Institutional Equity Research Temporal Analyst evaluating change intelligence for ${ticker}.

CRITICAL CONSTITUTIONAL CONSTRAINTS:
1. AIR-GAPPED EVIDENCE ISOLATION: Base your entire answer EXCLUSIVELY on the verified deterministic Change Intelligence Package provided below.
2. NO HALLUCINATION OF TIME OR METRICS: Never invent historical numbers, management commentary, or unverified news events.
3. NO ARITHMETIC RECALCULATION: Never recompute DCF or alter deterministic valuation/risk drift outputs.
4. CITATION REQUIREMENT: Every statement of fact or change MUST cite the corresponding change or evidence ID in brackets, e.g. [CHANGE_ID: ...].
5. RESPECT DETERMINISTIC DRIFT: If the package states thesis status is ${thesisDrift.status || 'THESIS_UNCHANGED'}, you MUST preserve that conclusion.

=== SEALED CHANGE INTELLIGENCE PACKAGE ===
Ticker: ${ticker}
Comparison Period: ${asOfPrevious || 'T0 (Baseline)'} -> ${asOfCurrent || 'T1 (Current)'}
Package Hash: ${changePackage.integrity?.packageHash || 'UNAVAILABLE'}

DETERMINISTIC SUMMARY:
${deterministicSummary}

DECISION TRANSITION:
- Current Decision: ${decisionDrift.currentDecision} (Previous: ${decisionDrift.previousDecision})
- Transition: ${decisionDrift.transitionType}
- Conviction: ${decisionDrift.currentConviction} (Delta: ${decisionDrift.convictionDelta})
- Reason: ${decisionDrift.reason}

THESIS DRIFT:
- Status: ${thesisDrift.status}
- Pillar Status: Growth=${thesisDrift.pillars?.growth}, Margins=${thesisDrift.pillars?.profitability}, Valuation=${thesisDrift.pillars?.valuation}, BalanceSheet=${thesisDrift.pillars?.balanceSheet}, Risk=${thesisDrift.pillars?.risk}
- Key Drivers: ${thesisDrift.keyDrivers?.join('; ') || 'None'}

VALUATION DRIFT:
- DCF Fair Value: $${valuationDrift.previousFairValue} -> $${valuationDrift.currentFairValue} (${valuationDrift.fairValueChangePct}%)
- Implied Growth: ${valuationDrift.previousReverseDcfGrowth}% -> ${valuationDrift.currentReverseDcfGrowth}%
- Interpretation: ${valuationDrift.interpretation}

RISK DRIFT:
- Overall: ${riskDrift.overallDirection} (Score: ${riskDrift.previousScore} -> ${riskDrift.currentScore})
- Transitions: ${riskDrift.transitions?.map(t => `${t.category}: ${t.previousLevel} -> ${t.currentLevel}`).join('; ') || 'None'}

THESIS BREAKERS STATUS:
${thesisBreakers.map(b => `- [${b.status}] ${b.trigger} (Current: ${b.currentValue}, Threshold: ${b.threshold})`).join('\n')}

MATERIAL CHANGES:
${materialChanges.map(c => `- ID: ${c.changeId} | ${c.name}: ${c.previousValue} -> ${c.currentValue} (${c.percentageChange !== null ? c.percentageChange + '%' : c.direction}) | Materiality: ${c.materiality} | Reason: ${c.materialityReason}`).join('\n')}

=== USER RESEARCH INQUIRY ===
${researchQuestion}

Provide your response in JSON format:
{
  "summary": "Concise executive overview of temporal changes and thesis impact",
  "whatChanged": [
    { "claim": "Description of change with [CHANGE_ID: ...]", "changeId": "string", "materiality": "MATERIAL" }
  ],
  "thesisImpact": "Deterministic explanation of thesis drift",
  "decisionImpact": "Deterministic explanation of decision drift",
  "whatToWatchNext": ["List of key metric triggers or approaching breakers"]
}
`.trim();
}
