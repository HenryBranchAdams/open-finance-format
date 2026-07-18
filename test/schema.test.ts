import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  OFF_SCHEMA_IDS,
  isAbsoluteUri,
  isHttpsUrlWithoutUserInfo,
  validateCoreSchema,
  validateCoreSchemaForEvaluation,
  validateDiagnosticSchema,
  validateNormalizedResultSchema,
  validatePublicEquitySchema,
} from "../src/schema.ts";
import { createDiagnostic } from "../src/diagnostics.ts";
import { buildNormalizedResult } from "../src/normalize.ts";

const coreManifest = {
  offVersion: "0.1",
  package: {
    id: "urn:off:test:package",
    releaseId: "urn:off:test:release:1",
    releaseVersion: "1",
    title: "Core schema test",
    authors: [{ id: "urn:off:test:author", name: "Test Author" }],
    license: { id: "Apache-2.0" },
    publishedAt: "2026-07-17T12:00:00Z",
    canonicalUrl: "https://example.org/off/releases/1",
    entrypointResourceId: "urn:off:test:resource:entrypoint",
  },
  profiles: [],
  resources: [
    {
      id: "urn:off:test:resource:entrypoint",
      mediaType: "text/markdown",
      roles: ["entrypoint"],
      locations: [{ kind: "local", path: "OFF.md" }],
      byteSize: 12,
      sha256: "0".repeat(64),
    },
  ],
};

const publicEquityUri =
  "https://openfinanceformat.org/profiles/public-equity-research/0.1";

function expectedNormalizedResult(name: string): any {
  return JSON.parse(
    readFileSync(
      new URL(`../conformance/expected/${name}.json`, import.meta.url),
      "utf8",
    ),
  );
}

function publicEquityManifest(): Record<string, unknown> {
  const unitId = "urn:off:test:unit:usd";
  const outputId = "urn:off:test:output:target";
  const attestationId = "urn:off:test:attestation:target";
  return {
    ...structuredClone(coreManifest),
    profiles: [publicEquityUri],
    profileData: {
      [publicEquityUri]: {
        securities: [
          {
            id: "urn:off:test:security",
            issuerName: "Example Issuer",
            ticker: "EXM",
            exchange: "XNYS",
            securityType: "common-stock",
            reportingCurrencyUnitId: unitId,
          },
        ],
        scenarios: [{ id: "urn:off:test:scenario:base", label: "Base", role: "base" }],
        units: [
          {
            id: unitId,
            label: "US dollars",
            kind: "currency",
            symbol: "$",
            currency: "USD",
          },
        ],
        sources: [
          {
            id: "urn:off:test:source:filing",
            title: "Synthetic filing",
            publisher: "Example Issuer",
            evidenceResourceId: "urn:off:test:resource:entrypoint",
          },
        ],
        sourceFacts: [
          {
            id: "urn:off:test:fact:revenue",
            label: "Revenue",
            value: { type: "decimal", value: "100.5" },
            unitId,
            effectiveDate: "2026-06-30",
            sourceId: "urn:off:test:source:filing",
            staleAt: "2026-10-01T00:00:00Z",
          },
        ],
        assumptions: [
          {
            id: "urn:off:test:assumption:growth",
            label: "Growth",
            value: { type: "decimal", value: "-0.5" },
            unitId,
            effectiveDate: "2026-07-17",
            designation: "analystJudgment",
            reviewBy: "2026-10-01T00:00:00Z",
          },
        ],
        outputs: [
          {
            id: outputId,
            label: "Price target",
            value: { type: "decimal", value: "125" },
            unitId,
            asOfDate: "2026-07-17",
            scenarioId: "urn:off:test:scenario:base",
            headline: true,
            artifactResourceId: "urn:off:test:resource:entrypoint",
            methodology: "Synthetic method",
            attestationId,
          },
        ],
        lineageEdges: [
          { fromId: outputId, toId: "urn:off:test:fact:revenue", material: true },
          { fromId: outputId, toId: "urn:off:test:assumption:growth", material: true },
        ],
        attestations: [
          {
            id: attestationId,
            outputIds: [outputId],
            authorId: "urn:off:test:author",
            attestedAt: "2026-07-17T12:00:00Z",
            artifactResourceId: "urn:off:test:resource:entrypoint",
            artifactSha256: "0".repeat(64),
            lineageBasis: "author-declared",
            materialityPolicy: "Every dependency above one percent.",
            scope: "Headline price target.",
            knownExclusions: [],
            lineageCompleteness: "attested-not-independently-verified",
          },
        ],
      },
    },
  };
}

