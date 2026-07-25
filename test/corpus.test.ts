import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  evaluatePackage,
  PUBLIC_EQUITY_PROFILE_URI,
} from "../src/index.ts";
import { canonicalizeJsonText } from "../src/json/jcs.ts";
import type { NormalizedResult } from "../src/normalize.ts";
import { validateNormalizedResultSchema } from "../src/schema.ts";

const corpusUrl = new URL("../conformance/corpus.json", import.meta.url);
const conformanceRoot = dirname(fileURLToPath(corpusUrl));

interface CorpusCase {
  readonly id: string;
  readonly boundary: string;
  readonly package: string;
  readonly evaluatedAt: string;
  readonly requestedProfiles: readonly string[];
  readonly expectedOutcome: "valid" | "validWithWarnings" | "invalid";
  readonly expectedDiagnosticCodes: readonly string[];
  readonly expected: string;
}

interface CorpusDocument {
  readonly corpusVersion: "0.1";
  readonly evaluatorFailures: string;
  readonly cases: readonly CorpusCase[];
}

async function readCorpus(): Promise<CorpusDocument> {
  return JSON.parse(await readFile(corpusUrl, "utf8")) as CorpusDocument;
}

async function evaluateCase(item: CorpusCase): Promise<NormalizedResult> {
  const packageRoot = resolve(conformanceRoot, item.package);
  const result = await evaluatePackage({
    packageRoot,
    evaluatedAt: item.evaluatedAt,
    requestedProfiles: item.requestedProfiles,
  });
  assert.equal(result.kind, "packageResult", item.id);
  if (result.kind !== "packageResult") {
    throw new Error(`${item.id}: evaluator failure`);
  }
  return result.normalized;
}

test("the layered corpus declares three positive packages and focused boundaries", async () => {
  const corpus = await readCorpus();
  assert.equal(corpus.corpusVersion, "0.1");
  assert.equal(corpus.evaluatorFailures, "evaluator-failures.json");
  await readFile(resolve(conformanceRoot, corpus.evaluatorFailures));
  assert.deepEqual(corpus.cases.map(({ id }) => id), [
    "core-minimal/valid",
    "public-equity-traceable/current",
    "workbook-binding-google-snapshot/valid",
    "unsupported-profile/invalid",
    "public-equity-traceable/stale",
    "duplicate-json-name/invalid",
    "unsafe-resource-path/invalid",
    "digest-mismatch/invalid",
    "unresolved-lineage/invalid",
    "lineage-cycle/invalid",
    "attestation-mismatch/invalid",
  ]);
  for (const item of corpus.cases) {
    assert.equal(item.boundary.length > 0, true, item.id);
    assert.equal(item.boundary.includes("\n"), false, `${item.id}: one-line boundary`);
    assert.match(item.evaluatedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u);
    for (const path of [item.package, item.expected]) {
      const fromRoot = relative(conformanceRoot, resolve(conformanceRoot, path));
      assert.equal(isAbsolute(fromRoot) || fromRoot.startsWith(".."), false, `${item.id}: contained path`);
    }
    await readFile(resolve(conformanceRoot, item.package, "off.json"));
    await readFile(resolve(conformanceRoot, item.expected));
  }
  assert.equal(new Set(corpus.cases.map(({ expected }) => expected)).size, corpus.cases.length);
  assert.deepEqual(
    [...new Set(corpus.cases.filter(({ package: path }) => path.startsWith("packages/"))
      .map(({ package: path }) => path))],
    [
      "packages/core-minimal",
      "packages/public-equity-traceable",
      "packages/workbook-binding-google-snapshot",
    ],
  );
  assert.deepEqual((await readdir(join(conformanceRoot, "fixtures"))).sort(), [
    "attestation-mismatch",
    "digest-mismatch",
    "duplicate-json-name",
    "lineage-cycle",
    "unresolved-lineage",
    "unsafe-resource-path",
    "unsupported-profile",
  ]);
});

test("every corpus case reproduces its hand-reviewed repository expectation envelope twice", async () => {
  const corpus = await readCorpus();
  for (const item of corpus.cases) {
    const expectedEnvelope = await readFile(resolve(conformanceRoot, item.expected), "utf8");
    const expectedValue = JSON.parse(expectedEnvelope) as NormalizedResult;
    const expectedCanonicalPayload = canonicalizeJsonText(expectedValue);
    assert.equal(expectedCanonicalPayload.endsWith("\n"), false, `${item.id}: normative payload has no trailing LF`);
    assert.equal(
      expectedEnvelope,
      `${expectedCanonicalPayload}\n`,
      `${item.id}: repository envelope is exact no-LF JCS payload plus one LF`,
    );
    assert.deepEqual(validateNormalizedResultSchema(expectedValue), {
      valid: true,
      diagnostics: [],
    }, `${item.id}: expectation schema`);

    const first = await evaluateCase(item);
    const second = await evaluateCase(item);
    assert.equal(first.outcome, item.expectedOutcome, `${item.id}: outcome`);
    assert.deepEqual(
      first.diagnostics.map(({ code }) => code),
      item.expectedDiagnosticCodes,
      `${item.id}: diagnostic boundary`,
    );
    assert.equal(canonicalizeJsonText(first), expectedCanonicalPayload, `${item.id}: canonical payload`);
    assert.equal(canonicalizeJsonText(second), expectedCanonicalPayload, `${item.id}: repeated payload`);
  }
});

