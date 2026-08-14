# Macro Density — Institutional Kalshi Implied Distributions & Risk Discovery

**Macro Density** is an institutional-grade macroeconomic risk analytics platform that extracts model-free **Probability Density Functions (PDFs)**, **Cumulative Distribution Functions (CDFs)**, and **Statistical Moments** directly from **Kalshi prediction markets**.

Inspired by the clean, authoritative design of **Augustus.com**, the platform features a white & Kalshi green aesthetic (`#00D26A`), high-contrast quantitative typography, and zero-friction data extraction tools.

---

## 🎯 Supported Core Macro Markets

1. **US CPI YoY Inflation (August 2026)**
   - Kalshi Series: `KXCPIYOY` | Event: `KXCPIYOY-26AUG`
   - Link: [Inflation in August 2026 (CPI YoY)](https://kalshi.com/markets/kxcpiyoy/inflation/kxcpiyoy-26aug)
2. **US Real GDP Growth (Q3 2026)**
   - Kalshi Series: `KXGDP` | Event: `KXGDP-26OCT30`
   - Link: [US Real GDP Growth in Q3 2026](https://kalshi.com/markets/kxgdp/us-gdp-growth/kxgdp-26oct30)
3. **US U-3 Unemployment Rate (August 2026)**
   - Kalshi Series: `KXU3` | Event: `KXU3-26AUG`
   - Link: [Unemployment in August](https://kalshi.com/markets/kxu3/unemployment/kxu3-26aug)
4. **Fed Funds Rate Target (December 2026 FOMC)**
   - Kalshi Series: `KXFED` | Event: `KXFED-26DEC`
5. **Custom Kalshi Market Importer**: Paste any active Kalshi URL or ticker to parse live distributions.

---

## 📐 Mathematical Formulation: Why Prediction Markets?

Traditional options pricing models (Black-Scholes, Bachelier) require subjective distributional assumptions (e.g. lognormality, volatility smiles, risk-neutral transformations). 

Kalshi binary threshold contracts $P(X > K_i)$ quote directly traded probabilities. The discrete **Probability Mass Function (PMF)** is derived model-free:

$$\begin{aligned}
P(X \le K_1) &= 1 - P(X > K_1) \\
P(K_i < X \le K_{i+1}) &= P(X > K_i) - P(X > K_{i+1}) \\
P(X > K_n) &= P(X > K_n)
\end{aligned}$$

### Statistical Moments Calculated:
- **Expected Value (Mean $\mu$):** $\mu = \sum x_i \cdot p_i$
- **Implied Volatility ($\sigma$):** $\sigma = \sqrt{\sum (x_i - \mu)^2 \cdot p_i}$
- **Skewness ($\gamma_1$):** $\gamma_1 = \frac{\sum (x_i - \mu)^3 \cdot p_i}{\sigma^3}$ (measures upside vs downside surprise risk)
- **Excess Kurtosis ($\kappa$):** $\kappa = \frac{\sum (x_i - \mu)^4 \cdot p_i}{\sigma^4} - 3$ (measures fat-tail risk)
- **Value at Risk ($\text{VaR}_{95}$):** Non-parametric 95th percentile threshold
- **Expected Shortfall ($\text{CVaR}_{95}$):** Conditional tail expectation

---
