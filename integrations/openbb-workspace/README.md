# OFF Research Workspace

OFF Research Workspace is a local, read-only OpenBB Workspace App for inspecting Open Finance Format packages. It presents the existing OFF evaluator's normalized results; it does not make OpenBB normative to OFF and does not reimplement validation, normalization, freshness, lineage, Workbook Binding, resource safety, or canonicalization.

## Boundary and architecture

`off.json` remains the sole normative package authority. The Node adapter dynamically imports the repository build at `dist/off.mjs`, calls `evaluatePackage`, and projects its result into bounded OpenBB response shapes. The integration has its own lockfile and dependencies. It does not change root dependencies or the frozen `release/v0.1-rc.1/**` closure.

The default catalog recursively discovers `off.json` only below the repository `examples/` directory. At startup it assigns stable, root-relative path-derived opaque package IDs and later accepts only those IDs—not paths—from requests. The IDs remain stable when the checkout moves without changing configured-root order or package-relative paths. Invalid packages remain visible with degraded context and diagnostics.

Workbook Binding is a post-v0.1-rc.1 sidecar profile. It is not part of the frozen v0.1-rc.1 release closure. Its exact passing claim is `Bound — author-declared workbook locators`; locator existence, cell values, formulas, recalculation, and live-sheet equivalence remain unevaluated. Public Equity's exact claim is `Traceable — author-declared lineage`, which does not establish independent verification or financial correctness.

## Locked local install and start

Use the repository's required Node 22 and pnpm 10.34.1 toolchain:

```sh
cd "/absolute/path/to/open-finance-format"
pnpm install --frozen-lockfile
pnpm build
cd integrations/openbb-workspace
pnpm install --frozen-lockfile
pnpm build
OFF_HOST=127.0.0.1 OFF_PORT=7779 pnpm start
```

The v1 server rejects non-loopback hosts. Browser requests are limited to the exact `https://pro.openbb.co` origin by default, including rejection of no-`Origin` requests marked `Sec-Fetch-Site: cross-site`; the exact bundled app-image GET route remains public so Workspace can render it, and direct loopback clients without browser fetch metadata continue to work. Set `OFF_ALLOWED_ORIGINS` to a comma-delimited list of exact HTTPS origins only when a different user-controlled Workspace origin is required. Open `http://127.0.0.1:7779/health`, `widgets.json`, and `apps.json` to confirm local service and configuration. The bundled app image is served at `/assets/off-workspace.svg` and assumes the documented port 7779.

To add bounded local package roots at process startup on macOS, provide an absolute colon-delimited list:

```sh
OFF_PACKAGE_ROOTS="/absolute/research/packages:/absolute/review/packages" OFF_HOST=127.0.0.1 OFF_PORT=7779 pnpm start
```

Every configured root must be a real directory, not a symlink. Duplicate roots, packages reachable through multiple roots, traversal, absolute-path injection, symlink escape, and oversized discovery are rejected. Adding a root intentionally makes OFF packages below that root discoverable to this loopback service; configure only roots you trust and intend to inspect.

## App and endpoints

The single app, **OFF Research Workspace**, uses four synchronized task tabs:

- **Research:** persistent package/release context, verified narrative, compact headline ledger, assumptions.
- **Evidence:** source facts, sources, freshness and affected outputs, material lineage.
- **Files:** resource inventory, Workbook Binding degradation, safe native files.
- **Conformance:** profile results, diagnostics, canonical normalized inspection, claims boundary.

`package_id` is shared through a dynamic `/off/packages/options` selector. `evaluated_at` is shared across evaluation-derived widgets. The app allows layout customization and uses dense 40-column pane layouts consistent with `docs/DESIGN.md`: persistent context, compact tables, hard pane boundaries, and no decorative KPI cards.

Backend routes:

| Route | Shape and purpose |
| --- | --- |
| `GET /health` | Local status and non-sensitive adapter version. |
| `GET /widgets.json`, `GET /apps.json` | OpenBB configuration. |
| `GET /off/packages/options` | Dynamic `{label,value,extraInfo}` package choices. |
| `GET /off/overview`, `/off/normalized` | JSON context and canonical normalized export. |
| `GET /off/context`, `/off/claims`, `/off/narrative`, `/off/normalized-view` | Markdown presentation views. |
| `GET /off/headline-outputs`, `/off/assumptions`, `/off/source-facts`, `/off/sources` | Research and source tables. |
| `GET /off/freshness`, `/off/lineage`, `/off/diagnostics` | Evaluation evidence tables. |
| `GET /off/resources`, `/off/workbook-bindings`, `/off/profile-results` | Files, sidecar binding, and profile tables. |
| `GET /off/files/options` | Opaque IDs for evaluator-verified local files. |
| `POST /off/files` | Ordered multi-file-viewer success/error records. |
| `GET /off/files/:opaque_id` | Verified download or safe inline response. |

Table endpoints accept visible per-widget `offset` and `limit` controls; the application limit is 1–200 rows per response and total/offset/limit/truncation are returned in `X-OFF-*` headers. The default is 200 rows. This is an application bound, not a claim about a universal OpenBB limit.

