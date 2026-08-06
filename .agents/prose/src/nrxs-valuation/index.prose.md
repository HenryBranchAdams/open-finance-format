---
name: nrxs-bespoke-equity-valuation
kind: function
---

# NRXS Bespoke Equity Valuation

### Parameters

- `ticker`: listed common-equity ticker; for this run, `NRXS`
- `issuer`: legal issuer name to confirm from authoritative evidence
- `valuation_date`: dated market and research cutoff; for this run, `2026-07-30`
- `repository_root`: attached OFF repository root
- `task_contract`: the complete execution prompt supplied by the caller

### Returns

- `workbook`: absolute path, byte size, and SHA-256 of the delivered formula-driven XLSX
- `off_package`: absolute package directory containing `OFF.md`, `SOURCES.md`, `off.json`, and the bound XLSX
- `acceptance_manifest`: durable record of the graph used, material decisions, exact checks and results, skips, limitations, and evidence locations
- `independent_verifier_report`: fresh read-only acceptance verdict with blocking and non-blocking findings
- `valuation_conclusion`: valuation range, primary method, valuation date, confidence/status, company-specific drivers, market-implied expectations, risks, and what would change the conclusion
- if licensed consensus or current vendor data is unavailable: return an honestly limited public-evidence valuation and identify the unavailable evidence without presenting it as verified

### Errors

- `spreadsheet-runtime-unavailable`: the required bundled XLSX authoring or verification runtime cannot be used
- `off-evaluator-unavailable`: the repository evaluator cannot run and no acceptance-equivalent route exists
- `unsafe-user-work-conflict`: task files cannot be created without overwriting unrelated user-owned work
- `new-authority-required`: completion requires credentials, external mutation, publication, deployment, trading, or another action not authorized by the caller

### Invariants

- The issuer, listing, financial history, product and reimbursement facts, market snapshot, and dilution perimeter are confirmed or explicitly labeled unresolved.
- Reported facts, management claims, analyst assumptions, derived calculations, and model outputs remain distinguishable and traceable.
- The workbook is formula-driven and authored only through `spreadsheets:Spreadsheets` with the bundled `@oai/artifact-tool` runtime.
- A builder does not certify its own final work; a fresh read-only verifier evaluates the integrated package after repair.
- Existing unrelated dirty or untracked work and immutable `release/v0.1-rc.1/**` bytes are preserved.
- The run does not trade, contact people, access credentials, connect accounts, publish, deploy, push, open a PR, or mutate live integrations.
- Local workbook verification, finance review, OFF conformance, independent review, and clean-room interoperability are reported as separate evidence states.

### Strategies

- Prefer SEC and issuer primary evidence; use regulatory, reimbursement, clinical, and public market evidence in descending authority.
- Choose the intrinsic method after establishing Neuraxis's commercial, reimbursement, product, financing, and dilution economics.
- Use public comps only as dated corroboration when maturity and denominator comparability are defensible.
- Continue through ordinary research gaps by explicit degradation; fail only for a declared terminal error.
- Route material verifier findings back to the owning builder or coordinator and re-run independent verification.

### Shape

- `self`: coordinate evidence, valuation judgment, integration, acceptance, and user-facing delivery
- `prohibited`: trading, issuer contact, credential access, paid-provider use, publication, deployment, live integration effects, frozen-release modification, and unrelated repository mutation

