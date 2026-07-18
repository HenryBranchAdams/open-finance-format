import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import {
  access,
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

const execute = promisify(execFile);
const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));

async function loadHarnessHelpers() {
  const offlineModuleUrl = pathToFileURL(
    join(repositoryRoot, "scripts/offline-check.mjs"),
  ).href;
  const node22ModuleUrl = pathToFileURL(
    join(repositoryRoot, "scripts/test-node22.mjs"),
  ).href;
  const offlineModule = await import(offlineModuleUrl) as {
    changeTreeMode: (root: string, writable: boolean) => Promise<void>;
    executeWithDeadline: (
      file: string,
      args: readonly string[],
      options?: { readonly deadlineMs?: number },
    ) => Promise<{ readonly stdout: string; readonly stderr: string }>;
    readSafeOfflineInputs: (
      root: string,
      forbiddenPaths?: readonly string[],
    ) => Promise<{ readonly expectedCaseCount: number }>;
  };
  const node22Module = await import(node22ModuleUrl) as {
    resolveNode22: () => Promise<string>;
  };
  return { ...offlineModule, ...node22Module };
}

test("the bundle is deterministic across absolute working directories", async (t) => {
  const firstRoot = await mkdtemp(join(tmpdir(), "off-build-first-"));
  const secondRoot = await mkdtemp(join(tmpdir(), "off-build-second-"));
  t.after(async () => {
    await rm(firstRoot, { recursive: true, force: true });
    await rm(secondRoot, { recursive: true, force: true });
  });
  const firstOutput = join(firstRoot, "off.mjs");
  const secondOutput = join(secondRoot, "off.mjs");
  const buildScript = join(repositoryRoot, "scripts/build.mjs");
  await execute(process.execPath, [buildScript, "--outfile", firstOutput], {
    cwd: firstRoot,
  });
  await execute(process.execPath, [buildScript, "--outfile", secondOutput], {
    cwd: secondRoot,
  });
  const first = await readFile(firstOutput);
  const second = await readFile(secondOutput);
  assert.deepEqual(first, second);
  const source = first.toString("utf8");
  assert.equal(source.includes(firstRoot), false);
  assert.equal(source.includes(secondRoot), false);
  assert.equal(source.includes(repositoryRoot), false);
  assert.equal(source.includes("sourceMappingURL"), false);
});

test("permission hardening rejects symlinks before changing any mode", async (t) => {
  const treeRoot = await mkdtemp(join(tmpdir(), "off-mode-tree-"));
  const externalRoot = await mkdtemp(join(tmpdir(), "off-mode-external-"));
  t.after(async () => {
    await rm(treeRoot, { recursive: true, force: true });
    await rm(externalRoot, { recursive: true, force: true });
  });

  const ordinaryFile = join(treeRoot, "ordinary.txt");
  const externalFile = join(externalRoot, "outside.txt");
  await writeFile(ordinaryFile, "inside\n");
  await writeFile(externalFile, "outside\n");
  await chmod(ordinaryFile, 0o640);
  await chmod(externalFile, 0o600);
  await symlink(externalFile, join(treeRoot, "escape"));

  const ordinaryMode = (await stat(ordinaryFile)).mode & 0o777;
  const externalMode = (await stat(externalFile)).mode & 0o777;
  const { changeTreeMode } = await loadHarnessHelpers();

  await assert.rejects(
    changeTreeMode(treeRoot, false),
    /Refusing symbolic link in offline release tree/u,
  );
  assert.equal((await stat(ordinaryFile)).mode & 0o777, ordinaryMode);
  assert.equal((await stat(externalFile)).mode & 0o777, externalMode);
  assert.equal(await readFile(externalFile, "utf8"), "outside\n");
});

