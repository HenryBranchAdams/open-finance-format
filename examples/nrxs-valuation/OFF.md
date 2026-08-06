# Neuraxis, Inc. (NRXS) valuation

Valuation date: **2026-07-30**<br>
Primary method: **probability-weighted 15-year FCFF DCF**<br>
Evidence status: **screen-grade / high uncertainty**

## Conclusion

The model produces a **$0.25 bear / $1.13 base / $4.30 bull** range and a
**$1.50 probability-weighted value per share** using 30% / 50% / 20% scenario
weights. The dated **$6.235 intraday price** is above the modeled bull value.
This is a valuation-research conclusion, not a trading recommendation.

All primary scenarios use the same **19% WACC** and **2.5% terminal growth**.
Keeping one hurdle avoids counting reimbursement, adoption, and financing risk
once in the cash flows and probabilities and again in the discount rate. The
forecast runs through 2040 so terminal value remains below 60% of positive
enterprise value in the base and bull cases.

The reverse DCF holds the bull margins, hurdle, terminal growth, and dilution
fixed. It requires roughly **1.53 times the bull revenue path** to reproduce the
dated market price. That implies approximately **$72 million of 2030 revenue,
$191 million of 2035 revenue, and $287 million of 2040 revenue**, compared with
FY2025 revenue of $3.6 million. This is a model-derived adoption burden, not a
unique market belief or consensus forecast.

## Why FCFF is the primary method

Neuraxis is a commercial-stage medical-device issuer with FDA-cleared products,
high gross margin, negative cash flow, a going-concern warning, and material
equity overhang. A 15-year FCFF model can show the operating ramp and cash burn
directly. The equity bridge adds each scenario's financing proceeds once to
post-money equity and adds the corresponding new shares at an externally fixed
issue price, avoiding a double penalty for the same cash need.

Unapproved indications receive **zero value** because the public evidence does
not support a complete indication-level rNPV with technical, regulatory,
commercial, cost, and exclusivity assumptions. Comparable companies are
qualitative corroboration only because no time-synchronized, normalized
forward-estimate dataset was available.

The cash-tax schedule starts with the disclosed **$43.160 million federal NOL**,
limits annual use to 80% of positive taxable income, and then applies a 21% cash
tax rate. It does not add the deferred tax asset separately and does not assume
away potential Section 382 limits.

## Operating cases

| Driver | Bear | Base | Bull |
|---|---:|---:|---:|
| Probability | 30% | 50% | 20% |
| 2026 revenue | $6.0m | $7.2m | $9.2m |
| 2030 revenue | $10.7m | $19.5m | $47.0m |
| Mature EBIT margin | 10% | 23% | 30% |
| Additional financing | $10m | $5m | $2m |
| Assumed issue price | $2.50 | $5.00 | $6.00 |
| Fully diluted shares after modeled financing | 23.224m | 20.224m | 18.237m |

The operating logic is reimbursement to active hospitals to patient starts to
realized payment to operating leverage. The model does not multiply reported
covered lives by disease prevalence. Public evidence does not disclose active
ordering centers, starts per center, authorization success, realized net price,
repeat courses, or RED product economics.

## Evidence read-through

- Q1 2026 revenue was **$1.608 million**, up 79.5% year over year, with an
  **86.4% gross margin**. Management reported delivered units up 35%.
- The Category I CPT 64567 code became effective January 1, 2026. It improves
  billing infrastructure but does not guarantee policy coverage, prior
  authorization, allowed amount, or payment.
- The 2026 CMS office benchmark is approximately $1,240 per placement, while
  the hospital outpatient APC 5301 rate is $926.63. The latter is below the
  company's $1,195 device list price before overhead.
- The July S-3 reports **12.477 million common shares** at July 22 and
  **0.924 million unvested RSUs**. The model adds the approximately 0.080
  million-share July preferred dividend, if-converted Series B, treasury-method
  warrants, the disputed 1.319 million option/RSU treatment in base and bear,
  and scenario financing shares.
- March 31 cash was **$7.079 million** and notes payable were $0.101 million.
  The equity bridge uses those dated values rather than pretending a precise
  July cash roll-forward is available.

## What changes the conclusion

The valuation would improve with reconciled evidence of active-account growth,
patient starts, repeat-course utilization, prior-authorization approval,
realized payment, cash collections, product-level RED economics, and a current
transfer-agent cap table. It would deteriorate with HOPD-heavy payment below
device economics, persistent public-company overhead, slower policy activation,
or financing below the modeled issue prices.

## Workbook and OFF boundary

The formula-driven workbook is
`outputs/20260730-nrxs01/nrxs-valuation-model.xlsx`. It contains Cover, Sources,
Assumptions, Historicals, KPIs, Forecast, DCF, Comps, Sensitivities, Reverse
DCF, and Checks sheets.

OFF validates package structure, resource fingerprints, and declared lineage.
It does not prove the commercial assumptions, valuation conclusion, spreadsheet
formula equivalence across engines, or suitability for any portfolio.
