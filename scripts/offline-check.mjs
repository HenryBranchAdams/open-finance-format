import { spawn } from "node:child_process";
import {
  chmod,
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const DEFAULT_CHILD_DEADLINE_MS = 30_000;
const MINIMUM_CHILD_DEADLINE_MS = 10;
const MAXIMUM_CHILD_DEADLINE_MS = 120_000;

function childProcessError(file, code, signal, stdout, stderr) {
  const reason = signal === null
    ? `exited with code ${String(code)}`
    : `was terminated by ${String(signal)}`;
  const error = new Error(`Child process ${file} ${reason}`);
  error.code = code;
  error.signal = signal;
  error.stdout = stdout;
  error.stderr = stderr;
  return error;
}

export async function executeWithDeadline(file, args, options = {}) {
  const {
    deadlineMs = DEFAULT_CHILD_DEADLINE_MS,
    detached: _detached,
    encoding: _encoding,
    killSignal: _killSignal,
    maxBuffer = 1024 * 1024,
    shell: _shell,
    signal: _signal,
    stdio: _stdio,
    timeout: _timeout,
    ...executionOptions
  } = options;
  if (
    !Number.isInteger(deadlineMs) ||
    deadlineMs < MINIMUM_CHILD_DEADLINE_MS ||
    deadlineMs > MAXIMUM_CHILD_DEADLINE_MS
  ) {
    throw new RangeError(
      `Child deadline must be an integer from ${MINIMUM_CHILD_DEADLINE_MS} to ${MAXIMUM_CHILD_DEADLINE_MS} milliseconds`,
    );
  }

  return new Promise((resolvePromise, rejectPromise) => {
    const usesPosixProcessGroup = process.platform !== "win32";
    let settled = false;
    let timer;
    let capturedStdout = "";
    let capturedStderr = "";
    let capturedStdoutBytes = 0;
    let capturedStderrBytes = 0;
    const captureLimit = Number.isInteger(maxBuffer) && maxBuffer > 0
      ? maxBuffer
      : 1024 * 1024;
    const child = spawn(
      file,
      args,
      {
        ...executionOptions,
        // Unlike execFile(), spawn() forwards detached on POSIX. The child is
        // therefore the leader of a new process group which can be terminated
        // without shell job control or its dash diagnostics.
        detached: usesPosixProcessGroup,
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");

    const terminate = () => {
      if (usesPosixProcessGroup && child.pid !== undefined) {
        try {
          process.kill(-child.pid, "SIGKILL");
          return;
        } catch {
          // The child may have failed before establishing its process group.
        }
      }
      child.kill("SIGKILL");
    };

    const rejectOutputLimit = (stream) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      terminate();
      child.stdin?.destroy();
      child.stdout?.destroy();
      child.stderr?.destroy();
      const error = new Error(
        `Child process ${stream} exceeded ${captureLimit} byte maxBuffer`,
      );
      error.code = "ERR_CHILD_PROCESS_STDIO_MAXBUFFER";
      error.stdout = capturedStdout;
      error.stderr = capturedStderr;
      rejectPromise(error);
    };

    child.stdout?.on("data", (chunk) => {
      const text = String(chunk);
      const bytes = Buffer.byteLength(text);
      if (capturedStdoutBytes + bytes > captureLimit) {
        rejectOutputLimit("stdout");
        return;
      }
      capturedStdout += text;
      capturedStdoutBytes += bytes;
    });
    child.stderr?.on("data", (chunk) => {
      const text = String(chunk);
      const bytes = Buffer.byteLength(text);
      if (capturedStderrBytes + bytes > captureLimit) {
        rejectOutputLimit("stderr");
        return;
      }
      capturedStderr += text;
      capturedStderrBytes += bytes;
    });
    child.once("error", (error) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;
      rejectPromise(error);
    });
    child.once("close", (code, signal) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;
      if (code === 0) {
        resolvePromise({ stdout: capturedStdout, stderr: capturedStderr });
        return;
      }
      rejectPromise(
        childProcessError(
          file,
          code,
          signal,
          capturedStdout,
          capturedStderr,
        ),
      );
    });
    timer = setTimeout(() => {
      if (settled) return;
      settled = true;

      // The POSIX child leads an isolated process group, so one SIGKILL reaches
      // its non-detached descendants. Deliberately detached descendants are
      // outside this JavaScript harness's cleanup guarantee. Pipe destruction
      // still makes the deadline promise settle immediately rather than
      // waiting on a descendant which inherited the stdio handles.
      terminate();
      child.stdin?.destroy();
      child.stdout?.destroy();
      child.stderr?.destroy();

      const deadlineError = new Error(
        `Child process exceeded ${deadlineMs} ms deadline; termination was requested for the supervised ${usesPosixProcessGroup ? "process group" : "direct child"}`,
      );
      deadlineError.code = "OFF-HARNESS-DEADLINE";
      deadlineError.terminationRequested = true;
      deadlineError.terminationScope = usesPosixProcessGroup
        ? "supervisedProcessGroup"
        : "directChild";
      deadlineError.stdout = capturedStdout;
      deadlineError.stderr = capturedStderr;
      rejectPromise(deadlineError);
    }, deadlineMs);
  });
}

