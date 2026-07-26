import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  cp,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  evaluatePackage,
  PUBLIC_EQUITY_PROFILE_URI,
  WORKBOOK_BINDING_PROFILE_URI,
} from "../src/index.ts";
import { runCli } from "../src/cli.ts";
import { canonicalizeJsonText } from "../src/json/jcs.ts";
import {
  validateNormalizedResultSchema,
  validateWorkbookBindingSchema,
} from "../src/schema.ts";
import {
  evaluateWorkbookBinding,
  XLSX_MEDIA_TYPE,
  type WorkbookBindingCoreContext,
} from "../src/workbook-binding.ts";

const profile = WORKBOOK_BINDING_PROFILE_URI;
const workbookId = "urn:off:test:workbook";
const subjectId = "urn:off:test:subject";
const bindingId = "urn:off:test:binding";
const snapshotId = "urn:off:test:resource:snapshot";
const liveId = "https://docs.google.com/spreadsheets/d/example";

function manifest(): any {
  return {
    offVersion: "0.1",
    package: {
      id: "urn:off:test:workbook-package",
      releaseId: "urn:off:test:workbook-release",
      releaseVersion: "1",
      title: "Workbook Binding test",
      authors: [{ id: "urn:off:test:author", name: "Test Author" }],
      license: { id: "Apache-2.0" },
      publishedAt: "2026-07-25T12:00:00Z",
      canonicalUrl: "https://example.org/workbook-binding",
      entrypointResourceId: "urn:off:test:resource:entrypoint",
    },
    profiles: [profile],
    resources: [
      {
        id: "urn:off:test:resource:entrypoint",
        mediaType: "text/markdown",
        roles: ["entrypoint"],
        locations: [{ kind: "local", path: "OFF.md" }],
        byteSize: 0,
        sha256: "0".repeat(64),
      },
      {
        id: snapshotId,
        mediaType: XLSX_MEDIA_TYPE,
        roles: ["workbook-snapshot"],
        locations: [{ kind: "local", path: "snapshot.xlsx" }],
        byteSize: 0,
        sha256: "0".repeat(64),
      },
      {
        id: liveId,
        mediaType: XLSX_MEDIA_TYPE,
        roles: ["live-source"],
        locations: [{ kind: "remote", url: liveId }],
      },
    ],
    profileData: {
      [profile]: {
        workbooks: [
          {
            id: workbookId,
            snapshotResourceId: snapshotId,
            format: "google-sheets-xlsx-export",
            capturedAt: "2026-07-25T11:59:59Z",
            liveSourceResourceId: liveId,
          },
        ],
        subjects: [
          {
            id: subjectId,
            label: "Revenue",
            externalEntityId: "urn:off:external:revenue",
          },
        ],
        bindings: [
          {
            id: bindingId,
            subjectId,
            workbookId,
            locator: { sheet: " Inputs ", range: "$B$2:C3" },
            role: "source",
            status: "author-declared-not-evaluated",
          },
        ],
      },
    },
  };
}

function coreContext(
  overrides: Partial<WorkbookBindingCoreContext> = {},
): WorkbookBindingCoreContext {
  return {
    resources: new Map([
      [
        snapshotId,
        {
          id: snapshotId,
          mediaType: XLSX_MEDIA_TYPE,
          locations: [
            {
              kind: "local",
              path: "snapshot.xlsx",
              availability: "available",
              integrity: "verified",
            },
          ],
        },
      ],
      [
        liveId,
        {
          id: liveId,
          mediaType: XLSX_MEDIA_TYPE,
          locations: [
            {
              kind: "remote",
              url: liveId,
              availability: "notEvaluated",
              integrity: "notEvaluated",
            },
          ],
        },
      ],
    ]),
    verifiedLocalResourceIds: new Set([snapshotId]),
    ...overrides,
  };
}

