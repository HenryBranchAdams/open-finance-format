# Grandstand Limited (NASDAQ: GRSD) — Multi-Method Equity Valuation

**Valuation date:** 28 July 2026<br>
**Market reference:** $1.95 closing price on 27 July 2026<br>
**Reporting and output currency:** USD<br>
**Accounting:** IFRS as issued by the IASB<br>
**Primary method:** Six-year perpetuity-growth FCFF DCF<br>
**Status:** Screen-grade; locally verified formula output; author-declared lineage

## Conclusion

The primary FCFF DCF indicates **$6.70 per diluted share**, with independently
recalculated bear/base/bull cases of **$4.29 / $6.70 / $10.23**. The frozen
market reference is **$1.95**. The gap is an underwriting question, not a trade
instruction or recommendation.

The model does not average methodologies. Perpetuity-growth DCF is primary;
exit-multiple DCF and adjusted present value (APV) are corroborative; EV/revenue
and EV/normalized EBITDA are analyst stresses until a normalized peer set is
available. Reverse-DCF outputs describe current-price implications only.

## Method reconciliation

| Method | Role | Low | Mid / base | High | Evidence posture |
|---|---|---:|---:|---:|---|
| Perpetuity-growth FCFF DCF | Primary | $4.29 | $6.70 | $10.23 | Source-backed forecast with analyst WACC and terminal assumptions |
| Exit-multiple DCF | Corroborative | $5.15 | $6.08 | $7.00 | 5.0x–7.0x analyst terminal multiple |
| Adjusted present value | Corroborative | $4.77 | $5.84 | $7.24 | Illustrative debt amortization and tax shields |
| EV / Revenue | Stress | $0.43 | $2.41 | $4.38 | 1.0x–2.0x analyst range; not a peer median |
| EV / normalized EBITDA | Stress | $0.83 | $1.91 | $3.00 | 4.0x–6.0x analyst range; not a peer median |

The frozen market price implies enterprise value of approximately $231.9
million, 1.38x FY2026E revenue and 5.03x FY2026E normalized EBITDA. These are
model-derived diagnostics, not quoted consensus.

## Business perimeter and method fit

Grandstand Limited, formerly Gambling.com Group Limited, is a Jersey-incorporated
Nasdaq issuer operating one reportable segment across performance marketing,
consumer and enterprise sports data, advertising and related ticketing. A
consolidated FCFF DCF is the best fit because operating cash flow can be
forecast and debt-like claims can be bridged separately from operating value.

The model begins with management's FY2026 revenue guidance of $165–$170 million
and adjusted-EBITDA guidance of $45–$50 million. It converts the revenue
midpoint into FCFF using explicit normalized EBITDA margins, D&A, cash taxes,
capex and operating working-capital investment. It adds March 2026 cash and
deducts borrowings, OddsJam deferred consideration and lease liabilities. It
uses 42.43 million Q1 2026 diluted weighted-average shares as a conservative
denominator.

SOTP is inapplicable because the evidence set does not provide separable
business-line revenue, margins, capex, working capital, corporate-cost
allocations or unit benchmarks. Precedent transactions are excluded without a
normalized transaction dataset. Dividend, residual-income and asset-NAV methods
do not match the core economic drivers.

## Scenario summary

| Case | Revenue 2026E | EBITDA margin 2026E | EBITDA margin 2031E | WACC | Value / share |
|---|---:|---:|---:|---:|---:|
| Bear | $165.0m | 26.0% | 29.0% | 14.5% | $4.29 |
| Base | $167.5m | 27.5% | 32.5% | 12.959% | $6.70 |
| Bull | $170.0m | 29.0% | 37.0% | 11.5% | $10.23 |

Each scenario recalculates revenue, margins, FCFF, discount factors, terminal
value and the equity bridge. The WACC / terminal-growth matrix covers 11%–15%
and 2.0%–3.0%; its base intersection reconciles to the primary DCF.

## What must be true

- Sports-data and enterprise subscription growth must offset organic-search and
  regulatory pressure on marketing revenue.
- Restructuring savings must convert into cash margins without damaging revenue
  quality.
- Borrowings, deferred consideration, capitalized development and potential
  dilution must not absorb forecast operating cash generation.
- APV tax shields are only corroborative until contractual debt maturities,
  refinancing terms and covenant effects are modeled.

## Evidence limits and next proof

The package uses audited FY2023–FY2025 IFRS statements, unaudited Q1 2026
interim results, management guidance and dated market/rate references. No
licensed consensus, normalized peer, price-history or beta feed was available.
Q2 2026 results, updated cash/debt/share count, realized cost savings, normalized
peer data and contractual debt terms are the next material evidence points.

## Revision and verification boundary

This build repairs the prior workbook's forecast-row mapping and removes fixed
bear/bull output multipliers. The former $8.71 base output is therefore not
carried forward; the corrected formula chain produces $6.70.

The workbook contains 493 formulas across 11 sheets. A read-only post-export
re-import found no cached formula-error strings and confirmed 15 passing model
checks, including source ties, FCFF construction, enterprise-to-equity bridges,
scenario independence and ordering, DCF sensitivity reconciliation, APV debt
amortization, market-method ordering and terminal-value concentration. All 11
sheets rendered successfully, including the native valuation chart. Native
Excel or LibreOffice recalculation is not claimed. OFF conformance validates
package structure and declared lineage, not the investment assumptions or
conclusion.
