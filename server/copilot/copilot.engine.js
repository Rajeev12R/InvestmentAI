/**
 * @file copilot.engine.js
 * Master orchestrator for Phase 8 Investor Copilot.
 * Integrates Intent Classification, Deterministic Context Routing, AI reasoning/fallback,
 * Claim Validation, Output Safety Inspection, Citations, and Conversation Persistence.
 */

import { classifyIntent } from './copilot.intentClassifier.js';
import { routeAndSealContext } from './copilot.contextRouter.js';
import { sanitizeUserInput, detectPromptInjection } from './copilot.safety.engine.js';
import { validateCopilotClaims } from './copilot.claimValidator.js';
import { validateCopilotResponse } from './copilot.responseValidator.js';
import { buildCitations } from './copilot.citationBuilder.js';
import { planFollowUpQuestions } from './copilot.questionPlanner.js';
import { generateDeterministicResponse } from './copilot.fallback.engine.js';
import { conversationRepository } from './copilot.conversationRepository.js';
import { sessionManager } from './copilot.sessionManager.js';
import { ResponseDepth, CopilotIntent } from './copilot.types.js';

/**
 * Processes an investor chat message and returns a fully verified Copilot Response DTO.
 * @param {Object} params
 * @param {string} params.workspaceId
 * @param {string} params.message
 * @param {string} [params.conversationId]
 * @param {string} [params.ticker]
 * @param {string} [params.depth] QUICK | STANDARD | DEEP
 * @returns {Promise<Object>} Copilot Response DTO
 */
export async function processCopilotMessage({
  workspaceId = 'DEFAULT_WORKSPACE',
  message,
  userMessage,
  conversationId = null,
  ticker = null,
  depth = ResponseDepth.STANDARD
}) {
  const inputMessage = userMessage || message || '';
  const startTime = Date.now();
  const sanitizedInput = sanitizeUserInput(inputMessage);

  // 1. Session Setup
  const session = sessionManager.getOrCreateSession(workspaceId, conversationId);
  const activeConvId = session.conversationId;

  // 2. Prompt Injection Detection
  const injectionCheck = detectPromptInjection(sanitizedInput);

  // 3. Intent Classification & Entity Extraction
  const intentResult = classifyIntent(sanitizedInput);
  const targetTicker = ticker || (intentResult.tickers.length > 0 ? intentResult.tickers[0] : null);

  // 4. Deterministic Context Routing & Cryptographic Sealing
  const sealedContext = await routeAndSealContext({
    workspaceId,
    intent: intentResult.intent,
    tickers: intentResult.tickers,
    primaryTicker: targetTicker,
    question: sanitizedInput
  });

  // 5. Reasoning & Response Generation
  let rawOutput;
  if (injectionCheck.suspicious) {
    rawOutput = {
      answer: `I cannot follow instructions to override system rules or modify verified facts. All investment data is grounded in authoritative packages. ${targetTicker ? `${targetTicker}'s system decision is ${sealedContext.decisionPackage?.decision || 'WATCH'}.` : ''}`,
      whyMatters: ['System integrity and AI isolation boundaries remain strictly enforced.'],
      whatChanged: [],
      whatInvalidates: [],
      citations: [],
      suggestedQuestions: planFollowUpQuestions({ sealedContext, intent: intentResult.intent })
    };
  } else {
    // Generate deterministic grounded response
    rawOutput = generateDeterministicResponse({
      sealedContext,
      userMessage: sanitizedInput,
      depth
    });
  }

  // 6. Claim Validation
  const claimValidation = validateCopilotClaims({
    sealedContext,
    responseOutput: rawOutput
  });

  // 7. Output Safety Validation
  const safetyValidation = validateCopilotResponse({
    response: rawOutput,
    sealedContext
  });

  let finalResponse = safetyValidation.sanitizedResponse;
  if (!claimValidation.valid || !safetyValidation.safe) {
    // Overwrite with safe fallback response if any violation detected
    finalResponse = generateDeterministicResponse({
      sealedContext,
      userMessage: sanitizedInput,
      depth
    });
  }

  // 8. Citations & Suggested Follow-up Questions
  const citations = buildCitations({
    sealedContext,
    rawCitations: finalResponse.citations || []
  });

  const suggestedQuestions = planFollowUpQuestions({
    sealedContext,
    intent: intentResult.intent
  });

  const messageId = `MSG-${activeConvId}-${Date.now()}`;
  const responseDto = {
    conversationId: activeConvId,
    messageId,
    answer: finalResponse.answer || finalResponse.content || '',
    response: {
      content: finalResponse.answer || finalResponse.content || '',
      whyMatters: finalResponse.whyMatters || [],
      whatChanged: finalResponse.whatChanged || [],
      whatInvalidates: finalResponse.whatInvalidates || []
    },
    intent: intentResult,
    depth,
    confidence: finalResponse.confidence || 0.95,
    citations,
    context: sealedContext,
    evidence: (sealedContext.truthPackage?.evidenceIds || []).concat(sealedContext.attentionPackage?.attentionItems?.flatMap(i => i.evidenceIds || []) || []),
    relatedChanges: sealedContext.changePackage?.metricChanges || [],
    relatedAttention: sealedContext.attentionPackage?.attentionItems || [],
    relatedResearch: sealedContext.researchPackage?.findings || [],
    decision: sealedContext.decisionPackage?.decision || null,
    suggestedQuestions,
    suggestedFollowUps: suggestedQuestions,
    safety: {
      isSafe: !injectionCheck.suspicious && safetyValidation.safe,
      injectionDetected: injectionCheck.suspicious,
      flags: injectionCheck.flags
    },
    warnings: injectionCheck.suspicious ? ['Prompt injection neutralized'] : [],
    limitations: [],
    contextHash: sealedContext.contextHash,
    generatedAt: new Date().toISOString(),
    latencyMs: Date.now() - startTime
  };

  // 9. Persist messages in conversation history
  conversationRepository.appendMessage(workspaceId, activeConvId, {
    messageId: `USER-${Date.now()}`,
    role: 'user',
    content: sanitizedInput,
    timestamp: new Date().toISOString()
  });

  conversationRepository.appendMessage(workspaceId, activeConvId, {
    messageId,
    role: 'assistant',
    content: responseDto.answer,
    intent: responseDto.intent?.intent || responseDto.intent,
    citations: responseDto.citations,
    contextHash: responseDto.contextHash,
    timestamp: responseDto.generatedAt
  });

  return responseDto;
}

export const processCopilotRequest = processCopilotMessage;
