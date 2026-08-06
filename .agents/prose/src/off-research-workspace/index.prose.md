---
name: off-research-workspace-build
kind: function
---

# OFF Research Workspace Local Delivery

Build and independently qualify a local OpenBB Workspace custom-backend
integration that consumes OFF without making OpenBB normative to OFF.

### Parameters

- `repository_root`: absolute path to the existing OFF repository checkout
- `delivery_request`: path to the caller-approved delivery brief

### Returns

- `project_changes`: task-only product files under `integrations/openbb-workspace/`, with material implementation decisions and no frozen-release drift
- `local_runbook`: concise locked-install, start, verification, security, troubleshooting, and later manual Workspace-connection instructions
- `acceptance_manifest`: canonical filesystem-backed evidence record distinguishing implemented, locally verified, current-contract validated, connected, live-rendered, packaged, and deployed states
- `independent_verifier_report`: fresh read-only verdict with criteria, exact evidence, unresolved risks, skipped checks, and confirmation that no prohibited external effect occurred

### Errors

- `unsafe-worktree-conflict`: user-owned work cannot be preserved while completing the authorized integration
- `openbb-contract-unavailable`: current authoritative OpenBB app-builder rules cannot be obtained through Workspace MCP or current official sources
- `required-runtime-unavailable`: the repository or integration cannot be locally installed, built, tested, or served through an acceptance-equivalent available runtime
- `frozen-release-drift`: `release/v0.1-rc.1/**` differs from its pre-run byte snapshot
- `independent-verification-rejected`: material verifier findings remain after three bounded repair rounds

### Invariants

- `off.json` remains the sole normative package authority and the existing OFF evaluator remains authoritative for validation, normalization, diagnostics, freshness, lineage, Workbook Binding, path safety, and canonicalization.
- `release/v0.1-rc.1/**` remains byte-for-byte unchanged.
- Existing tracked, untracked, ignored, and generated user state is preserved; unrelated root dependencies are not churned.
- The product is a read-only, replaceable OFF consumer under `integrations/openbb-workspace/`; OpenBB is neither a dependency of OFF conformance nor a new OFF syntax.
- Package requests use stable opaque IDs and cannot select arbitrary paths, escape configured roots, follow symlinks outside roots, fetch remote descriptors, or mutate inspected content.
- Numeric finance strings, units, stable IDs, evaluation distinctions, and canonical claim language are preserved without lossy coercion or softened disclosures.
- No account connection, credential access, deployment, publication, push, pull request, release, provider compilation, Reactor operation, or live integration effect occurs.
- Local HTTP evidence proves loopback compatibility only; it never becomes a claim of hosted Workspace rendering, financial correctness, adoption, deployment, or clean-room interoperability.
- The builder does not certify final acceptance; a fresh independent verifier is read-only and every material rejection routes through repair and re-verification.
- Only declared canonical outputs and evidence are published; delegate scratch remains private to its owning workspace.

### Strategies

- If Workspace MCP is unavailable, use only current official OpenBB documentation and official OpenBB repositories; record the fallback and evidence date.
- Prefer the smallest TypeScript backend boundary that directly reuses the built evaluator and keeps integration dependencies local and locked.
- Treat invalid packages, optional missing artifacts, unsupported profiles, and unsupported safe file-viewer capabilities as bounded degraded records rather than catalog-wide failures.
- Run narrow product and security checks before full integration and repository gates.
- If OpenBB schema assumptions drift, preserve the requested product behavior and adapt configuration to the current verified contract.

### Runtime

- `persist`: true

### Tools

- `cli:git`: inspect repository state and frozen-release integrity
- `cli:node`: run the OFF evaluator, integration service, tests, and build
- `cli:pnpm`: run locked installs and repository verification
- `cli:curl`: exercise representative local HTTP endpoints
- `cli:lsof`: prove the exact loopback listening address

### Shape

- `self`: coordinate bounded execution, preserve authority, integrate outputs, own the canonical acceptance manifest, and report evidence states accurately
- `delegates`:
  - `contract-discovery`: read-only OFF and current OpenBB contract discovery
  - `backend-builder`: evaluator adapter, catalog, security boundary, endpoints, and product tests
  - `workspace-builder`: widgets, apps layout, thumbnail, documentation, configuration tests, and focused product polish
  - `independent-verifier`: fresh read-only integrated acceptance
  - `repairer`: task-only fixes for material rejected findings
- `prohibited`: credentials, OpenBB account connection, external publication or deployment, Git push or PR operations, frozen-release edits, unrelated cleanup, separate replacement frontend, normative OFF changes, and unverified live-platform claims

### Execution

