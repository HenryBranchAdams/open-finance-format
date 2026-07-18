import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluatePublicEquity,
  type CoreProfileContext,
} from "../src/public-equity.ts";
import { validatePublicEquitySchema } from "../src/schema.ts";

const profileUri =
  "https://openfinanceformat.org/profiles/public-equity-research/0.1";
const artifactId = "urn:off:test:resource:artifact";
const artifactSha256 = "a".repeat(64);
const outputId = "urn:off:test:output:headline";
const factId = "urn:off:test:fact:revenue";
const assumptionId = "urn:off:test:assumption:growth";

const core: CoreProfileContext = {
  authorIds: new Set(["urn:off:test:author"]),
  verifiedLocalResources: new Map([
    [artifactId, { id: artifactId, sha256: artifactSha256 }],
  ]),
};

function manifest(): any {
  return {
    offVersion: "0.1",
    package: {
      id: "urn:off:test:package",
      releaseId: "urn:off:test:release",
      releaseVersion: "1",
      title: "Public Equity test",
      authors: [{ id: "urn:off:test:author", name: "Test Author" }],
      license: { id: "Apache-2.0" },
      publishedAt: "2026-07-17T12:00:00Z",
      canonicalUrl: "https://example.org/releases/1",
      entrypointResourceId: artifactId,
    },
    profiles: [profileUri],
    resources: [
      {
        id: artifactId,
        mediaType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        roles: ["entrypoint", "model-artifact"],
        locations: [{ kind: "local", path: "model.xlsx" }],
        byteSize: 1,
        sha256: artifactSha256,
      },
    ],
    profileData: {
      [profileUri]: {
        securities: [
          {
            id: "urn:off:test:security",
            issuerName: "Issuer",
            ticker: "TEST",
            exchange: "XNYS",
            securityType: "common-stock",
            reportingCurrencyUnitId: "urn:off:test:unit:usd",
          },
        ],
        scenarios: [{ id: "urn:off:test:scenario:base", label: "Base", role: "base" }],
        units: [
          {
            id: "urn:off:test:unit:usd",
            label: "US dollars",
            kind: "currency",
            symbol: "$",
            currency: "USD",
          },
        ],
        sources: [
          {
            id: "urn:off:test:source:filing",
            title: "Filing",
            publisher: "Issuer",
            evidenceResourceId: artifactId,
          },
        ],
        sourceFacts: [
          {
            id: factId,
            label: "Revenue",
            value: { type: "decimal", value: "100" },
            unitId: "urn:off:test:unit:usd",
            effectiveDate: "2026-06-30",
            sourceId: "urn:off:test:source:filing",
            staleAt: "2026-07-18T00:00:00Z",
          },
        ],
        assumptions: [
          {
            id: assumptionId,
            label: "Growth",
            value: { type: "decimal", value: "0.1" },
            unitId: "urn:off:test:unit:usd",
            effectiveDate: "2026-07-17",
            designation: "analystJudgment",
            reviewBy: "2026-07-18T00:00:00Z",
          },
        ],
        outputs: [
          {
            id: outputId,
            label: "Price target",
            value: { type: "decimal", value: "125" },
            unitId: "urn:off:test:unit:usd",
            asOfDate: "2026-07-17",
            scenarioId: "urn:off:test:scenario:base",
            headline: true,
            artifactResourceId: artifactId,
            methodology: "Synthetic methodology",
            attestationId: "urn:off:test:attestation:headline",
          },
        ],
        lineageEdges: [
          { fromId: outputId, toId: factId, material: true },
          { fromId: outputId, toId: assumptionId, material: true },
        ],
        attestations: [
          {
            id: "urn:off:test:attestation:headline",
            outputIds: [outputId],
            authorId: "urn:off:test:author",
            attestedAt: "2026-07-17T12:00:00Z",
            artifactResourceId: artifactId,
            artifactSha256,
            lineageBasis: "author-declared",
            materialityPolicy: "Material dependencies are declared.",
            scope: "Headline output.",
            knownExclusions: [],
            lineageCompleteness: "attested-not-independently-verified",
          },
        ],
      },
    },
  };
}

