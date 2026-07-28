# OFF normative terminology

Status: normative for mutable post-`v0.1-rc.1` development. This document does
not retroactively amend the frozen candidate.

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**,
**SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **NOT RECOMMENDED**, **MAY**, and
**OPTIONAL** are to be interpreted as described by BCP 14 (RFC 2119 and RFC
8174) when, and only when, they appear in capitals.

## Terms

**OFF package**
: An owned, quiescent directory with `off.json` at its root and the local
  resources it declares. It is input to conformance evaluation, not executable
  software merely because a resource contains active content.

**Manifest**
: `off.json`, the sole normative package source. Narrative files, workbooks,
  generators, and templates cannot override it.

**Protocol artifact**
: A specification, schema, rule registry, corpus descriptor, fixture,
  expectation, or release-authentication file published as part of a candidate
  or development snapshot.

**Release candidate**
: An immutable, identified set of public protocol artifacts offered for
  interoperability testing. A candidate is not a final version and is not
  changed in place.

**Development snapshot**
: The mutable repository state after a candidate. It may implement accepted or
  experimental changes but has no release identity until separately published.

**Core**
: The mandatory profile-independent package contract. Core is implicit for
  every OFF package.

**Profile**
: A contract identified by an exact absolute URI that adds domain or binding
  semantics. A profile URI is an inert identifier; conformance does not
  dereference it.

**Resource**
: A manifest record for local bytes, remote descriptors, or both. A remote
  location is inventory only and reports `notEvaluated` during structural
  conformance.

**Local resource**
: A resource location resolved under the package root and verified against its
  declared raw byte size and SHA-256 digest.

**Normalized result**
: The deterministic semantic result produced under the versioned normalization
  and conformance contracts. It is distinct from the authored manifest.

**Diagnostic**
: A stable, portable package-conformance record. Host errors, stack traces, and
  implementation-library messages are not diagnostics.

**Evaluator failure**
: A sanitized tool-level failure that prevents a package verdict. It is not an
  invalid package result.

**Structural conformance**
: Satisfaction of the applicable admitted-shape, reference, integrity, and
  semantic rules. It does not establish source truth, analytical quality,
  legal rights, spreadsheet execution, independent review, or financial
  correctness.

**Clean-room implementation**
: An unaffiliated implementation produced from authenticated frozen public
  artifacts without private clarification or reference-source guidance, under
  the published clean-room task.

**Normative**
: Required to interpret or evaluate the protocol version in scope.

**Non-normative**
: Explanatory or operational material that cannot override normative protocol
  artifacts.

Text that uses lowercase words such as "must" or "should" is explanatory
unless the surrounding normative contract expressly says otherwise.
