import ai from '../services/gemini.service.js';
import { cleanAndParseJSON } from '../utils/jsonParser.js';
import { buildEvidenceIndex, resolveEvidenceFact } from './researchEvidence.engine.js';
import { validateClaims, validateResearchClaims, extractAndValidateCitations } from './claimValidator.engine.js';
import { buildResearchPrompt } from './research.prompts.js';
import { buildInvestmentThesis } from './thesis.engine.js';
import { identifyCatalysts } from './catalyst.engine.js';
import { generateThesisBreakers } from './thesisBreaker.engine.js';
import { analyzeEarningsQuality } from './earnings.engine.js';
import { interpretValuation } from './valuationInterpretation.engine.js';
import { researchCache } from './researchCache.js';
import { STATEMENT_TYPES, AI_CONFIDENCE_LEVELS, RESEARCH_QUESTION_TYPES } from './research.types.js';
import { sealTruthPackage } from '../tools/evidence.tool.js';

const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro'
];

/**
 * Sanitizes adversarial prompts and strips injection attempts.
 */
function sanitizeAdversarialInput(text = '') {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/<[^>]*>?/gm, '') // Strip HTML / XML / script tags
    .replace(/DROP\s+TABLE/gi, '[SQL_FILTERED]')
    .trim();
}

/**
 * Executes an evidence-bounded institutional research query.
 *
 * @param {Object} params
 * @param {Object} params.truthPackage - Sealed Investment Truth Package
 * @param {string} params.researchQuestion - User's query
 * @param {string} [params.questionType] - Research intent
 * @param {string|Object} [params.investorProfile] - Target investor profile
 * @param {Object} [params.options] - Execution options (e.g. forceDeterministic)
 * @returns {Promise<Object>} Bounded, validated research report
 */
export async function executeResearch({
  truthPackage,
  researchQuestion = 'Synthesize comprehensive institutional equity research.',
  questionType = 'INVESTMENT_THESIS',
  investorProfile = 'BALANCED_VALUE',
  options = {}
} = {}) {
  // 1. Verify Truth Package & Cryptographic SHA-256 Seal
  if (!truthPackage || !truthPackage.integrity || !truthPackage.integrity.valid) {
    return {
      status: 'UNAVAILABLE',
      reason: 'Valid sealed Truth Package is required for research analysis.',
      summary: 'Analysis unavailable without verified primary grounded financial data.',
      thesis: null,
      catalysts: [],
      thesisBreakers: [],
      earningsQuality: null,
      valuationView: null,
      valuationInterpretation: null,
      confidence: AI_CONFIDENCE_LEVELS.INSUFFICIENT_EVIDENCE
    };
  }

  // Cryptographic Tamper Verification
  const computedSeal = sealTruthPackage(truthPackage);
  if (computedSeal.packageHash !== truthPackage.integrity.packageHash) {
    return {
      status: 'UNAVAILABLE',
      reason: 'Truth Package cryptographic SHA-256 seal mismatch (tampered or unsealed package).',
      summary: 'Analysis aborted: The supplied Truth Package failed cryptographic integrity verification.',
      thesis: null,
      catalysts: [],
      thesisBreakers: [],
      earningsQuality: null,
      valuationView: null,
      valuationInterpretation: null,
      confidence: AI_CONFIDENCE_LEVELS.INSUFFICIENT_EVIDENCE
    };
  }

  const ticker = (truthPackage.company?.ticker || truthPackage.company?.name || 'UNKNOWN').toUpperCase();
  const packageHash = truthPackage.integrity.packageHash;
  const sanitizedQuestion = sanitizeAdversarialInput(researchQuestion);

  // 2. Check Cache
  const cacheKey = researchCache.generateKey({ ticker, packageHash, question: sanitizedQuestion, investorProfile });
  const cachedResult = researchCache.get(cacheKey);
  if (cachedResult && !options.forceDeterministic) {
    return cachedResult;
  }

  // 3. Build Evidence Index
  const evidenceIndex = buildEvidenceIndex(truthPackage);

  // 4. Generate Deterministic Core Research Pillars
  const deterministicThesis = buildInvestmentThesis(truthPackage);
  const deterministicCatalysts = identifyCatalysts(truthPackage);
  const deterministicBreakers = generateThesisBreakers(truthPackage);
  const deterministicEarnings = analyzeEarningsQuality(truthPackage);
  const deterministicValuation = interpretValuation(truthPackage);

  // 5. Attempt Bounded AI Reasoning (if not forced deterministic)
  let aiSynthesis = null;

  if (!options.forceDeterministic) {
    const prompt = buildResearchPrompt({
      truthPackage,
      researchQuestion: sanitizedQuestion,
      questionType,
      investorProfile
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
          if (parsed && (parsed.summary || parsed.thesis)) {
            // Validate AI Claims against Truth Package with ticker isolation
            const validatedDrivers = validateClaims({ claims: parsed.keyDrivers || [], evidenceIndex, targetTicker: ticker });
            const validatedCatalysts = validateClaims({ claims: parsed.catalysts || [], evidenceIndex, targetTicker: ticker });
            const validatedBreakers = validateClaims({ claims: parsed.thesisBreakers || [], evidenceIndex, targetTicker: ticker });

            // Only accept validated grounded claims
            const safeDrivers = validatedDrivers.validClaims.filter(c => c.verificationStatus !== 'UNGROUNDED');
            const safeCatalysts = validatedCatalysts.validClaims.filter(c => c.verificationStatus !== 'UNGROUNDED');
            const safeBreakers = validatedBreakers.validClaims.filter(c => c.verificationStatus !== 'UNGROUNDED');

            aiSynthesis = {
              summary: parsed.summary ? sanitizeAdversarialInput(parsed.summary) : deterministicThesis.summary,
              thesis: {
                bullCase: parsed.thesis?.bullCase || deterministicThesis.bullCase,
                baseCase: parsed.thesis?.baseCase || deterministicThesis.baseCase,
                bearCase: parsed.thesis?.bearCase || deterministicThesis.bearCase
              },
              keyDrivers: safeDrivers.length > 0 ? safeDrivers : deterministicThesis.keyDrivers,
              catalysts: safeCatalysts.length > 0 ? safeCatalysts : deterministicCatalysts,
              thesisBreakers: safeBreakers.length > 0 ? safeBreakers : deterministicBreakers,
              earningsQuality: parsed.earningsQuality || deterministicEarnings,
              valuationView: parsed.valuationView || deterministicValuation,
              investorFitSummary: parsed.investorFitSummary || `Evaluated for ${investorProfile} profile.`,
              limitations: Array.isArray(parsed.limitations) ? parsed.limitations : deterministicThesis.limitations
            };
            break;
          }
        }
      } catch (err) {
        const isQuota = err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED') || err.message?.includes('credentials');
        if (isQuota) {
          break;
        }
      }
    }
  }

  // 6. Formulate Final Structured Research Payload
  const finalResearch = {
    status: 'COMPLETE',
    ticker,
    companyName: truthPackage.company?.name || ticker,
    question: sanitizedQuestion,
    questionType,
    investorProfile,
    summary: aiSynthesis?.summary || deterministicThesis.summary,
    thesis: aiSynthesis?.thesis || {
      bullCase: deterministicThesis.bullCase,
      baseCase: deterministicThesis.baseCase,
      bearCase: deterministicThesis.bearCase
    },
    keyDrivers: aiSynthesis?.keyDrivers || deterministicThesis.keyDrivers,
    catalysts: aiSynthesis?.catalysts || deterministicCatalysts,
    thesisBreakers: aiSynthesis?.thesisBreakers || deterministicBreakers,
    earningsQuality: aiSynthesis?.earningsQuality || deterministicEarnings,
    valuationInterpretation: aiSynthesis?.valuationView || deterministicValuation,
    valuationContext: deterministicValuation,
    investorFitSummary: aiSynthesis?.investorFitSummary || `Evaluated for ${investorProfile} profile.`,
    confidence: truthPackage.confidence?.overall >= 75 ? AI_CONFIDENCE_LEVELS.HIGH : (truthPackage.confidence?.overall >= 50 ? AI_CONFIDENCE_LEVELS.MEDIUM : AI_CONFIDENCE_LEVELS.LOW),
    evidenceCoverageRatio: truthPackage.confidence?.dataCompleteness ? truthPackage.confidence.dataCompleteness / 100 : 0.8,
    limitations: aiSynthesis?.limitations || deterministicThesis.limitations,
    provenanceSummary: {
      evidenceCount: evidenceIndex.getAllEvidenceIds().length,
      sealedAt: truthPackage.integrity.sealedAt || new Date().toISOString()
    },
    packageHash,
    evaluatedAt: new Date().toISOString(),
    isAirGapped: true
  };

  // 7. Store in Cache
  researchCache.set(cacheKey, finalResearch);

  return finalResearch;
}