test("Workbook Binding schema is closed and admits only the narrow A1 locator grammar", () => {
  assert.deepEqual(validateWorkbookBindingSchema(manifest()), {
    valid: true,
    diagnostics: [],
  });

  for (const range of [
    "Sheet1!A1",
    "A0",
    "A:A",
    "1:2",
    "A1,B2",
    "name",
    "A1 : B2",
    "AAAA1",
  ]) {
    const invalid = manifest();
    invalid.profileData[profile].bindings[0].locator.range = range;
    const result = validateWorkbookBindingSchema(invalid);
    assert.equal(result.valid, false, range);
    assert.equal(
      result.diagnostics.some(
        ({ instanceLocation }) =>
          instanceLocation.endsWith("/bindings/0/locator/range"),
      ),
      true,
      range,
    );
  }

  const open = manifest();
  open.profileData[profile].workbooks[0].surprise = true;
  assert.equal(validateWorkbookBindingSchema(open).valid, false);
});

test("Workbook Binding missing-profile contains diagnostics retain the active profile URI", () => {
  const invalid = manifest();
  invalid.profiles = [PUBLIC_EQUITY_PROFILE_URI];
  const containsDiagnostic = validateWorkbookBindingSchema(invalid).diagnostics.find(
    ({ instanceLocation, parameters }) =>
      instanceLocation === "/profiles" && parameters.reason === "contains",
  );
  assert.deepEqual(containsDiagnostic, {
    code: "OFF-E2004",
    severity: "error",
    instanceLocation: "/profiles",
    ruleId: "OFF.SCHEMA.PROFILE_DECLARATION",
    parameters: {
      profileUri: WORKBOOK_BINDING_PROFILE_URI,
      reason: "contains",
    },
  });
});

test("the evaluator preserves authored locator strings, sorts records, and never mutates input", () => {
  const input = manifest();
  const profileData = input.profileData[profile];
  profileData.workbooks.unshift({
    ...profileData.workbooks[0],
    id: "urn:off:test:workbook:a",
    liveSourceResourceId: undefined,
  });
  delete profileData.workbooks[0].liveSourceResourceId;
  profileData.subjects.unshift({
    id: "urn:off:test:subject:a",
    label: "Assumption",
  });
  profileData.bindings.unshift({
    ...profileData.bindings[0],
    id: "urn:off:test:binding:a",
    subjectId: "urn:off:test:subject:a",
    workbookId: "urn:off:test:workbook:a",
    locator: { sheet: "'Case Sensitive'", range: "z9" },
  });
  const before = structuredClone(input);
  const result = evaluateWorkbookBinding(input, coreContext());
  assert.equal(result.ok, true);
  assert.deepEqual(input, before);
  if (!result.ok) return;
  assert.deepEqual(
    result.entities.workbooks.map(({ id }) => id),
    ["urn:off:test:workbook", "urn:off:test:workbook:a"],
  );
  assert.deepEqual(result.entities.bindings[0]?.locator, {
    sheet: " Inputs ",
    range: "$B$2:C3",
  });
  assert.equal(
    (result.entities.workbooks[0] as Record<string, unknown>)
      .liveSourceStatus,
    "notEvaluated",
  );
  assert.equal(
    "liveSourceStatus" in
      (result.entities.workbooks[1] as Record<string, unknown>),
    false,
  );
  assert.equal(Object.isFrozen(result.entities), true);

  const permuted = structuredClone(input);
  for (const collection of ["workbooks", "subjects", "bindings"]) {
    permuted.profileData[profile][collection].reverse();
  }
  const second = evaluateWorkbookBinding(permuted, coreContext());
  assert.equal(second.ok, true);
  if (second.ok) {
    assert.equal(
      canonicalizeJsonText(second.entities),
      canonicalizeJsonText(result.entities),
    );
  }
});

test("schema failure suppresses Workbook Binding semantic evaluation", () => {
  const input = manifest();
  input.profileData[profile].bindings[0].surprise = true;
  input.profileData[profile].bindings[0].subjectId = "urn:off:test:missing";
  const result = evaluateWorkbookBinding(input, coreContext());
  assert.equal(result.ok, false);
  assert.equal(result.stage, "schemaFailed");
  assert.equal(
    result.diagnostics.every(({ ruleId }) => ruleId.startsWith("OFF.SCHEMA.")),
    true,
  );
});

