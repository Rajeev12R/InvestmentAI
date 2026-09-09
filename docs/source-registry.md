# Institutional Source Registry & Capability Matrix — Phase 10

## 1. Source Tiers & Classification

| Source Tier | Authority Level | Description | Example Providers |
| :--- | :---: | :--- | :--- |
| **TIER_1_PRIMARY** | Weight: 100 | Direct regulatory statutory filings and exchange feeds. | SEC EDGAR, NSE India, BSE India |
| **TIER_2_REGULATED** | Weight: 80 | Central banks, sovereign institutions, and official statistical agencies. | Federal Reserve (FRED), ECB |
| **TIER_3_SECONDARY** | Weight: 50 | Financial aggregators, syndicate news, and commercial market data vendors. | Yahoo Finance, AlphaVantage, GNews |
| **TIER_4_UNVERIFIED** | Weight: 10 | Unregulated web feeds, social commentary, and third-party notes. | Social feeds, unverified blogs |

---

## 2. Institutional Capability Matrix

| Source ID | Provider Name | Quotes | Fundamentals | Filings | Corporate Actions | News | FX | Macro |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `SRC-SEC-EDGAR` | SEC EDGAR System | ✗ | **YES** | **YES** | **YES** | ✗ | ✗ | ✗ |
| `SRC-NSE-BSE-INDIA` | National Stock Exchange | **YES** | **YES** | **YES** | **YES** | ✗ | ✗ | ✗ |
| `SRC-YAHOO-FINANCE` | Yahoo Finance Feed | **YES** | **YES** | ✗ | **YES** | **YES** | **YES** | ✗ |
| `SRC-FRED-MACRO` | Federal Reserve FRED | ✗ | ✗ | ✗ | ✗ | ✗ | **YES** | **YES** |
| `SRC-ECB-FX` | European Central Bank | ✗ | ✗ | ✗ | ✗ | ✗ | **YES** | **YES** |
| `SRC-GNEWS-FEED` | Google News Syndicate | ✗ | ✗ | ✗ | ✗ | **YES** | ✗ | ✗ |
