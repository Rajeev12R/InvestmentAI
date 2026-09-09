# InvestmentAI — Phase 6 Canonical Event Taxonomy

## Event Taxonomy & Classification Matrix

InvestmentAI classifies all external market disclosures and regulatory filings into a standardized, deterministic taxonomy across 6 core domains.

---

### 1. Financial & Reporting Events

| Event Type | Identifier | Primary Sources | Trigger / Detection Rules | Deterministic Materiality |
| :--- | :--- | :--- | :--- | :--- |
| **Annual Report** | `ANNUAL_REPORT` | SEC EDGAR, Official IR | Form 10-K, Form 20-F, Annual Audited Statements | `HIGH` |
| **Quarterly Report** | `QUARTERLY_REPORT` | SEC EDGAR, Official IR | Form 10-Q, Half-Year / Quarterly Statements | `HIGH` |
| **Earnings Release** | `EARNINGS_RELEASE` | SEC 8-K Item 2.02, PR Wires | Quarterly results, press releases, revenue/EPS disclosures | `HIGH` |
| **Revenue Revision** | `REVENUE_CHANGE` | SEC Filings, Data Wires | Verified revenue recalculation or revision | `MEDIUM` |
| **Earnings Revision** | `EARNINGS_CHANGE` | SEC Filings, Data Wires | Verified operating income / net income adjustments | `MEDIUM` |
| **Margin Change** | `MARGIN_CHANGE` | Financial Statements | Significant gross or operating margin variance | `MEDIUM` |
| **Cash Flow Change** | `CASH_FLOW_CHANGE` | Cash Flow Statements | Free cash flow / operating cash flow shifts | `HIGH` |
| **Debt Change** | `DEBT_CHANGE` | Balance Sheet Updates | Borrowing increases or principal paydowns | `HIGH` |
| **CapEx Revision** | `CAPEX_CHANGE` | Periodic Filings | Capital expenditure revisions | `MEDIUM` |
| **Guidance Change** | `GUIDANCE_CHANGE` | SEC 8-K, IR Disclosures | Full-year revenue / EBITDA outlook hikes or cuts | `HIGH` |

---

### 2. Corporate Actions

| Event Type | Identifier | Primary Sources | Trigger / Detection Rules | Deterministic Materiality |
| :--- | :--- | :--- | :--- | :--- |
| **Acquisition** | `ACQUISITION` | SEC 8-K Item 1.01, IR | Definitive merger or buyout agreements | `HIGH` |
| **Divestiture** | `DIVESTITURE` | SEC Filings, Exchange | Sale of corporate assets, business units | `MEDIUM` |
| **Merger** | `MERGER` | Regulatory Filings | Statutory mergers and combinations | `CRITICAL` |
| **Spinoff** | `SPINOFF` | SEC Form 10, Press Releases | Separation of operating subsidiary | `HIGH` |
| **Share Repurchase** | `BUYBACK` | SEC 8-K, Board Notices | Authorization or execution of buyback programs | `MEDIUM` |
| **Dividend Revision** | `DIVIDEND_CHANGE` | Exchange Notices, IR | Dividend hikes, cuts, special dividend declarations | `MEDIUM` |
| **Stock Split** | `STOCK_SPLIT` | Exchange Notices | Forward or reverse share splits | `LOW` |
| **Share Issuance** | `SHARE_ISSUANCE` | SEC S-3/424B, Exchange | Secondary offerings or equity dilution | `HIGH` |
| **Debt Issuance** | `DEBT_ISSUANCE` | SEC 8-K, Prospectus | Senior note or bond issuances | `MEDIUM` |

---

### 3. Governance & Management

| Event Type | Identifier | Primary Sources | Trigger / Detection Rules | Deterministic Materiality |
| :--- | :--- | :--- | :--- | :--- |
| **CEO Transition** | `CEO_CHANGE` | SEC 8-K Item 5.02, IR | Chief Executive departure, replacement, appointment | `HIGH` |
| **CFO Transition** | `CFO_CHANGE` | SEC 8-K Item 5.02, IR | Chief Financial Officer resignation or transition | `HIGH` |
| **Board Alteration** | `BOARD_CHANGE` | SEC Filings, Exchange | Director additions, departures, proxy updates | `LOW` |
| **Governance Event**| `GOVERNANCE_EVENT`| Proxy Statements, SEC | Shareholder proposals, voting rule changes | `MEDIUM` |

---

### 4. Regulatory, Legal & Forensic

| Event Type | Identifier | Primary Sources | Trigger / Detection Rules | Deterministic Materiality |
| :--- | :--- | :--- | :--- | :--- |
| **Regulatory Action** | `REGULATORY_ACTION` | Regulators, DOJ, SEC | Formal enforcement, penalties, antitrust inquiries | `CRITICAL` |
| **Major Lawsuit** | `LAWSUIT` | Court Filings, Wires | Material litigation filed against the company | `HIGH` |
| **Investigation** | `INVESTIGATION` | Official Inquiries | Formal probes, subpoenas, accounting queries | `CRITICAL` |
| **Restatement** | `ACCOUNTING_RESTATEMENT` | SEC 8-K Item 4.02 | Material accounting restatements, weaknesses | `CRITICAL` |

---

### 5. Market Shocks

| Event Type | Identifier | Primary Sources | Trigger / Detection Rules | Deterministic Materiality |
| :--- | :--- | :--- | :--- | :--- |
| **Price Move** | `PRICE_MOVE` | Market Wires (Tier 2) | Significant intraday or multi-day price dislocations | `MEDIUM` |
| **Volume Spike** | `VOLUME_SPIKE` | Exchange Data Feed | Trading volume exceeding 3.0σ above 30D average | `LOW` |
| **Volatility Spike** | `VOLATILITY_SPIKE` | Options / Market Data | Implied or realized volatility surge | `MEDIUM` |
| **52-Week High** | `52W_HIGH` | Market Feed | Security reaches 52-week peak | `LOW` |
| **52-Week Low** | `52W_LOW` | Market Feed | Security reaches 52-week trough | `LOW` |

---

### 6. External & Macro

| Event Type | Identifier | Primary Sources | Trigger / Detection Rules | Deterministic Materiality |
| :--- | :--- | :--- | :--- | :--- |
| **Macro Shock** | `MACRO_EVENT` | Central Banks, Macro Wire | Interest rate hikes, inflation reports, FX shifts | `MEDIUM` |
| **Sector Event** | `SECTOR_EVENT` | Industry Bodies, Regulators | Regulatory shifts impacting entire sector peer group | `MEDIUM` |
| **Competitor Event**| `COMPETITOR_EVENT`| Peer Disclosures | Major product launch or pricing move by peer | `LOW` |
