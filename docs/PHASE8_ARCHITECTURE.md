# PHASE 8 ARCHITECTURE — INVESTOR COPILOT & DECISION WORKFLOW

## 1. Executive Summary

Phase 8 introduces the **Investor Copilot & Decision Workflow** to InvestmentAI. The Investor Copilot is an institutional conversational AI layer sitting alongside professional investors. It retrieves deterministic, verified intelligence from Phases 1–7, explains metrics, answers complex inquiries, connects evidence across historical snapshots, suggests grounded investigation paths, and manages human decision review workflows.

```
+-----------------------------------------------------------------------------------+
|                           PHASE 8 INVESTOR COPILOT                                |
|                                                                                   |
|  [Investor Query]                                                                 |
|         |                                                                         |
|         v                                                                         |
|  +---------------------------+       +-----------------------------------------+  |
|  |  Prompt Injection Defense | ----> | Canonical Intent Classifier             |  |
|  |  & Delimiter Sanitization |       | (22 Intents, Multi-Ticker Extraction)   |  |
|  +---------------------------+       +-----------------------------------------+  |
|                                                           |                       |
|                                                           v                       |
|                                      +-----------------------------------------+  |
|                                      | Deterministic Context Router            |  |
|                                      | - Calls Phase 1-7 Tools                 |  |
|                                      | - Canonicalizes JSON DTO                |  |
|                                      | - SHA-256 Context Hash                  |  |
|                                      | - Object.freeze Sealed Immutability     |  |
|                                      +-----------------------------------------+  |
|                                                           |                       |
|         +-------------------------------------------------+                       |
|         |                                                                         |
|         v                                                                         |
|  +---------------------------+       +-----------------------------------------+  |
|  | Delimited AI Generation   | <---> | Deterministic Analytical Fallback       |  |
|  | (Gemini 2.5 Flash /       |       | Engine (100% Uptime, Zero Hallucination)|  |
|  |  Structured Outputs)      |       +-----------------------------------------+  |
|  +---------------------------+                            |                       |
|         |                                                 |                       |
|         v                                                 v                       |
|  +-----------------------------------------------------------------------------+  |
|  | Claim Validator & Safety Inspector                                          |  |
|  | - Strips UNSUPPORTED / REJECTED claims                                      |  |
|  | - Blocks decision overrides & unauthorized mutations                       |  |
|  | - Replaces with verified fallback if violated                              |  |
|  +-----------------------------------------------------------------------------+  |
|         |                                                                         |
|         v                                                                         |
|  +-----------------------------------------------------------------------------+  |
|  | Citation Builder & Grounded Question Planner                                |  |
|  | - Verified SHA-256 evidence linking & Authority Tiers                       |  |
|  | - Proposes signal-grounded follow-up investigations                         |  |
|  +-----------------------------------------------------------------------------+  |
|         |                                                                         |
|         v                                                                         |
|  +-----------------------------------------------------------------------------+  |
|  | Human Decision Workflow & Operations Synchronization                        |  |
|  | - Operations Review Queue Sync (No auto-trading)                            |  |
|  | - Atomic Conversation Persistence with Workspace Isolation                 |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 2. Core Architectural Pillars

### Pillar 1: Verified Truth Supremacy
Financial facts, DCF intrinsic values, WACC rates, Beta coefficients, HHI scores, and system decisions originate exclusively from deterministic Phase 1–7 packages. The Copilot is mathematically forbidden from computing or modifying financial metrics.

### Pillar 2: Cryptographic Context Sealing
Before being passed to the AI generation or fallback pipeline, all gathered intelligence packages are canonicalized, hashed with `SHA-256`, and sealed with `Object.freeze()`. Any downstream attempt to mutate the context throws a runtime exception.

### Pillar 3: Strict Claim & Citation Verification
Every analytical statement returned by the Copilot is validated against the sealed package evidence IDs. Unsupported claims or cross-company data leaks are stripped and replaced with deterministic fallback explanations.

### Pillar 4: Human-in-the-Loop Decision Operations
The Copilot operates strictly as an analytical advisor. Recommendations such as `CONSIDER_EXIT` or `REVIEW_POSITION` create entries in the human Decision Review Queue and require explicit human confirmation before any portfolio action is finalized. Automated trade execution is strictly banned (`isTradeExecuted: false`).

---

## 3. Directory Layout

```
server/
├── copilot/
│   ├── copilot.types.js                # Canonical intent taxonomy & schemas
│   ├── copilot.prompts.js              # AI Constitution & Delimited Prompts
│   ├── copilot.intentClassifier.js     # Regex & entity extraction engine
│   ├── copilot.contextRouter.js        # Deterministic context routing & sealing
│   ├── copilot.citationBuilder.js      # Evidence linker & authority tiering
│   ├── copilot.questionPlanner.js      # Grounded follow-up question planner
│   ├── copilot.claimValidator.js       # Claim validation & unsupported strip
│   ├── copilot.responseValidator.js    # Output safety & mutation inspector
│   ├── copilot.safety.engine.js        # Prompt injection & delimiter sanitizer
│   ├── copilot.memory.engine.js        # Conversational memory revalidation
│   ├── copilot.conversationRepository.js # Atomic workspace conversation storage
│   ├── copilot.sessionManager.js       # Session lifecycle manager
│   ├── copilot.fallback.engine.js      # Zero-hallucination deterministic fallback
│   ├── copilot.engine.js               # Master Copilot orchestrator
│   └── tools/                          # Phase 1–7 deterministic context tools
│       ├── truth.tool.js
│       ├── change.tool.js
│       ├── attention.tool.js
│       ├── valuation.tool.js
│       ├── risk.tool.js
│       ├── decision.tool.js
│       ├── portfolio.tool.js
│       ├── research.tool.js
│       └── timeline.tool.js
├── workflow/
│   ├── investorWorkflow.types.js       # Workflow action taxonomy & validation
│   ├── investorWorkflow.engine.js      # Master workflow dispatcher
│   ├── researchWorkflow.engine.js      # Grounded research initiation
│   ├── decisionWorkflow.engine.js      # Decision review synchronization
│   ├── reviewWorkflow.engine.js        # State transition engine (REVIEW->INVESTIGATING->RESOLVED)
│   └── followupWorkflow.engine.js      # Investigation follow-up task manager
└── routes/
    └── copilot.routes.js               # Express API endpoints
```