test("the positive Public Equity package preserves a generic extension without XBRL semantics", async () => {
  const packageRoot = join(conformanceRoot, "packages/public-equity-traceable");
  const manifest = JSON.parse(await readFile(join(packageRoot, "off.json"), "utf8")) as any;
  assert.deepEqual(manifest.extensions, {
    "https://example.org/extensions/research-note/0.1": {
      reviewState: "synthetic",
      supportsExecution: false,
    },
  });
  assert.equal(/xbrl/iu.test(JSON.stringify(manifest)), false);
  assert.deepEqual((await readdir(packageRoot)).sort(), [
    "OFF.md",
    "evidence.txt",
    "model.csv",
    "off.json",
  ]);

  const current = (await readCorpus()).cases.find(
    ({ id }) => id === "public-equity-traceable/current",
  );
  assert.notEqual(current, undefined);
  if (current !== undefined) {
    const normalized = await evaluateCase(current);
    assert.deepEqual(normalized.extensions, manifest.extensions);
  }
});

test("the positive Public Equity package exposes explainable forward-revenue arithmetic", async () => {
  const packageRoot = join(conformanceRoot, "packages/public-equity-traceable");
  const manifest = JSON.parse(await readFile(join(packageRoot, "off.json"), "utf8")) as any;
  const profile = manifest.profileData[PUBLIC_EQUITY_PROFILE_URI];
  assert.equal(profile.sourceFacts[0].value.value, "100");
  assert.equal(profile.assumptions[0].value.value, "0.1");
  assert.deepEqual(
    {
      id: profile.outputs[0].id,
      label: profile.outputs[0].label,
      value: profile.outputs[0].value.value,
      methodology: profile.outputs[0].methodology,
    },
    {
      id: "https://openfinanceformat.org/examples/public-equity-traceable/entities/output/forward-revenue",
      label: "Forward revenue",
      value: "110",
      methodology: "Multiplies sourced revenue by one plus the declared growth ratio: 100 × (1 + 0.1) = 110.",
    },
  );
  assert.equal(
    await readFile(join(packageRoot, "model.csv"), "utf8"),
    "metric,base_case\nrevenue,100\ngrowth,0.1\nforward_revenue,110\n",
  );
  assert.deepEqual(profile.attestations[0].knownExclusions, []);
  assert.equal(
    profile.attestations[0].materialityPolicy,
    "Sourced revenue and the growth assumption are the complete material inputs to forward revenue.",
  );
});

test("the cycle fixture contains two disjoint cycles and selects the mandated first witness", async () => {
  const packageRoot = join(conformanceRoot, "fixtures/lineage-cycle");
  const manifest = JSON.parse(await readFile(join(packageRoot, "off.json"), "utf8")) as any;
  const edges = manifest.profileData[PUBLIC_EQUITY_PROFILE_URI].lineageEdges
    .map(({ fromId, toId }: { fromId: string; toId: string }) => `${fromId}->${toId}`)
    .sort();
  assert.deepEqual(edges, [
    "urn:off:fixture:output:a->urn:off:fixture:output:b",
    "urn:off:fixture:output:b->urn:off:fixture:output:a",
    "urn:off:fixture:output:bridge->urn:off:fixture:output:headline",
    "urn:off:fixture:output:headline->urn:off:fixture:output:bridge",
  ]);

  const item = (await readCorpus()).cases.find(({ id }) => id === "lineage-cycle/invalid");
  assert.notEqual(item, undefined);
  if (item !== undefined) {
    const normalized = await evaluateCase(item);
    assert.deepEqual(normalized.diagnostics[0]?.parameters, {
      cycleEntityIds: ["urn:off:fixture:output:a", "urn:off:fixture:output:b"],
    });
  }
});