test("offline input safety is established before copied bytes are parsed", async (t) => {
  const treeRoot = await mkdtemp(join(tmpdir(), "off-input-tree-"));
  const externalRoot = await mkdtemp(join(tmpdir(), "off-input-external-"));
  t.after(async () => {
    await rm(treeRoot, { recursive: true, force: true });
    await rm(externalRoot, { recursive: true, force: true });
  });
  await mkdir(join(treeRoot, "conformance"), { recursive: true });
  await mkdir(join(treeRoot, "dist"), { recursive: true });
  const externalCorpus = join(externalRoot, "corpus.json");
  await writeFile(externalCorpus, "not JSON\n");
  await symlink(externalCorpus, join(treeRoot, "conformance/corpus.json"));
  await writeFile(join(treeRoot, "dist/off.mjs"), "export {};\n");

  const { readSafeOfflineInputs } = await loadHarnessHelpers();
  await assert.rejects(
    readSafeOfflineInputs(treeRoot, []),
    /Refusing symbolic link in offline release tree/u,
  );
});

test("child deadlines request bounded termination for a nonterminating process", async () => {
  const { executeWithDeadline } = await loadHarnessHelpers();
  await assert.rejects(
    executeWithDeadline(process.execPath, ["--version"], { deadlineMs: 0 }),
    /must be an integer from 10 to 120000 milliseconds/u,
  );
  await assert.rejects(
    executeWithDeadline(process.execPath, ["--version"], { deadlineMs: 120_001 }),
    /must be an integer from 10 to 120000 milliseconds/u,
  );
  const startedAt = Date.now();
  await assert.rejects(
    executeWithDeadline(
      process.execPath,
      ["-e", "setInterval(() => {}, 1_000)"],
      { deadlineMs: 100 },
    ),
    (error: unknown) => {
      assert.equal(
        (error as { readonly code?: unknown }).code,
        "OFF-HARNESS-DEADLINE",
      );
      assert.equal(
        (error as { readonly terminationRequested?: unknown })
          .terminationRequested,
        true,
      );
      assert.equal(
        (error as { readonly terminationScope?: unknown }).terminationScope,
        process.platform === "win32" ? "directChild" : "supervisedProcessGroup",
      );
      assert.match(
        (error as Error).message,
        /exceeded 100 ms deadline; termination was requested/u,
      );
      return true;
    },
  );
  assert.equal(Date.now() - startedAt < 5_000, true);
});

test("deadline supervision is quiet when the workload is dash", {
  skip: process.platform === "win32" || !existsSync("/bin/dash")
    ? "dash is unavailable"
    : false,
}, async () => {
  const { executeWithDeadline } = await loadHarnessHelpers();
  await assert.rejects(
    executeWithDeadline(
      "/bin/dash",
      ["-c", "while :; do sleep 1; done"],
      { deadlineMs: 100 },
    ),
    (error: unknown) => {
      assert.equal(
        (error as { readonly code?: unknown }).code,
        "OFF-HARNESS-DEADLINE",
      );
      assert.equal(
        String((error as { readonly stdout?: unknown }).stdout ?? ""),
        "",
      );
      assert.equal(
        String((error as { readonly stderr?: unknown }).stderr ?? ""),
        "",
      );
      return true;
    },
  );
});

test("a child deadline kills a long-lived grandchild process group", {
  skip: process.platform === "win32" ? "POSIX process groups are unavailable" : false,
}, async (t) => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "off-process-group-"));
  t.after(async () => rm(temporaryRoot, { recursive: true, force: true }));
  const sentinel = join(temporaryRoot, "grandchild-survived");
  const grandchildSource = [
    'const { writeFileSync } = require("node:fs");',
    `setTimeout(() => writeFileSync(${JSON.stringify(sentinel)}, "alive\\n"), 500);`,
    "setInterval(() => {}, 1_000);",
  ].join("\n");
  const childSource = [
    'const { spawn } = require("node:child_process");',
    `spawn(process.execPath, ["-e", ${JSON.stringify(grandchildSource)}], { detached: false, stdio: "ignore" });`,
    'process.stdout.write("spawned\\n");',
    "setInterval(() => {}, 1_000);",
  ].join("\n");

  const { executeWithDeadline } = await loadHarnessHelpers();
  await assert.rejects(
    executeWithDeadline(process.execPath, ["-e", childSource], {
      deadlineMs: 200,
    }),
    (error: unknown) => {
      assert.equal(
        (error as { readonly code?: unknown }).code,
        "OFF-HARNESS-DEADLINE",
      );
      assert.match(
        String((error as { readonly stdout?: unknown }).stdout ?? ""),
        /spawned/u,
      );
      return true;
    },
  );
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 600));
  await assert.rejects(access(sentinel));
});