test("the bundled Draft 2020-12 graph validates a closed Core manifest", () => {
  assert.deepEqual(OFF_SCHEMA_IDS, {
    core: "https://openfinanceformat.org/schemas/off-core-0.1.schema.json",
    publicEquity:
      "https://openfinanceformat.org/schemas/profiles/public-equity-research-0.1.schema.json",
    normalizedResult:
      "https://openfinanceformat.org/schemas/normalized-result-0.1.schema.json",
    diagnostic:
      "https://openfinanceformat.org/schemas/diagnostic-0.1.schema.json",
  });

  assert.deepEqual(validateCoreSchema(coreManifest), {
    valid: true,
    diagnostics: [],
  });
  assert.deepEqual(validateCoreSchemaForEvaluation(coreManifest), {
    valid: true,
    diagnostics: [],
    rootShapeFailed: false,
  });

  const invalid = validateCoreSchema({ ...coreManifest, surprise: true });
  assert.equal(invalid.valid, false);
  assert.deepEqual(invalid.diagnostics, [
    {
      code: "OFF-E2001",
      severity: "error",
      instanceLocation: "/surprise",
      ruleId: "OFF.SCHEMA.ROOT",
      parameters: { constraint: "closedObject" },
    },
  ]);
  assert.equal(
    validateCoreSchemaForEvaluation({ ...coreManifest, surprise: true })
      .rootShapeFailed,
    true,
  );

  const leapSecondPublishedAt = structuredClone(coreManifest);
  leapSecondPublishedAt.package.publishedAt = "2026-12-31T23:59:60Z";
  assert.deepEqual(validateCoreSchema(leapSecondPublishedAt).diagnostics, [
    {
      code: "OFF-E2003",
      severity: "error",
      instanceLocation: "/package/publishedAt",
      ruleId: "OFF.SCHEMA.IDENTITY",
      parameters: { field: "publishedAt", reason: "lexicalPattern" },
    },
  ]);
});

test("URI validation uses the exact offline ASCII lexical contract", () => {
  for (const value of [
    "urn:off:test:package",
    "x:a/b?query#fragment",
    "x:a[b]",
    "x:a%5Cb",
    "https://example.org/path?query#fragment",
  ]) {
    assert.equal(isAbsoluteUri(value), true, value);
  }
  for (const value of [
    "urn:",
    "x:%zz",
    "x:a\\b",
    "x:bad space",
    "x:é",
    "1x:value",
  ]) {
    assert.equal(isAbsoluteUri(value), false, value);
  }

  for (const value of [
    "https://example.org",
    "HTTPS://example.org:443/path",
    "https://[2001:db8::1]/report",
  ]) {
    assert.equal(isHttpsUrlWithoutUserInfo(value), true, value);
  }
  for (const value of [
    "http://example.org",
    "https://",
    "https:///path",
    "https://user@example.org",
    "https://example.org/%zz",
  ]) {
    assert.equal(isHttpsUrlWithoutUserInfo(value), false, value);
  }

  for (const invalidId of ["urn:", "x:%zz"]) {
    const invalid = structuredClone(coreManifest);
    invalid.package.id = invalidId;
    assert.equal(validateCoreSchema(invalid).valid, false, invalidId);
  }

  const invalidRelationships = structuredClone(coreManifest) as any;
  invalidRelationships.relationships = [
    {
      fromResourceId: "urn:",
      relation: "supports",
      toResourceId: "x:%zz",
    },
  ];
  assert.deepEqual(
    validateCoreSchema(invalidRelationships).diagnostics.map(
      ({ instanceLocation, parameters }) => ({ instanceLocation, parameters }),
    ),
    [
      {
        instanceLocation: "/relationships/0/fromResourceId",
        parameters: { constraint: "absoluteUri" },
      },
      {
        instanceLocation: "/relationships/0/toResourceId",
        parameters: { constraint: "absoluteUri" },
      },
    ],
  );
});

test("schema diagnostics use stable tokens, child pointers, and prerequisite suppression", () => {
  const missingIdentity = structuredClone(coreManifest) as any;
  delete missingIdentity.package.releaseVersion;
  delete missingIdentity.package.title;
  assert.deepEqual(validateCoreSchema(missingIdentity).diagnostics, [
    {
      code: "OFF-E2003",
      severity: "error",
      instanceLocation: "/package/releaseVersion",
      ruleId: "OFF.SCHEMA.IDENTITY",
      parameters: { field: "releaseVersion", reason: "required" },
    },
    {
      code: "OFF-E2003",
      severity: "error",
      instanceLocation: "/package/title",
      ruleId: "OFF.SCHEMA.IDENTITY",
      parameters: { field: "title", reason: "required" },
    },
  ]);

  const rootFailure = structuredClone(coreManifest) as any;
  rootFailure.surprise = true;
  rootFailure.package.canonicalUrl = "http://example.org";
  assert.deepEqual(validateCoreSchema(rootFailure).diagnostics, [
    {
      code: "OFF-E2001",
      severity: "error",
      instanceLocation: "/surprise",
      ruleId: "OFF.SCHEMA.ROOT",
      parameters: { constraint: "closedObject" },
    },
  ]);
});

test("duplicate package author IDs fail at every occurrence after the first", () => {
  const duplicateAuthors = structuredClone(coreManifest);
  duplicateAuthors.package.authors = [
    { id: "urn:off:test:author:repeated", name: "First" },
    { id: "urn:off:test:author:other", name: "Other" },
    { id: "urn:off:test:author:repeated", name: "Second" },
    { id: "urn:off:test:author:repeated", name: "Third" },
  ];

  assert.deepEqual(validateCoreSchema(duplicateAuthors), {
    valid: false,
    diagnostics: [
      {
        code: "OFF-E2003",
        severity: "error",
        instanceLocation: "/package/authors/2/id",
        ruleId: "OFF.SCHEMA.IDENTITY",
        parameters: { field: "authors.id", reason: "duplicateId" },
      },
      {
        code: "OFF-E2003",
        severity: "error",
        instanceLocation: "/package/authors/3/id",
        ruleId: "OFF.SCHEMA.IDENTITY",
        parameters: { field: "authors.id", reason: "duplicateId" },
      },
    ],
  });
});

