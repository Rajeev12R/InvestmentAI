# PHASE 13 — FORMULAS & DETERMINISTIC THRESHOLDS

## 1. Forecast Error Metrics

### Numeric Point Forecast
$$\text{Absolute Error} = |Actual - Predicted|$$
$$\text{Percentage Error} = \frac{|Actual - Predicted|}{|Predicted|}$$

Scoring Rules:
- $\text{Percentage Error} \le 5\% \implies \text{VALIDATED}$
- $5\% < \text{Percentage Error} \le 15\% \implies \text{PARTIALLY\_VALIDATED}$
- $\text{Percentage Error} > 15\% \implies \text{FALSIFIED}$

### Numeric Range Forecast
$$Actual \in [\text{min}, \text{max}] \implies \text{VALIDATED}$$
$$Actual \notin [\text{min}, \text{max}] \implies \text{FALSIFIED}$$
$$\text{Normalized Error} = \frac{|Actual - \text{Midpoint}|}{\text{Range Width}}$$

---

## 2. Confidence Calibration & Brier Score

### Confidence Buckets
- $50\% - 59.99\%$
- $60\% - 69.99\%$
- $70\% - 79.99\%$
- $80\% - 89.99\%$
- $90\% - 100.00\%$

### Calibration Error
$$\text{Empirical Accuracy} = \frac{\text{Validated Forecast Count}}{\text{Total Resolved Forecasts in Bucket}}$$
$$\text{Calibration Error} = |\text{Mean Confidence} - \text{Empirical Accuracy}|$$

Classification Rules (Requires $N \ge 5$ per bucket or $N \ge 10$ overall):
- $\text{Calibration Error} \le 0.10 \implies \text{WELL\_CALIBRATED}$
- $\text{Mean Confidence} > \text{Empirical Accuracy} + 0.10 \implies \text{OVERCONFIDENT}$
- $\text{Mean Confidence} < \text{Empirical Accuracy} - 0.10 \implies \text{UNDERCONFIDENT}$
- $N < \text{Threshold} \implies \text{INSUFFICIENT\_SAMPLE}$

### Brier Score (Probabilistic Forecasts)
$$BS = \frac{1}{N}\sum_{i=1}^{N} (p_i - o_i)^2$$
Where:
- $p_i \in [0.0, 1.0]$ is the predicted probability/confidence.
- $o_i \in \{0.0, 1.0\}$ is the observed binary outcome ($1$ for validated, $0$ for falsified).
- Score ranges from $0.0$ (perfect probabilistic accuracy) to $1.0$.

---

## 3. Multi-Dimensional Decision Quality Score

$$\text{Decision Quality Score} = \frac{\sum (w_i \times s_i)}{\sum w_i}$$

| Dimension | Weight ($w_i$) | Thresholds / Deterministic Criteria |
| :--- | :--- | :--- |
| **Evidence Quality** | 15% | SHA-256 package provenance, verified citations |
| **Evidence Coverage** | 15% | Ratio of expected drivers covered by verified evidence |
| **Valuation Discipline** | 15% | Margin of safety relative to DCF/Multiples fair value |
| **Risk Discipline** | 15% | Single-asset position weight $\le 25\%$, risk budget compliance |
| **Thesis Clarity** | 15% | Explicit statement, drivers, and falsification triggers |
| **Falsification Awareness** | 15% | $\ge 2$ explicit thesis-breaker conditions defined at $T_0$ |
| **Forecast Quality** | 10% | $\ge 2$ falsifiable numeric/threshold forecasts recorded |

Missing evidence results in `UNAVAILABLE` with an explicit `reasonCode` (never defaulted to 0 or 50). Minimum required evaluated weight: $\ge 50\%$.
