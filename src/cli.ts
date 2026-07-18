import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { verifyCorpus } from "./corpus.ts";
import { evaluatePackage } from "./index.ts";
import { canonicalizeJsonText } from "./json/jcs.ts";
import { isAbsoluteUri } from "./uri.ts";

export * from "./index.ts";
export { verifyCorpus } from "./corpus.ts";

export interface CliIo {
  stdout(value: string): void;
  stderr(value: string): void;
}

const defaultIo: CliIo = {
  stdout: (value) => process.stdout.write(value),
  stderr: (value) => process.stderr.write(value),
};

const usage = [
  "Usage: off validate <package-root> --evaluated-at <timestamp> [--profile <uri> ...]",
  "       off normalize <package-root> --evaluated-at <timestamp> [--profile <uri> ...]",
  "       off corpus verify --corpus <conformance/corpus.json>",
].join("\n");

interface PackageArguments {
  readonly packageRoot: string;
  readonly evaluatedAt: string;
  readonly requestedProfiles: readonly string[];
}

function wholeSecondUtcTimestamp(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})Z$/u.exec(value);
  if (match === null) return false;
  const date = `${match[1]}-${match[2]}-${match[3]}`;
  const parsed = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) &&
    parsed.toISOString().slice(0, 10) === date &&
    Number(match[4]) <= 23 &&
    Number(match[5]) <= 59 &&
    Number(match[6]) <= 59;
}

function parsePackageArguments(args: readonly string[]): PackageArguments | undefined {
  const packageRoot = args[0];
  if (packageRoot === undefined || packageRoot.startsWith("--")) return undefined;
  let evaluatedAt: string | undefined;
  const requestedProfiles: string[] = [];
  for (let index = 1; index < args.length; index += 2) {
    const option = args[index];
    const value = args[index + 1];
    if (value === undefined) return undefined;
    if (option === "--evaluated-at") {
      if (evaluatedAt !== undefined) return undefined;
      evaluatedAt = value;
    } else if (option === "--profile") {
      if (!isAbsoluteUri(value) || requestedProfiles.includes(value)) return undefined;
      requestedProfiles.push(value);
    } else {
      return undefined;
    }
  }
  if (evaluatedAt === undefined || !wholeSecondUtcTimestamp(evaluatedAt)) {
    return undefined;
  }
  return { packageRoot, evaluatedAt, requestedProfiles };
}

function emitCanonical(io: (value: string) => void, value: unknown): void {
  io(`${canonicalizeJsonText(value)}\n`);
}

function toolFailure(): {
  readonly kind: "evaluatorFailure";
  readonly code: "OFF-T1004";
  readonly operation: "internal";
} {
  return {
    kind: "evaluatorFailure",
    code: "OFF-T1004",
    operation: "internal",
  };
}

export async function runCli(
  args: readonly string[],
  io: CliIo = defaultIo,
): Promise<0 | 1 | 2 | 64> {
  try {
    const command = args[0];
    if (command === "validate" || command === "normalize") {
      const options = parsePackageArguments(args.slice(1));
      if (options === undefined) {
        io.stderr(`${usage}\n`);
        return 64;
      }
      const result = await evaluatePackage(options);
      if (result.kind === "evaluatorFailure") {
        emitCanonical(io.stderr, result);
        return 2;
      }
      io.stdout(`${new TextDecoder().decode(result.canonicalBytes)}\n`);
      return result.normalized.outcome === "invalid" ? 1 : 0;
    }

    if (command === "corpus" && args[1] === "verify") {
      if (args.length !== 4 || args[2] !== "--corpus" || args[3] === undefined) {
        io.stderr(`${usage}\n`);
        return 64;
      }
      const result = await verifyCorpus(args[3]);
      if (result.kind === "evaluatorFailure") {
        emitCanonical(io.stderr, result);
        return 2;
      }
      emitCanonical(io.stdout, result);
      return result.ok ? 0 : 1;
    }

    io.stderr(`${usage}\n`);
    return 64;
  } catch {
    emitCanonical(io.stderr, toolFailure());
    return 2;
  }
}

function isDirectInvocation(): boolean {
  const invokedPath = process.argv[1];
  if (invokedPath === undefined) return false;
  try {
    return realpathSync(fileURLToPath(import.meta.url)) ===
      realpathSync(resolve(invokedPath));
  } catch {
    return false;
  }
}

if (isDirectInvocation()) {
  process.exitCode = await runCli(process.argv.slice(2));
}