test("the Public Equity schema is closed and enforces exact lexical contracts", () => {
  const manifest = publicEquityManifest();
  const before = structuredClone(manifest);
  assert.deepEqual(validatePublicEquitySchema(manifest), {
    valid: true,
    diagnostics: [],
  });
  assert.deepEqual(manifest, before, "schema evaluation must not mutate input");

  const impossibleDate = publicEquityManifest() as any;
  impossibleDate.profileData[publicEquityUri].sourceFacts[0].effectiveDate =
    "2025-02-29";
  const dateResult = validatePublicEquitySchema(impossibleDate);
  assert.equal(dateResult.valid, false);
  assert.equal(dateResult.diagnostics[0]?.parameters.constraint, "realCalendarDate");

  const leapSecond = publicEquityManifest() as any;
  leapSecond.profileData[publicEquityUri].sourceFacts[0].staleAt =
    "2026-12-31T23:59:60Z";
  assert.deepEqual(validatePublicEquitySchema(leapSecond).diagnostics, [
    {
      code: "OFF-E2001",
      severity: "error",
      instanceLocation:
        `/profileData/${publicEquityUri.replaceAll("~", "~0").replaceAll("/", "~1")}/sourceFacts/0/staleAt`,
      ruleId: "OFF.SCHEMA.ROOT",
      parameters: { constraint: "lexicalPattern" },
    },
  ]);

  const extraMember = publicEquityManifest() as any;
  extraMember.profileData[publicEquityUri].sourceFacts[0].displayValue = "$100.5";
  const closedResult = validatePublicEquitySchema(extraMember);
  assert.equal(closedResult.valid, false);
  assert.equal(
    closedResult.diagnostics.some(
      (diagnostic) =>
        diagnostic.instanceLocation.endsWith("/sourceFacts/0/displayValue") &&
        diagnostic.parameters.constraint === "closedObject",
    ),
    true,
  );

  const nonCanonicalDecimal = publicEquityManifest() as any;
  nonCanonicalDecimal.profileData[publicEquityUri].outputs[0].value.value = "125.0";
  assert.equal(validatePublicEquitySchema(nonCanonicalDecimal).valid, false);

  const invalidReferences = publicEquityManifest() as any;
  const profile = invalidReferences.profileData[publicEquityUri];
  profile.assumptions[0].scenarioIds = ["urn:"];
  profile.attestations[0].outputIds = ["x:%zz"];
  profile.lineageEdges[0].fromId = "urn:";
  profile.lineageEdges[0].toId = "x:%zz";
  const profilePointer = publicEquityUri
    .replaceAll("~", "~0")
    .replaceAll("/", "~1");
  assert.deepEqual(
    validatePublicEquitySchema(invalidReferences).diagnostics.map(
      ({ instanceLocation, parameters }) => ({ instanceLocation, parameters }),
    ),
    [
      {
        instanceLocation:
          `/profileData/${profilePointer}/assumptions/0/scenarioIds/0`,
        parameters: { constraint: "absoluteUri" },
      },
      {
        instanceLocation:
          `/profileData/${profilePointer}/attestations/0/outputIds/0`,
        parameters: { constraint: "absoluteUri" },
      },
      {
        instanceLocation:
          `/profileData/${profilePointer}/lineageEdges/0/fromId`,
        parameters: { constraint: "absoluteUri" },
      },
      {
        instanceLocation:
          `/profileData/${profilePointer}/lineageEdges/0/toId`,
        parameters: { constraint: "absoluteUri" },
      },
    ],
  );
});

test("normalized envelope builders obey the Core retention shape", () => {
  const result = buildNormalizedResult({
    stage: "corePassed",
    evaluatedAt: "2026-07-17T12:00:00Z",
    requestedProfiles: [],
    declaredProfiles: [],
    diagnostics: [],
    packageIdentity: {
      ...coreManifest.package,
      declaredProfiles: [],
    },
    resourceInventory: [
      {
        ...coreManifest.resources[0]!,
        locations: [
          {
            kind: "local",
            path: "OFF.md",
            availability: "available",
            integrity: "verified",
          },
        ],
      },
    ],
    relationshipInventory: [],
    extensions: {},
  });

  assert.equal(result.outcome, "valid");
  assert.deepEqual(result.profileResults, {
    core: { status: "passed" },
    declared: [],
  });
  assert.deepEqual(validateNormalizedResultSchema(result), {
    valid: true,
    diagnostics: [],
  });
});