function evaluate(value = manifest()) {
  return evaluatePublicEquity(value, {
    core,
    evaluatedAt: "2026-07-17T12:00:00Z",
  });
}

test("valid Public Equity semantics normalize independently of authored entity order", () => {
  const first = evaluate();
  const shuffled = manifest();
  shuffled.profileData[profileUri].lineageEdges.reverse();
  shuffled.profileData[profileUri].units.reverse();
  const second = evaluate(shuffled);
  assert.equal(first.ok, true);
  assert.deepEqual(second, first);
  if (first.ok) {
    assert.equal(first.stage, "freshnessCompleted");
    assert.deepEqual(first.resolvedLineage, [
      { fromId: outputId, toId: assumptionId, material: true },
      { fromId: outputId, toId: factId, material: true },
    ]);
    assert.deepEqual(first.diagnostics, []);
  }
});

test("non-headline outputs forbid attestationId", () => {
  const value = manifest();
  value.profileData[profileUri].outputs[0].headline = false;

  assert.equal(validatePublicEquitySchema(value).valid, false);
});

test("headline outputs require attestationId", () => {
  const value = manifest();
  delete value.profileData[profileUri].outputs[0].attestationId;

  assert.equal(validatePublicEquitySchema(value).valid, false);
});

test("security identifier keys accept a normal CIK key", () => {
  const value = manifest();
  value.profileData[profileUri].securities[0].identifiers = {
    CIK: "0000320193",
  };

  assert.equal(validatePublicEquitySchema(value).valid, true);
});

test("security identifier keys reject space and control code points", () => {
  for (const key of ["CI K", `CIK${String.fromCharCode(0x1f)}`]) {
    const value = manifest();
    value.profileData[profileUri].securities[0].identifiers = {
      [key]: "0000320193",
    };

    assert.equal(validatePublicEquitySchema(value).valid, false, key);
  }
});

test("global IDs reject cross-kind duplicates before reference checks", () => {
  const value = manifest();
  value.profileData[profileUri].assumptions[0].id = factId;
  value.profileData[profileUri].assumptions[0].unitId = "urn:missing:unit";
  const result = evaluate(value);
  assert.equal(result.ok, false);
  assert.deepEqual(result.diagnostics, [
    {
      code: "OFF-E4001",
      severity: "error",
      instanceLocation: `/profileData/${profileUri.replaceAll("~", "~0").replaceAll("/", "~1")}/assumptions/0/id`,
      entityId: factId,
      ruleId: "OFF.PROFILE.ENTITY_ID",
      parameters: {
        entityKind: "assumption",
        firstInstanceLocation: `/profileData/${profileUri.replaceAll("~", "~0").replaceAll("/", "~1")}/sourceFacts/0/id`,
      },
    },
  ]);
});

test("unresolved and wrong-kind references emit exact reference diagnostics", () => {
  const value = manifest();
  value.profileData[profileUri].sourceFacts[0].sourceId = "urn:missing:source";
  value.profileData[profileUri].outputs[0].scenarioId = "urn:off:test:unit:usd";
  const result = evaluate(value);
  assert.equal(result.ok, false);
  assert.deepEqual(
    result.diagnostics.map(({ code, entityId, parameters }) => ({ code, entityId, parameters })),
    [
      {
        code: "OFF-E4002",
        entityId: outputId,
        parameters: { expectedKind: "scenario", referencedId: "urn:off:test:unit:usd" },
      },
      {
        code: "OFF-E4002",
        entityId: factId,
        parameters: { expectedKind: "source", referencedId: "urn:missing:source" },
      },
    ],
  );
});

