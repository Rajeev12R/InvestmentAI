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