test("normalized freshness collections use canonical entity order", () => {
  const result = buildNormalizedResult({
    stage: "freshnessCompleted",
    evaluatedAt: "2026-07-17T12:00:00Z",
    requestedProfiles: [publicEquityUri],
    declaredProfiles: [publicEquityUri],
    diagnostics: [],
    packageIdentity: {
      ...coreManifest.package,
      declaredProfiles: [publicEquityUri],
    },
    resourceInventory: [
      {
        ...coreManifest.resources[0]!,
        locations: [
          {
            kind: "local",
            path: "OFF.md",
            availability: "available",
            integrity: "verified",
          },
        ],
      },
    ],
    relationshipInventory: [],
    extensions: {},
    publicEquityEntities: {
      securities: [],
      scenarios: [],
      units: [],
      sources: [],
      sourceFacts: [],
      assumptions: [],
      outputs: [],
      attestations: [],
    },
    resolvedLineage: [],
    freshness: {
      leaves: [
        {
          entityId: "urn:off:test:leaf:z",
          status: "stale",
          threshold: "2026-07-17T12:00:00Z",
        },
        {
          entityId: "urn:off:test:leaf:a",
          status: "current",
          threshold: "2026-08-17T12:00:00Z",
        },
      ],
      headlines: [
        {
          entityId: "urn:off:test:headline:z",
          status: "stale",
          staleDependencyIds: [
            "urn:off:test:leaf:z",
            "urn:off:test:leaf:a",
            "urn:off:test:leaf:a",
          ],
        },
        {
          entityId: "urn:off:test:headline:a",
          status: "current",
          staleDependencyIds: [],
        },
      ],
    },
  });

  assert.deepEqual(result.freshness, {
    leaves: [
      {
        entityId: "urn:off:test:leaf:a",
        status: "current",
        threshold: "2026-08-17T12:00:00Z",
      },
      {
        entityId: "urn:off:test:leaf:z",
        status: "stale",
        threshold: "2026-07-17T12:00:00Z",
      },
    ],
    headlines: [
      {
        entityId: "urn:off:test:headline:a",
        status: "current",
        staleDependencyIds: [],
      },
      {
        entityId: "urn:off:test:headline:z",
        status: "stale",
        staleDependencyIds: [
          "urn:off:test:leaf:a",
          "urn:off:test:leaf:z",
        ],
      },
    ],
  });
});

