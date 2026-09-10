# PHASE 13 — HOSTILE AUDIT COVERAGE MATRIX (ATTACKS A THROUGH DM)

## 1. Complete Coverage Matrix (117 Distinct Attack Categories)

| Attack ID | Attack Name | Test Suite / Function | Assertion / Invariant Tested | Result |
| :--- | :--- | :--- | :--- | :--- |
| **A** | Fabricated historical evidence | `phase13HostileAuditAtoDM.js:recordAttack('A')` | `informationAvailableAt` filters post-T0 evidence | **PASS** |
| **B** | Future evidence injection | `phase13HostileAuditAtoDM.js:recordAttack('B')` | Post-T0 items isolated into `rejectedFutureEvidence` | **PASS** |
| **C** | Future news injected into T0 | `phase13HostileAuditAtoDM.js:recordAttack('C')` | Future valuation timestamp in snapshot throws error | **PASS** |
| **D** | Current facts replacing historical facts | `phase13HostileAuditAtoDM.js:recordAttack('D')` | `decisionTimeTruth` preserves original V1 values | **PASS** |
| **E** | Restatement rewriting history | `phase13HostileAuditAtoDM.js:recordAttack('E')` | `historicalDecisionIntegrityPreserved === true` | **PASS** |
| **F** | Fake forecast structure | `phase13HostileAuditAtoDM.js:recordAttack('F')` | Unrecognized `forecastType` strictly throws error | **PASS** |
| **G** | Fake confidence score | `phase13HostileAuditAtoDM.js:recordAttack('G')` | Confidence scores $> 1.0$ strictly rejected | **PASS** |
| **H** | Confidence inflation | `phase13HostileAuditAtoDM.js:recordAttack('H')` | High confidence with zero accuracy triggers `OVERCONFIDENT` | **PASS** |
| **I** | Missing forecast | `phase13HostileAuditAtoDM.js:recordAttack('I')` | Dimension marked `UNAVAILABLE` with reasonCode | **PASS** |
| **J** | Missing outcome observation | `phase13HostileAuditAtoDM.js:recordAttack('J')` | Missing actuals return `INSUFFICIENT_DATA` (never failure) | **PASS** |
| **K** | Conflicting outcome observation | `phase13HostileAuditAtoDM.js:recordAttack('K')` | Deterministic factual resolution applied | **PASS** |
| **L** | Stale outcome observation | `phase13HostileAuditAtoDM.js:recordAttack('L')` | Strict timestamp boundaries enforced | **PASS** |
| **M** | Fabricated catalyst | `phase13HostileAuditAtoDM.js:recordAttack('M')` | Unmatched catalyst IDs do not trigger realization | **PASS** |
| **N** | Price-only thesis validation | `phase13HostileAuditAtoDM.js:recordAttack('N')` | Stock price rally cannot validate broken thesis | **PASS** |
| **O** | Profit implies good decision | `phase13HostileAuditAtoDM.js:recordAttack('O')` | Flawed process + profit = `BAD_DECISION_GOOD_OUTCOME` | **PASS** |
| **P** | Loss implies bad decision | `phase13HostileAuditAtoDM.js:recordAttack('P')` | Strong process + alpha = `GOOD_DECISION_GOOD_OUTCOME` | **PASS** |
| **Q** | Benchmark manipulation | `phase13HostileAuditAtoDM.js:recordAttack('Q')` | Negative excess return marks outcome unfavorable | **PASS** |
| **R** | Survivorship bias | `phase13HostileAuditAtoDM.js:recordAttack('R')` | Low evaluation coverage (<80%) fails bias check | **PASS** |
| **S** | Selection bias | `phase13HostileAuditAtoDM.js:recordAttack('S')` | `evaluationCoverage` truthfully exposes sample ratio | **PASS** |
| **T** | Small sample overconfidence | `phase13HostileAuditAtoDM.js:recordAttack('T')` | $N < 5$ returns `INSUFFICIENT_SAMPLE` | **PASS** |
| **U** | Calibration manipulation | `phase13HostileAuditAtoDM.js:recordAttack('U')` | Empty dataset returns null Brier score without fabrication | **PASS** |
| **V** | Brier score manipulation | `phase13HostileAuditAtoDM.js:recordAttack('V')` | Quadratic formula $(p_i - o_i)^2$ strictly computed | **PASS** |
| **W** | Process score tampering | `phase13HostileAuditAtoDM.js:recordAttack('W')` | Snapshot objects are deeply frozen | **PASS** |
| **X** | Thesis mutation | `phase13HostileAuditAtoDM.js:recordAttack('X')` | Thesis version DAG is immutable | **PASS** |
| **Y** | Decision snapshot mutation | `phase13HostileAuditAtoDM.js:recordAttack('Y')` | Decision price cannot be modified in place | **PASS** |
| **Z** | Evidence mutation | `phase13HostileAuditAtoDM.js:recordAttack('Z')` | Evidence array frozen via `deepFreeze` | **PASS** |
| **AA** | Cross-company contamination | `phase13HostileAuditAtoDM.js:recordAttack('AA')` | Snapshots strictly scoped by ticker | **PASS** |
| **AB** | Cross-workspace contamination | `phase13HostileAuditAtoDM.js:recordAttack('AB')` | Foreign workspace access throws authorization error | **PASS** |
| **AC** | IDOR | `phase13HostileAuditAtoDM.js:recordAttack('AC')` | IDOR lookup across workspaces blocked | **PASS** |
| **AD** | AI score override | `phase13HostileAuditAtoDM.js:recordAttack('AD')` | Scores derived by engine; AI cannot override | **PASS** |
| **AE** | AI outcome override | `phase13HostileAuditAtoDM.js:recordAttack('AE')` | Outcome classifications immutable to AI | **PASS** |
| **AF** | AI historical rewrite | `phase13HostileAuditAtoDM.js:recordAttack('AF')` | Historical decision timestamp immutable | **PASS** |
| **AG** | Prompt injection | `phase13HostileAuditAtoDM.js:recordAttack('AG')` | Prompt injection restricted to read-only tool queries | **PASS** |
| **AH** | Indirect prompt injection | `phase13HostileAuditAtoDM.js:recordAttack('AH')` | Injected note text cannot disable thesis breakers | **PASS** |
| **AI** | Malicious investor note | `phase13HostileAuditAtoDM.js:recordAttack('AI')` | Thesis breaker status intact regardless of note | **PASS** |
| **AJ** | Fabricated learning insight | `phase13HostileAuditAtoDM.js:recordAttack('AJ')` | Zero insights generated without factual evidence | **PASS** |
| **AK** | Unsupported behavioral claim | `phase13HostileAuditAtoDM.js:recordAttack('AK')` | Insights strictly bound to verified evidence types | **PASS** |
| **AL** | Hidden trade recommendation | `phase13HostileAuditAtoDM.js:recordAttack('AL')` | Process layer contains zero trade execution actions | **PASS** |
| **AM** | Position mutation | `phase13HostileAuditAtoDM.js:recordAttack('AM')` | Position size immutable in snapshot | **PASS** |
| **AN** | Portfolio mutation | `phase13HostileAuditAtoDM.js:recordAttack('AN')` | Portfolio context deeply frozen | **PASS** |
| **AO** | Missing source provenance | `phase13HostileAuditAtoDM.js:recordAttack('AO')` | Dimension marked `UNAVAILABLE` | **PASS** |
| **AP** | Fake evidence ID | `phase13HostileAuditAtoDM.js:recordAttack('AP')` | Missing evidence triggers `NO_EVIDENCE_RECORDED` | **PASS** |
| **AQ** | Package hash corruption | `phase13HostileAuditAtoDM.js:recordAttack('AQ')` | Byte tampering immediately alters SHA-256 seal | **PASS** |
| **AR** | Deep-freeze bypass | `phase13HostileAuditAtoDM.js:recordAttack('AR')` | Recursive freezing protects nested objects and arrays | **PASS** |
| **AS** | Nondeterministic output | `phase13HostileAuditAtoDM.js:recordAttack('AS')` | Canonical key sorting guarantees identical hashes | **PASS** |
| **AT** | Concurrency race | `phase13HostileAuditAtoDM.js:recordAttack('AT')` | Parallel hash calculations match byte-for-byte | **PASS** |
| **AU** | Duplicate evaluation | `phase13HostileAuditAtoDM.js:recordAttack('AU')` | Duplicate evaluations yield identical package seal | **PASS** |
| **AV** | Replay attack | `phase13HostileAuditAtoDM.js:recordAttack('AV')` | Duplicate snapshot registration rejected | **PASS** |
| **AW** | Partial failure | `phase13HostileAuditAtoDM.js:recordAttack('AW')` | Partial inputs degrade gracefully with reasonCodes | **PASS** |
| **AX** | Cache poisoning | `phase13HostileAuditAtoDM.js:recordAttack('AX')` | Cached packages are frozen | **PASS** |
| **AY** | Stale package | `phase13HostileAuditAtoDM.js:recordAttack('AY')` | Package seal validates payload currency | **PASS** |
| **AZ** | Malformed LLM output | `phase13HostileAuditAtoDM.js:recordAttack('AZ')` | Deterministic score calculated independently of LLM | **PASS** |
| **BA** | Benchmark-relative inversion | `phase13HostileAuditAtoDM.js:recordAttack('BA')` | Positive absolute return with negative excess caught | **PASS** |
| **BB** | Dividend omission | `phase13HostileAuditAtoDM.js:recordAttack('BB')` | Total return includes dividend distributions | **PASS** |
| **BC** | FX omission | `phase13HostileAuditAtoDM.js:recordAttack('BC')` | Multi-currency returns incorporate FX delta | **PASS** |
| **BD** | Attribution residual fabrication | `phase13HostileAuditAtoDM.js:recordAttack('BD')` | Brinson terms reconcile without fabricated residuals | **PASS** |
| **BE** | Thesis-breaker timing manipulation | `phase13HostileAuditAtoDM.js:recordAttack('BE')` | Breach date preserved independently of awareness | **PASS** |
| **BF** | Catalyst timing manipulation | `phase13HostileAuditAtoDM.js:recordAttack('BF')` | Delayed catalyst realization accurately recorded | **PASS** |
| **BG** | Forecast horizon manipulation | `phase13HostileAuditAtoDM.js:recordAttack('BG')` | Horizon string immutable in forecast record | **PASS** |
| **BH** | Confidence bucket boundary manipulation | `phase13HostileAuditAtoDM.js:recordAttack('BH')` | Strict $[0.50, 0.5999]$ boundaries enforced | **PASS** |
| **BI** | Zero denominator | `phase13HostileAuditAtoDM.js:recordAttack('BI')` | Handled gracefully without producing NaN | **PASS** |
| **BJ** | NaN / Infinity resistance | `phase13HostileAuditAtoDM.js:recordAttack('BJ')` | Decision quality weights resistant to NaN/Infinity | **PASS** |
| **BK** | Negative prediction edge cases | `phase13HostileAuditAtoDM.js:recordAttack('BK')` | Negative predicted values correctly scored | **PASS** |
| **BL** | Zero prediction | `phase13HostileAuditAtoDM.js:recordAttack('BL')` | Zero point prediction scored without div-by-zero | **PASS** |
| **BM** | Negative actual value | `phase13HostileAuditAtoDM.js:recordAttack('BM')` | Negative actuals correctly compared against predictions | **PASS** |
| **BN** | Threshold boundary | `phase13HostileAuditAtoDM.js:recordAttack('BN')` | Exact threshold boundary satisfies GTE | **PASS** |
| **BO** | Range boundary | `phase13HostileAuditAtoDM.js:recordAttack('BO')` | Range minimum is inclusive and VALIDATED | **PASS** |
| **BP** | Insufficient sample as score | `phase13HostileAuditAtoDM.js:recordAttack('BP')` | Sub-threshold observations marked `INSUFFICIENT_SAMPLE` | **PASS** |
| **BQ** | Unresolved position as closed | `phase13HostileAuditAtoDM.js:recordAttack('BQ')` | Active status distinct from closed | **PASS** |
| **BR** | Open position as final outcome | `phase13HostileAuditAtoDM.js:recordAttack('BR')` | Open position without outcome returns `INSUFFICIENT_DATA` | **PASS** |
| **BS** | Current holding selection bias | `phase13HostileAuditAtoDM.js:recordAttack('BS')` | Active holding selection caught via coverage metric | **PASS** |
| **BT** | Historical position deletion | `phase13HostileAuditAtoDM.js:recordAttack('BT')` | Full historical denominator preserved | **PASS** |
| **BU** | Deleted decision referenced by forecast | `phase13HostileAuditAtoDM.js:recordAttack('BU')` | Invalid forecast lookup throws error | **PASS** |
| **BV** | Deleted thesis referenced by outcome | `phase13HostileAuditAtoDM.js:recordAttack('BV')` | Missing thesis version triggers evaluation error | **PASS** |
| **BW** | Unauthorized process package access | `phase13HostileAuditAtoDM.js:recordAttack('BW')` | Nonexistent package lookup returns null safely | **PASS** |
| **BX** | Package replay across workspaces | `phase13HostileAuditAtoDM.js:recordAttack('BX')` | Cross-workspace package replay blocked | **PASS** |
| **BY** | Malicious notes containing fake evidence | `phase13HostileAuditAtoDM.js:recordAttack('BY')` | Future evidence rejected regardless of note text | **PASS** |
| **BZ** | Raw upstream state leakage | `phase13HostileAuditAtoDM.js:recordAttack('BZ')` | Packages sealed canonically without raw memory leakage | **PASS** |
| **CA** | Raw database access through AI | `phase13HostileAuditAtoDM.js:recordAttack('CA')` | Direct SQL/DB queries prohibited for AI Copilot | **PASS** |
| **CB** | Unauthorized Copilot query | `phase13HostileAuditAtoDM.js:recordAttack('CB')` | Copilot tool queries enforce workspace isolation | **PASS** |
| **CC** | Decision review authorization bypass | `phase13HostileAuditAtoDM.js:recordAttack('CC')` | Review workflow records authorized reviewer ID | **PASS** |
| **CD** | Review state tampering | `phase13HostileAuditAtoDM.js:recordAttack('CD')` | Review record deeply frozen | **PASS** |
| **CE** | Process score modification via API | `phase13HostileAuditAtoDM.js:recordAttack('CE')` | Scoring configuration is deeply frozen and immutable | **PASS** |
| **CF** | Backdated post-outcome forecast | `phase13HostileAuditAtoDM.js:recordAttack('CF')` | Post-outcome forecast rejected by temporal boundary | **PASS** |
| **CG** | Timestamp spoofing | `phase13HostileAuditAtoDM.js:recordAttack('CG')` | Invalid/spoofed timestamp throws error | **PASS** |
| **CH** | Timezone boundary errors | `phase13HostileAuditAtoDM.js:recordAttack('CH')` | ISO-8601 UTC timestamps enforce exact temporal order | **PASS** |
| **CI** | Period mismatch | `phase13HostileAuditAtoDM.js:recordAttack('CI')` | Filing date governs availability, not reporting period | **PASS** |
| **CJ** | Restatement period mismatch | `phase13HostileAuditAtoDM.js:recordAttack('CJ')` | Restatement preserves historical decision integrity | **PASS** |
| **CK** | Duplicate observations | `phase13HostileAuditAtoDM.js:recordAttack('CK')` | Deduplication by observation fact ID | **PASS** |
| **CL** | Duplicate forecasts | `phase13HostileAuditAtoDM.js:recordAttack('CL')` | Duplicate forecast ID registration rejected | **PASS** |
| **CM** | Conflicting forecasts | `phase13HostileAuditAtoDM.js:recordAttack('CM')` | Independent forecasts recorded distinctly | **PASS** |
| **CN** | Conflicting thesis versions | `phase13HostileAuditAtoDM.js:recordAttack('CN')` | Thesis DAG preserves revision sequence | **PASS** |
| **CO** | Unsupported causal attribution | `phase13HostileAuditAtoDM.js:recordAttack('CO')` | Labeled `MODEL_ATTRIBUTED` rather than proven causation | **PASS** |
| **CP** | Correlation mistaken for causation | `phase13HostileAuditAtoDM.js:recordAttack('CP')` | Correlation does not imply `CAUSALLY_ESTABLISHED` | **PASS** |
| **CQ** | Price spike as thesis validation | `phase13HostileAuditAtoDM.js:recordAttack('CQ')` | Thesis broken when breaker is tripped despite rally | **PASS** |
| **CR** | Benchmark choice manipulation | `phase13HostileAuditAtoDM.js:recordAttack('CR')` | Excess return calculated against designated benchmark | **PASS** |
| **CS** | Survivorship via deleted decisions | `phase13HostileAuditAtoDM.js:recordAttack('CS')` | Full historical denominator preserved | **PASS** |
| **CT** | Failed investment omitted from scorecard | `phase13HostileAuditAtoDM.js:recordAttack('CT')` | Evaluated count truthfully reflects denominator | **PASS** |
| **CU** | Successful investment overweighted | `phase13HostileAuditAtoDM.js:recordAttack('CU')` | Equal weighting applied across decisions | **PASS** |
| **CV** | Sample-size weighting manipulation | `phase13HostileAuditAtoDM.js:recordAttack('CV')` | Thresholds read from frozen configuration | **PASS** |
| **CW** | Confidence weighting manipulation | `phase13HostileAuditAtoDM.js:recordAttack('CW')` | Forecast weight read from configuration | **PASS** |
| **CX** | Process score hardcoded | `phase13HostileAuditAtoDM.js:recordAttack('CX')` | Process scores computed dynamically from evidence | **PASS** |
| **CY** | LLM-generated deterministic score | `phase13HostileAuditAtoDM.js:recordAttack('CY')` | Scores computed via pure mathematical formulas | **PASS** |
| **CZ** | AI-generated evidence | `phase13HostileAuditAtoDM.js:recordAttack('CZ')` | Post-T0 AI evidence rejected from decision boundary | **PASS** |
| **DA** | AI-generated outcome | `phase13HostileAuditAtoDM.js:recordAttack('DA')` | Actual returns consumed from Truth/Performance | **PASS** |
| **DB** | AI-generated probability | `phase13HostileAuditAtoDM.js:recordAttack('DB')` | Calibration probabilities computed from ledger | **PASS** |
| **DC** | AI-generated forecast | `phase13HostileAuditAtoDM.js:recordAttack('DC')` | Arbitrary forecast schema rejected | **PASS** |
| **DD** | AI-generated thesis mutation | `phase13HostileAuditAtoDM.js:recordAttack('DD')` | Thesis versions deeply frozen | **PASS** |
| **DE** | Malformed package | `phase13HostileAuditAtoDM.js:recordAttack('DE')` | Nonexistent decision package evaluation rejected | **PASS** |
| **DF** | Hash corruption / tampering | `phase13HostileAuditAtoDM.js:recordAttack('DF')` | Modifying payload immediately alters SHA-256 seal | **PASS** |
| **DG** | Cache invalidation failure | `phase13HostileAuditAtoDM.js:recordAttack('DG')` | New package version yields distinct deterministic hash | **PASS** |
| **DH** | Restart recovery | `phase13HostileAuditAtoDM.js:recordAttack('DH')` | Reinstantiated engine reproduces identical output | **PASS** |
| **DI** | Concurrent evaluation isolation | `phase13HostileAuditAtoDM.js:recordAttack('DI')` | Concurrent evaluations maintain strict isolation | **PASS** |
| **DJ** | Multi-tenant isolation | `phase13HostileAuditAtoDM.js:recordAttack('DJ')` | Cross-tenant access strictly blocked | **PASS** |
| **DK** | Production HTTP authorization | `phase13HostileAuditAtoDM.js:recordAttack('DK')` | Routes enforce `x-workspace-id` authorization | **PASS** |
| **DL** | Frontend boundary bypass | `phase13HostileAuditAtoDM.js:recordAttack('DL')` | Frontend consumes only sealed package APIs | **PASS** |
| **DM** | Golden E2E chain integrity | `phase13HostileAuditAtoDM.js:recordAttack('DM')` | Complete causal chain from snapshot to seal verified | **PASS** |
