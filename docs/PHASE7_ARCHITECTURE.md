# InvestmentAI — Phase 7 Architecture: Portfolio Intelligence & Decision Operations

## Executive Summary
Phase 7 introduces the **Attention Engine**, **Portfolio Intelligence & Multi-Asset Exposure Layer**, and **Decision Operations & Review Queue** to InvestmentAI.

It transforms the platform from an isolated equity analysis tool into a unified institutional workspace that continuously answers:
> *"What changed across my portfolio/watchlist, what matters most, why does it matter, what decisions need review, and what should I investigate next?"*

---

## 1. Architectural Pipeline & Invariants

```text
External Ingested Events (Phase 6)
          ↓
Grounded Truth Packages & Snapshots (Phase 1 & 5)
          ↓
Deterministic Change & Drift Engine (Phase 5)
          ↓
┌────────────────────────────────────────────────────────┐
│                   PHASE 7 ENGINES                      │
│                                                        │
│  ┌───────────────────────┐  ┌───────────────────────┐  │
│  │   Attention Engine    │  │ PortfolioIntelligence │  │
│  │  - Company Attention  │  │  - Concentration/HHI  │  │
│  │  - Portfolio Attention│  │  - Correlation/N_eff  │  │
│  │  - Deduplication      │  │  - Multi-Asset Drift  │  │
│  │  - Scoring / Ranking  │  │  - Position Sizing    │  │
│  └───────────┬───────────┘  └───────────┬───────────┘  │
│              │                          │              │
│              └────────────┬─────────────┘              │
│                           ↓                            │
│           ┌───────────────────────────────┐            │
│           │   Decision Operations Engine  │            │
│           │   - Decision Review Queue     │            │
│           │   - Follow-up Workflows       │            │
│           │   - Action Recommendations    │            │
│           └───────────────┬───────────────┘            │
└───────────────────────────┼────────────────────────────┘
                            ↓
             Sealed Attention Package (SHA-256)
                            ↓
         ┌──────────────────┴──────────────────┐
         │                                     │
         ↓                                     ↓
Frontend Attention & Ops UI         AI Explanation Boundary (Read-Only)
```

---

## 2. Core Architectural Guarantees
1. **Zero Financial Hallucination**: Attention priorities, scores, categories, explanations, and research questions are computed purely deterministically.
2. **AI Read-Only Boundary**: AI models receive only sealed, frozen `AttentionIntelligencePackage` DTOs to explain why items matter or answer approved research questions. AI cannot create facts, alter decisions, modify attention, or suppress alerts.
3. **Strict Separation of Workflow & Truth**: User workflow transitions (`REVIEW`, `INVESTIGATING`, `DISMISSED`, `RESOLVED`) exist exclusively in the operational repository and never mutate underlying Truth Packages or snapshots.
4. **End-to-End Cryptographic Provenance**: Every attention item and review item retains full upstream pointers (`changeIds`, `eventIds`, `alertIds`, `evidenceIds`, `snapshotId`, `packageHash`).