test("normalized-result validation rejects contradictory semantic envelopes", () => {
  const valid = buildNormalizedResult({
    stage: "corePassed",
    evaluatedAt: "2026-07-17T12:00:00Z",
    requestedProfiles: [],
    declaredProfiles: [],
    diagnostics: [],
    packageIdentity: { ...coreManifest.package, declaredProfiles: [] },
    resourceInventory: [
      {
        ...coreManifest.resources[0]!,
        locations: [
          {
            kind: "local",
            path: "OFF.md",
            availability: "available",
            integrity: "verified",
          },
        ],
      },
    ],
    relationshipInventory: [],
    extensions: {},
  });

  const outcomeMismatch = structuredClone(valid) as any;
  outcomeMismatch.outcome = "invalid";
  assert.equal(validateNormalizedResultSchema(outcomeMismatch).valid, false);

  const leapSecondContext = structuredClone(valid) as any;
  leapSecondContext.evaluationContext.evaluatedAt =
    "2026-12-31T23:59:60Z";
  assert.equal(validateNormalizedResultSchema(leapSecondContext).valid, false);

  const missingCoreMembers = structuredClone(valid) as any;
  delete missingCoreMembers.packageIdentity;
  assert.equal(validateNormalizedResultSchema(missingCoreMembers).valid, false);

  const falseClaim = structuredClone(valid) as any;
  falseClaim.profileResults.declared = [
    {
      uri: "urn:off:test:unknown-profile",
      requested: false,
      status: "failed",
      claim: "Traceable — author-declared lineage",
      structuralConformance: "passed",
      lineageCompleteness: "attested-not-independently-verified",
    },
  ];
  assert.equal(validateNormalizedResultSchema(falseClaim).valid, false);

  const freshnessWithoutLineage = structuredClone(valid) as any;
  freshnessWithoutLineage.freshness = { leaves: [], headlines: [] };
  assert.equal(validateNormalizedResultSchema(freshnessWithoutLineage).valid, false);

  const inconsistentRows = structuredClone(valid) as any;
  inconsistentRows.evaluationContext.requestedProfiles = [
    "urn:off:test:requested-profile",
  ];
  assert.equal(validateNormalizedResultSchema(inconsistentRows).valid, false);

  const passedWithoutProfilePayload = structuredClone(valid) as any;
  passedWithoutProfilePayload.evaluationContext.requestedProfiles = [
    publicEquityUri,
  ];
  passedWithoutProfilePayload.packageIdentity.declaredProfiles = [
    publicEquityUri,
  ];
  passedWithoutProfilePayload.profileResults.declared = [
    {
      uri: publicEquityUri,
      requested: true,
      status: "passed",
      claim: "Traceable — author-declared lineage",
      structuralConformance: "passed",
      lineageCompleteness: "attested-not-independently-verified",
    },
  ];
  assert.deepEqual(
    validateNormalizedResultSchema(passedWithoutProfilePayload).diagnostics,
    [
      {
        code: "OFF-E2001",
        severity: "error",
        instanceLocation: "/profileResults/declared/0/status",
        ruleId: "OFF.SCHEMA.ROOT",
        parameters: { constraint: "profilePassedRetention" },
      },
    ],
  );

  const emptyPublicEquity = buildNormalizedResult({
    ...structuredClone(valid),
    stage: "publicEquityGraphPassed",
    evaluatedAt: "2026-07-17T12:00:00Z",
    requestedProfiles: [publicEquityUri],
    declaredProfiles: [publicEquityUri],
    diagnostics: [],
    packageIdentity: {
      ...coreManifest.package,
      declaredProfiles: [publicEquityUri],
    },
    resourceInventory: valid.resourceInventory as never,
    relationshipInventory: [],
    extensions: {},
    publicEquityEntities: {
      securities: [],
      scenarios: [],
      units: [],
      sources: [],
      sourceFacts: [],
      assumptions: [],
      outputs: [],
      attestations: [],
    },
    resolvedLineage: [],
  });
  assert.equal(validateNormalizedResultSchema(emptyPublicEquity).valid, false);

  const coreNotEvaluated = structuredClone(valid) as any;
  coreNotEvaluated.profileResults.core.status = "notEvaluated";
  assert.equal(validateNormalizedResultSchema(coreNotEvaluated).valid, false);

  for (const diagnostic of [
    createDiagnostic("OFF.ADMISSION.JSON", "", { byteOffset: 0 }),
    createDiagnostic("OFF.SCHEMA.ROOT", "/resources", {
      constraint: "type",
    }),
    createDiagnostic("OFF.SCHEMA.PROFILE_DECLARATION", "/profileData", {
      profileUri: "",
      reason: "type",
    }),
    expectedNormalizedResult("digest-mismatch-invalid").diagnostics[0],
  ]) {
    const passedWithCoreError = structuredClone(valid) as any;
    passedWithCoreError.outcome = "invalid";
    passedWithCoreError.diagnostics = [diagnostic];
    assert.equal(validateNormalizedResultSchema(passedWithCoreError).valid, false);
  }

  const publicEquityCurrent = expectedNormalizedResult("public-equity-current");
  assert.equal(
    validateNormalizedResultSchema(publicEquityCurrent).valid,
    true,
    "freshness and remote-descriptor warnings remain compatible with a passed profile",
  );

  const passedWithProfileError = structuredClone(publicEquityCurrent);
  passedWithProfileError.outcome = "invalid";
  passedWithProfileError.diagnostics =
    expectedNormalizedResult("attestation-mismatch-invalid").diagnostics;
  assert.equal(validateNormalizedResultSchema(passedWithProfileError).valid, false);

  const profilePointer = publicEquityUri.replaceAll("~", "~0").replaceAll("/", "~1");
  const profileSchemaError = createDiagnostic(
    "OFF.SCHEMA.ROOT",
    `/profileData/${profilePointer}/outputs/0/methodology`,
    { constraint: "nonEmpty" },
  );
  const passedWithProfileSchemaError = structuredClone(publicEquityCurrent);
  passedWithProfileSchemaError.outcome = "invalid";
  passedWithProfileSchemaError.diagnostics = [profileSchemaError];
  assert.equal(
    validateNormalizedResultSchema(passedWithProfileSchemaError).valid,
    false,
  );

  const missingProfileDataError = createDiagnostic(
    "OFF.SCHEMA.PROFILE_DECLARATION",
    "/profileData",
    { profileUri: "", reason: "required" },
  );
  for (const diagnostic of [profileSchemaError, missingProfileDataError]) {
    const failedProfileAfterCorePass = structuredClone(valid) as any;
    failedProfileAfterCorePass.outcome = "invalid";
    failedProfileAfterCorePass.evaluationContext.requestedProfiles = [publicEquityUri];
    failedProfileAfterCorePass.packageIdentity.declaredProfiles = [publicEquityUri];
    failedProfileAfterCorePass.profileResults.declared = [
      { uri: publicEquityUri, requested: true, status: "failed" },
    ];
    failedProfileAfterCorePass.diagnostics = [diagnostic];
    assert.equal(
      validateNormalizedResultSchema(failedProfileAfterCorePass).valid,
      true,
      "a Public Equity schema failure does not reverse an independent Core pass",
    );
  }

  const freshnessWarning = expectedNormalizedResult(
    "public-equity-stale",
  ).diagnostics.find((diagnostic: any) => diagnostic.code === "OFF-W5001");
  assert.ok(freshnessWarning);

  const failedWithWarningOnly = structuredClone(valid) as any;
  failedWithWarningOnly.outcome = "validWithWarnings";
  failedWithWarningOnly.evaluationContext.requestedProfiles = [publicEquityUri];
  failedWithWarningOnly.packageIdentity.declaredProfiles = [publicEquityUri];
  failedWithWarningOnly.profileResults.declared = [
    { uri: publicEquityUri, requested: true, status: "failed" },
  ];
  failedWithWarningOnly.diagnostics = [freshnessWarning];
  assert.equal(
    validateNormalizedResultSchema(failedWithWarningOnly).valid,
    false,
    "warnings alone cannot justify a failed profile row",
  );

  const notEvaluatedWithProfileError = structuredClone(valid) as any;
  notEvaluatedWithProfileError.outcome = "invalid";
  notEvaluatedWithProfileError.evaluationContext.requestedProfiles = [
    publicEquityUri,
  ];
  notEvaluatedWithProfileError.packageIdentity.declaredProfiles = [
    publicEquityUri,
  ];
  notEvaluatedWithProfileError.profileResults.declared = [
    { uri: publicEquityUri, requested: true, status: "notEvaluated" },
  ];
  notEvaluatedWithProfileError.diagnostics = [profileSchemaError];
  assert.equal(
    validateNormalizedResultSchema(notEvaluatedWithProfileError).valid,
    false,
    "an applicable profile error requires failed rather than notEvaluated",
  );

  const unsupportedWithoutRequestError = expectedNormalizedResult(
    "unsupported-profile-invalid",
  );
  unsupportedWithoutRequestError.outcome = "valid";
  unsupportedWithoutRequestError.diagnostics = [];
  unsupportedWithoutRequestError.profileResults.declared[0].status =
    "notEvaluated";
  assert.equal(
    validateNormalizedResultSchema(unsupportedWithoutRequestError).valid,
    false,
    "a requested unsupported profile requires its request error and failed status",
  );

  for (const fixture of [
    "attestation-mismatch-invalid",
    "unresolved-lineage-invalid",
  ]) {
    const graphFailureWithoutEntities = expectedNormalizedResult(fixture);
    delete graphFailureWithoutEntities.profileEntities;
    assert.equal(
      validateNormalizedResultSchema(graphFailureWithoutEntities).valid,
      false,
      `${fixture}: graph failure retains profile entities`,
    );
  }

  const corePassedProfileInput = {
    stage: "corePassed" as const,
    evaluatedAt: valid.evaluationContext.evaluatedAt,
    requestedProfiles: [publicEquityUri],
    declaredProfiles: [publicEquityUri],
    packageIdentity: {
      ...coreManifest.package,
      declaredProfiles: [publicEquityUri],
    },
    resourceInventory: [
      {
        ...coreManifest.resources[0]!,
        locations: [
          {
            kind: "local",
            path: "OFF.md",
            availability: "available",
            integrity: "verified",
          },
        ],
      },
    ],
    relationshipInventory: [],
    extensions: {},
  };
  assert.throws(
    () =>
      buildNormalizedResult({
        ...corePassedProfileInput,
        diagnostics: [freshnessWarning],
        profileResultOverrides: {
          [publicEquityUri]: { status: "failed" },
        },
      }),
    /status failed is incompatible/u,
  );
  assert.throws(
    () =>
      buildNormalizedResult({
        ...corePassedProfileInput,
        diagnostics: [profileSchemaError],
      }),
    /status notEvaluated is incompatible/u,
  );
  const legitimateProfileSchemaFailure = buildNormalizedResult({
    ...corePassedProfileInput,
    diagnostics: [profileSchemaError],
    profileResultOverrides: {
      [publicEquityUri]: { status: "failed" },
    },
  });
  assert.equal(legitimateProfileSchemaFailure.profileResults.core.status, "passed");
  assert.equal(
    legitimateProfileSchemaFailure.profileResults.declared[0]?.status,
    "failed",
  );

  const rejectCoreMutation = (mutate: (result: any) => void): void => {
    const candidate = structuredClone(valid) as any;
    mutate(candidate);
    assert.equal(validateNormalizedResultSchema(candidate).valid, false);
  };
  rejectCoreMutation((candidate) => {
    candidate.packageIdentity.authors[0].id = "not-uri";
  });
  rejectCoreMutation((candidate) => {
    candidate.packageIdentity.publishedAt = "2025-02-29T12:00:00Z";
  });
  rejectCoreMutation((candidate) => {
    candidate.packageIdentity.canonicalUrl = "http://example.org";
  });
  rejectCoreMutation((candidate) => {
    candidate.resourceInventory[0].id = "not-uri";
  });
  rejectCoreMutation((candidate) => {
    candidate.resourceInventory[0].roles = ["bad role"];
  });
  rejectCoreMutation((candidate) => {
    candidate.resourceInventory[0].locations[0].path = "../OFF.md";
  });
  rejectCoreMutation((candidate) => {
    candidate.packageIdentity.authors = [
      { id: "urn:off:test:author:z", name: "Z" },
      { id: "urn:off:test:author:a", name: "A" },
    ];
  });
  rejectCoreMutation((candidate) => {
    candidate.resourceInventory[0].roles = ["narrative", "entrypoint"];
  });

  const reversedUnits = structuredClone(publicEquityCurrent);
  reversedUnits.profileEntities[publicEquityUri].units.reverse();
  assert.equal(validateNormalizedResultSchema(reversedUnits).valid, false);

  const reversedLineage = structuredClone(publicEquityCurrent);
  reversedLineage.resolvedLineage.reverse();
  assert.equal(validateNormalizedResultSchema(reversedLineage).valid, false);

  const reversedFreshness = structuredClone(publicEquityCurrent);
  reversedFreshness.freshness.leaves.reverse();
  assert.equal(validateNormalizedResultSchema(reversedFreshness).valid, false);

  const invalidProfileReference = structuredClone(publicEquityCurrent);
  invalidProfileReference.profileEntities[publicEquityUri].outputs[0].scenarioId =
    "not-uri";
  assert.equal(validateNormalizedResultSchema(invalidProfileReference).valid, false);

  const reversedDiagnostics = expectedNormalizedResult("public-equity-stale");
  reversedDiagnostics.diagnostics.reverse();
  assert.equal(validateNormalizedResultSchema(reversedDiagnostics).valid, false);
});

