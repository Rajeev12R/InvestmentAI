import ai from '../services/gemini.service.js';
import { cleanAndParseJSON } from '../utils/jsonParser.js';
import { buildChangeResearchPrompt } from './change.prompts.js';
import { validateChangeClaims } from './changeValidator.engine.js';
import { sealChangePackage } from '../change/change.engine.js';

const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro'
];

/**
 * Executes an AI Change Intelligence interpretation over a sealed Change Package.
 */
export async function executeChangeResearch({
  changePackage,
  researchQuestion = 'What changed since my last review and does it alter the investment thesis?',
  options = {}
}) {
  if (!changePackage || !changePackage.integrity) {
    return {
      status: 'UNAVAILABLE',
      reason: 'Valid sealed Change Intelligence Package is required for temporal research.',
      summary: 'Temporal research unavailable without verified change package.',
      isAirGapped: true
    };
  }

  // Verify SHA-256 seal integrity
  const computedSeal = sealChangePackage(changePackage);
  if (computedSeal.packageHash !== changePackage.integrity.packageHash) {
    return {
      status: 'UNAVAILABLE',
      reason: 'Change Package cryptographic SHA-256 seal mismatch (tampered or unsealed package).',
      summary: 'Analysis aborted: The supplied Change Package failed cryptographic integrity verification.',
      isAirGapped: true
    };
  }

  const deterministicSummary = changePackage.deterministicSummary;
  const whatToWatchNext = changePackage.thesisBreakers
    ?.filter(b => b.status === 'APPROACHING' || b.status === 'TRIGGERED')
    .map(b => b.trigger) || [];

  let aiInterpretation = null;

  if (!options.forceDeterministic) {
    const prompt = buildChangeResearchPrompt({
      changePackage,
      researchQuestion
    });

    for (const modelName of CANDIDATE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: { responseMimeType: 'application/json' }
        });

        if (response && response.text) {
          const parsed = cleanAndParseJSON(response.text);
          if (parsed && parsed.summary) {
            const validation = validateChangeClaims({
              claims: parsed.whatChanged || [],
              changePackage
            });

            aiInterpretation = {
              summary: parsed.summary,
              whatChanged: validation.validClaims,
              thesisImpact: parsed.thesisImpact || changePackage.thesisDrift?.summary,
              decisionImpact: parsed.decisionImpact || changePackage.decisionDrift?.reason,
              whatToWatchNext: Array.isArray(parsed.whatToWatchNext) && parsed.whatToWatchNext.length > 0
                ? parsed.whatToWatchNext
                : whatToWatchNext
            };
            break;
          }
        }
      } catch (err) {
        const isQuota = err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED') || err.message?.includes('credentials');
        if (isQuota) break;
      }
    }
  }

  return {
    status: 'COMPLETE',
    ticker: changePackage.ticker,
    question: researchQuestion,
    summary: aiInterpretation?.summary || deterministicSummary,
    whatChanged: aiInterpretation?.whatChanged || changePackage.materialChanges.map(c => ({
      claim: `${c.name} shifted from ${c.previousValue} to ${c.currentValue} (${c.percentageChange !== null ? c.percentageChange + '%' : c.direction})`,
      changeId: c.changeId,
      materiality: c.materiality,
      direction: c.direction,
      verificationStatus: 'GROUNDED',
      evidenceIds: c.evidenceIds
    })),
    thesisImpact: aiInterpretation?.thesisImpact || changePackage.thesisDrift?.summary,
    decisionImpact: aiInterpretation?.decisionImpact || changePackage.decisionDrift?.reason,
    whatToWatchNext: aiInterpretation?.whatToWatchNext || whatToWatchNext,
    deterministicChangePackage: changePackage,
    isAirGapped: true,
    evaluatedAt: new Date().toISOString()
  };
}
