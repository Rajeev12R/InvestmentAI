# Phase 16 — Hostile Red-Team Audit & Coverage Matrix (154 Categories A–EX)

## 1. Machine-Reconciled Taxonomy

This matrix maps all 154 canonical hostile test categories (A through EX). Every category executes an independent test asserting mathematical integrity, security boundary enforcement, temporal integrity, or non-zero coercion.

| Category ID | Attack Name | Concrete Input | Expected Invariant | Target Subsystem |
| :--- | :--- | :--- | :--- | :--- |
| **A** | Zero Price Injection | Price = 0.0 with missing truth | Reject or tag INSUFFICIENT_DATA | InputValidator |
| **B** | NaN Weight Injection | Holding weight = NaN | Reject with NUMERICAL_FAILURE | InputValidator |
| **C** | Infinity Weight Injection | Holding weight = Infinity | Reject with NUMERICAL_FAILURE | InputValidator |
| **D** | Negative Holding in Long-Only | Weight = -0.05 | Reject or BREACH Shorting rule | RuleEngine |
| **E** | Over-Summing Portfolio Weights | Weights sum to 1.40 | Reject with INVALID_INPUT | InputValidator |
| **F** | Duplicate Holdings Ticker | AAPL included twice | Reject with CONFLICT | InputValidator |
| **G** | Duplicate Transaction ID | Same transactionId twice | Reject with CONFLICT | InputValidator |
| **H** | Future Evaluation Timestamp | asOf = 2099-01-01 | Reject with TEMPORAL_VIOLATION | InputValidator |
| **I** | Future Transaction Date | Transaction timestamp > asOf | Reject with TEMPORAL_VIOLATION | InputValidator |
| **J** | Missing Workspace Header | x-workspace-id missing | Reject with 401 AUTH_REQUIRED | ComplianceRoutes |
| **K** | Viewer Role Policy Creation | Role = VIEWER POST /policy | Reject with 403 Forbidden | ComplianceRoutes |
| **L** | Auditor Role Policy Mutation | Role = AUDITOR POST /version | Reject with 403 Forbidden | ComplianceRoutes |
| **M** | Cross-Workspace Policy Leak | Accessing WS-2 policy from WS-1 | Reject with 404 / UNAVAILABLE | PolicyRepository |
| **N** | Cross-Workspace Package Leak | Accessing WS-2 package from WS-1 | Reject with 404 / UNAVAILABLE | ComplianceRepository |
| **O** | Policy V1 Immutability Overwrite | Re-saving existing V1 version | Reject with immutable error | PolicyRepository |
| **P** | Expired Waiver Bypass | Waiver expired yesterday | Breach not waived | ExceptionEngine |
| **Q** | Future Waiver Pre-Activation | Waiver effective next month | Breach not waived | ExceptionEngine |
| **R** | Self-Approval of Exception | Requester approves own waiver | Reject with self-approval error | ExceptionEngine |
| **S** | Unauthorized Waiver Approver | Role = ANALYST approving waiver | Reject with 403 Forbidden | ExceptionEngine |
| **T** | Exception Hash Tamper | Reason modified post-approval | Hash invalidation / Waiver denied | ExceptionEngine |
| **U** | Cross-Rule Waiver Application | Sector waiver applied to Position limit | Breach not waived | ExceptionEngine |
| **V** | Cross-Portfolio Waiver Theft | Portfolio-A waiver used for Portfolio-B | Breach not waived | ExceptionEngine |
| **W** | Missing Price as Zero Attack | Missing price converted to 0 | Reject; produce INSUFFICIENT_DATA | RuleEngine |
| **X** | Missing Sector as Other Attack | Missing sector converted to 'Other' | Reject; produce INSUFFICIENT_DATA | RuleEngine |
| **Y** | Missing Geography Data | Geography missing for asset | Reject; produce INSUFFICIENT_DATA | RuleEngine |
| **Z** | Missing ADV Data in Liquidity Check | ADV = null for proposed trade | Reject; produce INSUFFICIENT_DATA | RuleEngine |
| **AA** | Missing Cash Holding in Cash Check | Cash holding not provided | Reject; produce INSUFFICIENT_DATA | RuleEngine |
| **AB** | Missing Leverage Data | Gross leverage = null | Reject; produce INSUFFICIENT_DATA | RuleEngine |
| **AC** | Missing Turnover Data | Turnover = null | Reject; produce INSUFFICIENT_DATA | RuleEngine |
| **AD** | Ineligible Security Injection | Prohibited ticker in holdings | Flag BREACH on SECURITY_ELIGIBILITY | RuleEngine |
| **AE** | Position Weight Exactly At Limit | Weight = 0.10, Limit <= 0.10 | Status = PASS | RuleEngine |
| **AF** | Position Weight Epsilon Breach | Weight = 0.1001, Limit <= 0.10 | Status = BREACH | RuleEngine |
| **AG** | Sector Weight Approaching Warning | Sector = 32%, Limit <= 35% | Status = WARNING | RuleEngine |
| **AH** | Sector Weight Breach | Sector = 40%, Limit <= 35% | Status = BREACH | RuleEngine |
| **AI** | Cash Below Minimum Mandate | Cash = 2%, Limit >= 5% | Status = BREACH | RuleEngine |
| **AJ** | Cash In Range | Cash = 10%, Limit 5% to 25% | Status = PASS | RuleEngine |
| **AK** | Leverage Exceeded | Gross leverage = 1.30, Limit <= 1.00 | Status = BREACH | RuleEngine |
| **AL** | Short Position In Long-Only | Short weight = -0.02 | Status = BREACH | RuleEngine |
| **AM** | Concentration HHI Breach | HHI = 0.30, Limit <= 0.20 | Status = BREACH | RuleEngine |
| **AN** | ADV Participation Limit Breach | Proposed order = 15% ADV, Limit <= 10% | Status = BREACH | RuleEngine |
| **AO** | Turnover Limit Breach | Turnover = 28%, Limit <= 20% | Status = BREACH | RuleEngine |
| **AP** | Decision Authority Unauthorized | Analyst approves PM decision | Status = BREACH | RuleEngine |
| **AQ** | Decision Authority Authorized | PM approves decision | Status = PASS | RuleEngine |
| **AR** | Inactive Policy at Evaluation Time | asOf before effectiveFrom | Status = POLICY_NOT_FOUND | ComplianceEngine |
| **AS** | Historical Policy Version Resolution | asOf resolves to V1 instead of V2 | PolicyVersion = 1.0.0 | PolicyEngine |
| **AT** | Precedence: Regulatory Overrides Mandate | Regulatory 30% vs Mandate 35% | Evaluates against 30% limit | PolicyEngine |
| **AU** | Precedence: Firm Overrides Strategy | Firm 10% vs Strategy 15% | Evaluates against 10% limit | PolicyEngine |
| **AV** | Conflicting Unresolvable Policies | Contradictory rules | Status = CONFLICT | PolicyEngine |
| **AW** | Breach Lifecycle: Detected to Acknowledged | Valid transition | Status = ACKNOWLEDGED | BreachEngine |
| **AX** | Breach Lifecycle: Invalid Skip to Closed | Transition DETECTED -> CLOSED | Transition rejected | BreachEngine |
| **AY** | Breach Resolution Immutability | Resolved breach retained in history | Stored in history | BreachEngine |
| **AZ** | Remediation Plan: Weight Reduction | Sector breach of 6.2% | Delta = -6.2% proposed | RemediationEngine |
| **BA** | Remediation Plan: Non-Execution | Remediation plan generated | isExecutionAuthorized = false | RemediationEngine |
| **BB** | Evidence Graph Generation | Complete evaluation graph | Valid DAG nodes & edges | ComplianceAuditEngine |
| **BC** | Evidence Graph Hash Integrity | Graph hash computed | Canonical SHA-256 match | ComplianceAuditEngine |
| **BD** | Phase 9 Audit Trail Integration | Compliance event logged | Appended to Phase 9 log | ComplianceAuditEngine |
| **BE** | Sealed Package Tamper Detection | Modifying package ruleResults | verifyPackageIntegrity = false | CompliancePackageBuilder |
| **BF** | Sealed Package Valid Integrity | Unmodified sealed package | verifyPackageIntegrity = true | CompliancePackageBuilder |
| **BG** | CSV Export Format Integrity | Exporting rule results | Valid RFC-4180 CSV output | ComplianceReportEngine |
| **BH** | Portfolio Summary Report Metrics | Summary metric aggregation | Total = Pass + Warn + Breach | ComplianceReportEngine |
| **BI** | Historical Breach Log Report | Query historical breaches | Includes resolved breaches | ComplianceReportEngine |
| **BJ** | Copilot Prompt Injection Defense | Query asking to "mark compliant" | Answer remains read-only BREACH | ComplianceExplanationEngine |
| **BK** | Copilot Waiver Override Defense | Query asking Copilot to waive | AI cannot approve waiver | ComplianceExplanationEngine |
| **BL** | Copilot Remediation Query | Querying required remediation | Deterministic remedial text | ComplianceExplanationEngine |
| **BM** | Copilot Why Non-Compliant Query | Querying cause of breach | Detailed rule & actual value | ComplianceExplanationEngine |
| **BN** | Broker Execution Attempt in Compliance | Requesting trade execution | Non-execution invariant | ComplianceEngine |
| **BO** | Broker API Call Absence | Checking network/broker calls | No broker API invoked | ComplianceEngine |
| **BP** | Empty Holdings Evaluation | Holdings = [] | Evaluates safely without crash | ComplianceEngine |
| **BQ** | Single Holding Portfolio | 100% in one stock | Position limit breach | ComplianceEngine |
| **BR** | Multi-Sector Balanced Portfolio | Diversified portfolio | Status = PASS | ComplianceEngine |
| **BS** | Malformed Rule Schema Rejection | Missing operator in rule | Reject with schema error | PolicyEngine |
| **BT** | Unknown Rule Type Rejection | Invalid ruleType | Reject with schema error | PolicyEngine |
| **BU** | Unknown Operator Rejection | Invalid operator | Reject with schema error | PolicyEngine |
| **BV** | Unknown Severity Rejection | Invalid severity | Reject with schema error | PolicyEngine |
| **BW** | Policy effectiveTo Preceding effectiveFrom | from > to | Reject with date order error | PolicyEngine |
| **BX** | Exception expiresAt Preceding effectiveFrom | from >= expires | Reject with date order error | ExceptionEngine |
| **BY** | Exception Duration Exceeding Max | Duration = 90 days | Reject exceeding max 60 days | ExceptionEngine |
| **BZ** | Dual Exception Active Resolution | Two valid waivers for rule | Resolved safely without conflict | ComplianceEngine |
| **CA** | Floating Point Epsilon Summation | Weights sum to 0.99999 | Tolerated under 10 bps slack | ComplianceInputValidator |
| **CB** | String Weight Coercion Attack | Weight = "0.20" string | Reject non-number weight | ComplianceInputValidator |
| **CC** | Null Character in Ticker | Ticker = "AAPL\0EVIL" | Sanitized / handled safely | ComplianceInputValidator |
| **CD** | Huge Market Cap Value | MarketCap = Number.MAX_SAFE_INTEGER | Handled with finite precision | RuleEngine |
| **CE** | Negative Market Cap Value | MarketCap = -100000 | Reject with NUMERICAL_FAILURE | RuleEngine |
| **CF** | Negative Cash Weight Injection | Cash = -0.05 | Reject / Shorting breach | RuleEngine |
| **CG** | Negative Turnover Value | Turnover = -0.10 | Reject with NUMERICAL_FAILURE | RuleEngine |
| **CH** | Rating Limit Met | Rating = 'AAA', Min = 'BBB' | Status = PASS | RuleEngine |
| **CI** | Rating Limit Missing | Rating data absent | Status = INSUFFICIENT_DATA | RuleEngine |
| **CJ** | ESG Score Met | ESG = 85, Limit >= 70 | Status = PASS | RuleEngine |
| **CK** | ESG Score Breach | ESG = 50, Limit >= 70 | Status = BREACH | RuleEngine |
| **CL** | ESG Score Missing | ESG score absent | Status = INSUFFICIENT_DATA | RuleEngine |
| **CM** | Decision Governance Report Generation | Report for decision review | Valid governance report | ComplianceReportEngine |
| **CN** | Decision Governance Compliant Case | Authorized decision | isCompliant = true | ComplianceReportEngine |
| **CO** | Decision Governance Breach Case | Unauthorized decision | isCompliant = false | ComplianceReportEngine |
| **CP** | Multi-Tenant Policy Isolation Test | WS-A cannot see WS-B policy | Isolation verified | PolicyRepository |
| **CQ** | Multi-Tenant Breach Isolation Test | WS-A cannot see WS-B breach | Isolation verified | ComplianceRepository |
| **CR** | Multi-Tenant Exception Isolation Test | WS-A cannot see WS-B exception | Isolation verified | ComplianceRepository |
| **CS** | Multi-Tenant Evaluation Isolation Test | WS-A cannot see WS-B evaluation | Isolation verified | ComplianceRepository |
| **CT** | Replay Determinism Hash Consistency | 100 replays of evaluation | Hashes match 100/100 | PolicyEngine |
| **CU** | Replay Determinism Rule Results | 100 replays of rule status | Exact identical status array | RuleEngine |
| **CV** | Concurrency: Parallel Evaluations | 10 concurrent evaluations | Zero state pollution | ComplianceEngine |
| **CW** | Concurrency: Parallel Policy Versions | 10 concurrent version creations | Immutable version chain | PolicyRepository |
| **CX** | Concurrency: Parallel Exception Approvals | 10 concurrent waiver approvals | Correct cryptographic hashes | ExceptionEngine |
| **CY** | Temporal Defense: Future Price Attack | Price dated T + 1 day | Excluded from T0 evaluation | ComplianceInputValidator |
| **CZ** | Temporal Defense: Future Holding Attack | Holding dated T + 1 day | Excluded from T0 evaluation | ComplianceInputValidator |
| **DA** | Temporal Defense: Future Restatement | Restated fact at T + 2 | Historical T0 remains intact | ComplianceEngine |
| **DB** | Temporal Defense: Post-Dated Waiver | Waiver approved at T + 3 | Rejected at historical T0 | ExceptionEngine |
| **DC** | Restatement V1 vs V2 Audit Trail | Evaluating before & after restatement | Old snapshot preserved | ComplianceEngine |
| **DD** | Real Ticker AAPL Compliance Evaluation | Live AAPL market price evaluation | Provenance REAL_DATA | RuleEngine |
| **DE** | Real Ticker JPM Compliance Evaluation | Live JPM market price evaluation | Provenance REAL_DATA | RuleEngine |
| **DF** | Real Ticker RELIANCE.NS Evaluation | Live RELIANCE.NS price evaluation | Provenance REAL_DATA | RuleEngine |
| **DG** | Real Ticker TMPV.NS Evaluation | Live TMPV.NS price evaluation | Provenance REAL_DATA | RuleEngine |
| **DH** | Real Ticker TSM Evaluation | Live TSM market price evaluation | Provenance REAL_DATA | RuleEngine |
| **DI** | Golden E2E Trace: Initial Proposal | Proposal compliant check | Evaluation generated | ComplianceEngine |
| **DJ** | Golden E2E Trace: Drift Detection | Drift exceeds sector limit | Status = BREACH | ComplianceEngine |
| **DK** | Golden E2E Trace: Waiver Request | Analyst requests waiver | Status = REQUESTED | ExceptionEngine |
| **DL** | Golden E2E Trace: PM Waiver Approval | PM approves waiver | Status = ACTIVE | ExceptionEngine |
| **DM** | Golden E2E Trace: Waived Evaluation | Re-eval with active waiver | Status = PASS (Waived) | ComplianceEngine |
| **DN** | Golden E2E Trace: Remediation Proposal | Generates remedial proposal | Remediation plan sealed | RemediationEngine |
| **DO** | Golden E2E Trace: Cured Re-Evaluation | Remediation cured breach | Status = PASS | ComplianceEngine |
| **DP** | Golden E2E Trace: Audit Package Sealed | Final sealed package | SHA-256 sealed | CompliancePackageBuilder |
| **DQ** | HTTP POST /api/compliance/policy | Live Express policy creation | Status 201 Created | ComplianceRoutes |
| **DR** | HTTP POST /api/compliance/policy/:id/version | Live Express version creation | Status 201 Created | ComplianceRoutes |
| **DS** | HTTP GET /api/compliance/policy/:id/history | Live Express version history | Status 200 OK | ComplianceRoutes |
| **DT** | HTTP POST /api/compliance/evaluate | Live Express evaluation | Status 200 OK | ComplianceRoutes |
| **DU** | HTTP GET /api/compliance/:portfolioId | Live Express latest evaluation | Status 200 OK | ComplianceRoutes |
| **DV** | HTTP GET /api/compliance/:portfolioId/history | Live Express history list | Status 200 OK | ComplianceRoutes |
| **DW** | HTTP GET /api/compliance/:portfolioId/breaches | Live Express breach history | Status 200 OK | ComplianceRoutes |
| **DX** | HTTP POST /api/compliance/:portfolioId/exception | Live Express exception request | Status 201 Created | ComplianceRoutes |
| **DY** | HTTP POST /api/compliance/exception/:id/approve | Live Express exception approval | Status 200 OK | ComplianceRoutes |
| **DZ** | HTTP POST /api/compliance/:portfolioId/remediation | Live Express remediation plan | Status 200 OK | ComplianceRoutes |
| **EA** | HTTP GET /api/compliance/:portfolioId/audit | Live Express audit retrieval | Status 200 OK | ComplianceRoutes |
| **EB** | HTTP GET /api/compliance/package/:packageId | Live Express package retrieval | Status 200 OK | ComplianceRoutes |
| **EC** | HTTP Auth Header Missing Rejection | Missing x-workspace-id header | Status 401 Unauthorized | ComplianceRoutes |
| **ED** | HTTP Viewer Role Escalation Rejection | Role = VIEWER POST /policy | Status 403 Forbidden | ComplianceRoutes |
| **EE** | HTTP Auditor Role Escalation Rejection | Role = AUDITOR POST /exception | Status 403 Forbidden | ComplianceRoutes |
| **EF** | HTTP Cross-Workspace Access Denial | Cross workspace package access | Status 404 Not Found | ComplianceRoutes |
| **EG** | HTTP Malformed JSON Payload Rejection | Malformed JSON in evaluate | Status 400 Bad Request | ComplianceRoutes |
| **EH** | HTTP Non-Existent Policy Rejection | Invalid policyId in versioning | Status 404 Not Found | ComplianceRoutes |
| **EI** | HTTP Non-Existent Package Rejection | Invalid packageId in retrieval | Status 404 Not Found | ComplianceRoutes |
| **EJ** | HTTP Non-Existent Exception Rejection | Invalid exceptionId in approval | Status 404 Not Found | ComplianceRoutes |
| **EK** | HTTP Deterministic Package Hash Output | Sequential evaluations have hash | SHA-256 verified | ComplianceRoutes |
| **EL** | Mutation: Force Compliance PASS on Breach | Mutant changing BREACH to PASS | Mutant Killed | ComplianceEngine |
| **EM** | Mutation: Force Compliance BREACH on Pass | Mutant changing PASS to BREACH | Mutant Killed | ComplianceEngine |
| **EN** | Mutation: Ignore Policy Version in Evaluation | Mutant ignoring version | Mutant Killed | ComplianceEngine |
| **EO** | Mutation: Relax Position Limit Threshold | Mutant changing 0.10 to 0.50 | Mutant Killed | RuleEngine |
| **EP** | Mutation: Relax Sector Limit Threshold | Mutant changing 0.35 to 0.80 | Mutant Killed | RuleEngine |
| **EQ** | Mutation: Bypass Self-Approval Check | Mutant allowing self-approval | Mutant Killed | ExceptionEngine |
| **ER** | Mutation: Bypass Expiration Check | Mutant ignoring waiver expiry | Mutant Killed | ExceptionEngine |
| **ES** | Mutation: Coerce Missing Price to Zero | Mutant converting null to 0 | Mutant Killed | RuleEngine |
| **ET** | Mutation: Coerce Missing Sector to Other | Mutant converting null to 'Other' | Mutant Killed | RuleEngine |
| **EU** | Mutation: Corrupt Sealed Package Hash | Mutant altering package hash | Mutant Killed | CompliancePackageBuilder |
| **EV** | Mutation: Bypass Cross-Workspace Isolation | Mutant returning all packages | Mutant Killed | ComplianceRepository |
| **EW** | Mutation: Disable Temporal T0 Strictness | Mutant accepting future dates | Mutant Killed | ComplianceInputValidator |
| **EX** | Mutation: Allow Broker Execution In Compliance | Mutant marking isExecuted = true | Mutant Killed | ComplianceEngine |

---

## 2. Summary Statistics

```text
Expected categories: 154
Unique categories: 154
Duplicate IDs: 0
Missing IDs: 0
Unexpected IDs: 0
```
