import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { appendFile, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  resolveLocalResources,
  validateLocalPath,
  NODE_RESOURCE_FILE_SYSTEM,
  type ResourceStat,
} from "../src/resources.ts";

const digest = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex");

function changedIdentity(stat: ResourceStat): ResourceStat {
  return {
    dev: stat.dev,
    ino: stat.ino + 1n,
    size: stat.size,
    mtimeNs: stat.mtimeNs,
    ctimeNs: stat.ctimeNs,
    isDirectory: () => stat.isDirectory(),
    isFile: () => stat.isFile(),
    isSymbolicLink: () => stat.isSymbolicLink(),
  };
}

function assertMutation(result: Awaited<ReturnType<typeof resolveLocalResources>>): void {
  assert.equal(result.kind, "evaluatorFailure");
  if (result.kind === "evaluatorFailure") {
    assert.equal(result.code, "OFF-T1003");
    assert.equal(result.operation, "resourceMutation");
  }
}

test("Core local paths use the portable lexical policy", () => {
  assert.equal(validateLocalPath("research/model.bin"), null);

  const rejected = [
    "",
    "/OFF.md",
    "../OFF.md",
    "a//b",
    "a\\b",
    "a/%2e/b",
    "a?b",
    "a#b",
    "report. ",
    "CON.txt",
    "C:/OFF.md",
    "//server/share",
  ];
  for (const path of rejected) {
    assert.notEqual(validateLocalPath(path), null, path);
  }
});

test("resource resolution hashes raw bytes and reports digest mismatch", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "off-u3-resource-"));
  t.after(async () => rm(root, { recursive: true, force: true }));

  const bytes = Uint8Array.from([0, 255, 1, 13, 10, 128]);
  await writeFile(join(root, "model.bin"), bytes);

  const valid = await resolveLocalResources(root, [
    {
      resourceId: "urn:off:test:resource:model",
      resourceIndex: 0,
      locationIndex: 0,
      path: "model.bin",
      byteSize: bytes.byteLength,
      sha256: digest(bytes),
    },
  ], { limits: { chunkBytes: 2 } });
  assert.equal(valid.kind, "resolved");
  if (valid.kind === "resolved") {
    assert.deepEqual(valid.diagnostics, []);
    assert.deepEqual(valid.verified, [
      {
        resourceId: "urn:off:test:resource:model",
        path: "model.bin",
        byteSize: bytes.byteLength,
        sha256: digest(bytes),
      },
    ]);
  }

  const invalid = await resolveLocalResources(root, [
    {
      resourceId: "urn:off:test:resource:model",
      resourceIndex: 0,
      locationIndex: 0,
      path: "model.bin",
      byteSize: bytes.byteLength,
      sha256: "0".repeat(64),
    },
  ]);
  assert.equal(invalid.kind, "resolved");
  if (invalid.kind === "resolved") {
    assert.deepEqual(invalid.verified, []);
    assert.deepEqual(invalid.diagnostics, [
      {
        code: "OFF-E3006",
        severity: "error",
        instanceLocation: "/resources/0/sha256",
        entityId: "urn:off:test:resource:model",
        ruleId: "OFF.CORE.RESOURCE_DIGEST",
        parameters: {
          actualSha256: digest(bytes),
          declaredSha256: "0".repeat(64),
        },
      },
    ]);
  }
});