test("normalized-result builder enforces stage and profile-claim invariants", () => {
  const admissionError = createDiagnostic("OFF.ADMISSION.JSON", "", {
    byteOffset: 0,
  });
  const admissionFailed = buildNormalizedResult({
    stage: "admissionFailed",
    evaluatedAt: "2026-07-17T12:00:00Z",
    requestedProfiles: [publicEquityUri],
    declaredProfiles: [publicEquityUri],
    diagnostics: [admissionError],
  });
  assert.deepEqual(admissionFailed.profileResults.declared, []);

  const rootFailure = createDiagnostic("OFF.SCHEMA.ROOT", "", {
    constraint: "type",
  });
  const schemaFailed = buildNormalizedResult({
    stage: "schemaFailed",
    evaluatedAt: "2026-07-17T12:00:00Z",
    requestedProfiles: ["urn:off:test:profile:unsupported"],
    declaredProfiles: ["urn:off:test:profile:unsupported"],
    diagnostics: [rootFailure],
    rootShapeFailed: true,
  });
  assert.equal(
    schemaFailed.diagnostics.some(({ code }) => code === "OFF-E2006"),
    false,
  );
  assert.deepEqual(schemaFailed.profileResults.declared, [
    {
      uri: "urn:off:test:profile:unsupported",
      requested: true,
      status: "notEvaluated",
    },
  ]);
  assert.equal(validateNormalizedResultSchema(schemaFailed).valid, true);

  const nestedFailure = buildNormalizedResult({
    stage: "schemaFailed",
    evaluatedAt: "2026-07-17T12:00:00Z",
    requestedProfiles: ["urn:off:test:profile:unsupported"],
    declaredProfiles: ["urn:off:test:profile:unsupported"],
    diagnostics: [
      createDiagnostic("OFF.SCHEMA.ROOT", "/resources", {
        constraint: "type",
      }),
    ],
  });
  assert.equal(
    nestedFailure.diagnostics.some(({ code }) => code === "OFF-E2006"),
    true,
  );

  const manifestWithoutProfiles = structuredClone(coreManifest) as any;
  delete manifestWithoutProfiles.profiles;
  const missingProfilesValidation = validateCoreSchemaForEvaluation(
    manifestWithoutProfiles,
  );
  assert.equal(missingProfilesValidation.rootShapeFailed, false);
  const missingProfilesFailure = buildNormalizedResult({
    stage: "schemaFailed",
    evaluatedAt: "2026-07-17T12:00:00Z",
    requestedProfiles: ["urn:off:test:profile:unsupported"],
    declaredProfiles: [],
    diagnostics: missingProfilesValidation.diagnostics,
    rootShapeFailed: missingProfilesValidation.rootShapeFailed,
  });
  assert.equal(
    missingProfilesFailure.diagnostics.some(({ code }) => code === "OFF-E2006"),
    true,
  );

  assert.throws(
    () =>
      buildNormalizedResult({
        stage: "schemaFailed",
        evaluatedAt: "2026-07-17T12:00:00Z",
        requestedProfiles: [],
        diagnostics: [
          createDiagnostic("OFF.SCHEMA.ROOT", "", {
            constraint: "type",
          }),
        ],
      }),
    /declaredProfiles/u,
  );

  assert.throws(
    () =>
      buildNormalizedResult({
        stage: "coreFailed",
        evaluatedAt: "2026-07-17T12:00:00Z",
        requestedProfiles: [],
        declaredProfiles: [],
        diagnostics: [],
        packageIdentity: { ...coreManifest.package, declaredProfiles: [] },
        resourceInventory: [],
        extensions: {},
      }),
    /error diagnostic/u,
  );

  const corePassedInput = {
    stage: "corePassed" as const,
    evaluatedAt: "2026-07-17T12:00:00Z",
    requestedProfiles: [publicEquityUri],
    declaredProfiles: [publicEquityUri],
    diagnostics: [],
    packageIdentity: {
      ...coreManifest.package,
      declaredProfiles: [publicEquityUri],
    },
    resourceInventory: [
      {
        ...coreManifest.resources[0]!,
        locations: [
          {
            kind: "local",
            path: "OFF.md",
            availability: "available",
            integrity: "verified",
          },
        ],
      },
    ],
    relationshipInventory: [],
    extensions: {},
  };
  assert.throws(
    () =>
      buildNormalizedResult({
        ...corePassedInput,
        profileResultOverrides: {
          [publicEquityUri]: { status: "passed" },
        },
      }),
    /graph completion/u,
  );
  assert.throws(
    () =>
      buildNormalizedResult({
        ...corePassedInput,
        profileResultOverrides: {
          "urn:off:test:unknown-profile": { status: "passed" },
        },
      }),
    /unknown profile/u,
  );
  assert.throws(
    () =>
      buildNormalizedResult({
        ...corePassedInput,
        packageIdentity: { ...corePassedInput.packageIdentity, declaredProfiles: [] },
      }),
    /declaredProfiles/u,
  );
});

