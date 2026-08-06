import { createHash } from "node:crypto";
import { lstat, readdir, realpath } from "node:fs/promises";
import { basename, isAbsolute, join, relative, resolve, sep } from "node:path";

import type { EvaluationResult, OffApi, PackageRecord } from "./types.ts";

const MAX_DISCOVERY_DEPTH = 12;
const MAX_DISCOVERY_ENTRIES = 100_000;
const MAX_PACKAGES = 2_000;
const DISCOVERY_TIME = "2000-01-01T00:00:00Z";

function inside(root: string, candidate: string): boolean {
  const value = relative(root, candidate);
  return value === "" ||
    (value !== ".." && !value.startsWith(`..${sep}`) && !isAbsolute(value));
}

function opaqueId(namespace: string, value: string): string {
  return `${namespace}_${createHash("sha256").update(`${namespace}\0${value}`).digest("base64url").slice(0, 24)}`;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function summarize(
  id: string,
  packageRoot: string,
  configuredRoot: string,
  result: EvaluationResult,
): PackageRecord {
  if (result.kind === "evaluatorFailure") {
    return {
      id,
      packageRoot,
      configuredRoot,
      title: `Degraded OFF package ${id.slice(-8)}`,
      declaredProfiles: [],
      outcome: "evaluatorFailure",
      evaluatorFailure: { code: result.code, operation: result.operation },
    };
  }
  const identity = result.normalized.packageIdentity;
  const title = typeof identity?.title === "string"
    ? identity.title
    : `Degraded OFF package ${id.slice(-8)}`;
  return {
    id,
    packageRoot,
    configuredRoot,
    title,
    ...(typeof identity?.releaseId === "string" ? { releaseId: identity.releaseId } : {}),
    ...(typeof identity?.releaseVersion === "string" ? { releaseVersion: identity.releaseVersion } : {}),
    ...(typeof identity?.id === "string" ? { packageIdentityId: identity.id } : {}),
    declaredProfiles: strings(identity?.declaredProfiles).sort(),
    outcome: result.normalized.outcome,
  };
}

async function discoverUnder(root: string): Promise<string[]> {
  const rootStat = await lstat(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw new Error("A configured package root must be a real directory, not a symlink");
  }
  const boundedRoot = await realpath(root);
  const found: string[] = [];
  const pending: Array<{ path: string; depth: number }> = [{ path: boundedRoot, depth: 0 }];
  let seenEntries = 0;
  while (pending.length > 0) {
    const current = pending.shift();
    if (current === undefined) break;
    const entries = await readdir(current.path, { withFileTypes: true });
    seenEntries += entries.length;
    if (seenEntries > MAX_DISCOVERY_ENTRIES) throw new Error("Package discovery entry limit exceeded");
    const manifest = entries.find((entry) => entry.name === "off.json");
    if (manifest?.isFile() === true && !manifest.isSymbolicLink()) {
      const packageRoot = await realpath(current.path);
      if (!inside(boundedRoot, packageRoot)) throw new Error("Discovered package escaped its configured root");
      found.push(packageRoot);
      if (found.length > MAX_PACKAGES) throw new Error("Package discovery result limit exceeded");
      continue;
    }
    if (current.depth >= MAX_DISCOVERY_DEPTH) continue;
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      if (entry.isDirectory() && !entry.isSymbolicLink()) {
        pending.push({ path: join(current.path, entry.name), depth: current.depth + 1 });
      }
    }
  }
  return found;
}

export class PackageCatalog {
  readonly #records: ReadonlyMap<string, PackageRecord>;

  private constructor(records: readonly PackageRecord[]) {
    this.#records = new Map(records.map((record) => [record.id, record]));
  }

  static async create(api: OffApi, roots: readonly string[]): Promise<PackageCatalog> {
    if (roots.length === 0) throw new Error("At least one package root is required");
    const configuredRoots = await Promise.all(roots.map(async (root) => {
      const lexicalRoot = resolve(root);
      const stats = await lstat(lexicalRoot);
      if (!stats.isDirectory() || stats.isSymbolicLink()) {
        throw new Error("A configured package root must be a real directory, not a symlink");
      }
      return realpath(lexicalRoot);
    }));
    if (new Set(configuredRoots).size !== configuredRoots.length) {
      throw new Error("Duplicate configured package roots are not allowed");
    }
    const candidates = new Map<string, string>();
    for (const configuredRoot of configuredRoots) {
      for (const packageRoot of await discoverUnder(configuredRoot)) {
        if (candidates.has(packageRoot)) throw new Error("A package was discovered through multiple roots");
        candidates.set(packageRoot, configuredRoot);
      }
    }
    const supported = new Set([
      api.PUBLIC_EQUITY_PROFILE_URI,
      api.WORKBOOK_BINDING_PROFILE_URI,
    ]);
    const records: PackageRecord[] = [];
    for (const [packageRoot, configuredRoot] of [...candidates].sort(([left], [right]) => left.localeCompare(right))) {
      const rootIndex = configuredRoots.indexOf(configuredRoot);
      const packagePath = relative(configuredRoot, packageRoot).split(sep).join("/");
      const id = opaqueId("pkg", `${rootIndex}\0${packagePath}`);
      const core = await api.evaluatePackage({
        packageRoot,
        evaluatedAt: DISCOVERY_TIME,
        requestedProfiles: [],
      });
      let evaluated = core;
      if (core.kind === "packageResult") {
        const declared = strings(core.normalized.packageIdentity?.declaredProfiles);
        const requestedProfiles = declared.filter((uri) => supported.has(uri)).sort();
        if (requestedProfiles.length > 0) {
          evaluated = await api.evaluatePackage({ packageRoot, evaluatedAt: DISCOVERY_TIME, requestedProfiles });
        }
      }
      records.push(summarize(id, packageRoot, configuredRoot, evaluated));
    }
    return new PackageCatalog(records.sort((left, right) => left.id.localeCompare(right.id)));
  }

  list(): readonly PackageRecord[] {
    return [...this.#records.values()];
  }

  get(id: string): PackageRecord | undefined {
    return this.#records.get(id);
  }
}

export function resourceOpaqueId(packageId: string, resourceId: string): string {
  return opaqueId("res", `${packageId}\0${resourceId}`);
}
