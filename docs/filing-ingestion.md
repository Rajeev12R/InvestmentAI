# Regulatory Filing Ingestion & Document Versioning — Phase 10

## 1. Supported Document Types
* **US Issuers (SEC EDGAR):** 10-K (Annual), 10-Q (Quarterly), 8-K (Current Event), 20-F (Foreign Private Issuer Annual), 6-K (Foreign Private Issuer Semi-Annual).
* **Indian Issuers (NSE/BSE):** Annual Audited Reports, Quarterly Financial Results, Shareholding Disclosures, Board Resolutions.

## 2. Document Immutability & Versioning
* **Raw Document Hash:** Every retrieved document produces a SHA-256 `contentHash`.
* **Multi-Version Preservation:** If an issuer or provider amends a filing (e.g. 10-K/A or revised PDF), the system creates Version 2 (`V2`) while preserving Version 1 (`V1`) in perpetuity.
* **Traceable Reference:** Financial truth updates reference the exact document version and content hash.
