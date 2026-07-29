# dLocal (NASDAQ: DLO) — Bespoke Equity Valuation

**Valuation date:** 23 July 2026  
**Reporting and output currency:** USD  
**Accounting:** IFRS as issued by the IASB  
**Primary method:** Six-year FCFF DCF  
**Status:** Screen-grade; locally verified; author-declared lineage

## Conclusion

The model indicates **$22.67 per share** in the base case and a **$13.31–$34.57**
bear-to-bull operating range, compared with the frozen **$14.77** closing-price
reference. The base result implies 53.5% upside, but confidence is moderate-low:
71% of base enterprise value is terminal value and the conclusion is sensitive
to gross-profit take rate, post-2026 TPV growth, emerging-market risk, and the
normalization of settlement working capital.

The dated market price is close to the modeled bear case. Holding the base
monetization and operating-leverage paths constant, the reverse DCF implies
approximately **11.2% annual TPV growth from 2027 through 2031** after the 2026
guidance midpoint. The base case instead fades from 35% to 15%.

## Business perimeter and method

dLocal Limited is the consolidated Cayman Islands parent of a single operating
segment listed on Nasdaq as DLO. It provides cross-border and local-to-local
payment processing for global merchants in emerging markets. A consolidated
FCFF DCF is appropriate because funding is not the product in the same sense as
a bank or lender and the company reports one segment.

The operating model forecasts:

- TPV as the primary volume driver;
- gross profit per unit of TPV as the monetization driver;
- operating profit as a share of gross profit as the operating-leverage driver;
- cash taxes, D&A, capex, and normalized corporate working capital to derive
  FCFF.

Merchant settlement cash is excluded from the equity bridge. The model adds
corporate cash only, then deducts the declared June 2026 dividend and reported
financial and lease liabilities. The resulting pro forma net-cash adjustment is
$284.9 million. No future repurchase execution is assumed.

## Scenario summary

| Case | 2026 TPV growth | 2031 TPV growth | 2026 GP / TPV | 2031 GP / TPV | 2031 OP / GP | Value / share |
|---|---:|---:|---:|---:|---:|---:|
| Bear | 50% | 8% | 0.77% | 0.70% | 60% | $13.31 |
| Base | 55% | 15% | 0.80% | 0.79% | 66% | $22.67 |
| Bull | 60% | 20% | 0.82% | 0.86% | 71% | $34.57 |

All three operating cases use the same 11.7% WACC and 3.0% terminal growth so
that the scenario range isolates operating outcomes. A separate WACC/terminal-
growth table tests discount-rate uncertainty.

## Corroboration

Public processor peers are not cleanly comparable: Payoneer had a pending
acquisition, while StoneCo and PagSeguro combine payments with financial-
services balance sheets that distort generic enterprise-value calculations.
The workbook therefore does not manufacture a normalized peer median.

An explicitly analyst-selected 18x–22x multiple applied to 2026 estimated
normalized EPS produces an approximately $17–$21 per-share market-method
read-through. It is corroborative only; the FCFF DCF remains primary.

## What must be true

- TPV growth must remain materially above the reverse-DCF path.
- Gross profit per TPV must stabilize near 0.8% despite local-to-local and payout
  mix.
- Operating profit must grow faster than gross profit as the 2025 investment
  cycle scales.
- Corporate liquidity must remain separable from merchant settlement balances.
- Regulation, taxes, FX, and processor-credit losses must not consume the
  modeled operating leverage.

## Catalysts and risks

The next decision-relevant evidence is Q2 2026 execution, 2H operating leverage,
cross-border mix, licensing progress, and actual capital returns.

Principal risks are Brazil tax changes, Argentina FX, Mexico tariffs, emerging-
market regulation, merchant concentration, processor-receivable recoverability,
take-rate compression, settlement-liquidity volatility, and undisciplined
buyback execution.

## Verification boundary

The delivered workbook was recalculated by the artifact runtime, rendered sheet
by sheet, scanned for formula errors, and re-imported after export. Thirteen
visible checks passed, including source ties, FCFF construction, the
enterprise-to-equity bridge, scenario ordering, sensitivity monotonicity, and
the base sensitivity intersection.

This package does not claim licensed-consensus verification, independently
normalized peer data, native Excel or LibreOffice recalculation, independent
valuation review, or clean-room interoperability. OFF conformance validates the
package structure and declared lineage; it does not prove the assumptions or
investment conclusion.