test("path collisions, exact case, symlinks, and non-regular files are invalid", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "off-u3-paths-"));
  t.after(async () => rm(root, { recursive: true, force: true }));
  const bytes = Uint8Array.from([1, 2, 3]);
  await writeFile(join(root, "Data.bin"), bytes);
  await mkdir(join(root, "directory"));
  await mkdir(join(root, "real"));
  await writeFile(join(root, "real", "nested.bin"), bytes);
  await symlink("Data.bin", join(root, "link.bin"));
  await symlink("missing.bin", join(root, "dangling.bin"));
  await symlink("loop.bin", join(root, "loop.bin"));
  await symlink("real", join(root, "alias"));

  const collision = await resolveLocalResources(root, [
    {
      resourceId: "urn:off:test:resource:upper",
      resourceIndex: 0,
      locationIndex: 0,
      path: "Data.bin",
      byteSize: bytes.byteLength,
      sha256: digest(bytes),
    },
    {
      resourceId: "urn:off:test:resource:lower",
      resourceIndex: 1,
      locationIndex: 0,
      path: "data.bin",
      byteSize: bytes.byteLength,
      sha256: digest(bytes),
    },
  ]);
  assert.equal(collision.kind, "resolved");
  if (collision.kind === "resolved") {
    assert.equal(collision.verified.length, 0);
    assert.deepEqual(collision.diagnostics.map((item) => item.parameters.reason), [
      "caseCollision",
      "caseCollision",
    ]);
  }

  const duplicate = await resolveLocalResources(root, [
    {
      resourceId: "urn:off:test:resource:first",
      resourceIndex: 0,
      locationIndex: 0,
      path: "Data.bin",
      byteSize: bytes.byteLength,
      sha256: digest(bytes),
    },
    {
      resourceId: "urn:off:test:resource:second",
      resourceIndex: 1,
      locationIndex: 0,
      path: "Data.bin",
      byteSize: bytes.byteLength,
      sha256: digest(bytes),
    },
  ]);
  assert.equal(duplicate.kind, "resolved");
  if (duplicate.kind === "resolved") {
    assert.deepEqual(duplicate.diagnostics.map((item) => item.parameters.reason), [
      "duplicatePath",
      "duplicatePath",
    ]);
  }

  for (const [path, reason] of [
    ["data.bin", "caseMismatch"],
    ["missing.bin", "missing"],
    ["link.bin", "symlink"],
    ["dangling.bin", "symlink"],
    ["loop.bin", "symlink"],
    ["alias/nested.bin", "symlink"],
    ["directory", "nonRegularFile"],
  ] as const) {
    const result = await resolveLocalResources(root, [
      {
        resourceId: `urn:off:test:resource:${reason}`,
        resourceIndex: 0,
        locationIndex: 0,
        path,
        byteSize: bytes.byteLength,
        sha256: digest(bytes),
      },
    ]);
    assert.equal(result.kind, "resolved", reason);
    if (result.kind === "resolved") {
      assert.equal(result.verified.length, 0, reason);
      assert.equal(result.diagnostics[0]?.parameters.reason, reason);
    }
  }
});

test("zero-byte and declared-size mismatches remain package results", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "off-u3-size-"));
  t.after(async () => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "empty.bin"), new Uint8Array());

  const emptyDigest = digest(new Uint8Array());
  const valid = await resolveLocalResources(root, [
    {
      resourceId: "urn:off:test:resource:empty",
      resourceIndex: 0,
      locationIndex: 0,
      path: "empty.bin",
      byteSize: 0,
      sha256: emptyDigest,
    },
  ]);
  assert.equal(valid.kind, "resolved");
  if (valid.kind === "resolved") assert.equal(valid.verified[0]?.byteSize, 0);

  const mismatch = await resolveLocalResources(root, [
    {
      resourceId: "urn:off:test:resource:empty",
      resourceIndex: 0,
      locationIndex: 0,
      path: "empty.bin",
      byteSize: Number.MAX_SAFE_INTEGER,
      sha256: emptyDigest,
    },
  ]);
  assert.equal(mismatch.kind, "resolved");
  if (mismatch.kind === "resolved") {
    assert.equal(mismatch.diagnostics[0]?.code, "OFF-E3005");
    assert.deepEqual(mismatch.diagnostics[0]?.parameters, {
      actualByteSize: 0,
      declaredByteSize: Number.MAX_SAFE_INTEGER,
    });
  }
});

