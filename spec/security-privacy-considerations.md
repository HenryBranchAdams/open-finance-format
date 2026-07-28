# OFF security and privacy considerations

Status: normative for mutable post-`v0.1-rc.1` development. This document
consolidates implementation requirements and residual risks; it does not
retroactively amend the frozen candidate.

An OFF package, its directory tree, and every resource are untrusted input.
Structural conformance is offline parsing and byte verification, not permission
to render, open, execute, refresh, or publish resource contents.

| Threat or privacy concern | Required behavior | Residual risk / host duty |
|---|---|---|
| Untrusted package tree and local resources | Evaluators **MUST** enforce package-root containment, exact path spelling, regular files, symlink rejection, raw-byte size and digest checks, bounded reads, and mutation detection. Host paths and raw operating-system errors **MUST NOT** enter normalized output. | A mutable attacker-controlled tree cannot be made safe by manifest checks alone. Hosts must create an owned quiescent snapshot before evaluation. |
| Macros, formulas, external connections, embedded objects, and other active content | Conformance evaluators **MUST** treat all resources, including XLSX, HTML, PDF, and images, as opaque bytes. They **MUST NOT** open them in a native application, execute macros or formulas, refresh connections, invoke plugins, or spawn a process. | A separate viewer may expose application vulnerabilities or active content. Opening a verified file is a new trust decision. |
| Renderer injection and document exploitation | Renderers **MUST** escape untrusted text and URLs, use content-type-aware parsers, and isolate document rendering from evaluator and host privileges. Active content **MUST** be disabled by default. | Browser or native-viewer sandboxing, content security policy, download handling, and patching are renderer responsibilities outside structural conformance. |
| Remote URIs and network privacy | Conformance **MUST NOT** dereference identifiers or remote resource locations and **MUST NOT** perform DNS, socket, HTTP, remote-schema, or spreadsheet-API access. Remote availability and integrity remain `notEvaluated`. | A host that later follows a link can disclose IP address, timing, credentials, or package interest and can receive different content. Require a separate informed action and network policy. |
| Extensions and resource exhaustion | Unknown extension values **MUST** remain inert. Implementations **MUST** apply the deterministic byte, nesting, string, resource, path, directory-enumeration, and canonicalization limits defined by the applicable contract. A protocol limit preventing evaluation is a sanitized evaluator failure, not an invalid-package diagnostic. Embedding hosts **SHOULD** separately impose a bounded wall-clock deadline or cancellation policy appropriate to their environment. | Wall-clock time is host policy, not portable package conformance. The reference library exposes no deadline or cancellation parameter; a host that requires a hard deadline must supervise or isolate the evaluator process. Hosts must also defend decompression and renderer work separately. |
| Sensitive author, source, and model data | Producers **SHOULD** publish only identifiers, names, URLs, evidence, and metadata they intend to make public and are authorized to disclose. Consumers **MUST NOT** treat an author ID, canonical URL, license declaration, or attestation as authentication, consent, ownership, or legal proof. | Digests, lineage, timestamps, source titles, workbook bytes, and stable IDs can reveal identities, research interests, confidential assumptions, or document history even without direct personal data. Immutability makes later erasure difficult. |
| Logs, telemetry, and diagnostics | Portable results **MUST** contain only defined fields and sanitized context. Tools **SHOULD** minimize logs and **MUST NOT** log complete manifests/resources, absolute paths, credentials, query secrets, raw host errors, or stack traces by default. Telemetry **MUST** be opt-in and documented. | Operators control surrounding process, crash, shell, proxy, and analytics logs; those channels can still leak package contents or access patterns. |

## Trust boundaries

Integrity proves that local bytes match an author's declaration. It does not
prove who authored them, whether they are safe to open, whether a remote copy
matches, or whether the analysis is true. Likewise, an attestation is
author-declared data, not a digital signature or independent review.

Implementations should separate at least four privileges: package acquisition,
offline conformance evaluation, human-readable rendering, and network access.
Granting one does not grant the others. A renderer or publisher that adds
network access, authentication, uploads, decompression, native file opening, or
analytics needs its own threat model.

Security defects follow the private process in [`../SECURITY.md`](../SECURITY.md).
A fix that changes normative behavior belongs in a new candidate under
[versioning](versioning.md); frozen release bytes are not patched in place.