test("a distinct temporary Traceable producer package is accepted without fixture special cases", async (t) => {
  const packageRoot = await mkdtemp(join(tmpdir(), "off-corpus-producer-"));
  t.after(async () => rm(packageRoot, { recursive: true, force: true }));
  const resource = Uint8Array.from([0, 3, 1, 4, 1, 5]);
  await writeFile(join(packageRoot, "different.bin"), resource);
  const resourceDigest = createHash("sha256").update(resource).digest("hex");
  const profile = PUBLIC_EQUITY_PROFILE_URI;
  const resourceId = "urn:off:producer:resource:binary";
  const unitId = "urn:off:producer:unit:eur";
  const ratioUnitId = "urn:off:producer:unit:ratio";
  const scenarioId = "urn:off:producer:scenario:independent";
  const factId = "urn:off:producer:fact:users";
  const assumptionId = "urn:off:producer:assumption:retention";
  const outputId = "urn:off:producer:output:value";
  const attestationId = "urn:off:producer:attestation:value";
  const manifest = {
    offVersion: "0.1",
    package: {
      id: "urn:off:producer:distinct-package",
      releaseId: "urn:off:producer:distinct-release",
      releaseVersion: "2026.7",
      title: "Distinct producer package",
      authors: [{ id: "urn:off:producer:author", name: "Independent Producer" }],
      license: { id: "MIT" },
      publishedAt: "2026-07-17T13:00:00Z",
      canonicalUrl: "https://producer.example/releases/distinct",
      entrypointResourceId: resourceId,
    },
    profiles: [profile],
    resources: [
      {
        id: resourceId,
        mediaType: "application/octet-stream",
        roles: ["source-evidence", "model-artifact", "entrypoint"],
        locations: [{ kind: "local", path: "different.bin" }],
        byteSize: resource.byteLength,
        sha256: resourceDigest,
      },
    ],
    profileData: {
      [profile]: {
        securities: [
          {
            id: "urn:off:producer:security",
            issuerName: "Different Issuer",
            ticker: "DFR",
            exchange: "XNAS",
            securityType: "common-stock",
            reportingCurrencyUnitId: unitId,
          },
        ],
        scenarios: [{ id: scenarioId, label: "Independent case", role: "other" }],
        units: [
          {
            id: ratioUnitId,
            label: "Retention ratio",
            kind: "ratio",
            symbol: "x",
          },
          {
            id: unitId,
            label: "Euros",
            kind: "currency",
            symbol: "€",
            currency: "EUR",
          },
        ],
        sources: [
          {
            id: "urn:off:producer:source:survey",
            title: "Independent survey",
            publisher: "Independent Producer",
            evidenceResourceId: resourceId,
          },
        ],
        sourceFacts: [
          {
            id: factId,
            label: "Active users",
            value: { type: "decimal", value: "222" },
            unitId,
            effectiveDate: "2026-07-01",
            sourceId: "urn:off:producer:source:survey",
            staleAt: "2027-01-01T00:00:00Z",
          },
        ],
        assumptions: [
          {
            id: assumptionId,
            label: "Retention contribution",
            value: { type: "decimal", value: "0.2" },
            unitId: ratioUnitId,
            effectiveDate: "2026-07-17",
            designation: "analystJudgment",
            reviewBy: "2027-01-01T00:00:00Z",
          },
        ],
        outputs: [
          {
            id: outputId,
            label: "Independent value",
            value: { type: "decimal", value: "150" },
            unitId,
            asOfDate: "2026-07-17",
            scenarioId,
            headline: true,
            artifactResourceId: resourceId,
            methodology: "Combines the independent fact and judgment.",
            attestationId,
          },
        ],
        lineageEdges: [
          { fromId: outputId, toId: assumptionId, material: true },
          { fromId: outputId, toId: factId, material: true },
        ],
        attestations: [
          {
            id: attestationId,
            outputIds: [outputId],
            authorId: "urn:off:producer:author",
            attestedAt: "2026-07-17T13:00:00Z",
            artifactResourceId: resourceId,
            artifactSha256: resourceDigest,
            lineageBasis: "author-declared",
            materialityPolicy: "Both independent dependencies are material.",
            scope: "Independent headline value.",
            knownExclusions: ["No spreadsheet execution claim."],
            lineageCompleteness: "attested-not-independently-verified",
          },
        ],
      },
    },
    extensions: { "urn:off:producer:extension": { ordinal: 7 } },
  };
  await writeFile(join(packageRoot, "off.json"), JSON.stringify(manifest));
  const result = await evaluatePackage({
    packageRoot,
    evaluatedAt: "2026-07-17T13:00:00Z",
    requestedProfiles: [profile],
  });
  assert.equal(result.kind, "packageResult");
  if (result.kind === "packageResult") {
    assert.equal(result.normalized.outcome, "valid");
    assert.equal((result.normalized.packageIdentity as any).id, manifest.package.id);
    assert.deepEqual(result.normalized.extensions, manifest.extensions);
    assert.deepEqual(result.normalized.profileResults.declared, [
      {
        uri: profile,
        requested: true,
        status: "passed",
        claim: "Traceable — author-declared lineage",
        structuralConformance: "passed",
        lineageCompleteness: "attested-not-independently-verified",
      },
    ]);
  }
});
