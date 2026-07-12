# Investment AI

An AI-powered Investment Research Agent that performs due diligence like a junior investment analyst. Given a company name, the agent gathers structured evidence from multiple sources, analyzes financial and market indicators, evaluates potential risks and opportunities, and produces an explainable investment recommendation with a confidence score.

Rather than relying on a single LLM response, the system follows an agentic workflow where individual research modules collect factual evidence before an AI reasoning engine synthesizes the findings into a final investment report.

---

# Initial Planning

## Objective

The goal is to build an AI Investment Research Agent that mimics the workflow of a real investment analyst.

A professional investor never decides whether to invest immediately. Instead, they:

- Collect evidence
- Analyze company fundamentals
- Evaluate financial performance
- Understand market positioning
- Assess potential risks
- Identify future growth opportunities
- Compare against competitors
- Form a recommendation backed by evidence

The agent follows the same structured process.

```
                Company Name
                      │
                      ▼
           Evidence Collection
                      │
                      ▼
            Evidence Analysis
                      │
                      ▼
             Risk Assessment
                      │
                      ▼
         Investment Recommendation
                      │
                      ▼
           Explainable Research Report
```

---

# Research Framework

The agent performs research across multiple dimensions before making an investment recommendation.

## 1. Company Profile

The agent gathers the company's basic information.

- Company Name
- Industry
- Headquarters
- Founded Year
- CEO
- Employee Count
- Business Model
- Revenue Streams
- Products & Services
- Public / Private Status
- IPO Details (if applicable)

---

## 2. Business Overview

Understand how the company operates.

- What problem does the company solve?
- Who are its customers?
- How does it generate revenue?
- Is market demand increasing?

---

## 3. Financial Analysis

Evaluate the company's financial health.

- Revenue
- Revenue Growth
- Net Profit
- Profit Margin
- Operating Margin
- Cash Flow
- Debt
- Assets
- Liabilities
- Earnings Per Share (EPS)
- Price-to-Earnings (P/E) Ratio
- Market Capitalization
- Enterprise Value
- Return on Equity (ROE)
- Return on Assets (ROA)
- Current Ratio
- Quick Ratio
- Free Cash Flow
- Dividend Information

---

## 4. Stock Performance

Analyze historical stock performance.

- Current Price
- 52 Week High
- 52 Week Low
- 1 Month Performance
- 6 Month Performance
- 1 Year Performance
- 5 Year Performance
- Volatility
- Average Trading Volume
- Beta
- Overall Trend

---

## 5. Market Position

Understand the company's competitive landscape.

- Major Competitors
- Market Share
- Industry Leadership
- Competitive Moat
- Brand Strength
- Customer Loyalty
- Switching Cost

---

## 6. News & Market Sentiment

Analyze recent developments affecting the company.

- Latest News (Last 30 Days)
- Positive News
- Neutral News
- Negative News
- Overall Market Sentiment

---

## 7. Risk Assessment

Identify factors that could negatively impact future performance.

- Legal Issues
- Debt Risk
- Competitive Risk
- Political & Geopolitical Risk
- Supply Chain Risk
- Currency Risk
- Cybersecurity Risks
- ESG Concerns
- Regulatory Challenges

---

## 8. Growth Opportunities

Identify potential future growth drivers.

- AI Adoption
- Product Expansion
- Acquisitions
- New Product Launches
- International Expansion
- Emerging Markets
- Future Industry Demand

---

## 9. Market Consensus

Understand how professional analysts view the company.

- Buy / Hold / Sell Rating
- Average Target Price

---

## 10. Insider Activity

Analyze confidence from company insiders and institutional investors.

- Insider Buying / Selling
- CEO Share Transactions
- Institutional Holdings
- Mutual Fund Holdings
- FII / DII Activity

---

## 11. ESG Analysis

Evaluate long-term sustainability.

- Environmental Factors
- Social Responsibility
- Corporate Governance

---

## 12. Valuation Analysis

Determine whether the company appears fairly valued.

- Overvalued / Undervalued
- P/E Comparison with Industry
- Relative Valuation

---

## 13. Competitor Comparison

Compare the company with major competitors across important metrics.

- Revenue
- Profit
- Growth
- Market Cap
- Debt
- P/E Ratio
- Market Position

---

## 14. AI Investment Reasoning

The AI synthesizes all collected evidence into an explainable recommendation.

The recommendation includes:

- Key Strengths
- Key Weaknesses
- Major Risks
- Growth Drivers
- Final Recommendation
- Supporting Reasoning

---

## 15. Confidence Score

Finally, the agent estimates its confidence in the recommendation.

The confidence score considers:

- Completeness of collected data
- Reliability of available evidence
- Agreement across multiple indicators
- Consistency between financials, news, and market sentiment

---

# Overall Workflow