test("unresolved lineage fromId omits entityId from both endpoint diagnostics", () => {
  const value = manifest();
  value.profileData[profileUri].lineageEdges = [
    {
      fromId: "urn:off:test:output:missing",
      toId: "urn:off:test:dependency:missing",
      material: true,
    },
  ];
  const result = evaluate(value);
  assert.equal(result.ok, false);
  assert.deepEqual(result.diagnostics, [
    {
      code: "OFF-E4002",
      severity: "error",
      instanceLocation: `/profileData/${profileUri.replaceAll("~", "~0").replaceAll("/", "~1")}/lineageEdges/0/fromId`,
      ruleId: "OFF.PROFILE.REFERENCE",
      parameters: {
        expectedKind: "output",
        referencedId: "urn:off:test:output:missing",
      },
    },
    {
      code: "OFF-E4002",
      severity: "error",
      instanceLocation: `/profileData/${profileUri.replaceAll("~", "~0").replaceAll("/", "~1")}/lineageEdges/0/toId`,
      ruleId: "OFF.PROFILE.REFERENCE",
      parameters: {
        expectedKind: "lineageDependency",
        referencedId: "urn:off:test:dependency:missing",
      },
    },
  ]);
});

test("self and duplicate edges stop graph evaluation", () => {
  const value = manifest();
  value.profileData[profileUri].lineageEdges.push(
    { fromId: outputId, toId: factId, material: true },
    { fromId: outputId, toId: outputId, material: true },
  );
  const result = evaluate(value);
  assert.equal(result.ok, false);
  assert.deepEqual(
    result.diagnostics.map(({ code, parameters }) => ({ code, parameters })),
    [
      { code: "OFF-E4004", parameters: { fromId: outputId, reason: "duplicate", toId: factId } },
      { code: "OFF-E4004", parameters: { fromId: outputId, reason: "self", toId: outputId } },
    ],
  );
});

test("independent headline and edge rules report in the same active stage", () => {
  const value = manifest();
  const nonHeadlineId = "urn:off:test:output:non-headline";
  const nonHeadline = {
    ...value.profileData[profileUri].outputs[0],
    id: nonHeadlineId,
    headline: false,
  };
  delete nonHeadline.attestationId;
  value.profileData[profileUri].outputs.push(nonHeadline);
  value.profileData[profileUri].lineageEdges = [
    { fromId: nonHeadlineId, toId: nonHeadlineId, material: true },
  ];

  const result = evaluate(value);
  assert.equal(result.ok, false);
  assert.deepEqual(
    result.diagnostics.map(({ code, entityId, parameters }) => ({
      code,
      entityId,
      parameters,
    })),
    [
      {
        code: "OFF-E4003",
        entityId: outputId,
        parameters: { missingFields: ["lineageEdges"] },
      },
      {
        code: "OFF-E4004",
        entityId: nonHeadlineId,
        parameters: {
          fromId: nonHeadlineId,
          reason: "self",
          toId: nonHeadlineId,
        },
      },
    ],
  );
});

test("a headline failure does not suppress an independent cycle diagnostic", () => {
  const value = manifest();
  const cycleAId = "urn:off:test:output:cycle-a";
  const cycleBId = "urn:off:test:output:cycle-b";
  for (const id of [cycleAId, cycleBId]) {
    const output = {
      ...value.profileData[profileUri].outputs[0],
      id,
      headline: false,
    };
    delete output.attestationId;
    value.profileData[profileUri].outputs.push(output);
  }
  value.profileData[profileUri].lineageEdges = [
    { fromId: cycleAId, toId: cycleBId, material: true },
    { fromId: cycleBId, toId: cycleAId, material: true },
  ];

  const result = evaluate(value);
  assert.equal(result.ok, false);
  assert.deepEqual(
    result.diagnostics.map(({ code, entityId, parameters }) => ({
      code,
      entityId,
      parameters,
    })),
    [
      {
        code: "OFF-E4003",
        entityId: outputId,
        parameters: { missingFields: ["lineageEdges"] },
      },
      {
        code: "OFF-E4005",
        entityId: undefined,
        parameters: { cycleEntityIds: [cycleAId, cycleBId] },
      },
    ],
  );
});

