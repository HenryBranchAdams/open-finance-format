import { access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { executeWithDeadline } from "./offline-check.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function usableNode22(candidate) {
  try {
    const { stdout } = await executeWithDeadline(candidate, ["--version"]);
    const match = /^v(\d+)\.(\d+)\.(\d+)$/u.exec(stdout.trim());
    return match !== null &&
      Number(match[1]) === 22 &&
      (Number(match[2]) > 13 || Number(match[2]) === 13);
  } catch {
    return false;
  }
}

async function homebrewNode22() {
  try {
    const { stdout } = await executeWithDeadline("brew", ["--prefix", "node@22"], {
      env: { ...process.env, HOMEBREW_NO_AUTO_UPDATE: "1" },
    });
    const prefix = stdout.trim();
    return prefix === "" ? undefined : join(prefix, "bin/node");
  } catch {
    return undefined;
  }
}

export async function resolveNode22() {
  const candidates = [
    process.env.OFF_NODE22,
    process.execPath,
    "node22",
    "node",
    await homebrewNode22(),
  ].filter((candidate) => typeof candidate === "string");

  for (const candidate of new Set(candidates)) {
    if (await usableNode22(candidate)) return candidate;
  }
  throw new Error(
    "Node 22.13.0 or newer in the Node 22 line is required; set OFF_NODE22 when it is not on PATH",
  );
}

async function main() {
  const node22 = await resolveNode22();
  const bundle = resolve(repositoryRoot, "dist/off.mjs");
  await access(bundle);
  const { stdout, stderr } = await executeWithDeadline(
    node22,
    [
      bundle,
      "corpus",
      "verify",
      "--corpus",
      resolve(repositoryRoot, "conformance/corpus.json"),
    ],
    { cwd: repositoryRoot },
  );
  if (stderr !== "") throw new Error("Node 22 bundle emitted stderr");
  const result = JSON.parse(stdout);
  if (result.kind !== "corpusResult" || result.ok !== true) {
    throw new Error("Node 22 corpus verification failed");
  }
  const version = String((await executeWithDeadline(node22, ["--version"])).stdout)
    .trim()
    .slice(1);
  process.stdout.write(
    `node ${version} conformance passed (${result.cases.length} cases)\n`,
  );
}

if (
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