## Evaluation time

`evaluated_at` must be a real whole-second UTC timestamp such as `2026-07-17T23:59:59Z`. When omitted or blank, the backend uses one whole-second UTC timestamp captured when the local adapter starts, so every widget in that server session shares the same evaluation instant. `/health` reports it as `default_evaluated_at`. Every evaluation-derived JSON row or object includes it, Markdown views display it, and responses also return `X-OFF-Evaluated-At`. Use a fixed value for reproducible tests and comparisons.

By default the adapter requests every declared profile supported by the installed evaluator. Requested, declared, unsupported, passed, failed, and `notEvaluated` distinctions are retained. Canonical numeric strings and units are not coerced into binary floating-point values.

## Local security and evidence limits

The service is read-only and loopback-only. It does not fetch remote descriptors, mutate packages, initialize Core content, connect accounts, expose credentials, provide an MCP server, trade, execute, or provide investment advice.

File access is restricted to evaluator-verified local resources. The service rechecks containment, symlinks, file identity, size, and digest at access time. It exposes opaque file IDs, not local paths. Active or unsafe formats are download-only or refused by the native viewer; remote-only resources are never proxied. Viewer selections must contain unique IDs and are bounded to 8 MiB of verified decoded content in aggregate. There are no directory listings or arbitrary file routes.

AI exposure is deliberately explicit and conservative. Current official OpenBB widget documentation defines the widget-level boolean `ai`; `false` excludes a widget from AI workflows. Every widget declares this field. Safe normalized analytical views use `ai: true`; `native_files`, `diagnostics`, and `normalized_view` use `ai: false` because they expose raw file selection, implementation diagnostics, or canonical normalized JSON that can contain local resource paths. App prompts use `@[id:widget_id]` only for widgets marked `ai: true`, and do not mention authentication or unsafe parameters. The pinned public validator is fallback evidence rather than the canonical live Workspace contract, so visibility must still be revalidated before any live connection. No `selected_agent` or MCP server is declared.

Local checks establish repository and adapter consistency only. They do not prove financial correctness, adoption, independent interoperability, deployment readiness, live OpenBB compatibility, or hosted behavior.

## Checks

From this directory:

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
/usr/bin/python3 /tmp/off-openbb-validators.fvRMyr/repo/scripts/validate_widgets.py .
/usr/bin/python3 /tmp/off-openbb-validators.fvRMyr/repo/scripts/validate_apps.py .
/usr/bin/python3 /tmp/off-openbb-validators.fvRMyr/repo/scripts/validate_app.py .
OFF_HOST=127.0.0.1 OFF_PORT=7779 pnpm start
/usr/bin/python3 /tmp/off-openbb-validators.fvRMyr/repo/scripts/validate_endpoints.py . --base-url http://127.0.0.1:7779
```

The pinned public validators come from the official `OpenBB-finance/backends-for-openbb` checkout at commit `a6293707576e16edda8305adda95b07b6a4b968b`. They are useful public-contract evidence, not canonical Workspace MCP or live-account validation.

## Workspace connection and deployment

Connecting `http://127.0.0.1:7779` to OpenBB Workspace is intentionally unperformed. It requires a user-controlled Workspace/account action and live schema review. Publishing or reviewing this adapter's source does not connect an account, deploy the service, or establish live OpenBB compatibility.

For a later deployment, retain HTTPS, authentication appropriate to the hosting boundary, strict allowed origins, bounded roots mounted read-only, trustworthy evaluator build provenance, request/rate limits, audit-safe logging, and a non-sensitive image URL. Revalidate `widgets.json`, `apps.json`, agent visibility, file-viewer behavior, response limits, and mixed-content rules against the then-current official Workspace contract before exposing the service beyond loopback. This is consideration guidance, not a deployment-readiness claim.

## Troubleshooting

- **`dist/off.mjs` missing:** run the repository root `pnpm build` before starting the adapter.
- **Port or image unavailable:** confirm `lsof -nP -iTCP:7779 -sTCP:LISTEN` and `curl http://127.0.0.1:7779/health`. The app image URLs intentionally use port 7779.
- **Package absent:** confirm its directory is below `examples/` or an explicitly configured non-symlink `OFF_PACKAGE_ROOTS` directory and contains `off.json`.
- **Invalid `package_id`:** refresh the dynamic selector after changing configured-root order or package-relative paths; IDs are opaque and derived from the root index plus package-relative path.
- **Unexpected freshness:** inspect the visible `evaluated_at`; a blank value intentionally uses the server-start whole-second UTC timestamp reported by `/health`.
- **Schema drift:** rerun the pinned validators, then compare with the current official app-builder resources or Workspace MCP. Preserve explicit widget-level `ai` exclusions and do not silently add MCP or agent IDs.
- **Mixed content or remote Workspace access:** an HTTPS Workspace may block a plain HTTP backend or be unable to reach loopback. Use an explicitly authorized HTTPS deployment path later; do not weaken browser security or expose the local service broadly.
- **Workbook view empty:** the selected package may not declare Workbook Binding. An empty table is deliberate degradation, not proof that a workbook lacks locators.
