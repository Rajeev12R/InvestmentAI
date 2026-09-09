# Phase 18 — Hostile Red-Team Audit Category Coverage Matrix

| Category ID | Threat Category | Test Scenario | Assertion Description | Expected Result | Execution Status | Pass/Fail |
|:---|:---|:---|:---|:---|:---|:---|
| A | Data Integrity | Missing ADV | Reject null ADV with UNAVAILABLE | Status UNAVAILABLE | EXECUTED | PASS |
| B | Data Integrity | Zero ADV | Reject zero ADV with INVALID_ADV | Status INVALID_ADV | EXECUTED | PASS |
| C | Data Integrity | Negative ADV | Reject negative ADV with INVALID_ADV | Status INVALID_ADV | EXECUTED | PASS |
| D | Data Integrity | NaN ADV | Reject NaN ADV with INVALID_ADV | Status INVALID_ADV | EXECUTED | PASS |
| E | Data Integrity | Infinity ADV | Reject Infinity ADV with INVALID_ADV | Status INVALID_ADV | EXECUTED | PASS |
| F | Data Integrity | Missing Price | Reject null price with UNAVAILABLE | Status UNAVAILABLE | EXECUTED | PASS |
| G | Data Integrity | Zero Price | Reject zero price with INVALID_PRICE | Status INVALID_PRICE | EXECUTED | PASS |
| H | Data Integrity | Negative Price | Reject negative price with INVALID_PRICE | Status INVALID_PRICE | EXECUTED | PASS |
| I | Quote Integrity | Missing Bid | Reject null bid with UNAVAILABLE | Status UNAVAILABLE | EXECUTED | PASS |
| J | Quote Integrity | Missing Ask | Reject null ask with UNAVAILABLE | Status UNAVAILABLE | EXECUTED | PASS |
| K | Quote Integrity | Inverted Quote | Reject Ask < Bid with INVALID_QUOTE | Status INVALID_QUOTE | EXECUTED | PASS |
| L | Quote Integrity | Zero Bid | Reject zero bid with INVALID_QUOTE | Status INVALID_QUOTE | EXECUTED | PASS |
| M | Quote Integrity | Zero Ask | Reject zero ask with INVALID_QUOTE | Status INVALID_QUOTE | EXECUTED | PASS |
| N | Quote Integrity | NaN Bid | Reject NaN bid with INVALID_QUOTE | Status INVALID_QUOTE | EXECUTED | PASS |
| O | Quote Integrity | Infinity Ask | Reject Infinity ask with INVALID_QUOTE | Status INVALID_QUOTE | EXECUTED | PASS |
| P | Order Integrity | Null Order | Reject missing qty/notional | Status INVALID_QUANTITY | EXECUTED | PASS |
| Q | Order Integrity | Negative Qty | Reject negative quantity | Status INVALID_QUANTITY | EXECUTED | PASS |
| R | Order Integrity | Negative Notional | Reject negative notional | Status INVALID_QUANTITY | EXECUTED | PASS |
| S | Order Integrity | NaN Quantity | Reject NaN quantity | Status INVALID_QUANTITY | EXECUTED | PASS |
| T | Volume History | Empty History | Empty volume history is UNAVAILABLE | Status UNAVAILABLE | EXECUTED | PASS |
| U | Volume History | Non-Numeric | Non-numeric volume is UNAVAILABLE | Status UNAVAILABLE | EXECUTED | PASS |
| V | Dollar ADV | Null ADV | Dollar ADV with null ADV is UNAVAILABLE | Status UNAVAILABLE | EXECUTED | PASS |
| W | Dollar ADV | Null Price | Dollar ADV with null price is UNAVAILABLE | Status UNAVAILABLE | EXECUTED | PASS |
| X | Participation | Negative Order | Negative participation rejected | Status INVALID_QUANTITY | EXECUTED | PASS |
| Y | Participation | Zero ADV | Zero ADV participation rejected | Status INVALID_ADV | EXECUTED | PASS |
| Z | Tiering | Null Dollar ADV | Null Dollar ADV returns UNKNOWN tier | Tier UNKNOWN | EXECUTED | PASS |
| AA | Impact Model | Null Notional | Null notional impact rejected | Status INVALID_QUANTITY | EXECUTED | PASS |
| AB | Impact Model | Null ADV | Null ADV impact rejected | Status UNAVAILABLE | EXECUTED | PASS |
| AC | Impact Model | Negative Notional | Negative notional impact rejected | Status INVALID_QUANTITY | EXECUTED | PASS |
| AD | Impact Model | Negative ADV | Negative ADV impact rejected | Status INVALID_ADV | EXECUTED | PASS |
| AE | Impact Model | Custom Coeff | Custom coefficient processed safely | Status PASS | EXECUTED | PASS |
| AF | Trading Cost | Null Notional | Null notional cost rejected | Status INVALID_QUANTITY | EXECUTED | PASS |
| AG | Trading Cost | Null ADV | Null ADV cost rejected | Status UNAVAILABLE | EXECUTED | PASS |
| AH | Trading Cost | Negative Notional | Negative notional cost rejected | Status INVALID_QUANTITY | EXECUTED | PASS |
| AI | Horizon | Null Qty | Null quantity horizon rejected | Status INVALID_QUANTITY | EXECUTED | PASS |
| AJ | Horizon | Null ADV | Null ADV horizon rejected | Status UNAVAILABLE | EXECUTED | PASS |
| AK | Horizon | Zero ADV | Zero ADV horizon rejected | Status INVALID_ADV | EXECUTED | PASS |
| AL | Horizon | Zero Part Limit | Zero participation rate rejected | Status INVALID_INPUT | EXECUTED | PASS |
| AM | Horizon | Negative Part | Negative participation rate rejected | Status INVALID_INPUT | EXECUTED | PASS |
| AN | Horizon | Excess Part | >100% participation limit rejected | Status INVALID_INPUT | EXECUTED | PASS |
| AO | Capacity | Null ADV | Null ADV position capacity rejected | Status UNAVAILABLE | EXECUTED | PASS |
| AP | Capacity | Zero ADV | Zero ADV position capacity rejected | Status INVALID_ADV | EXECUTED | PASS |
| AQ | Capacity | Empty Strategy | Empty strategy positions rejected | Status INVALID_INPUT | EXECUTED | PASS |
| AR | Capacity | Null Strategy ADV | Position with null ADV rejected | Status UNAVAILABLE | EXECUTED | PASS |
| AS | Constraint | Null ADV | Constraint with null ADV rejected | Status UNAVAILABLE | EXECUTED | PASS |
| AT | Constraint | Null Portfolio | Constraint with null portfolio rejected | Status INVALID_INPUT | EXECUTED | PASS |
| AU | Constraint | Zero Portfolio | Constraint with zero portfolio rejected | Status INVALID_INPUT | EXECUTED | PASS |
| AV | Constraint | Negative Notional | Negative proposed notional rejected | Status INVALID_INPUT | EXECUTED | PASS |
| AW | Feasibility | Null Qty | Null quantity feasibility rejected | Status INVALID_QUANTITY | EXECUTED | PASS |
| AX | Feasibility | Null ADV | Null ADV returns UNKNOWN feasibility | Feasibility UNKNOWN | EXECUTED | PASS |
| AY | Feasibility | Inverted Quote | Inverted quote feasibility rejected | Status INVALID_QUOTE | EXECUTED | PASS |
| AZ | Rebalance | Null Portfolio | Null portfolio value rebalance rejected | Status INVALID_INPUT | EXECUTED | PASS |
| BA | Stress | Null Notional | Null notional stress rejected | Status INVALID_QUANTITY | EXECUTED | PASS |
| BB | Stress | Null ADV | Null ADV stress rejected | Status UNAVAILABLE | EXECUTED | PASS |
| BC | Stress | Zero Multiplier | Zero stress multiplier rejected | Status INVALID_INPUT | EXECUTED | PASS |
| BD | Stress | Negative Mult | Negative stress multiplier rejected | Status INVALID_INPUT | EXECUTED | PASS |
| BE | Single Security | Null Observation | Null observation rejected | Status INVALID_INPUT | EXECUTED | PASS |
| BF | Single Security | Null ADV | Observation with null ADV rejected | Status UNAVAILABLE | EXECUTED | PASS |
| BG | Single Security | Null Price | Observation with null price rejected | Status UNAVAILABLE | EXECUTED | PASS |
| BH | Single Security | Inverted Quote | Observation with inverted quote rejected | Status INVALID_QUOTE | EXECUTED | PASS |
| BI | Portfolio | Null Portfolio | Null portfolio rejected | Status INVALID_INPUT | EXECUTED | PASS |
| BJ | Portfolio | Empty Positions | Empty portfolio positions rejected | Status INVALID_INPUT | EXECUTED | PASS |
| BK | Portfolio | Missing FX | Missing FX rate rejected | Status FX_UNAVAILABLE | EXECUTED | PASS |
| BL | Freshness | Null Timestamp | Null observation timestamp rejected | Status UNAVAILABLE | EXECUTED | PASS |
| BM | Freshness | Look-ahead | Future observation relative to asOf rejected | Status TEMPORAL_VIOLATION | EXECUTED | PASS |
| BN | Freshness | Stale Data | Stale observation flagged as STALE | Status STALE | EXECUTED | PASS |
| BO | Score | Null ADV | Score calculation with null ADV rejected | Status UNAVAILABLE | EXECUTED | PASS |
| BP | Score | Zero ADV | Score calculation with zero ADV rejected | Status UNAVAILABLE | EXECUTED | PASS |
| BQ | Rebalance | Empty Trades | Empty trades rebalance rejected | Status INVALID_INPUT | EXECUTED | PASS |
| BR | Package | Null Payload | Null package payload rejected | Status INVALID_INPUT | EXECUTED | PASS |
| BS | Package | Null Verify | Null package verification fails | Return false | EXECUTED | PASS |
| BT | Package | Empty Verify | Empty package verification fails | Return false | EXECUTED | PASS |
| BU | Package | Corrupted Hash | Corrupted package hash fails verification | Return false | EXECUTED | PASS |
| BV | Cost | Unknown Jur | Unknown jurisdiction handled gracefully | Status PASS | EXECUTED | PASS |
| BW | Horizon | Dual Inputs | Dual quantity and notional inputs resolved | Status PASS | EXECUTED | PASS |
| BX | Feasibility | Notional Input | Feasibility from notional alone passes | Status PASS | EXECUTED | PASS |
| BY | Capacity | Custom Limit | Custom participation capacity respected | Verified Max Daily | EXECUTED | PASS |
| BZ | Stress | Custom Stress | Custom multipliers evaluated | Status PASS | EXECUTED | PASS |
| CA | Repository | Missing WS | Nonexistent workspace returns null | Return null | EXECUTED | PASS |
| CB | Repository | Missing Feas | Nonexistent workspace returns empty feas | Empty array | EXECUTED | PASS |
| CC | Repository | Missing Pkg | Nonexistent package returns null | Return null | EXECUTED | PASS |
| CD | Repository | Missing Logs | Nonexistent audit logs return empty | Empty array | EXECUTED | PASS |
| CE | Copilot | Null WS | Null workspace Copilot query rejected | Status UNAVAILABLE | EXECUTED | PASS |
| CF | Copilot | Null Ticker | Null ticker Copilot query rejected | Status INVALID_INPUT | EXECUTED | PASS |
| CG | Copilot | Missing Feas | Missing ticker feasibility rejected | Status UNAVAILABLE | EXECUTED | PASS |
| CH | Copilot | Missing Stress | Missing ticker stress rejected | Status UNAVAILABLE | EXECUTED | PASS |
| CI | Metrics | Zero Spread | Zero spread quote handled accurately | Spread 0 bps | EXECUTED | PASS |
| CJ | Quotes | Identical Quotes | Identical bid and ask valid | Return true | EXECUTED | PASS |
| CK | Quotes | 1 Cent Inversion | Inverted by 1 cent rejected | Return false | EXECUTED | PASS |
| CL | Quotes | Microscopic Bid | Microscopic positive quotes valid | Return true | EXECUTED | PASS |
| CM | Quotes | Micro Negative | Microscopic negative bid rejected | Return false | EXECUTED | PASS |
| CN | Price | Micro Price | Microscopic positive price valid | Return true | EXECUTED | PASS |
| CO | Price | Micro Negative | Microscopic negative price rejected | Return false | EXECUTED | PASS |
| CP | ADV | 1 Share ADV | 1 share ADV valid | Return true | EXECUTED | PASS |
| CQ | ADV | Fractional ADV | Fractional ADV valid | Return true | EXECUTED | PASS |
| CR | ADV | Frac Negative | Fractional negative ADV rejected | Return false | EXECUTED | PASS |
| CS | Horizon | 1 Day Min | Minimum 1 day liquidation enforced | Days 1 | EXECUTED | PASS |
| CT | Horizon | Huge Order | Multi-thousand day liquidation not truncated | Days 1000 | EXECUTED | PASS |
| CU | Cost | Zero Commission | Zero commission schedule allowed | Commission 0 bps | EXECUTED | PASS |
| CV | Cost | High Commission | High commission schedule allowed | Commission 100 bps | EXECUTED | PASS |
| CW | Capacity | Single Asset | Single asset strategy bottleneck evaluated | Bottleneck evaluated | EXECUTED | PASS |
| CX | Constraint | Zero Notional | Zero proposed position is compliant | Compliant true | EXECUTED | PASS |
| CY | Constraint | Giant Notional | Huge position breaches constraint | Compliant false | EXECUTED | PASS |
| CZ | Rebalance | Zero Delta | Zero-delta rebalance trade filtered | Filtered | EXECUTED | PASS |
| DA | Cost | Round Trip Dir | Round-trip direction verified | Direction ROUND_TRIP | EXECUTED | PASS |
| DB | Cost | Round Trip Side | Round-trip side verified | Direction ROUND_TRIP | EXECUTED | PASS |
| DC | Cost | One Way Dir | One-way direction verified | Direction ONE_WAY | EXECUTED | PASS |
| DD | Tiering | Tier 1 Exact | Tier 1 exact boundary verified | Tier 1 High | EXECUTED | PASS |
| DE | Tiering | Tier 2 Upper | Tier 2 upper boundary verified | Tier 2 Moderate | EXECUTED | PASS |
| DF | Tiering | Tier 2 Exact | Tier 2 exact boundary verified | Tier 2 Moderate | EXECUTED | PASS |
| DG | Tiering | Tier 3 Upper | Tier 3 upper boundary verified | Tier 3 Low | EXECUTED | PASS |
| DH | Tiering | Tier 3 Exact | Tier 3 exact boundary verified | Tier 3 Low | EXECUTED | PASS |
| DI | Tiering | Tier 4 Upper | Tier 4 upper boundary verified | Tier 4 Illiquid | EXECUTED | PASS |
| DJ | Tiering | Wide Spread Downgrade | High ADV wide spread downgraded to Tier 2 | Tier 2 Moderate | EXECUTED | PASS |
| DK | Tiering | Very Wide Downgrade | High ADV wide spread downgraded to Tier 3 | Tier 3 Low | EXECUTED | PASS |
| DL | Score | Mega Cap | Mega-cap high liquidity score >= 95 | Score >= 95 | EXECUTED | PASS |
| DM | Score | Micro Cap | Micro-cap illiquid score <= 20 | Score <= 20 | EXECUTED | PASS |
| DN | Impact | Linear Model | Linear impact model selectable | Type LINEAR | EXECUTED | PASS |
| DO | Impact | Sqrt Model | Square root impact model default | Type SQUARE_ROOT | EXECUTED | PASS |
| DP | Stress | ADV -25% | ADV -25% multiplier verified | Multiplier 0.75 | EXECUTED | PASS |
| DQ | Stress | ADV -75% | ADV -75% multiplier verified | Multiplier 0.25 | EXECUTED | PASS |
| DR | Stress | Spread 1.5x | Spread 1.5x multiplier verified | Multiplier 1.5 | EXECUTED | PASS |
| DS | Stress | Spread 2.0x | Spread 2.0x multiplier verified | Multiplier 2.0 | EXECUTED | PASS |
| DT | Stress | Impact 1.5x | Impact 1.5x multiplier verified | Multiplier 1.5 | EXECUTED | PASS |
| DU | Stress | Impact 2.0x | Impact 2.0x multiplier verified | Multiplier 2.0 | EXECUTED | PASS |
| DV | Feasibility | Strict Limit | Stricter custom participation limit triggers constraint | Constraint flagged | EXECUTED | PASS |
| DW | Feasibility | Strict Days | Strict 2-day limit makes 10-day trade INFEASIBLE | Feasibility INFEASIBLE | EXECUTED | PASS |
| DX | Rebalance | Giant Illiquid | Illiquid giant rebalance trade INFEASIBLE | Status INFEASIBLE | EXECUTED | PASS |
| DY | Portfolio | Multi Position | Multi-position portfolio evaluated | 2 Positions | EXECUTED | PASS |
| DZ | Portfolio | Single HHI | Single asset portfolio liquidity HHI is 10,000 | HHI 10,000 | EXECUTED | PASS |
| EA | Freshness | Prime Date | Same-day timestamp is PRIME | Status PRIME | EXECUTED | PASS |
| EB | Freshness | Acceptable Date | 2-day old timestamp is ACCEPTABLE | Status ACCEPTABLE | EXECUTED | PASS |
| EC | ADV | Few Observations | Fewer observations than window handled safely | Observation count 3 | EXECUTED | PASS |
| ED | ADV | Max Window Cap | Window caps observation count to 5 | Observation count 5 | EXECUTED | PASS |
| EE | Taxes | US 0 Tax | US transaction tax is 0 | Tax $0 | EXECUTED | PASS |
| EF | Taxes | India STT | India transaction tax (STT) is strictly positive | STT > 0 | EXECUTED | PASS |
| EG | Horizon | Zero Remainder | Schedule remaining quantity reaches 0 on completion | Remaining 0 | EXECUTED | PASS |
| EH | Capacity | Custom Days | Custom maxLiquidationDays capacity respected | Notional verified | EXECUTED | PASS |
| EI | Capacity | Bottleneck B | Strategy bottleneck security B correctly identified | Bottleneck B | EXECUTED | PASS |
| EJ | Constraint | Max Weight | Max allowed weight is 25% | Max weight 0.25 | EXECUTED | PASS |
| EK | Feasibility | Spread Friction | 60 bps spread triggers wide spread friction condition | CONDITIONALLY_FEASIBLE | EXECUTED | PASS |
| EL | Rebalance | Highly Liquid | Highly liquid rebalance trade evaluated as FEASIBLE | Status FEASIBLE | EXECUTED | PASS |
| EM | Portfolio | 100% Illiquid | 100% illiquid portfolio exposure identified | Illiquid 100% | EXECUTED | PASS |
| EN | Package | Package Version | Sealed package version constant verified | Version V1.0 | EXECUTED | PASS |
| EO | Package | Configured Status | Package dataStatus is CONFIGURED | Status CONFIGURED | EXECUTED | PASS |
| EP | Repository | Save Obs | Observation saved successfully | Saved AAPL | EXECUTED | PASS |
| EQ | Repository | Save Feas | Feasibility record assigned ID | ID generated | EXECUTED | PASS |
| ER | Repository | Save Pkg | Package saved in repository | Package saved | EXECUTED | PASS |
| ES | Copilot | Valid Feas | Copilot queries valid AAPL feasibility | Status PASS | EXECUTED | PASS |
| ET | Explanation | Security UNAVAILABLE | Null security explanation contains UNAVAILABLE | Contains text | EXECUTED | PASS |
| EU | Explanation | Feas Cannot Proceed | Null feasibility explanation indicates cannot proceed | Contains text | EXECUTED | PASS |
| EV | Explanation | Stress UNAVAILABLE | Null stress explanation contains UNAVAILABLE | Contains text | EXECUTED | PASS |
| EW | Freshness | Malformed Date | Malformed date string returns UNAVAILABLE | Status UNAVAILABLE | EXECUTED | PASS |
| EX | Policy | Immutability | Policy versions POL-LIQ-INST-V1 and V2 immutably configured | Verified | EXECUTED | PASS |