```prose
let discovery = call contract-discovery
  repository_root: repository_root
  delivery_request: delivery_request

let backend_result = call backend-builder
  repository_root: repository_root
  delivery_request: delivery_request
  discovery: discovery

let workspace_result = call workspace-builder
  repository_root: repository_root
  delivery_request: delivery_request
  discovery: discovery
  backend_result: backend_result

let acceptance = call local-acceptance
  repository_root: repository_root
  delivery_request: delivery_request
  discovery: discovery
  backend_result: backend_result
  workspace_result: workspace_result

let verification = call independent-verifier
  repository_root: repository_root
  delivery_request: delivery_request
  acceptance_manifest: acceptance.acceptance_manifest

loop while verification verdict is reject (max: 3):
  let repair = call repairer
    repository_root: repository_root
    delivery_request: delivery_request
    verifier_report: verification.independent_verifier_report

  acceptance = call local-acceptance
    repository_root: repository_root
    delivery_request: delivery_request
    discovery: discovery
    backend_result: backend_result
    workspace_result: workspace_result
    repair: repair

  verification = call independent-verifier
    repository_root: repository_root
    delivery_request: delivery_request
    acceptance_manifest: acceptance.acceptance_manifest

if verification verdict is reject:
  throw "independent-verification-rejected"

return {
  project_changes: acceptance.project_changes,
  local_runbook: acceptance.local_runbook,
  acceptance_manifest: acceptance.acceptance_manifest,
  independent_verifier_report: verification.independent_verifier_report
}
```

## contract-discovery

### Parameters

- `repository_root`: OFF checkout to inspect read-only
- `delivery_request`: bounded delivery brief to satisfy

### Returns

- `discovery`: repository architecture, evaluator entrypoints, package corpus, design and policy boundaries, verified current OpenBB app-builder contract evidence, lightweight capability record, implementation constraints, and exact pre-run Git/frozen-release evidence

### Invariants

- Discovery is read-only and distinguishes repository proof, current official platform evidence, and inference.
- Workspace MCP availability is tested before the official-web fallback; no skill is installed and no account or credential is accessed.

## backend-builder

### Parameters

- `repository_root`: OFF checkout to modify only within the authorized integration
- `delivery_request`: bounded delivery brief
- `discovery`: published discovery result by reference

### Returns

- `backend_result`: locally implemented TypeScript custom backend with evaluator reuse, safe catalog and resource boundary, semantic endpoints, deterministic tests, locked integration dependencies, and no mutation outside task scope

### Invariants

- Caller-controlled raw filesystem paths never cross the API boundary.
- Remote resources are never retrieved or proxied.
- Every file-serving decision rechecks containment and identity at request time and fails closed for unsafe content.

## workspace-builder

### Parameters

- `repository_root`: OFF checkout to modify only within the authorized integration
- `delivery_request`: bounded delivery brief
- `discovery`: published discovery result by reference
- `backend_result`: implemented backend result by reference

### Returns

- `workspace_result`: current-contract-valid `widgets.json`, `apps.json`, synchronized parameters and groups, valid widget/app/prompt references, local OFF thumbnail, concise operator README, and focused configuration tests

### Invariants

- Widget descriptions and prompts preserve OFF evidence limitations and never expose raw paths, secrets, unsafe parameters, or implementation diagnostics to AI workflows.
- The app contains Research, Evidence, Files, and Conformance task tabs and declares no fictional agent or MCP server.

## local-acceptance

### Parameters

- `repository_root`: integrated OFF checkout
- `delivery_request`: bounded delivery brief
- `discovery`: current repository and OpenBB contract evidence
- `backend_result`: backend implementation evidence
- `workspace_result`: widgets, app, asset, and documentation evidence
- `repair`: optional repair record from a prior verifier rejection

### Returns

- `project_changes`: exact task-only product files and architecture decisions
- `local_runbook`: operator documentation path and verified commands
- `acceptance_manifest`: one canonical evidence record with exact commands, exit results, fixtures, timestamps, security cases, loopback proof, OpenBB validation evidence, frozen-release before/after proof, skips, uncertainties, repair history, and distinct evidence-state claims

### Invariants

- Acceptance runs the integration locked install, lint, typecheck, tests, build, loopback HTTP checks, and the repository's exact `pnpm verify` gate unless current repository instructions supersede it.
- The local service is stopped cleanly after exact-address and representative-endpoint checks.

## independent-verifier

### Parameters

- `repository_root`: integrated checkout to inspect read-only
- `delivery_request`: acceptance criteria and authority boundary
- `acceptance_manifest`: coordinator-owned evidence record to challenge, not trust

### Returns

- `independent_verifier_report`: structured `accept` or `reject` verdict, criteria evaluated, exact evidence, unresolved risks, skipped or unavailable checks, and explicit no-external-effect confirmation

### Invariants

- Verification is fresh, independent, and read-only; it does not edit files or rely on the builder's conclusion.
- Missing live Workspace rendering or account connection is recorded as an authority-bound platform-envelope limitation, not converted into local rejection when current-contract configuration evidence passes.

## repairer

### Parameters

- `repository_root`: integrated checkout with material rejected findings
- `delivery_request`: unchanged bounded delivery brief
- `verifier_report`: exact fresh rejection evidence

### Returns

- `repair`: task-only corrections for material findings, with exact focused checks and no scope expansion

### Invariants

- Only rejected defects and their direct consequences are changed; user-owned work and frozen release files remain untouched.
- Ordinary defects remain repair paths. Missing authority or an impossible acceptance-equivalent route remains a named terminal error.
