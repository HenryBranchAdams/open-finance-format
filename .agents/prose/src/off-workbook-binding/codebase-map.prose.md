---
name: off-workbook-binding-codebase-map
kind: responsibility
id: 01KYDD8RP7EJ8SRMT5HT1WP99B
---

### Goal

A smallest-change implementation map for adding one optional profile without destabilizing existing OFF behavior.

### Requires

- `profile-objective`: the bounded outcome, invariants, acceptance criteria, and delivery authority for Workbook Binding

### Maintains

Structured `implementation-map` naming the evaluator, type, schema,
normalization, diagnostic, corpus, test, and documentation seams that own the
change. Paths and existing behavioral contracts are material; discovery order is
immaterial. Postcondition: the map distinguishes required changes from optional
or deferred work and preserves the immutable release closure.

#### implementation-map

- Current supported-profile routing and data flow.
- Required files and tests with non-overlapping ownership.
- Existing failure/normalization conventions to reuse.
- Release-boundary and backward-compatibility constraints.

### Continuity

- input-driven

### Shape

- `self`: inspect repository source, tests, schemas, corpus, scripts, and release boundaries
- `prohibited`: editing files, running networked publication actions, or absorbing untracked work from another checkout