test("unterminated output dependencies are reported per headline", () => {
  const value = manifest();
  value.profileData[profileUri].outputs.push({
    ...value.profileData[profileUri].outputs[0],
    id: "urn:off:test:output:dead-end",
    headline: false,
    attestationId: undefined,
  });
  delete value.profileData[profileUri].outputs[1].attestationId;
  value.profileData[profileUri].lineageEdges = [
    { fromId: outputId, toId: "urn:off:test:output:dead-end", material: true },
  ];
  const result = evaluate(value);
  assert.equal(result.ok, false);
  assert.deepEqual(result.diagnostics[0], {
    code: "OFF-E4006",
    severity: "error",
    instanceLocation: `/profileData/${profileUri.replaceAll("~", "~0").replaceAll("/", "~1")}/outputs/0`,
    entityId: outputId,
    ruleId: "OFF.PROFILE.LINEAGE_TERMINAL",
    parameters: { unterminatedNodeIds: ["urn:off:test:output:dead-end"] },
  });
});

test("many headlines reuse one shared-chain termination result", () => {
  const value = manifest();
  const profile = value.profileData[profileUri];
  const baseOutput = profile.outputs[0];
  const headlineIds = [outputId];
  for (let index = 1; index < 256; index += 1) {
    const id = `urn:off:test:output:headline-${index.toString().padStart(4, "0")}`;
    headlineIds.push(id);
    profile.outputs.push({ ...baseOutput, id });
  }

  const chainIds = Array.from(
    { length: 512 },
    (_, index) =>
      `urn:off:test:output:shared-${index.toString().padStart(4, "0")}`,
  );
  for (const id of chainIds) {
    const output = { ...baseOutput, id, headline: false };
    delete output.attestationId;
    profile.outputs.push(output);
  }
  profile.lineageEdges = [
    ...headlineIds.map((id: string) => ({
      fromId: id,
      toId: chainIds[0],
      material: true,
    })),
    ...chainIds.slice(0, -1).map((id: string, index: number) => ({
      fromId: id,
      toId: chainIds[index + 1],
      material: true,
    })),
  ];

  const result = evaluate(value);
  assert.equal(result.ok, false);
  assert.equal(result.diagnostics.length, headlineIds.length);
  assert.equal(
    result.diagnostics.every(
      ({ code, parameters }) =>
        code === "OFF-E4006" &&
        JSON.stringify(parameters.unterminatedNodeIds) ===
          JSON.stringify([chainIds.at(-1)]),
    ),
    true,
  );
  assert.deepEqual(
    result.diagnostics
      .map(({ entityId }) => entityId)
      .sort(),
    [...headlineIds].sort(),
  );
});

test("one headline reports accumulating dead-end outputs without prefix sets", () => {
  const value = manifest();
  const profile = value.profileData[profileUri];
  const baseOutput = profile.outputs[0];
  const count = 256;
  const chainIds = [
    outputId,
    ...Array.from(
      { length: count - 1 },
      (_, index) =>
        `urn:off:test:output:chain-${index.toString().padStart(4, "0")}`,
    ),
  ];
  const deadEndIds = Array.from(
    { length: count },
    (_, index) =>
      `urn:off:test:output:dead-end-${index.toString().padStart(4, "0")}`,
  );
  for (const id of [...chainIds.slice(1), ...deadEndIds]) {
    const output = { ...baseOutput, id, headline: false };
    delete output.attestationId;
    profile.outputs.push(output);
  }
  profile.lineageEdges = [];
  for (let index = 0; index < count; index += 1) {
    profile.lineageEdges.push({
      fromId: chainIds[index],
      toId: deadEndIds[index],
      material: true,
    });
    if (index + 1 < count) {
      profile.lineageEdges.push({
        fromId: chainIds[index],
        toId: chainIds[index + 1],
        material: true,
      });
    }
  }

  const result = evaluate(value);
  assert.equal(result.ok, false);
  assert.equal(result.diagnostics.length, 1);
  assert.deepEqual(result.diagnostics[0], {
    code: "OFF-E4006",
    severity: "error",
    instanceLocation: `/profileData/${profileUri.replaceAll("~", "~0").replaceAll("/", "~1")}/outputs/0`,
    entityId: outputId,
    ruleId: "OFF.PROFILE.LINEAGE_TERMINAL",
    parameters: { unterminatedNodeIds: deadEndIds },
  });
});