async function assertSafePermissionTree(root) {
  const rootStatus = await lstat(root);
  if (rootStatus.isSymbolicLink()) {
    throw new Error("Refusing to change permissions through a symbolic link");
  }
  if (!rootStatus.isDirectory()) {
    throw new Error("Permission-tree root is not a directory");
  }

  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(root, entry.name);
    const status = await lstat(path);
    if (status.isSymbolicLink()) {
      throw new Error("Refusing symbolic link in offline release tree");
    }
    if (status.isDirectory()) {
      await assertSafePermissionTree(path);
    } else if (!status.isFile()) {
      throw new Error("Refusing non-regular entry in offline release tree");
    }
  }
}

function safeRelativeReference(value) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    isAbsolute(value) ||
    /^[A-Za-z]:/u.test(value) ||
    value.includes("\\")
  ) {
    return false;
  }
  return value.split("/").every(
    (segment) => segment.length > 0 && segment !== "." && segment !== "..",
  );
}

export async function readSafeOfflineInputs(
  releaseRoot,
  forbiddenPaths = [repositoryRoot],
) {
  // This check deliberately precedes every read and parse from the copied
  // release. A preserved symlink or special file therefore fails closed
  // before candidate bytes are consumed by the harness.
  await assertSafePermissionTree(releaseRoot);

  const corpusDocument = JSON.parse(
    await readFile(join(releaseRoot, "conformance/corpus.json"), "utf8"),
  );
  if (!Array.isArray(corpusDocument.cases) || corpusDocument.cases.length === 0) {
    throw new Error("Offline corpus descriptor has no cases");
  }
  if (!safeRelativeReference(corpusDocument.evaluatorFailures)) {
    throw new Error("Offline corpus has an unsafe evaluator-failure reference");
  }
  const conformanceRoot = join(releaseRoot, "conformance");
  const evaluatorVectorPath = resolve(
    conformanceRoot,
    corpusDocument.evaluatorFailures,
  );
  const fromConformanceRoot = relative(conformanceRoot, evaluatorVectorPath);
  if (
    fromConformanceRoot === "" ||
    isAbsolute(fromConformanceRoot) ||
    fromConformanceRoot === ".." ||
    fromConformanceRoot.startsWith(`..${sep}`)
  ) {
    throw new Error("Offline evaluator-failure vector escaped conformance root");
  }
  const evaluatorVector = JSON.parse(
    await readFile(evaluatorVectorPath, "utf8"),
  );
  if (
    evaluatorVector.vectorVersion !== "0.1" ||
    !Array.isArray(evaluatorVector.cases) ||
    evaluatorVector.cases.length === 0
  ) {
    throw new Error("Offline evaluator-failure vector has no cases");
  }

  const bundleSource = await readFile(join(releaseRoot, "dist/off.mjs"), "utf8");
  if (forbiddenPaths.some((path) => bundleSource.includes(path))) {
    throw new Error("Bundle contains its absolute build path");
  }
  try {
    await lstat(join(releaseRoot, "node_modules"));
    throw new Error("Offline copy unexpectedly contains node_modules");
  } catch (error) {
    if (!(typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT")) {
      throw error;
    }
  }

  return {
    expectedCaseCount: corpusDocument.cases.length,
    expectedEvaluatorFailureCount: evaluatorVector.cases.length,
    expectedCorpusVersion: corpusDocument.corpusVersion,
    expectedCases: corpusDocument.cases.map((item) => ({
      id: item.id,
      status: "passed",
      outcome: item.expectedOutcome,
    })),
    expectedEvaluatorFailureCases: evaluatorVector.cases.map((item) => ({
      id: item.id,
      status: "passed",
      evaluatorFailure: item.expected,
    })),
  };
}

async function applyTreeMode(root, writable) {
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(root, entry.name);
    const status = await lstat(path);
    if (status.isSymbolicLink()) {
      throw new Error("Refusing symbolic link in offline release tree");
    }
    if (status.isDirectory()) {
      if (writable) await chmod(path, 0o755);
      await applyTreeMode(path, writable);
      if (!writable) await chmod(path, 0o555);
    } else if (status.isFile()) {
      await chmod(path, writable ? 0o644 : 0o444);
    } else {
      throw new Error("Refusing non-regular entry in offline release tree");
    }
  }
  await chmod(root, writable ? 0o755 : 0o555);
}

export async function changeTreeMode(root, writable) {
  // Validate the entire copied tree before the first chmod. In particular,
  // chmod follows symlinks, so even a single preserved link must abort the
  // operation before any target inside or outside the temporary tree changes.
  await assertSafePermissionTree(root);
  await applyTreeMode(root, writable);
}

async function runGuarded(nodeArgs, releaseRoot, harnessRoot) {
  return executeWithDeadline(
    process.execPath,
    [
      "--no-warnings",
      "--experimental-loader",
      pathToFileURL(join(harnessRoot, "network-loader.mjs")).href,
      "--import",
      pathToFileURL(join(harnessRoot, "network-runtime.mjs")).href,
      ...nodeArgs,
    ],
    {
      cwd: releaseRoot,
      env: {
        PATH: process.env.PATH ?? "",
        LANG: "C",
        LC_ALL: "C",
      },
      maxBuffer: 16 * 1024 * 1024,
    },
  );
}

