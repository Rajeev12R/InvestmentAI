# Accounting Consistency & Identity Engine

## Overview

The Accounting Consistency Engine performs deterministic cross-statement verification across financial statements. Financial statements submitted by issuers or third parties often contain subtle unit conversion errors, signage differences (e.g. CapEx reported as positive vs negative), or internal contradictions.

## Supported Accounting Identities

### 1. Free Cash Flow Identity
$$\text{Free Cash Flow} = \text{Operating Cash Flow} - \text{Capital Expenditures}$$
- **Verification Rule**: Checks whether reported or derived Free Cash Flow matches $CFO - CapEx$ within defined tolerance (0.1% or $1M threshold).

### 2. Net Debt Identity
$$\text{Net Debt} = \text{Total Debt} - \text{Cash \& Cash Equivalents}$$
- **Verification Rule**: Asserts balance sheet consistency across short-term debt, long-term debt, and liquid cash balances.

### 3. Diluted EPS Identity
$$\text{Diluted EPS} = \frac{\text{Net Income}}{\text{Diluted Weighted Average Shares}}$$
- **Verification Rule**: Confirms alignment between income statement earnings per share and primary share count disclosures.

### 4. Market Capitalization Identity
$$\text{Market Capitalization} = \text{Spot Share Price} \times \text{Diluted Shares}$$
- **Verification Rule**: Verifies market valuation calculations against normalized sovereign share counts.

## Output Severity Tiers

- **`PASS`**: Computed difference is zero or within strict floating-point tolerance.
- **`WARNING`**: Small rounding discrepancy (< 1.0%) due to multi-decimal rounding or minor disclosure timing differences.
- **`CONFLICT`**: Significant arithmetic contradiction (> 1.0%); flagged to auditor and marked in Quality Score.
- **`UNAVAILABLE`**: One or more required accounting components are not disclosed by the reporting entity.
