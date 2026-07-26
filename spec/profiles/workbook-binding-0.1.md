# OFF Workbook Binding 0.1

Status: experimental post-`v0.1-rc.1` development profile

Profile URI: `https://openfinanceformat.org/profiles/workbook-binding/0.1`

Schema ID: `https://openfinanceformat.org/schemas/profiles/workbook-binding-0.1.schema.json`

## 1. Profile data

A package declares the profile URI in `profiles` and uses that exact URI as a
`profileData` key. The value is a closed object containing exactly three
required non-empty arrays: `workbooks`, `subjects`, and `bindings`. Every record
and nested object is closed.

Every record `id` is an absolute URI. IDs are globally unique across all three
arrays. Normalization sorts each array by exact UTF-16 lexical `id` order.
Authored strings, including locator strings, retain their admitted spelling.

## 2. Workbooks

A workbook record is:

```json
{
  "id": "urn:example:workbook",
  "snapshotResourceId": "urn:example:resource:workbook",
  "format": "xlsx",
  "capturedAt": "2026-07-25T12:00:00Z"
}
```

`format` is exactly `xlsx` or `google-sheets-xlsx-export`. `capturedAt` is a
real whole-second UTC timestamp ending in `Z`. A workbook may also declare
`liveSourceResourceId`.

`snapshotResourceId` resolves to one Core resource with media type
`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` and exactly
one local regular-file location whose declared byte size and SHA-256 Core
successfully verified. Those Core fields are the snapshot identity and are not
repeated by this profile.

If present, `liveSourceResourceId` is distinct from `snapshotResourceId` and
resolves to a Core resource having an HTTPS remote location. It is an inert
descriptor. Evaluation does not fetch it and does not claim its availability,
permissions, integrity, revision, currentness, or equivalence to the snapshot.

## 3. Subjects and bindings

A subject has an absolute-URI `id`, non-empty `label`, and optional absolute-URI
`externalEntityId`. The external identifier is an inert author declaration. It
is not resolved by this evaluator and does not import or order another
profile's semantics.

A binding has absolute-URI `id`, `subjectId`, and `workbookId`; a closed
`locator`; `role`; and `status`. `subjectId` resolves only to this profile's
subjects. `workbookId` resolves only to this profile's workbooks.

The locator contains a non-empty exact `sheet` string and an A1 `range`. A
range is one cell, or two cells joined by `:`, where each cell matches
`$?[A-Za-z]{1,3}$?[1-9][0-9]*`. Whitespace, sheet qualifiers, commas, named
ranges, row-only or column-only ranges, and multi-area references are invalid.
The evaluator does not trim, case-fold, unquote, or add absolute markers.
Lexical admission does not claim that the sheet or coordinate exists.

`role` is exactly `source`, `assumption`, `output`, or `supporting`. `status` is
exactly `author-declared-not-evaluated`. Workbook Binding never duplicates or
overrides another profile's values, units, dates, lineage, freshness, or
attestations.

## 4. Evaluation

The stage runs only after Core passes and only when the URI is both requested
and declared. It is independent of Public Equity. Schema failure emits only
existing `OFF.SCHEMA.*` diagnostics and suppresses semantic evaluation.
Semantic evaluation applies `OFF-E3101` through `OFF-E3106` from the rule
registry. Duplicate IDs are ambiguous; dependent resource/reference checks do
not infer a unique target.

A passed row has the exact claim
`Bound — author-declared workbook locators`. Passing means only that Core
verified snapshot bytes and the profile's shapes and references are coherent.

The normalized `profileEntities` value retains the three sorted arrays and:

```json
{
  "unevaluated": {
    "workbookContents": "notEvaluated",
    "locatorExistence": "notEvaluated",
    "cellValues": "notEvaluated",
    "formulas": "notEvaluated",
    "recalculation": "notEvaluated"
  }
}
```

A workbook with a live source also retains `liveSourceResourceId` and adds
`liveSourceStatus: "notEvaluated"`. Both are omitted when no live source was
declared. The payload is retained only for a passed row.

The evaluator treats XLSX as opaque bytes. It does not parse ZIP or XML, inspect
workbook contents, extract cells, resolve locators, parse formulas, recalculate,
refresh connections, open a browser, call spreadsheet APIs, fetch remote
resources, or spawn a process. It makes no claim about spreadsheet execution,
cell values, financial correctness, source truth, analytical quality,
computational reproduction, or independent audit.