test("a deadline settles while an explicitly detached descendant remains outside cleanup scope", {
  skip: process.platform === "win32" ? "POSIX process groups are unavailable" : false,
}, async (t) => {
  let escapedPid: number | undefined;
  t.after(() => {
    if (escapedPid === undefined) return;
    try {
      process.kill(escapedPid, "SIGKILL");
    } catch {
      // The self-terminating regression child may already have exited.
    }
  });
  const grandchildSource = [
    "setTimeout(() => process.exit(0), 2_000);",
    "setInterval(() => {}, 1_000);",
  ].join("\n");
  const childSource = [
    'const { spawn } = require("node:child_process");',
    `const child = spawn(process.execPath, ["-e", ${JSON.stringify(grandchildSource)}], { detached: true, stdio: ["ignore", "inherit", "inherit"] });`,
    'process.stdout.write(`escaped=${child.pid}\\n`);',
    "setInterval(() => {}, 1_000);",
  ].join("\n");

  const { executeWithDeadline } = await loadHarnessHelpers();
  const startedAt = Date.now();
  await assert.rejects(
    executeWithDeadline(process.execPath, ["-e", childSource], {
      deadlineMs: 200,
    }),
    (error: unknown) => {
      assert.equal(
        (error as { readonly code?: unknown }).code,
        "OFF-HARNESS-DEADLINE",
      );
      const match = /escaped=(\d+)/u.exec(
        String((error as { readonly stdout?: unknown }).stdout ?? ""),
      );
      assert.notEqual(match, null);
      escapedPid = Number(match?.[1]);
      return true;
    },
  );
  assert.notEqual(escapedPid, undefined);
  const reportedPid = escapedPid;
  if (reportedPid === undefined) {
    throw new Error("escaped child did not report its pid");
  }
  assert.doesNotThrow(() => process.kill(reportedPid, 0));
  assert.equal(Date.now() - startedAt < 2_000, true);
});

test("the checked-in dependency-free bundle matches a fresh build and verifies on Node 22", async (t) => {
  const buildRoot = await mkdtemp(join(tmpdir(), "off-node22-build-"));
  t.after(async () => {
    await rm(buildRoot, { recursive: true, force: true });
  });
  const temporaryBundle = join(buildRoot, "off.mjs");
  const checkedInBundle = join(repositoryRoot, "dist/off.mjs");
  const checkedInBefore = await readFile(checkedInBundle);
  await execute(
    process.execPath,
    [
      join(repositoryRoot, "scripts/build.mjs"),
      "--outfile",
      temporaryBundle,
    ],
    { cwd: buildRoot },
  );
  assert.deepEqual(await readFile(temporaryBundle), checkedInBefore);

  const { resolveNode22 } = await loadHarnessHelpers();
  const node22 = await resolveNode22();
  const { stdout, stderr } = await execute(
    node22,
    [
      checkedInBundle,
      "corpus",
      "verify",
      "--corpus",
      join(repositoryRoot, "conformance/corpus.json"),
    ],
    { cwd: repositoryRoot },
  );
  assert.equal(stderr, "");
  assert.equal((JSON.parse(stdout) as { ok?: unknown }).ok, true);
  assert.deepEqual(await readFile(checkedInBundle), checkedInBefore);
});

test("the read-only fresh-checkout-shaped offline harness succeeds", async () => {
  const corpus = JSON.parse(
    await readFile(join(repositoryRoot, "conformance/corpus.json"), "utf8"),
  ) as { readonly cases: readonly unknown[] };
  const { stdout, stderr } = await execute(
    process.execPath,
    [join(repositoryRoot, "scripts/offline-check.mjs")],
    { cwd: repositoryRoot },
  );
  assert.equal(stderr, "");
  assert.equal(
    stdout,
    `offline conformance passed (${corpus.cases.length} cases, twice)\n`,
  );
});