test("safety limits, host faults, short reads, and mutation are evaluator failures", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "off-u3-secret-canary-"));
  t.after(async () => rm(root, { recursive: true, force: true }));
  const bytes = Uint8Array.from([1, 2, 3, 4]);
  await writeFile(join(root, "model.bin"), bytes);
  const input = {
    resourceId: "urn:off:test:resource:model",
    resourceIndex: 0,
    locationIndex: 0,
    path: "model.bin",
    byteSize: bytes.byteLength,
    sha256: digest(bytes),
  };

  const limited = await resolveLocalResources(root, [input], {
    limits: { maxResourceBytes: 3, maxTotalBytes: 3, chunkBytes: 2 },
  });
  assert.deepEqual(limited, {
    kind: "evaluatorFailure",
    code: "OFF-T1001",
    operation: "resourceLimit",
    resourceId: input.resourceId,
    path: input.path,
  });

  const longPath = await resolveLocalResources(root, [{ ...input, path: "model.bin" }], {
    limits: { maxPathBytes: 4 },
  });
  assert.equal(longPath.kind, "evaluatorFailure");
  if (longPath.kind === "evaluatorFailure") assert.equal(longPath.code, "OFF-T1001");

  const invalidLimits = await resolveLocalResources(root, [input], {
    limits: { chunkBytes: 0 },
  });
  assert.deepEqual(invalidLimits, {
    kind: "evaluatorFailure",
    code: "OFF-T1004",
    operation: "internal",
  });

  const hostFault = await resolveLocalResources(root, [input], {
    fileSystem: {
      ...NODE_RESOURCE_FILE_SYSTEM,
      async scanDirectory() {
        throw Object.assign(new Error(`do not leak ${root}`), { code: "EACCES" });
      },
    },
  });
  assert.equal(hostFault.kind, "evaluatorFailure");
  assert.equal(JSON.stringify(hostFault).includes(root), false);
  assert.equal(JSON.stringify(hostFault).includes("EACCES"), false);

  const shortRead = await resolveLocalResources(root, [input], {
    fileSystem: {
      ...NODE_RESOURCE_FILE_SYSTEM,
      async open(path, flags) {
        const handle = await NODE_RESOURCE_FILE_SYSTEM.open(path, flags);
        return { ...handle, read: async () => 0 };
      },
    },
  });
  assert.equal(shortRead.kind, "evaluatorFailure");
  if (shortRead.kind === "evaluatorFailure") assert.equal(shortRead.code, "OFF-T1003");

  const mutation = await resolveLocalResources(root, [input], {
    limits: { chunkBytes: 2 },
    fileSystem: {
      ...NODE_RESOURCE_FILE_SYSTEM,
      async open(path, flags) {
        const handle = await NODE_RESOURCE_FILE_SYSTEM.open(path, flags);
        let mutated = false;
        return {
          ...handle,
          async read(buffer) {
            const count = await handle.read(buffer);
            if (count > 0 && !mutated) {
              mutated = true;
              await appendFile(path, Uint8Array.from([9]));
            }
            return count;
          },
        };
      },
    },
  });
  assert.equal(mutation.kind, "evaluatorFailure");
  if (mutation.kind === "evaluatorFailure") {
    assert.equal(mutation.code, "OFF-T1003");
    assert.equal(mutation.operation, "resourceMutation");
  }
});

test("root, intermediate, and opened-file identity swaps are mutation failures", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "off-u3-identity-"));
  t.after(async () => rm(root, { recursive: true, force: true }));
  const expected = Uint8Array.from([1, 2, 3]);
  const replacement = Uint8Array.from([7, 8, 9]);
  await mkdir(join(root, "nested"));
  await writeFile(join(root, "nested", "model.bin"), expected);
  await writeFile(join(root, "replacement.bin"), replacement);
  const canonicalRoot = await NODE_RESOURCE_FILE_SYSTEM.realpath(root);

  const nestedInput = {
    resourceId: "urn:off:test:resource:nested",
    resourceIndex: 0,
    locationIndex: 0,
    path: "nested/model.bin",
    byteSize: expected.byteLength,
    sha256: digest(expected),
  };

  let rootStatCalls = 0;
  const rootSwap = await resolveLocalResources(root, [nestedInput], {
    fileSystem: {
      ...NODE_RESOURCE_FILE_SYSTEM,
      async lstat(path) {
        const stat = await NODE_RESOURCE_FILE_SYSTEM.lstat(path);
        if (path === canonicalRoot && ++rootStatCalls > 1) return changedIdentity(stat);
        return stat;
      },
    },
  });
  assertMutation(rootSwap);

  let nestedStatCalls = 0;
  const nestedPath = join(canonicalRoot, "nested");
  const intermediateSwap = await resolveLocalResources(root, [nestedInput], {
    fileSystem: {
      ...NODE_RESOURCE_FILE_SYSTEM,
      async lstat(path) {
        const stat = await NODE_RESOURCE_FILE_SYSTEM.lstat(path);
        if (path === nestedPath && ++nestedStatCalls > 1) return changedIdentity(stat);
        return stat;
      },
    },
  });
  assertMutation(intermediateSwap);

  const openedFileSwap = await resolveLocalResources(root, [{
    ...nestedInput,
    path: "nested/model.bin",
    byteSize: replacement.byteLength,
    sha256: digest(replacement),
  }], {
    fileSystem: {
      ...NODE_RESOURCE_FILE_SYSTEM,
      open(path, flags) {
        return NODE_RESOURCE_FILE_SYSTEM.open(
          path.endsWith("model.bin") ? join(root, "replacement.bin") : path,
          flags,
        );
      },
    },
  });
  assertMutation(openedFileSwap);
});

