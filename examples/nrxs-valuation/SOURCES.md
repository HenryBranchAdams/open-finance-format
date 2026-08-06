# NRXS valuation sources and evidence ledger

Evidence cutoff: **2026-07-30**. Currency is USD. Annual and quarterly financial
values are filing-reported unless labeled calculated. Market price is a dated
secondary intraday snapshot and must be refreshed before a decision.

## Primary financial and capitalization evidence

1. **FY2025 Form 10-K**, filed 2026-03-19. Historical financials, products,
   list price, hospitals, payer-policy count, coverage claim, concentration,
   headcount, liquidity, going concern, and $43.160 million federal NOL
   carryforward. The NOL has a full valuation allowance and may be limited by
   Section 382; the model applies the federal 80% taxable-income limitation and
   does not add the deferred tax asset separately.<br>
   <https://www.sec.gov/Archives/edgar/data/1933567/000149315226011505/form10-k.htm>

2. **Q1 2026 Form 10-Q**, filed 2026-05-12. Q1 financials, cash flow, dilution
   instruments, Series B terms, subsequent ATM/warrant events, and management's
   reimbursement explanation.<br>
   <https://www.sec.gov/Archives/edgar/data/1933567/000149315226022384/form10-q.htm>

3. **SEC company facts**, retrieved 2026-07-30. Machine-readable cross-check for
   reported financial values.<br>
   <https://data.sec.gov/api/xbrl/companyfacts/CIK0001933567.json>

4. **July 2026 Form S-3**, filed 2026-07-23. The selling-stockholder table states
   12,477,309 common shares outstanding as of 2026-07-22 and identifies 923,776
   unvested RSUs among the registered shares. The filing also reports a $6.87
   NYSE American close on 2026-07-22.<br>
   <https://www.sec.gov/Archives/edgar/data/1933567/000149315226034417/forms-3.htm>

5. **Series B dividend Form 8-K**, filed 2026-07-10. Approximately 80,463 common
   shares were payable on 2026-07-29 for the Q2 preferred dividend. The quantity
   is approximate, so the model labels the pro forma basic count accordingly.<br>
   <https://www.sec.gov/Archives/edgar/data/1933567/000149315226032769/form8-k.htm>

6. **2026 proxy and annual-meeting Form 8-K**. Stockholders approved the plan
   expansion and option-for-RSU exchange framework; the exact post-transaction
   share result remains unresolved.<br>
   <https://www.sec.gov/Archives/edgar/data/1933567/000114036126017498/ny20066493x1_def14a.htm><br>
   <https://www.sec.gov/Archives/edgar/data/1933567/000149315226028489/form8-k.htm>

## Product, regulatory, clinical, and reimbursement evidence

7. **FDA 510(k) K252024 decision summary**, 2025-10-16. Current IB-Stim label,
   ages 8 and older, functional abdominal pain associated with IBS and
   functional dyspepsia, nausea associated with functional dyspepsia, and the
   four-device course.<br>
   <https://www.accessdata.fda.gov/cdrh_docs/pdf25/K252024.pdf>

8. **FDA De Novo DEN180057 decision summary**, 2019-06-07. Original pediatric
   indication and pivotal randomized evidence.<br>
   <https://www.accessdata.fda.gov/cdrh_docs/reviews/DEN180057.pdf>

9. **CMS CY2026 PFS relative value file RVU26C**. CPT 64567 RVU components used
   for the approximately $1,240 national office-payment screen. This is not a
   Neuraxis realized price.<br>
   <https://www.cms.gov/medicare/payment/fee-schedules/physician/pfs-relative-value-files/rvu26c>

10. **CMS CY2026 OPPS final rule**. APC 5301 hospital outpatient payment of
    $926.63 for CPT 64567. Pediatric commercial contracts and geographic
    adjustments differ.<br>
    <https://www.govinfo.gov/content/pkg/FR-2025-11-25/pdf/2025-20907.pdf>

11. **AGA coding FAQ**. CPT 64567 is reported once for each weekly placement
    across the four-week course.<br>
    <https://gastro.org/practice-resources/reimbursement/coding/coding-neurogastroenterology-and-motility-faqs/>

12. **Anthem PENFS policy**, updated 2025-12-18. Example favorable pediatric
    criteria and limitations; the member contract controls payment.<br>
    <https://www.anthem.com/medpolicies/abc/active/gl_pw_f008543.html>

13. **BCBS Vermont PENFS policy**, 2025-12. Prior authorization and narrow
    age/diagnosis/treatment-failure criteria.<br>
    <https://www.bluecrossvt.org/sites/default/files/2025-12/Percutaneous%20Electrical%20Nerve%20Field%20Stimulation%20for%20Irritable%20Bowel%20Syndrome%20-%202025-AM%20Publication.pdf>

14. **ESPGHAN/NASPGHAN pediatric IBS/FAP guideline**, 2025. Conditional PENFS
    recommendation with moderate certainty and cost/availability limitations.<br>
    <https://pmc.ncbi.nlm.nih.gov/articles/PMC12314588/>

## Issuer claims and market reference

15. **Q1 2026 results release**, 2026-05-12. Management-reported 35% device
    delivery growth and full-price mix; financial values reconcile to the 10-Q.<br>
    <https://neuraxis.com/2026/05/12/neuraxis-reports-first-quarter-2026-financial-results-and-provides-business-update/>

16. **December 2025 coverage milestone release**. Management claim of roughly
    100 million covered lives. A deduplicated named-policy roster was not
    available.<br>
    <https://neuraxis.com/2025/12/19/neuraxis-achieves-medical-coverage-policy-milestone-expanding-access-to-approximately-45-million-additional-covered-lives/>

17. **April 2026 coverage release**. Management claim of four additional
    policies representing 1.25 million plan lives. Overlap, churn, and effective
    dates were not reconciled.<br>
    <https://neuraxis.com/2026/04/22/neuraxis-expands-payer-coverage-with-four-new-medical-policies/>

18. **NRXS intraday market snapshot**, 2026-07-30 13:36:28 UTC. Price used:
    $6.235. The data was obtained from an aggregated public market-data tool and
    is not an official close. The NYSE quote page is included as the public
    listing reference.<br>
    <https://www.nyse.com/quote/XASE:NRXS>

## Evidence classifications and limitations

- SEC, FDA, and CMS records are primary evidence.
- Issuer releases are management claims unless they reproduce filed financials.
- Policy coverage is not paid utilization. Reported covered lives are not
  unique eligible patients, approved authorizations, paid claims, or courses.
- The office and HOPD payment figures are national public screens, not contract
  rates or Neuraxis net revenue.
- No licensed consensus or time-synchronized peer-estimate dataset was used.
- The current transfer-agent cap table, exact post-dividend common shares,
  option/RSU exchange consummation, remaining Series B conversions, and realized
  warrant exercises remain unresolved.
- The workbook gives unapproved indications zero value. Adding rNPV requires
  indication-level trial, regulatory, cost, timing, commercial, and exclusivity
  evidence without double-counting consolidated R&D.
