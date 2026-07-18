# OFF Core 0.1

Status: experimental normative contract for `v0.1-rc.1`

This document uses the key words **MUST**, **MUST NOT**, **SHOULD**, and **MAY** as described by RFC 8174 when, and only when, they appear in capitals.

OFF Core describes a portable research object. It does not interpret financial semantics or prove identity, ownership, licensing rights, or analytical correctness.

## 1. Package root and authority

An OFF package is an owned, quiescent directory containing `off.json` at its root. `off.json` is the sole normative manifest. Generators, templates, Markdown, spreadsheets, and other resources do not override it.

The manifest MUST be admitted and normalized under [Normalization 0.1](normalization-0.1.md). Unknown properties are invalid unless this specification or a declared profile assigns them, or they appear inside the `extensions` object.

## 2. Manifest members

The root object MUST contain:

| Member | Contract |
|---|---|
| `offVersion` | Exact string `0.1`. |
| `package` | Package and immutable-release metadata. |
| `profiles` | Unique array of absolute profile URI strings; empty is valid. Core itself is implicit. |
| `resources` | Non-empty array of resource records. |

It MAY contain `relationships`, `profileData`, and `extensions`. Missing optional data is omitted; `null` is not a substitute.

`package` MUST contain `id`, `releaseId`, `releaseVersion`, `title`, `authors`, `license`, `publishedAt`, `canonicalUrl`, and `entrypointResourceId`.

- `id`, `releaseId`, author `id` values, resource IDs, and references MUST be exact absolute URI strings.
- `releaseVersion` and `title` MUST be non-empty strings.
- `authors` MUST be non-empty; each entry MUST contain an exact `id` and a human-readable `name` string. Author IDs MUST be unique by exact string equality.
- `license` MUST contain a non-empty `id` declaration and MAY contain an HTTPS `url`. Validation checks the declaration, not its legal truth.
- `publishedAt` MUST be a real whole-second UTC timestamp under Normalization 0.1: hour `00` through `23`, minute and second `00` through `59`, terminal `Z`, and no leap second.
- `canonicalUrl` MUST be HTTPS and MUST NOT contain user information.
- `entrypointResourceId` MUST resolve to one local resource whose roles include `entrypoint`.

URI strings are inert identifiers. Consumers MUST NOT rewrite case, ports, percent escapes, or other spelling, and conformance evaluation MUST NOT dereference them.

## 3. Resources

Each resource MUST contain:

| Member | Contract |
|---|---|
| `id` | Unique absolute URI. |
| `mediaType` | Lowercase `type/subtype` media-type string without parameters. |
| `roles` | Non-empty unique array of ASCII role tokens. |
| `locations` | Non-empty array of location records. |
| `byteSize` | Required non-negative safe integer when a local location exists. |
| `sha256` | Required 64-character lowercase hexadecimal digest when a local location exists. |

A location is either `{"kind":"local","path":"..."}` or `{"kind":"remote","url":"https://..."}`. A resource has at most one local location. Remote locations are descriptors only; their availability and integrity are always `notEvaluated` during structural conformance.

A local path MUST use `/`, be relative to the package root, and contain only printable ASCII path segments. It MUST NOT contain an empty, `.` or `..` segment, a backslash, percent sign, query, fragment, leading slash, drive or UNC prefix, trailing dot or space, control character, or Windows device-name segment. Paths that collide under ASCII case-folding are invalid.

The resolver MUST reject symlinks and non-regular files, enforce root containment and exact entry spelling, and compare the declared size and SHA-256 digest with raw file bytes. It MUST NOT follow a link or expose an absolute host path.

Resources referenced by `entrypointResourceId`, a relationship, or profile semantics MUST have a local location. Remote-only resources MAY be declared only as supporting evidence or distribution locations; they cannot supply information required to interpret a claimed profile.

## 4. Relationships, profiles, and extensions

Each `relationships` entry MUST contain `fromResourceId`, `relation`, and `toResourceId`. Both IDs MUST resolve, and `relation` MUST be a non-empty ASCII token. Relationships describe resources only and do not imply execution.

Each declared profile URI MAY have one value under `profileData` keyed by the exact same URI. A Core consumer inventories every declared profile. A profile it does not implement is `notEvaluated`; it is not interpreted by guessing from fields.

`extensions` is an object keyed by absolute namespace URI. Extension values MAY contain any admitted I-JSON value. Consumers MUST preserve unknown namespace keys and values exactly through semantic normalization and canonical serialization, without activating URLs or code found inside them.

## 5. Core conformance

Core passes only when identity, release metadata, declarations, resource references, local resolution, and declared integrity satisfy this contract. Remote descriptors do not affect structural validity unless remote content is required for meaning, which is invalid under this profile.

The minimal Core reference package contains only `off.json` and one local human-readable entrypoint. It declares no Public Equity entities, sources, assumptions, outputs, or lineage.

Evaluation outcomes and evaluator failures are defined by [Conformance 0.1](conformance-0.1.md); stable diagnostics are defined by [Diagnostics 0.1](diagnostics-0.1.md).
