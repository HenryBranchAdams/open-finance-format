# Illustrative XBRL source locator

Status: non-normative example

This note shows how OFF can cite an XBRL-related artifact without becoming an XBRL processor. It does not define a profile, schema, extension contract, diagnostic, or conformance fixture.

The terminology follows XBRL International's [Open Information Model 1.0](https://specifications.xbrl.org/work-product-index-open-information-model-open-information-model.html), including its syntax-independent report model and xBRL-JSON representation. Those specifications remain external to OFF and are not imported into the v0.1-rc.1 conformance contract.

An OFF Public Equity `source` may use its normative `evidenceResourceId` to identify a local resource whose raw bytes are size- and SHA-256-checked under OFF Core. The resource may happen to be Inline XBRL, xBRL-JSON, or another report representation; Core treats it as opaque bytes.

An author may place locator metadata in a private namespaced extension, for example:

```json
{
  "extensions": {
    "https://example.org/off/xbrl-locator/1": {
      "sourceFactId": "urn:example:fact:revenue-2025",
      "evidenceResourceId": "urn:example:resource:filing-json",
      "locator": {
        "concept": "us-gaap:RevenueFromContractWithCustomerExcludingAssessedTax",
        "entity": "scheme:value",
        "period": "2025-12-31",
        "unit": "iso4217:USD"
      },
      "status": "notEvaluated"
    }
  }
}
```

A locator that happens to identify a real fact and a deliberately nonexistent locator produce the same OFF conformance result. OFF does not parse the report, resolve a taxonomy, compare the fact value, process calculations or Formula rules, verify cross-syntax equivalence, or treat the assertion as provenance proof.

Every value, unit, effective date, freshness threshold, and lineage edge required by OFF remains explicit in `off.json`. Future XBRL processing, if standardized, requires a separate optional profile and conformance corpus.
