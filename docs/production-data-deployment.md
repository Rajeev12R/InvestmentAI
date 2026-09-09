# Production Data Ingestion Deployment — Phase 10

## 1. Provider Status & Environment Classification

| Provider Feed | Environment | Deployment Mode | Freshness Policy | Rate Limit |
| :--- | :--- | :--- | :--- | :--- |
| **SEC EDGAR** | Production Interface | Event-Driven Ingestion | As Published | 10 req/sec |
| **NSE / BSE India** | Production Interface | Periodic Polling / XML Feed | Daily / Quarterly | 5 req/sec |
| **Yahoo Finance** | Production Interface | REST Polling Adapter | 15-Minute Interval | 120 req/min |
| **FRED Federal Reserve** | Production Interface | Daily Reference Ingestion | Daily EOD | 120 req/min |
| **ECB Reference FX** | Production Interface | Daily XML Ingestion | 16:00 CET | 60 req/min |
| **Google News Syndicate** | Production Interface | RSS / Atom Polling | Hourly | 60 req/min |

## 2. Ingestion Priority Queues
* **CRITICAL:** Immediate priority (Trading halts, corporate action announcements).
* **HIGH:** Earnings release, material 8-K filings, guidance updates.
* **NORMAL:** Daily fundamentals and end-of-day market price updates.
* **LOW:** Historical dataset backfills and archive indexing.