```
Company
    │
    ▼
Company Research
    │
    ▼
Financial Analysis
    │
    ▼
News Analysis
    │
    ▼
Market Analysis
    │
    ▼
Risk Assessment
    │
    ▼
Competitor Analysis
    │
    ▼
AI Reasoning
    │
    ▼
Investment Score
    │
    ▼
Final Research Report
```

---

## How to Run It

This project consists of an Express backend server and a React Vite frontend.

### Prerequisites
- Node.js (v18 or higher)
- npm

### Environment Variables Setup

#### 1. Server Configuration
Create a `.env` file inside the `server` directory:
```env
PORT=3000
GEMINI_API_KEY="your_gemini_api_key"
GNEWS_API_KEY="your_gnews_api_key"
```
- `GEMINI_API_KEY`: Used to authenticate with the Gemini API.
- `GNEWS_API_KEY`: Used to query financial news.

#### 2. Client Configuration
Create a `.env` file inside the `client` directory:
```env
VITE_API_URL="http://localhost:3000"
```

---

### Setup and Running the Project

#### 1. Run the Backend
```bash
cd server
npm install
npm run dev
```
The server will start on port 3000.

#### 2. Run the Frontend
```bash
cd client
npm install
npm run dev
```
This launches the development server (usually at http://localhost:5173). Open it in your browser.

---

## How it Works

The project implements a sequential research graph using LangGraph to analyze a company before making an investment recommendation. Instead of relying on a single, long LLM prompt—which can result in math errors and generic answers—the application breaks the research down into specific stages.

### Graph Stages
1. **Company Profile**: Searches Yahoo Finance to resolve the company's ticker and retrieve core profile details.
2. **Financials**: Gathers key financial metrics (revenue, margins, cash, debt, ratios).
3. **Stock Data**: Fetches stock prices, P/E ratio, and volatility metrics (Beta).
4. **News**: Collects recent articles using GNews.
5. **Competitors**: Identifies peer companies in the same sector.
6. **Risk Analysis**: Programmatically evaluates metrics like leverage and liquidity ratios.
7. **Decision**: Feeds the consolidated data to Gemini 2.5 Flash to synthesize the final report.

---

## Key Decisions and Trade-offs

- **LangGraph for Control**: We used LangGraph to enforce a strict sequence. While this makes the application less flexible than an open-ended conversational agent, it guarantees that every report runs through the exact same rigorous steps.
- **Custom Yahoo Scraper**: Standard npm packages for Yahoo Finance are often unreliable and get rate-limited. We wrote a scraper that reads SvelteKit state blocks directly from the HTML, which is much more reliable.
- **Programmatic Calculations**: We calculate leverage (Debt/Cash) and liquidity (Current/Quick ratios) in code instead of asking the LLM to do math, which avoids calculation errors.
- **In-Memory Caching**: We currently cache search results in-memory. This keeps the application simple but means cache state is lost when the server restarts.

---

## Example Runs

Below are representative outputs from runs of the analysis pipeline.

### Apple Inc. (AAPL)
- **Sector/Industry**: Technology / Consumer Electronics
- **Key Metrics**: Market Cap: $3.45T, P/E: 31.2, Quick Ratio: 0.85, Current Ratio: 0.92, Debt/Cash: 0.78, ROE: 148%
- **Pros**: Strong returns, high operating margins, and loyal customer base.
- **Cons**: High valuation, hardware growth slowing.
- **Recommendation**: HOLD (Score: 68/100, Confidence: 88%)
- **AI Summary**: Apple's premium brand and cash flow are solid, but a high P/E ratio suggests limited near-term upside. A Hold recommendation fits until margins or product growth inflects.

### Microsoft Corp. (MSFT)
- **Sector/Industry**: Technology / Infrastructure Software
- **Key Metrics**: Market Cap: $3.18T, P/E: 34.5, Quick Ratio: 1.15, Current Ratio: 1.22, ROE: 38.2%
- **Pros**: Leadership in enterprise cloud (Azure) and rapid monetization of generative AI tools.
- **Cons**: High capital expenditure requirements for AI data centers.
- **Recommendation**: BUY (Score: 85/100, Confidence: 92%)
- **AI Summary**: Microsoft is executing well on AI integration across its product suite. Strong cloud growth and enterprise demand justify its premium valuation for long-term investors.

---

## What We Would Improve with More Time

1. **Parallel Requests**: Run independent steps (like financials, news, and stock data collection) concurrently to speed up the report generation.
2. **Persistent Caching**: Add a database (such as Redis or PostgreSQL) to cache reports and save on API usage.
3. **Deep-Dive Competitor Analysis**: Fetch detailed metrics for the identified competitor tickers instead of just listing their names.
4. **PDF Reports**: Add a feature to download formatted PDF reports directly from the dashboard.

---
