# Protocol discovery artifacts

Status: post-`v0.1-rc.1` development support; not part of the frozen
`v0.1-rc.1` release.

The [protocol catalog](catalog-0.1.json) is the machine-readable index of the
mutable development contract. It distinguishes byte-frozen `v0.1-rc.1`
material from resources added or changed afterward. It is a discovery index;
it does not override a specification, schema, rule registry, or immutable
release manifest.

The [offline schema catalog](../schemas/catalog-0.1.json) maps each bundled
JSON Schema `$id` to one repository-relative file. Load those resources before
schema evaluation. The HTTPS strings are stable identifiers, not instructions
to perform DNS or network retrieval. The complete loading contract is in
[Schema Resources 0.1](../spec/schema-resources-0.1.md).

## Reference CLI

The development reference CLI exposes the catalogs without network access:

```text
off protocol list
off protocol explain <identifier>
```

`<identifier>` may be a catalog identifier, profile URI, schema ID, or listed
repository-relative path. Output is canonical JSON followed by one LF.

The Core initializer creates a new directory containing only `OFF.md` and a
Core-only `off.json`:

```text
off init core <target> \
  --package-id <absolute-uri> \
  --release-id <absolute-uri> \
  --entrypoint-id <absolute-uri> \
  --release-version <text> \
  --title <text> \
  --author-id <absolute-uri> \
  --author-name <text> \
  --license <text> \
  --published-at <whole-second-Z> \
  --canonical-url <https-no-userinfo>
```

The initializer rejects an existing target, including an empty directory or
symlink. It computes the entrypoint byte size and SHA-256 digest, writes no
profile data, lineage, attestation, remote resource, or financial claim, and
self-validates the completed package. If creation fails, rollback removes only
unchanged entries that invocation exclusively created; a concurrent,
unexpected, or replaced entry is preserved. Because this command was added
after `v0.1-rc.1`, using it cannot satisfy the frozen candidate's independent
ten-minute authoring gate.

## Reference-tool failure codes

These codes describe this development CLI and API. They are not package
diagnostics and do not change OFF conformance:

| Code | Meaning | CLI behavior |
|---|---|---|
| `OFF-P1001` | The requested protocol-catalog identifier is unknown. | Canonical failure on stderr; exit `1`. |
| `OFF-I1001` | Core initialization input is invalid or the target already exists. | Invalid syntax exits `64`; an existing target emits a canonical failure and exits `1`. |
| `OFF-I1002` | The host could not create, write, or self-validate the new package. | Canonical failure on stderr; exit `2`. |

Unexpected internal CLI faults retain the existing sanitized `OFF-T1004`
failure boundary.
