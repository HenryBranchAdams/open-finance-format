import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { runCli } from "../src/cli.ts";
import { evaluatePackage } from "../src/index.ts";
import {
  InitializationError,
  initializeCorePackage,
  initializeCorePackageWithOperations,
  type InitializeCoreOptions,
} from "../src/initialize.ts";

const publishedAt = "2026-07-27T12:34:56Z";

function options(target: string): InitializeCoreOptions {
  return {
    target,
    packageId: "https://example.org/off/acme",
    releaseId: "urn:example:off:acme:release:1",
    entrypointId: "urn:example:off:acme:resource:narrative",
    releaseVersion: "1",
    title: "Acme Core package",
    authorId: "urn:example:author:analyst",
    authorName: "Example Analyst",
    license: "Apache-2.0",
    publishedAt,
    canonicalUrl: "https://example.org/off/acme/releases/1",
  };
}

function cliArguments(target: string): string[] {
  const value = options(target);
  return [
    "init",
    "core",
    target,
    "--package-id",
    value.packageId,
    "--release-id",
    value.releaseId,
    "--entrypoint-id",
    value.entrypointId,
    "--release-version",
    value.releaseVersion,
    "--title",
    value.title,
    "--author-id",
    value.authorId,
    "--author-name",
    value.authorName,
    "--license",
    value.license,
    "--published-at",
    value.publishedAt,
    "--canonical-url",
    value.canonicalUrl,
  ];
}

function captureIo() {
  let stdout = "";
  let stderr = "";
  return {
    io: {
      stdout(value: string) {
        stdout += value;
      },
      stderr(value: string) {
        stderr += value;
      },
    },
    stdout: () => stdout,
    stderr: () => stderr,
  };
}

