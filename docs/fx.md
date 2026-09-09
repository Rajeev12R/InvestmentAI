# Foreign Exchange (FX) Infrastructure & Conversions — Phase 10

## 1. Explicit Conversion Policy
* **Formula Transparency:** Every converted currency value exposes its exact formula:
  $$\text{convertedValue} = \text{sourceValue} \times \text{FXRate}$$
* **No Default 1:1 Fallbacks:** If an exchange rate between two distinct currencies (e.g. USD and INR) cannot be verified, the conversion result is returned as `UNAVAILABLE`. The system never defaults to $1.0$.

## 2. Reference Currency Engine
* Reference cross rates are calculated via standard triangulated central bank quotes (e.g. European Central Bank reference feed against USD base).
* Conversion calculations record the rate timestamp, currency pair, source ID, and tier.