test("all six semantic rules emit exact codes, pointers, and parameters", async (t) => {
  const base = `/profileData/${profile.replaceAll("/", "~1")}`;
  const run = (
    mutate: (value: any) => void,
    context = coreContext(),
  ) => {
    const value = manifest();
    mutate(value);
    return evaluateWorkbookBinding(value, context);
  };

  await t.test("duplicate id and ambiguous references", () => {
    const result = run((value) => {
      value.profileData[profile].subjects[0].id = workbookId;
      value.profileData[profile].bindings[0].subjectId = workbookId;
    });
    assert.equal(result.ok, false);
    assert.deepEqual(result.diagnostics, [
      {
        code: "OFF-E3101",
        severity: "error",
        instanceLocation: `${base}/subjects/0/id`,
        ruleId: "OFF.WORKBOOK_BINDING.DUPLICATE_ID",
        parameters: { id: workbookId },
      },
      {
        code: "OFF-E3105",
        severity: "error",
        instanceLocation: `${base}/bindings/0/subjectId`,
        ruleId: "OFF.WORKBOOK_BINDING.SUBJECT_REFERENCE",
        parameters: { subjectId: workbookId },
      },
      {
        code: "OFF-E3106",
        severity: "error",
        instanceLocation: `${base}/bindings/0/workbookId`,
        ruleId: "OFF.WORKBOOK_BINDING.WORKBOOK_REFERENCE",
        parameters: { workbookId },
      },
    ]);
  });

  const cases = [
    {
      name: "missing snapshot",
      mutate: (value: any) => {
        value.profileData[profile].workbooks[0].snapshotResourceId =
          "urn:off:test:missing";
      },
      context: coreContext(),
      expected: {
        code: "OFF-E3102",
        pointer: `${base}/workbooks/0/snapshotResourceId`,
        parameters: {
          reason: "missing",
          resourceId: "urn:off:test:missing",
        },
      },
    },
    {
      name: "snapshot not locally verified",
      mutate: () => {},
      context: coreContext({ verifiedLocalResourceIds: new Set() }),
      expected: {
        code: "OFF-E3102",
        pointer: `${base}/workbooks/0/snapshotResourceId`,
        parameters: { reason: "notLocallyVerified", resourceId: snapshotId },
      },
    },
    {
      name: "wrong snapshot media type",
      mutate: () => {},
      context: coreContext({
        resources: new Map([
          [
            snapshotId,
            {
              id: snapshotId,
              mediaType: "text/csv",
              locations: [{ kind: "local", path: "snapshot.xlsx" }],
            },
          ],
          [
            liveId,
            {
              id: liveId,
              mediaType: XLSX_MEDIA_TYPE,
              locations: [{ kind: "remote", url: liveId }],
            },
          ],
        ]),
      }),
      expected: {
        code: "OFF-E3103",
        pointer: `${base}/workbooks/0/snapshotResourceId`,
        parameters: {
          actualMediaType: "text/csv",
          resourceId: snapshotId,
        },
      },
    },
    {
      name: "missing live source",
      mutate: (value: any) => {
        value.profileData[profile].workbooks[0].liveSourceResourceId =
          "https://example.org/missing";
      },
      context: coreContext(),
      expected: {
        code: "OFF-E3104",
        pointer: `${base}/workbooks/0/liveSourceResourceId`,
        parameters: {
          reason: "missing",
          resourceId: "https://example.org/missing",
        },
      },
    },
    {
      name: "unresolved subject",
      mutate: (value: any) => {
        value.profileData[profile].bindings[0].subjectId =
          "urn:off:test:subject:missing";
      },
      context: coreContext(),
      expected: {
        code: "OFF-E3105",
        pointer: `${base}/bindings/0/subjectId`,
        parameters: { subjectId: "urn:off:test:subject:missing" },
      },
    },
    {
      name: "unresolved workbook",
      mutate: (value: any) => {
        value.profileData[profile].bindings[0].workbookId =
          "urn:off:test:workbook:missing";
      },
      context: coreContext(),
      expected: {
        code: "OFF-E3106",
        pointer: `${base}/bindings/0/workbookId`,
        parameters: { workbookId: "urn:off:test:workbook:missing" },
      },
    },
  ] as const;
  for (const item of cases) {
    await t.test(item.name, () => {
      const result = run(item.mutate, item.context);
      assert.equal(result.ok, false);
      assert.equal(result.diagnostics.length, 1);
      assert.deepEqual(
        {
          code: result.diagnostics[0]?.code,
          pointer: result.diagnostics[0]?.instanceLocation,
          parameters: result.diagnostics[0]?.parameters,
        },
        item.expected,
      );
    });
  }
});