test("attestation artifact binding uses deterministic mismatch precedence", () => {
  const value = manifest();
  value.profileData[profileUri].attestations[0].artifactResourceId = artifactId;
  value.profileData[profileUri].attestations[0].artifactSha256 = "b".repeat(64);
  const result = evaluate(value);
  assert.equal(result.ok, false);
  assert.deepEqual(result.diagnostics[0]?.parameters, {
    attestationId: "urn:off:test:attestation:headline",
    reason: "artifactDigestMismatch",
  });
});

test("multiple attestation coverage precedes artifact mismatch", () => {
  const value = manifest();
  value.profileData[profileUri].attestations.push({
    ...value.profileData[profileUri].attestations[0],
    id: "urn:off:test:attestation:second",
    artifactSha256: "b".repeat(64),
  });
  const result = evaluate(value);
  assert.equal(result.ok, false);
  assert.deepEqual(result.diagnostics[0]?.parameters, {
    attestationId: "urn:off:test:attestation:headline",
    reason: "multipleCoverage",
  });
});

test("attestation resource mismatch precedes digest comparison", () => {
  const value = manifest();
  const otherArtifact = "urn:off:test:resource:other";
  value.profileData[profileUri].attestations[0].artifactResourceId = otherArtifact;
  value.profileData[profileUri].attestations[0].artifactSha256 = "b".repeat(64);
  const result = evaluatePublicEquity(value, {
    evaluatedAt: "2026-07-17T12:00:00Z",
    core: {
      ...core,
      verifiedLocalResources: new Map([
        ...core.verifiedLocalResources,
        [otherArtifact, { id: otherArtifact, sha256: "c".repeat(64) }] as const,
      ]),
    },
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.diagnostics[0]?.parameters, {
    attestationId: "urn:off:test:attestation:headline",
    reason: "artifactResourceMismatch",
  });
});

test("zero covering attestations emits missingCoverage", () => {
  const value = manifest();
  const otherOutputId = "urn:off:test:output:other-headline";
  value.profileData[profileUri].outputs.push({
    ...value.profileData[profileUri].outputs[0],
    id: otherOutputId,
  });
  value.profileData[profileUri].lineageEdges.push({
    fromId: otherOutputId,
    toId: factId,
    material: true,
  });
  value.profileData[profileUri].attestations[0].outputIds = [otherOutputId];

  const result = evaluate(value);
  assert.equal(result.ok, false);
  assert.deepEqual(result.diagnostics, [
    {
      code: "OFF-E4007",
      severity: "error",
      instanceLocation: `/profileData/${profileUri.replaceAll("~", "~0").replaceAll("/", "~1")}/outputs/0/attestationId`,
      entityId: outputId,
      ruleId: "OFF.PROFILE.ATTESTATION",
      parameters: {
        attestationId: "urn:off:test:attestation:headline",
        reason: "missingCoverage",
      },
    },
  ]);
});

test("one other covering attestation emits outputNotCovered", () => {
  const value = manifest();
  const otherOutputId = "urn:off:test:output:other-headline";
  value.profileData[profileUri].outputs.push({
    ...value.profileData[profileUri].outputs[0],
    id: otherOutputId,
  });
  value.profileData[profileUri].lineageEdges.push({
    fromId: otherOutputId,
    toId: factId,
    material: true,
  });
  value.profileData[profileUri].attestations[0].outputIds = [otherOutputId];
  value.profileData[profileUri].attestations.push({
    ...value.profileData[profileUri].attestations[0],
    id: "urn:off:test:attestation:other",
    outputIds: [outputId],
  });

  const result = evaluate(value);
  assert.equal(result.ok, false);
  assert.deepEqual(result.diagnostics[0]?.parameters, {
    attestationId: "urn:off:test:attestation:headline",
    reason: "outputNotCovered",
  });
});