function digest(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

test("Core initialization writes deterministic raw-byte-bound files that evaluate as valid", async (t) => {
  const parent = await mkdtemp(join(tmpdir(), "off-init-valid-"));
  t.after(async () => rm(parent, { recursive: true, force: true }));
  const target = join(parent, "package");
  const result = await initializeCorePackage(options(target));
  assert.equal(result.kind, "initializedCorePackage");
  assert.deepEqual((await readdir(target)).sort(), ["OFF.md", "off.json"]);

  const narrativeBytes = await readFile(join(target, "OFF.md"));
  const manifestBytes = await readFile(join(target, "off.json"));
  assert.deepEqual(new Uint8Array(narrativeBytes), result.narrativeBytes);
  assert.deepEqual(new Uint8Array(manifestBytes), result.manifestBytes);
  assert.equal(new TextDecoder("utf-8", { fatal: true }).decode(narrativeBytes).startsWith("# Acme Core package\n"), true);
  assert.equal(manifestBytes.at(-1), 0x0a);

  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  assert.equal(manifest.package.entrypointResourceId, options(target).entrypointId);
  assert.equal(manifest.resources[0].id, options(target).entrypointId);
  assert.equal(manifest.resources[0].byteSize, narrativeBytes.byteLength);
  assert.equal(manifest.resources[0].sha256, digest(narrativeBytes));
  assert.deepEqual(manifest.profiles, []);

  const evaluated = await evaluatePackage({
    packageRoot: target,
    evaluatedAt: publishedAt,
    requestedProfiles: [],
  });
  assert.equal(evaluated.kind, "packageResult");
  if (evaluated.kind === "packageResult") {
    assert.equal(evaluated.normalized.outcome, "valid");
    assert.deepEqual(evaluated.normalized.diagnostics, []);
  }
});

test("identical initialization inputs produce identical package bytes", async (t) => {
  const parent = await mkdtemp(join(tmpdir(), "off-init-deterministic-"));
  t.after(async () => rm(parent, { recursive: true, force: true }));
  const first = join(parent, "first");
  const second = join(parent, "second");
  await initializeCorePackage(options(first));
  await initializeCorePackage(options(second));
  assert.deepEqual(await readFile(join(first, "OFF.md")), await readFile(join(second, "OFF.md")));
  assert.deepEqual(await readFile(join(first, "off.json")), await readFile(join(second, "off.json")));
});

test("the scaffold makes no profile, lineage, evidence, remote, or claim-bearing assertion", async (t) => {
  const parent = await mkdtemp(join(tmpdir(), "off-init-claims-"));
  t.after(async () => rm(parent, { recursive: true, force: true }));
  const target = join(parent, "package");
  await initializeCorePackage(options(target));
  const manifest = JSON.parse(await readFile(join(target, "off.json"), "utf8"));
  assert.deepEqual(Object.keys(manifest), ["offVersion", "package", "profiles", "resources"]);
  assert.deepEqual(manifest.profiles, []);
  assert.equal("relationships" in manifest, false);
  assert.equal("profileData" in manifest, false);
  assert.equal("extensions" in manifest, false);
  assert.equal(JSON.stringify(manifest).includes('"remote"'), false);
  for (const forbidden of ["claim", "lineage", "evidence", "attestation"] as const) {
    assert.equal(Object.keys(manifest).some((key) => key.toLowerCase().includes(forbidden)), false);
  }
});

test("invalid arguments and unsafe existing targets are rejected before package writes", async (t) => {
  const parent = await mkdtemp(join(tmpdir(), "off-init-reject-"));
  t.after(async () => rm(parent, { recursive: true, force: true }));

  const invalidTarget = join(parent, "invalid");
  await assert.rejects(
    initializeCorePackage({ ...options(invalidTarget), canonicalUrl: "http://example.org" }),
    (error: unknown) => {
      assert.equal(error instanceof InitializationError, true);
      assert.equal((error as InitializationError).reason, "invalidArguments");
      return true;
    },
  );
  assert.equal((await readdir(parent)).includes("invalid"), false);

  const unavailable = join(parent, "missing-parent", "package");
  await assert.rejects(
    initializeCorePackage(options(unavailable)),
    /OFF-I1002:targetUnavailable/u,
  );
  assert.equal((await readdir(parent)).includes("missing-parent"), false);

  const empty = join(parent, "empty");
  await mkdir(empty);
  await assert.rejects(initializeCorePackage(options(empty)), /OFF-I1001:targetExists/u);
  assert.deepEqual(await readdir(empty), []);

  const nonempty = join(parent, "nonempty");
  await mkdir(nonempty);
  await writeFile(join(nonempty, "owned.txt"), "preserve\n");
  await assert.rejects(initializeCorePackage(options(nonempty)), /OFF-I1001:targetExists/u);
  assert.equal(await readFile(join(nonempty, "owned.txt"), "utf8"), "preserve\n");

  const external = join(parent, "external");
  const link = join(parent, "link");
  await mkdir(external);
  await symlink(external, link, "dir");
  await assert.rejects(initializeCorePackage(options(link)), /OFF-I1001:targetExists/u);
  assert.deepEqual(await readdir(external), []);
});

test("failed initialization preserves a concurrently created foreign entry", async (t) => {
  const parent = await mkdtemp(join(tmpdir(), "off-init-race-"));
  t.after(async () => rm(parent, { recursive: true, force: true }));
  const target = join(parent, "package");
  const foreignBytes = new TextEncoder().encode("FOREIGN\n");

  await assert.rejects(
    initializeCorePackageWithOperations(options(target), {
      async makeDirectory(path) {
        await mkdir(path, { mode: 0o755 });
        await writeFile(join(path, "off.json"), foreignBytes, { flag: "wx" });
      },
    }),
    /OFF-I1002:writeFailed/u,
  );

  assert.deepEqual(
    new Uint8Array(await readFile(join(target, "off.json"))),
    foreignBytes,
  );
  assert.deepEqual(await readdir(target), ["off.json"]);
});

test("init CLI accepts options in any order and uses 0, 1, and 64 exactly", async (t) => {
  const parent = await mkdtemp(join(tmpdir(), "off-init-cli-"));
  t.after(async () => rm(parent, { recursive: true, force: true }));
  const target = join(parent, "package");
  const success = captureIo();
  assert.equal(await runCli(cliArguments(target), success.io), 0);
  assert.equal(success.stdout(), '{"files":["OFF.md","off.json"],"kind":"initializedCorePackage"}\n');
  assert.equal(success.stderr(), "");

  const exists = captureIo();
  assert.equal(await runCli(cliArguments(target), exists.io), 1);
  assert.equal(exists.stdout(), "");
  assert.equal(
    exists.stderr(),
    '{"code":"OFF-I1001","kind":"initializationFailure","reason":"targetExists"}\n',
  );

  const invalid = captureIo();
  const invalidArgs = cliArguments(join(parent, "invalid"));
  invalidArgs[invalidArgs.indexOf("--canonical-url") + 1] = "https://user@example.org";
  assert.equal(await runCli(invalidArgs, invalid.io), 64);
  assert.equal(invalid.stdout(), "");
  assert.match(invalid.stderr(), /^Usage:/u);
  assert.equal((await readdir(parent)).includes("invalid"), false);

  const reorderedTarget = join(parent, "reordered");
  const original = cliArguments(reorderedTarget);
  const reordered = [
    ...original.slice(0, 3),
    ...original.slice(19),
    ...original.slice(3, 19),
  ];
  const reorderedCapture = captureIo();
  assert.equal(await runCli(reordered, reorderedCapture.io), 0);
});
