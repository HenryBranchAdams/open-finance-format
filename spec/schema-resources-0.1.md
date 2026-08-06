# OFF Schema Resources 0.1

Status: experimental normative support contract for post-`v0.1-rc.1`
development. It is not part of the frozen `v0.1-rc.1` release.

This document uses the key words **MUST**, **MUST NOT**, **SHOULD**, and
**MAY** as described by RFC 8174 when, and only when, they appear in capitals.

## 1. Purpose and authority

OFF schemas use absolute `$id` and `$ref` values so that every schema resource
has a stable identity. Those URI strings are identifiers. Schema evaluation
MUST NOT depend on DNS, HTTP, redirects, or any other network retrieval.

The development [schema catalog](../schemas/catalog-0.1.json) is the closed
mapping from bundled schema IDs to repository-relative files. The catalog is
validated by [OFF Schema Catalog 0.1](../schemas/schema-catalog-0.1.schema.json).
The normative prose and semantic rules remain authoritative when a JSON Schema
cannot express the complete OFF contract.

## 2. Loading algorithm

Before evaluating an OFF schema graph, an implementation MUST:

1. authenticate or otherwise select one quiescent candidate tree;
2. read the catalog and require its exact supported `catalogVersion` and JSON
   Schema dialect;
3. reject an unknown member, duplicate schema ID, unsafe path, path escape,
   symlink, missing file, non-regular file, or `$id` that differs from the
   catalog key;
4. load every cataloged schema into a local resource registry keyed by its
   exact `$id`; and
5. resolve `$ref` only from that registry.

An implementation MUST NOT fall back to network retrieval when a resource is
missing or unknown. Failure to assemble the schema graph is an implementation
or evaluator-configuration failure, not an OFF package diagnostic.

Paths are resolved from the authenticated repository root. They use `/`, are
relative, and MUST remain inside that root after filesystem resolution.

## 3. Version and release boundary

One catalog describes one development contract. A schema ID MUST map to at
most one byte sequence in that catalog and MUST NOT be reassigned to different
semantics in an immutable release. A changed schema graph requires a new
candidate and catalog under the [versioning policy](versioning.md).

The catalog in the mutable tree includes post-`v0.1-rc.1` resources. A
clean-room exercise for the frozen candidate MUST use the authenticated
artifacts in `release/v0.1-rc.1/`, not this later development catalog.

## 4. Security boundary

Preloading avoids implicit SSRF and availability dependencies; it does not
authenticate a checkout or make admitted package resources safe to render or
execute. Implementations also apply the
[security and privacy considerations](security-privacy-considerations.md).