test("normalized results recursively clone and freeze caller-owned values", () => {
  const author = { id: "urn:off:test:author", name: "Before" };
  const extensions = { "urn:off:test:extension": { value: "before" } };
  const result = buildNormalizedResult({
    stage: "corePassed",
    evaluatedAt: "2026-07-17T12:00:00Z",
    requestedProfiles: [],
    declaredProfiles: [],
    diagnostics: [],
    packageIdentity: {
      ...coreManifest.package,
      authors: [author],
      declaredProfiles: [],
    },
    resourceInventory: [
      {
        ...coreManifest.resources[0]!,
        locations: [
          {
            kind: "local",
            path: "OFF.md",
            availability: "available",
            integrity: "verified",
          },
        ],
      },
    ],
    relationshipInventory: [],
    extensions,
  });

  author.name = "After";
  extensions["urn:off:test:extension"].value = "after";
  assert.equal((result.packageIdentity as any).authors[0].name, "Before");
  assert.equal(
    (result.extensions as any)["urn:off:test:extension"].value,
    "before",
  );
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.packageIdentity), true);
  assert.equal(Object.isFrozen((result.packageIdentity as any).authors[0]), true);
  assert.equal(
    Object.isFrozen((result.extensions as any)["urn:off:test:extension"]),
    true,
  );
});

