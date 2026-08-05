# Implementing Open Finance Format

Choose an authority target before writing code. A consumer built for the frozen
`v0.1-rc.1` candidate and a consumer built from the current development tree do
not have the same artifact set.

## Authority map

| Goal | Use | Do not treat as authority |
|---|---|---|
| Evaluate frozen rc.1 | After authenticating it, the pinned rc.1 Git commit and paths in `release/v0.1-rc.1/files.json`; follow the frozen release README and its Core and Public Equity contracts. | Current top-level files that have changed after rc.1, Workbook Binding, plans, `src/`, or `dist/off.mjs`. |
| Evaluate current development | The [specification index](../spec/INDEX.md), checked-in [protocol catalog](../protocol/catalog-0.1.json), offline [schema catalog](../schemas/catalog-0.1.json), specifications, schemas, rule registry, and corpus in the same checkout. | Hosted URI contents, examples, implementation source, or generated code as alternate semantics. |
| Produce clean-room evidence | Only the authenticated frozen public artifacts and the [consumer](../clean-room/CONSUMER_TASK.md) or [producer](../clean-room/PRODUCER_TASK.md) task. Freeze outputs before the permitted reference comparison. | Private clarification, the current development catalog, `src/`, or reading or reverse-engineering `dist/off.mjs` for normative or authoring guidance. |
| Build an ordinary integration | Current public normative artifacts first; reference tools may be inspected for engineering help if no clean-room claim will be made. | A passing reference-tool test as proof of independent interoperability. |

The rc.1 allowlist is resolved at its pinned commit. Do not combine frozen rc.1
files with current development files: that creates an unauthenticated hybrid
contract. The frozen evidence still marks its external authentication anchors
pending; do not begin a qualifying clean-room attempt without them. Workbook
Binding is development-only.

## Offline discovery

The development catalog maps stable protocol identifiers to repository paths.
It is self-contained because `openfinanceformat.org` profile and schema URIs are
identifiers, not a live retrieval dependency. Current DNS or hosted resolution
is not required or claimed.

The development CLI offers convenience discovery:

    node dist/off.mjs protocol list
    node dist/off.mjs protocol explain <identifier>
    node dist/off.mjs help

These commands describe the catalog in that checkout. They do not replace the
catalog, create protocol authority, or belong to the frozen rc.1 clean-room
artifact set.

## Minimal Core initialization

For ordinary development, the reference CLI can initialize a Core package from
explicit package, release, entrypoint, author, license, publication, and
canonical-URL metadata. Run `node dist/off.mjs help` for the current usage, then
provide every required value:

    node dist/off.mjs init core <target> \
      --package-id <absolute-uri> --release-id <absolute-uri> \
      --entrypoint-id <absolute-uri> --release-version <text> --title <text> \
      --author-id <absolute-uri> --author-name <text> --license <text> \
      --published-at <whole-second-Z> --canonical-url <https-no-userinfo>

The initializer writes a starting package; it does not confer conformance,
authorship, ownership, licensing rights, or release immutability. Inspect the
generated `off.json`, create the entrypoint bytes, update their exact size and
SHA-256 declaration if needed, and validate at an explicit whole-second UTC
timestamp. Clean-room authors must follow the frozen producer task instead of
using post-rc.1 initialization features.

## Clean-room qualification launchpad

The local qualification launchpad (docs/QUALIFICATION_LAUNCHPAD.md) prepares a
non-normative handoff from an authenticated, clean rc.1 checkout. It copies the
published release metadata and clean-room tasks into a new attempt directory
outside the candidate repository after checking the supplied commit and
checksum-manifest digest. It refuses pending anchors and never runs an
implementation, validator, network operation, publication, or external
evidence mutation.

Use it only after the immutable public commit and independently authenticated
checksum digest exist. Local release self-check remains a self-consistency
check, not publisher authentication. The generated manifest keeps
independence, public review, and all promotion gates pending.

## Evaluation checklist

1. Admit and normalize `off.json` before interpreting it.
2. Resolve local resources under an owned, quiescent package root with the path,
   symlink, file-type, byte-size, digest, mutation, and resource-limit rules.
3. Never dereference identifiers or remote locations during conformance.
4. Evaluate requested profile targets independently, then Core and eligible
   profile stages in the specified order.
5. Keep package diagnostics separate from evaluator failures.
6. Produce deterministic normalized results and canonical bytes at the caller's
   explicit evaluation timestamp.
7. Test against the matching corpus, including exact diagnostics and evaluator
   failures, without executing package content.

Read the [security and privacy requirements](../spec/security-privacy-considerations.md)
before adding rendering, uploads, native file opening, decompression, network
access, logs, or telemetry. Those capabilities create trust boundaries beyond
structural conformance.

The reference `evaluatePackage` API enforces deterministic structural resource
limits but does not expose a wall-clock deadline or cancellation parameter. A
host that requires a hard deadline must supervise or isolate the evaluator
process. A timeout is a host/evaluator failure, never evidence that the package
itself is invalid.

## Claim boundary

Core success establishes the defined structural contract. Public Equity success
means only `Traceable — author-declared lineage`; development Workbook Binding
success means only `Bound — author-declared workbook locators`. Neither proves
source truth, computational reproduction, spreadsheet execution, analytical
quality, legal rights, independent review, adoption, or financial correctness.

If public artifacts are ambiguous, file an
[OFF Change Proposal](../proposals/README.md) or a focused issue without relying
on private interpretation. During clean-room work, stop and record the
ambiguity; any private clarification requires a new candidate and restarted
evidence.
