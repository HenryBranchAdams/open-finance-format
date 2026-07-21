# Concepts

Shared domain vocabulary for this project — entities, named processes, and status concepts with project-specific meaning. Seeded with core domain vocabulary, then accretes as ce-compound and ce-compound-refresh process learnings; direct edits are fine. Glossary only, not a spec or catch-all.

## Conformance evidence

### Layered Conformance Corpus
A versioned collection of package fixtures, evaluator-failure vectors, fixed evaluation contexts, and expected normalized results that exercises both valid behavior and boundary failures without executing spreadsheet calculations.

### Local Conformance Proof
Evidence that the reference evaluator reproduces the Layered Conformance Corpus under its stated evaluation contexts, establishing internal consistency without claiming that an independent implementation interprets the format equivalently.

### Clean-room Interoperability Evidence
Frozen results from an unaffiliated alternate-language consumer and an unaffiliated package producer working only from public materials and without private clarification, used to determine whether the public contract supports independent semantic interpretation and authoring of a distinct conforming package.

## Release evidence

### Release Closure
Mechanical evidence that a candidate's declared files, checksums, labels, and generated artifacts are complete and mutually consistent; it detects drift but does not authenticate the publisher or establish interoperability.

### Promotion
The public decision to publish a new immutable candidate after the required clean-room evidence has been independently reviewed, never an in-place status change awarded by the candidate's own validator.
