import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { evaluateCore } from "../src/core.ts";

const RESOURCE_ID = "urn:off:test:resource:entrypoint";

function manifest(bytes: Uint8Array): Record<string, unknown> {
  return {
    offVersion: "0.1",
    package: {
      id: "urn:off:test:package",
      releaseId: "urn:off:test:release:1",
      releaseVersion: "1",
      title: "Core test",
      authors: [{ id: "urn:off:test:author", name: "Test Author" }],
      license: { id: "Apache-2.0" },
      publishedAt: "2026-07-17T12:00:00Z",
      canonicalUrl: "https://example.org/off/releases/1",
      entrypointResourceId: RESOURCE_ID,
    },
    profiles: [],
    resources: [
      {
        id: RESOURCE_ID,
        mediaType: "text/markdown",
        roles: ["entrypoint"],
        locations: [{ kind: "local", path: "OFF.md" }],
        byteSize: bytes.byteLength,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      },
      {
        id: "urn:off:test:resource:supporting",
        mediaType: "application/pdf",
        roles: ["supporting-evidence"],
        locations: [
          { kind: "remote", url: "https://network-tripwire.invalid/report.pdf" },
        ],
        byteSize: 123,
        sha256: "1".repeat(64),
      },
    ],
    extensions: { "urn:off:test:extension": { preserved: true } },
  };
}

test("Core resolves its local entrypoint and inventories remote descriptors offline", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "off-u3-core-secret-canary-"));
  t.after(async () => rm(root, { recursive: true, force: true }));
  const bytes = new TextEncoder().encode("# OFF\n");
  await writeFile(join(root, "OFF.md"), bytes);

  const result = await evaluateCore(manifest(bytes), {
    packageRoot: root,
    evaluatedAt: "2026-07-17T12:00:00Z",
    requestedProfiles: [],
  });

  assert.equal(result.kind, "packageResult");
  if (result.kind === "packageResult") {
    assert.equal(result.normalized.outcome, "validWithWarnings");
    assert.deepEqual(result.normalized.diagnostics, [
      {
        code: "OFF-W5003",
        severity: "warning",
        instanceLocation: "/resources/1/locations/0",
        entityId: "urn:off:test:resource:supporting",
        ruleId: "OFF.CORE.REMOTE_NOT_EVALUATED",
        parameters: {
          locationIndex: 0,
          url: "https://network-tripwire.invalid/report.pdf",
        },
      },
    ]);
    assert.deepEqual(result.normalized.profileResults.core, { status: "passed" });
    assert.deepEqual(result.normalized.extensions, {
      "urn:off:test:extension": { preserved: true },
    });
    const inventory = result.normalized.resourceInventory as any[];
    const supporting = inventory.find(
      ({ id }) => id === "urn:off:test:resource:supporting",
    );
    assert.equal(supporting.byteSize, 123);
    assert.equal(supporting.sha256, "1".repeat(64));
    assert.deepEqual(supporting.locations, [
      {
        kind: "remote",
        url: "https://network-tripwire.invalid/report.pdf",
        availability: "notEvaluated",
        integrity: "notEvaluated",
      },
    ]);
    assert.equal(JSON.stringify(result), JSON.stringify(result).replaceAll(root, ""));
  }
});

test("Core retains remote inventory when a paired local digest fails", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "off-u3-retention-"));
  t.after(async () => rm(root, { recursive: true, force: true }));
  const bytes = new TextEncoder().encode("# OFF\n");
  await writeFile(join(root, "OFF.md"), bytes);
  await writeFile(join(root, "evidence.bin"), Uint8Array.from([7]));
  const value = manifest(bytes) as any;
  value.resources[1] = {
    id: "urn:off:test:resource:supporting",
    mediaType: "application/octet-stream",
    roles: ["supporting-evidence"],
    locations: [
      { kind: "local", path: "evidence.bin" },
      { kind: "remote", url: "https://network-tripwire.invalid/evidence.bin" },
    ],
    byteSize: 1,
    sha256: "0".repeat(64),
  };

  const result = await evaluateCore(value, {
    packageRoot: root,
    evaluatedAt: "2026-07-17T12:00:00Z",
    requestedProfiles: [],
  });
  assert.equal(result.kind, "packageResult");
  if (result.kind === "packageResult") {
    assert.equal(result.normalized.outcome, "invalid");
    assert.deepEqual(result.normalized.profileResults.core, { status: "failed" });
    assert.equal("relationshipInventory" in result.normalized, false);
    const inventory = result.normalized.resourceInventory as any[];
    const supporting = inventory.find(({ id }) => id === value.resources[1].id);
    assert.deepEqual(supporting.locations, [
      {
        kind: "remote",
        url: "https://network-tripwire.invalid/evidence.bin",
        availability: "notEvaluated",
        integrity: "notEvaluated",
      },
    ]);
    assert.equal(supporting.byteSize, 1);
    assert.equal(supporting.sha256, "0".repeat(64));
  }
});

