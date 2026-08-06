import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import type { OffApi } from "./types.ts";

async function isRepositoryRoot(candidate: string): Promise<boolean> {
  try {
    const document = JSON.parse(await readFile(join(candidate, "package.json"), "utf8")) as {
      name?: unknown;
    };
    await readFile(join(candidate, "dist", "off.mjs"));
    return document.name === "@open-finance-format/reference";
  } catch {
    return false;
  }
}

export async function locateRepositoryRoot(explicit?: string): Promise<string> {
  const starts = [
    explicit,
    process.env.OFF_REPOSITORY_ROOT,
    process.cwd(),
    dirname(fileURLToPath(import.meta.url)),
  ].filter((value): value is string => typeof value === "string" && value.length > 0);
  for (const start of starts) {
    let candidate = resolve(start);
    for (let depth = 0; depth < 8; depth += 1) {
      if (await isRepositoryRoot(candidate)) return candidate;
      const parent = dirname(candidate);
      if (parent === candidate) break;
      candidate = parent;
    }
  }
  throw new Error("OFF repository root with built evaluator was not found");
}

export async function loadOffApi(repositoryRoot: string): Promise<OffApi> {
  const moduleUrl = pathToFileURL(join(repositoryRoot, "dist", "off.mjs")).href;
  const loaded = (await import(moduleUrl)) as Partial<OffApi>;
  if (
    typeof loaded.evaluatePackage !== "function" ||
    typeof loaded.PUBLIC_EQUITY_PROFILE_URI !== "string" ||
    typeof loaded.WORKBOOK_BINDING_PROFILE_URI !== "string"
  ) {
    throw new Error("Built OFF evaluator API is incompatible");
  }
  return loaded as OffApi;
}