test("package evaluation verifies snapshot bytes while keeping a Google descriptor inert", async (t) => {
  const packageRoot = await mkdtemp(join(tmpdir(), "off-workbook-binding-"));
  t.after(async () => rm(packageRoot, { recursive: true, force: true }));
  const entrypoint = new TextEncoder().encode("# Workbook Binding\n");
  const snapshot = Uint8Array.from([
    0x50, 0x4b, 0x03, 0x04, 0x4f, 0x46, 0x46, 0x2d, 0x58, 0x4c, 0x53, 0x58,
  ]);
  await writeFile(join(packageRoot, "OFF.md"), entrypoint);
  await writeFile(join(packageRoot, "snapshot.xlsx"), snapshot);
  const value = manifest();
  value.resources[0].byteSize = entrypoint.byteLength;
  value.resources[0].sha256 = createHash("sha256")
    .update(entrypoint)
    .digest("hex");
  value.resources[1].byteSize = snapshot.byteLength;
  value.resources[1].sha256 = createHash("sha256")
    .update(snapshot)
    .digest("hex");
  await writeFile(
    join(packageRoot, "off.json"),
    `${JSON.stringify(value, null, 2)}\n`,
  );

  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = (() => {
    fetchCalls += 1;
    throw new Error("network use is forbidden");
  }) as typeof fetch;
  try {
    const result = await evaluatePackage({
      packageRoot,
      evaluatedAt: "2026-07-25T12:00:00Z",
      requestedProfiles: [profile],
    });
    assert.equal(result.kind, "packageResult");
    if (result.kind !== "packageResult") return;
    assert.equal(fetchCalls, 0);
    assert.equal(
      result.normalized.profileResults.declared[0]?.status,
      "passed",
    );
    assert.equal(
      result.normalized.profileResults.declared[0]?.claim,
      "Bound — author-declared workbook locators",
    );
    assert.deepEqual(
      (result.normalized.profileEntities as Record<string, unknown>)[profile],
      {
        workbooks: [
          {
            id: workbookId,
            snapshotResourceId: snapshotId,
            format: "google-sheets-xlsx-export",
            capturedAt: "2026-07-25T11:59:59Z",
            liveSourceResourceId: liveId,
            liveSourceStatus: "notEvaluated",
          },
        ],
        subjects: [
          {
            id: subjectId,
            label: "Revenue",
            externalEntityId: "urn:off:external:revenue",
          },
        ],
        bindings: [
          {
            id: bindingId,
            subjectId,
            workbookId,
            locator: { sheet: " Inputs ", range: "$B$2:C3" },
            role: "source",
            status: "author-declared-not-evaluated",
          },
        ],
        unevaluated: {
          workbookContents: "notEvaluated",
          locatorExistence: "notEvaluated",
          cellValues: "notEvaluated",
          formulas: "notEvaluated",
          recalculation: "notEvaluated",
        },
      },
    );
    assert.equal(
      new TextDecoder().decode(result.canonicalBytes),
      canonicalizeJsonText(result.normalized),
    );
    assert.deepEqual(validateNormalizedResultSchema(result.normalized), {
      valid: true,
      diagnostics: [],
    });
    const outputs: string[] = [];
    const errors: string[] = [];
    const exitCode = await runCli(
      [
        "normalize",
        packageRoot,
        "--evaluated-at",
        "2026-07-25T12:00:00Z",
        "--profile",
        profile,
      ],
      {
        stdout: (value) => outputs.push(value),
        stderr: (value) => errors.push(value),
      },
    );
    assert.equal(exitCode, 0);
    assert.equal(errors.join(""), "");
    assert.equal(
      outputs.join(""),
      `${canonicalizeJsonText(result.normalized)}\n`,
    );

    const opaque = await evaluatePackage({
      packageRoot,
      evaluatedAt: "2026-07-25T12:00:00Z",
      requestedProfiles: [],
    });
    assert.equal(opaque.kind, "packageResult");
    if (opaque.kind === "packageResult") {
      assert.equal("profileEntities" in opaque.normalized, false);
      assert.equal(
        opaque.normalized.profileResults.declared[0]?.status,
        "notEvaluated",
      );
    }
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(
    (await readFile(join(packageRoot, "snapshot.xlsx"))).equals(snapshot),
    true,
  );
});

test("Workbook Binding and Public Equity evaluate independently in one package", async (t) => {
  const packageRoot = await mkdtemp(join(tmpdir(), "off-workbook-coexist-"));
  t.after(async () => rm(packageRoot, { recursive: true, force: true }));
  const sourceRoot = new URL(
    "../conformance/packages/public-equity-traceable/",
    import.meta.url,
  );
  await cp(sourceRoot, packageRoot, { recursive: true });
  const snapshot = Uint8Array.from([
    0x50, 0x4b, 0x03, 0x04, 0x43, 0x4f, 0x45, 0x58, 0x49, 0x53, 0x54,
  ]);
  await writeFile(join(packageRoot, "snapshot.xlsx"), snapshot);
  const value = JSON.parse(
    await readFile(join(packageRoot, "off.json"), "utf8"),
  ) as any;
  value.profiles.push(profile);
  value.resources.push(
    {
      id: snapshotId,
      mediaType: XLSX_MEDIA_TYPE,
      roles: ["workbook-snapshot"],
      locations: [{ kind: "local", path: "snapshot.xlsx" }],
      byteSize: snapshot.byteLength,
      sha256: createHash("sha256").update(snapshot).digest("hex"),
    },
    {
      id: liveId,
      mediaType: XLSX_MEDIA_TYPE,
      roles: ["live-source"],
      locations: [{ kind: "remote", url: liveId }],
    },
  );
  value.profileData[profile] = manifest().profileData[profile];
  value.profileData[profile].subjects[0].externalEntityId =
    "https://openfinanceformat.org/examples/public-equity-traceable/entities/output/forward-revenue";
  await writeFile(
    join(packageRoot, "off.json"),
    `${JSON.stringify(value, null, 2)}\n`,
  );

  const result = await evaluatePackage({
    packageRoot,
    evaluatedAt: "2026-07-17T23:59:59Z",
    requestedProfiles: [
      "https://openfinanceformat.org/profiles/public-equity-research/0.1",
      profile,
    ],
  });
  assert.equal(result.kind, "packageResult");
  if (result.kind !== "packageResult") return;
  assert.deepEqual(
    result.normalized.profileResults.declared.map(
      ({ uri, status, claim }: any) => ({ uri, status, claim }),
    ),
    [
      {
        uri: "https://openfinanceformat.org/profiles/public-equity-research/0.1",
        status: "passed",
        claim: "Traceable — author-declared lineage",
      },
      {
        uri: profile,
        status: "passed",
        claim: "Bound — author-declared workbook locators",
      },
    ],
  );
  assert.deepEqual(validateNormalizedResultSchema(result.normalized), {
    valid: true,
    diagnostics: [],
  });
});

test("Workbook Binding runtime contains no spreadsheet parser, network, or process surface", async () => {
  const source = await readFile(
    new URL("../src/workbook-binding.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(
    source,
    /\b(?:fetch|XMLHttpRequest|node:child_process|spawn|execFile|exceljs|jszip)\b/iu,
  );
});