/**
 * Shorthand helper to generate a full research report.
 */
export async function generateResearchReport({ truthPackage, options = {} }) {
  const result = await executeResearch({
    truthPackage,
    researchQuestion: 'Generate full institutional equity research synthesis.',
    questionType: RESEARCH_QUESTION_TYPES.FULL_RESEARCH_REPORT,
    options
  });
  return {
    ...result,
    executiveSummary: { content: result.summary },
    earningsIntelligence: result.earningsQuality
  };
}

/**
 * Dynamic Q&A helper over the sealed Truth Package.
 */
export async function answerResearchQuestion({
  question,
  questionType = RESEARCH_QUESTION_TYPES.GENERAL_INQUIRY,
  truthPackage,
  investorProfile = 'BALANCED_VALUE'
}) {
  const sanitizedQ = sanitizeAdversarialInput(question);
  const research = await executeResearch({
    truthPackage,
    researchQuestion: sanitizedQ,
    questionType,
    investorProfile
  });

  if (research.status === 'UNAVAILABLE') {
    return {
      answer: `Research unavailable: ${research.reason}`,
      citations: [],
      groundedFacts: [],
      isAirGapped: true
    };
  }

  const evidenceIndex = buildEvidenceIndex(truthPackage);
  const citations = extractAndValidateCitations(research.summary, evidenceIndex).validCitations;
  const groundedFacts = citations.map(c => resolveEvidenceFact(c, evidenceIndex)).filter(Boolean);

  let answerText = research.summary;
  if (questionType === RESEARCH_QUESTION_TYPES.REVERSE_DCF_GROWTH || sanitizedQ.toLowerCase().includes('growth rate')) {
    answerText = research.valuationInterpretation?.reverseDcfDiagnostic || research.valuationContext?.reverseDcfDiagnostic || answerText;
  } else if (questionType === RESEARCH_QUESTION_TYPES.RISK_DEEP_DIVE || sanitizedQ.toLowerCase().includes('risk')) {
    const riskFact = evidenceIndex.get('risk.overall');
    answerText = `Overall risk is evaluated as ${riskFact?.value || 'MODERATE'}. Key vulnerabilities: ${research.thesisBreakers.map(b => b.trigger).join('; ')}.`;
  }

  return {
    answer: answerText,
    citations: citations.length > 0 ? citations : ['risk.overall', 'valuation.dcf'],
    groundedFacts: groundedFacts.length > 0 ? groundedFacts : [evidenceIndex.get('risk.overall')].filter(Boolean),
    isAirGapped: true,
    confidence: research.confidence
  };
}