async function main() {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "off-offline-"));
  const releaseRoot = join(temporaryRoot, "release");
  const harnessRoot = join(temporaryRoot, "harness");

  try {
    await mkdir(join(releaseRoot, "dist"), { recursive: true });
    await mkdir(harnessRoot, { recursive: true });
    await cp(
      resolve(repositoryRoot, "dist/off.mjs"),
      join(releaseRoot, "dist/off.mjs"),
    );
    await cp(
      resolve(repositoryRoot, "conformance"),
      join(releaseRoot, "conformance"),
      { recursive: true, dereference: false },
    );

    const {
      expectedCaseCount,
      expectedEvaluatorFailureCount,
      expectedCorpusVersion,
      expectedCases,
      expectedEvaluatorFailureCases,
    } = await readSafeOfflineInputs(releaseRoot);

    await writeFile(
      join(harnessRoot, "network-loader.mjs"),
      `const blocked = new Set([
  "child_process", "cluster", "dgram", "dns", "http", "http2", "https", "module",
  "net", "process", "tls", "worker_threads",
  "node:child_process", "node:cluster", "node:dgram", "node:dns", "node:dns/promises",
  "node:http", "node:http2", "node:https", "node:module", "node:net", "node:process",
  "node:tls", "node:worker_threads"
]);
export async function resolve(specifier, context, nextResolve) {
  if (blocked.has(specifier)) throw new Error("offline module blocked");
  return nextResolve(specifier, context);
}
`,
    );
    await writeFile(
      join(harnessRoot, "network-runtime.mjs"),
      `const blocked = () => { throw new Error("offline network blocked"); };
for (const name of ["fetch", "WebSocket", "EventSource"]) {
  Object.defineProperty(globalThis, name, { value: blocked, configurable: false, writable: false });
}
Object.defineProperty(process, "getBuiltinModule", {
  value: blocked,
  configurable: false,
  writable: false
});
`,
    );
    const guardProbes = [
      {
        name: "direct builtin import",
        source: 'import "node:http";\n',
      },
      {
        name: "process.getBuiltinModule",
        source: 'process.getBuiltinModule("http");\n',
      },
      {
        name: "node:process getBuiltinModule",
        source: 'import { getBuiltinModule } from "node:process";\ngetBuiltinModule("http");\n',
      },
      {
        name: "node:module createRequire",
        source: 'import { createRequire } from "node:module";\ncreateRequire(import.meta.url)("node:http");\n',
      },
    ];
    for (const [index, probe] of guardProbes.entries()) {
      const probePath = join(harnessRoot, `network-probe-${index}.mjs`);
      await writeFile(probePath, probe.source);
      let blocked = false;
      try {
        await runGuarded([probePath], releaseRoot, harnessRoot);
      } catch {
        blocked = true;
      }
      if (!blocked) {
        throw new Error(`Offline regression guard missed ${probe.name}`);
      }
    }

    await changeTreeMode(releaseRoot, false);
    const invocation = [
      join(releaseRoot, "dist/off.mjs"),
      "corpus",
      "verify",
      "--corpus",
      join(releaseRoot, "conformance/corpus.json"),
    ];
    const first = await runGuarded(invocation, releaseRoot, harnessRoot);
    const second = await runGuarded(invocation, releaseRoot, harnessRoot);
    if (first.stderr !== "" || second.stderr !== "") {
      throw new Error("Offline corpus emitted stderr");
    }
    if (first.stdout !== second.stdout) {
      throw new Error("Offline corpus output was nondeterministic");
    }
    if (first.stdout.includes(repositoryRoot) || first.stdout.includes(temporaryRoot)) {
      throw new Error("Offline corpus output leaked an absolute path");
    }
    const result = JSON.parse(first.stdout);
    if (
      result.kind !== "corpusResult" ||
      result.ok !== true ||
      result.corpusVersion !== expectedCorpusVersion ||
      !isDeepStrictEqual(result.cases, expectedCases) ||
      !isDeepStrictEqual(
        result.evaluatorFailureCases,
        expectedEvaluatorFailureCases,
      ) ||
      JSON.stringify(Object.keys(result).sort()) !== JSON.stringify([
        "cases",
        "corpusVersion",
        "evaluatorFailureCases",
        "kind",
        "ok",
      ])
    ) {
      throw new Error(
        `Offline corpus verification failed (kind=${String(result.kind)}, ok=${String(result.ok)}, packageCases=${Array.isArray(result.cases) ? result.cases.length : "invalid"}, evaluatorFailureCases=${Array.isArray(result.evaluatorFailureCases) ? result.evaluatorFailureCases.length : "invalid"})`,
      );
    }
    process.stdout.write(`offline conformance passed (${result.cases.length} cases, twice)\n`);
  } finally {
    try {
      await changeTreeMode(releaseRoot, true);
    } catch {
      // The release tree may not have been created or may have been rejected.
    }
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

if (
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
