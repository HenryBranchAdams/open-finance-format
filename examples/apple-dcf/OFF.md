# Apple DCF valuation — OFF dogfood example

This package applies the OFF Public Equity Research profile to a real, formula-driven Apple Inc. valuation workbook as of 2026-07-21.

## Result

The workbook produces three five-year unlevered DCF cases:

| Scenario | Revenue growth | EBIT margin | WACC | Terminal growth | Implied value / share | Upside / (downside) vs. $327.54 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Bear | 4.0% | 31.0% | 9.5% | 2.5% | $130.18 | (60.3%) |
| Base | 7.0% | 33.0% | 8.5% | 3.0% | $195.25 | (40.4%) |
| Bull | 10.0% | 35.0% | 7.5% | 3.5% | $316.86 | (3.3%) |

The market price is above even the modeled bull case. The bounded screen-grade read is therefore **wait for proof / re-underwrite**, not an investment rating.

## Method

The model starts with LTM revenue through 2026-03-28, forecasts five years using scenario-specific revenue growth and EBIT margin, converts EBIT to unlevered free cash flow, and discounts forecast cash flows and a Gordon-growth terminal value. It then adds net cash and divides by shares outstanding.

The base WACC is formula-driven from the sourced 10-year Treasury yield and market capitalization plus analyst assumptions for beta, equity risk premium, and pretax debt cost. The workbook includes source comments, editable assumptions, a valuation sensitivity table, and integrity checks.

## Evidence and limits

Reported financial inputs come from Apple SEC filings and SEC company facts. The Treasury rate comes from the U.S. Department of the Treasury. The share price is a short-lived public market-data snapshot. `SOURCES.md` records the derivations and staleness posture.

This is an illustrative screen, not investment advice. It does not include consensus estimates, segment forecasts, channel checks, management guidance beyond filed actuals, or an independent review of the assumptions or lineage. OFF validation proves package conformance and internal traceability; it does not prove that the valuation assumptions are correct or that another implementation can execute the workbook identically.