test("profile results expose requested-only, declared-only, and supported targets", () => {
  const unknownRequested = "urn:off:test:profile:requested-only";
  const unknownDeclared = "urn:off:test:profile:declared-only";
  const publicEquity =
    "https://openfinanceformat.org/profiles/public-equity-research/0.1";
  const common = {
    evaluatedAt: "2026-07-17T12:00:00Z",
    diagnostics: [],
  };
  const retainedCore = (declaredProfiles: readonly string[]) => ({
    packageIdentity: {
      ...coreManifest.package,
      declaredProfiles,
    },
    resourceInventory: [
      {
        ...coreManifest.resources[0]!,
        locations: [
          {
            kind: "local",
            path: "OFF.md",
            availability: "available",
            integrity: "verified",
          },
        ],
      },
    ],
    relationshipInventory: [],
    extensions: {},
  });

  const requestedOnly = buildNormalizedResult({
    ...common,
    stage: "corePassed",
    requestedProfiles: [unknownRequested],
    declaredProfiles: [],
    ...retainedCore([]),
  });
  assert.equal(requestedOnly.outcome, "invalid");
  assert.deepEqual(requestedOnly.profileResults.declared, [
    { uri: unknownRequested, requested: true, status: "failed" },
  ]);
  assert.deepEqual(requestedOnly.diagnostics, [
    {
      code: "OFF-E2006",
      severity: "error",
      instanceLocation: "",
      entityId: unknownRequested,
      ruleId: "OFF.SCHEMA.PROFILE_TARGET",
      parameters: { reason: "notDeclared" },
    },
  ]);
  assert.equal(validateNormalizedResultSchema(requestedOnly).valid, true);

  const declaredOnly = buildNormalizedResult({
    stage: "corePassed",
    evaluatedAt: common.evaluatedAt,
    diagnostics: [],
    requestedProfiles: [],
    declaredProfiles: [unknownDeclared],
    ...retainedCore([unknownDeclared]),
  });
  assert.equal(declaredOnly.outcome, "valid");
  assert.deepEqual(declaredOnly.profileResults.declared, [
    { uri: unknownDeclared, requested: false, status: "notEvaluated" },
  ]);
  assert.equal(validateNormalizedResultSchema(declaredOnly).valid, true);

  const unsupported = buildNormalizedResult({
    ...common,
    stage: "corePassed",
    requestedProfiles: [unknownDeclared],
    declaredProfiles: [unknownDeclared],
    ...retainedCore([unknownDeclared]),
  });
  assert.equal(unsupported.outcome, "invalid");
  assert.deepEqual(unsupported.profileResults.declared, [
    { uri: unknownDeclared, requested: true, status: "failed" },
  ]);
  assert.deepEqual(unsupported.diagnostics[0]?.parameters, {
    reason: "unsupported",
  });
  assert.equal(unsupported.profileResults.core.status, "passed");
  assert.equal(validateNormalizedResultSchema(unsupported).valid, true);

  const corePassed = buildNormalizedResult({
    stage: "corePassed",
    evaluatedAt: common.evaluatedAt,
    requestedProfiles: [publicEquity],
    declaredProfiles: [publicEquity],
    diagnostics: [],
    ...retainedCore([publicEquity]),
  });
  assert.deepEqual(corePassed.profileResults.declared, [
    { uri: publicEquity, requested: true, status: "notEvaluated" },
  ]);

  const profilePassed = buildNormalizedResult({
    ...corePassed,
    stage: "publicEquityGraphPassed",
    evaluatedAt: common.evaluatedAt,
    requestedProfiles: [publicEquity],
    declaredProfiles: [publicEquity],
    diagnostics: [],
    packageIdentity: { ...coreManifest.package, declaredProfiles: [publicEquity] },
    resourceInventory: corePassed.resourceInventory as never,
    relationshipInventory: [],
    extensions: {},
    publicEquityEntities: {
      securities: [],
      scenarios: [],
      units: [],
      sources: [],
      sourceFacts: [],
      assumptions: [],
      outputs: [],
      attestations: [],
    },
    resolvedLineage: [],
  });
  assert.deepEqual(profilePassed.profileResults.declared, [
    {
      uri: publicEquity,
      requested: true,
      status: "passed",
      claim: "Traceable — author-declared lineage",
      structuralConformance: "passed",
      lineageCompleteness: "attested-not-independently-verified",
    },
  ]);

  assert.throws(
    () =>
      buildNormalizedResult({
        ...common,
        stage: "schemaFailed",
        evaluatedAt: "2025-02-29T12:00:00Z",
        requestedProfiles: [],
      }),
    /evaluatedAt/u,
  );
  assert.throws(
    () =>
      buildNormalizedResult({
        ...common,
        stage: "schemaFailed",
        requestedProfiles: ["not an absolute URI"],
        declaredProfiles: [],
      }),
    /absolute URI/u,
  );
});

test("diagnostic and normalized-result schemas reject registry drift", () => {
  const valid = {
    code: "OFF-E2002",
    severity: "error",
    instanceLocation: "/offVersion",
    ruleId: "OFF.SCHEMA.VERSION",
    parameters: { supportedVersion: "0.1" },
  };
  assert.equal(validateDiagnosticSchema(valid).valid, true);
  assert.equal(
    validateDiagnosticSchema({ ...valid, code: "OFF-E2999" }).valid,
    false,
  );
  assert.equal(
    validateDiagnosticSchema({ ...valid, ruleId: "OFF.SCHEMA.UNKNOWN" }).valid,
    false,
  );
});
