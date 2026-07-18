import assert from "node:assert/strict";
import test from "node:test";

import rulesDocument from "../spec/rules-0.1.json" with { type: "json" };

import {
  createDiagnostic,
  finalizeDiagnostics,
  getRuleDefinition,
  outcomeFromDiagnostics,
} from "../src/diagnostics.ts";

test("the rule registry does not imply an unpublished fixture matrix", () => {
  for (const rule of rulesDocument.rules) {
    assert.equal("fixtures" in rule, false);
    assert.equal("testScenarios" in rule, false);
  }
});

test("registry diagnostics require exact emission parameters", () => {
  assert.equal(
    getRuleDefinition("OFF.SCHEMA.PROFILE_TARGET").stage,
    "request",
    "requested-profile diagnostics are non-gating request rules",
  );
  assert.deepEqual(
    createDiagnostic("OFF.SCHEMA.VERSION", "/offVersion", {
      supportedVersion: "0.1",
    }),
    {
      code: "OFF-E2002",
      severity: "error",
      instanceLocation: "/offVersion",
      ruleId: "OFF.SCHEMA.VERSION",
      parameters: { supportedVersion: "0.1" },
    },
  );

  assert.throws(
    () => createDiagnostic("OFF.SCHEMA.VERSION", "/offVersion", {}),
    /supportedVersion/u,
  );
  assert.throws(
    () =>
      createDiagnostic("OFF.SCHEMA.VERSION", "/offVersion", {
        supportedVersion: "0.1",
        libraryMessage: "must be equal to constant",
      }),
    /libraryMessage/u,
  );
});

test("diagnostics deduplicate by registry cardinality and sort deterministically", () => {
  const warning = createDiagnostic(
    "OFF.CORE.REMOTE_NOT_EVALUATED",
    "/resources/0/locations/1",
    { locationIndex: 1, url: "https://example.org/report" },
    "urn:off:test:resource:report",
  );
  const error = createDiagnostic("OFF.SCHEMA.ROOT", "/unexpected", {
    constraint: "additionalProperties",
  });

  const finalized = finalizeDiagnostics([warning, error, { ...warning }]);
  assert.deepEqual(finalized, [error, warning]);
  assert.equal(outcomeFromDiagnostics(finalized), "invalid");
  assert.equal(outcomeFromDiagnostics([warning]), "validWithWarnings");
  assert.equal(outcomeFromDiagnostics([]), "valid");
});

test("diagnostic conflicts retain the smallest canonical UTF-8 parameter bytes", () => {
  const utf8Earlier = createDiagnostic("OFF.SCHEMA.IDENTITY", "/package", {
    field: "\ue000",
    reason: "test",
  });
  const utf16Earlier = createDiagnostic("OFF.SCHEMA.IDENTITY", "/package", {
    field: "\u{10000}",
    reason: "test",
  });

  assert.deepEqual(finalizeDiagnostics([utf16Earlier, utf8Earlier]), [utf8Earlier]);

  const locationEarlier = createDiagnostic(
    "OFF.SCHEMA.PROFILE_TARGET",
    "/a",
    { reason: "unsupported" },
    "urn:off:test:profile:conflict",
  );
  const parametersEarlier = createDiagnostic(
    "OFF.SCHEMA.PROFILE_TARGET",
    "/z",
    { reason: "notDeclared" },
    "urn:off:test:profile:conflict",
  );
  assert.deepEqual(
    finalizeDiagnostics([locationEarlier, parametersEarlier]),
    [parametersEarlier],
    "cardinality selection precedes final diagnostic ordering",
  );
});

test("diagnostic parameters are recursively cloned and frozen", () => {
  const staleDependencyIds = ["urn:off:test:leaf:a"];
  const diagnostic = createDiagnostic(
    "OFF.FRESHNESS.HEADLINE_STALE",
    "/profileData/output",
    {
      evaluatedAt: "2026-07-17T12:00:00Z",
      staleDependencyIds,
    },
    "urn:off:test:output",
  );

  staleDependencyIds.push("urn:off:test:leaf:b");
  assert.deepEqual(diagnostic.parameters.staleDependencyIds, [
    "urn:off:test:leaf:a",
  ]);
  assert.equal(Object.isFrozen(diagnostic), true);
  assert.equal(Object.isFrozen(diagnostic.parameters), true);
  assert.equal(Object.isFrozen(diagnostic.parameters.staleDependencyIds), true);
});