test("Core validates entrypoint and relationship references without profile guessing", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "off-u3-references-"));
  t.after(async () => rm(root, { recursive: true, force: true }));
  const bytes = new TextEncoder().encode("# OFF\n");
  await writeFile(join(root, "OFF.md"), bytes);
  const value = manifest(bytes) as any;
  value.package.entrypointResourceId = "urn:off:test:resource:missing";
  value.relationships = [{
    fromResourceId: RESOURCE_ID,
    relation: "supports",
    toResourceId: "urn:off:test:resource:also-missing",
  }];
  value.profiles = ["urn:off:test:profile:unknown"];
  value.profileData = { "urn:off:test:profile:unknown": { opaque: true } };

  const result = await evaluateCore(value, {
    packageRoot: root,
    evaluatedAt: "2026-07-17T12:00:00Z",
    requestedProfiles: [],
  });
  assert.equal(result.kind, "packageResult");
  if (result.kind === "packageResult") {
    assert.equal(result.normalized.outcome, "invalid");
    assert.deepEqual(
      result.normalized.diagnostics.filter(({ code }) => code.startsWith("OFF-E3")),
      [
        {
          code: "OFF-E3007",
          severity: "error",
          instanceLocation: "/package/entrypointResourceId",
          ruleId: "OFF.CORE.ENTRYPOINT",
          parameters: {
            reason: "unresolved",
            referencedId: "urn:off:test:resource:missing",
          },
        },
        {
          code: "OFF-E3008",
          severity: "error",
          instanceLocation: "/relationships/0",
          ruleId: "OFF.CORE.RELATIONSHIP",
          parameters: {
            fromResourceId: RESOURCE_ID,
            reason: "unresolvedTo",
            toResourceId: "urn:off:test:resource:also-missing",
          },
        },
      ],
    );
    assert.deepEqual(result.normalized.profileResults.declared, [
      {
        uri: "urn:off:test:profile:unknown",
        requested: false,
        status: "notEvaluated",
      },
    ]);
    assert.equal("profileData" in result.normalized, false);
  }
});

test("remote descriptors never invoke fetch", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "off-u3-offline-"));
  t.after(async () => rm(root, { recursive: true, force: true }));
  const bytes = new TextEncoder().encode("# OFF\n");
  await writeFile(join(root, "OFF.md"), bytes);
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    throw new Error("network invoked");
  }) as typeof fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const result = await evaluateCore(manifest(bytes), {
    packageRoot: root,
    evaluatedAt: "2026-07-17T12:00:00Z",
    requestedProfiles: [],
  });
  assert.equal(result.kind, "packageResult");
  assert.equal(calls, 0);
});

test("schema-invalid manifests remain package results without touching resources", async () => {
  const value = manifest(new Uint8Array()) as any;
  delete value.profiles;
  const result = await evaluateCore(value, {
    packageRoot: "/secret/path-that-must-not-be-touched",
    evaluatedAt: "2026-07-17T12:00:00Z",
    requestedProfiles: [],
  });
  assert.equal(result.kind, "packageResult");
  if (result.kind === "packageResult") {
    assert.equal(result.normalized.outcome, "invalid");
    assert.deepEqual(result.normalized.profileResults.core, { status: "failed" });
    assert.equal(result.normalized.diagnostics.some(({ code }) => code === "OFF-E2004"), true);
  }

  const malformed = manifest(new Uint8Array()) as any;
  malformed.profiles = ["not an absolute URI"];
  const malformedResult = await evaluateCore(malformed, {
    packageRoot: "/another-secret-path-that-must-not-be-touched",
    evaluatedAt: "2026-07-17T12:00:00Z",
    requestedProfiles: [],
  });
  assert.equal(malformedResult.kind, "packageResult");
  if (malformedResult.kind === "packageResult") {
    assert.deepEqual(malformedResult.normalized.profileResults.declared, []);
  }
});

test("duplicate resource IDs and remote-only entrypoints emit exact Core diagnostics", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "off-u3-duplicates-"));
  t.after(async () => rm(root, { recursive: true, force: true }));
  const bytes = new TextEncoder().encode("# OFF\n");
  await writeFile(join(root, "OFF.md"), bytes);

  const duplicate = manifest(bytes) as any;
  duplicate.resources[1] = {
    ...duplicate.resources[0],
    locations: [{ kind: "local", path: "OFF-copy.md" }],
  };
  await writeFile(join(root, "OFF-copy.md"), bytes);
  const duplicateResult = await evaluateCore(duplicate, {
    packageRoot: root,
    evaluatedAt: "2026-07-17T12:00:00Z",
    requestedProfiles: [],
  });
  assert.equal(duplicateResult.kind, "packageResult");
  if (duplicateResult.kind === "packageResult") {
    assert.deepEqual(
      duplicateResult.normalized.diagnostics.filter(({ code }) => code === "OFF-E3001"),
      [
        {
          code: "OFF-E3001",
          severity: "error",
          instanceLocation: "/resources/1/id",
          entityId: RESOURCE_ID,
          ruleId: "OFF.CORE.RESOURCE_ID",
          parameters: { firstInstanceLocation: "/resources/0/id" },
        },
      ],
    );
  }

  const remoteOnly = manifest(bytes) as any;
  remoteOnly.resources[0] = {
    id: RESOURCE_ID,
    mediaType: "text/markdown",
    roles: ["entrypoint"],
    locations: [{ kind: "remote", url: "https://network-tripwire.invalid/OFF.md" }],
  };
  const remoteResult = await evaluateCore(remoteOnly, {
    packageRoot: root,
    evaluatedAt: "2026-07-17T12:00:00Z",
    requestedProfiles: [],
  });
  assert.equal(remoteResult.kind, "packageResult");
  if (remoteResult.kind === "packageResult") {
    assert.deepEqual(
      remoteResult.normalized.diagnostics.filter(({ severity }) => severity === "error"),
      [
        {
          code: "OFF-E3003",
          severity: "error",
          instanceLocation: "/resources/0",
          entityId: RESOURCE_ID,
          ruleId: "OFF.CORE.RESOURCE_REQUIRED_LOCAL",
          parameters: { roles: ["entrypoint"] },
        },
        {
          code: "OFF-E3007",
          severity: "error",
          instanceLocation: "/package/entrypointResourceId",
          ruleId: "OFF.CORE.ENTRYPOINT",
          parameters: { reason: "missingLocal", referencedId: RESOURCE_ID },
        },
      ],
    );
  }
});
