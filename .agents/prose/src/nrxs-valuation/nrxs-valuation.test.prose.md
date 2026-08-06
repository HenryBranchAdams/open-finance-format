---
name: test-nrxs-bespoke-equity-valuation
kind: test
subject: nrxs-bespoke-equity-valuation
---

# NRXS Valuation Delivery Test

### Fixtures

- `ticker`: `NRXS`
- `issuer`: `Neuraxis, Inc.`
- `valuation_date`: `2026-07-30`
- `repository_root`: resolve `../../../..` from this test file's directory to an absolute path before invoking the subject
- `task_contract`: build and independently verify the NRXS valuation and OFF package under the caller's stated authority

### Expects

- `workbook`: identifies one delivered XLSX with an absolute path, byte size, and SHA-256
- `off_package`: contains `OFF.md`, `SOURCES.md`, `off.json`, and the XLSX bound by `off.json`
- `acceptance_manifest`: records exact workbook, finance-audit, OFF-evaluator, and independent-verifier evidence
- `independent_verifier_report`: contains a fresh read-only verdict and distinguishes blocking from non-blocking findings
- `valuation_conclusion`: states the valuation date, primary method, range, confidence/status, and material limitations

### Expects Not

- `off_package`: changes any file under `release/v0.1-rc.1/`
- `valuation_conclusion`: presents unavailable licensed consensus, vendor data, or clean-room interoperability as verified
- `acceptance_manifest`: claims a trade, publication, deployment, push, PR, account connection, credential access, or live integration effect