test("unsafe path values are rendered as deterministic ASCII before diagnostics or limits", async () => {
  const unsafePath = "bad\u001b-\u00e9";
  const result = await resolveLocalResources("/not-accessed", [{
    resourceId: "urn:off:test:resource:unsafe-path",
    resourceIndex: 0,
    locationIndex: 0,
    path: unsafePath,
    byteSize: 0,
    sha256: digest(new Uint8Array()),
  }], { limits: { maxPathBytes: 1 } });

  assert.equal(result.kind, "resolved");
  if (result.kind === "resolved") {
    assert.deepEqual(result.diagnostics[0]?.parameters, {
      path: "bad\\u{1B}-\\u{E9}",
      reason: "nonPrintableAscii",
    });
    const serialized = JSON.stringify(result);
    assert.equal(serialized.includes("\u001b"), false);
    assert.equal(serialized.includes("\u00e9"), false);
  }
});

test("chunk allocation configuration has a hard upper bound", async () => {
  const result = await resolveLocalResources("/not-accessed", [], {
    limits: { chunkBytes: Number.MAX_SAFE_INTEGER },
  });
  assert.deepEqual(result, {
    kind: "evaluatorFailure",
    code: "OFF-T1004",
    operation: "internal",
  });
});

test("directory inventories are cached, globally bounded, and classify post-check disappearance", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "off-u3-directories-"));
  t.after(async () => rm(root, { recursive: true, force: true }));
  const bytes = Uint8Array.from([1]);
  await writeFile(join(root, "first.bin"), bytes);
  await writeFile(join(root, "second.bin"), bytes);
  const inputs = ["first.bin", "second.bin"].map((path, resourceIndex) => ({
    resourceId: `urn:off:test:resource:${resourceIndex}`,
    resourceIndex,
    locationIndex: 0,
    path,
    byteSize: bytes.byteLength,
    sha256: digest(bytes),
  }));

  let directoryReads = 0;
  const cached = await resolveLocalResources(root, inputs, {
    limits: { maxDirectoryEntries: 10 },
    fileSystem: {
      ...NODE_RESOURCE_FILE_SYSTEM,
      async scanDirectory(path, maxEntries) {
        directoryReads += 1;
        return NODE_RESOURCE_FILE_SYSTEM.scanDirectory!(path, maxEntries);
      },
    },
  });
  assert.equal(cached.kind, "resolved");
  assert.equal(directoryReads, 1);

  let requestedEntryLimit: number | undefined;
  let storedEntryCount: number | undefined;
  const limited = await resolveLocalResources(root, inputs, {
    limits: { maxDirectoryEntries: 1 },
    fileSystem: {
      ...NODE_RESOURCE_FILE_SYSTEM,
      async scanDirectory(path, maxEntries) {
        requestedEntryLimit = maxEntries;
        const scan = await NODE_RESOURCE_FILE_SYSTEM.scanDirectory!(path, maxEntries);
        storedEntryCount = scan.names.length;
        return scan;
      },
    },
  });
  assert.equal(limited.kind, "evaluatorFailure");
  assert.equal(requestedEntryLimit, 1);
  assert.equal(storedEntryCount, 1);
  if (limited.kind === "evaluatorFailure") {
    assert.equal(limited.code, "OFF-T1001");
    assert.equal(limited.operation, "resourceLimit");
  }

  const disappeared = await resolveLocalResources(root, [inputs[0]!], {
    fileSystem: {
      ...NODE_RESOURCE_FILE_SYSTEM,
      async scanDirectory() {
        throw Object.assign(new Error("removed after precheck"), { code: "ENOENT" });
      },
    },
  });
  assertMutation(disappeared);
});
