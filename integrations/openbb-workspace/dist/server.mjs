// src/index.ts
import { delimiter, join as join4, resolve as resolve4 } from "node:path";
import { pathToFileURL as pathToFileURL2 } from "node:url";

// src/catalog.ts
import { createHash } from "node:crypto";
import { lstat, readdir, realpath } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
var MAX_DISCOVERY_DEPTH = 12;
var MAX_DISCOVERY_ENTRIES = 1e5;
var MAX_PACKAGES = 2e3;
var DISCOVERY_TIME = "2000-01-01T00:00:00Z";
function inside(root, candidate) {
  const value = relative(root, candidate);
  return value === "" || value !== ".." && !value.startsWith(`..${sep}`) && !isAbsolute(value);
}
function opaqueId(namespace, value) {
  return `${namespace}_${createHash("sha256").update(`${namespace}\0${value}`).digest("base64url").slice(0, 24)}`;
}
function strings(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}
function summarize(id, packageRoot, configuredRoot, result) {
  if (result.kind === "evaluatorFailure") {
    return {
      id,
      packageRoot,
      configuredRoot,
      title: `Degraded OFF package ${id.slice(-8)}`,
      declaredProfiles: [],
      outcome: "evaluatorFailure",
      evaluatorFailure: { code: result.code, operation: result.operation }
    };
  }
  const identity = result.normalized.packageIdentity;
  const title = typeof identity?.title === "string" ? identity.title : `Degraded OFF package ${id.slice(-8)}`;
  return {
    id,
    packageRoot,
    configuredRoot,
    title,
    ...typeof identity?.releaseId === "string" ? { releaseId: identity.releaseId } : {},
    ...typeof identity?.releaseVersion === "string" ? { releaseVersion: identity.releaseVersion } : {},
    ...typeof identity?.id === "string" ? { packageIdentityId: identity.id } : {},
    declaredProfiles: strings(identity?.declaredProfiles).sort(),
    outcome: result.normalized.outcome
  };
}
async function discoverUnder(root) {
  const rootStat = await lstat(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw new Error("A configured package root must be a real directory, not a symlink");
  }
  const boundedRoot = await realpath(root);
  const found = [];
  const pending = [{ path: boundedRoot, depth: 0 }];
  let seenEntries = 0;
  while (pending.length > 0) {
    const current = pending.shift();
    if (current === void 0) break;
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
var PackageCatalog = class _PackageCatalog {
  #records;
  constructor(records3) {
    this.#records = new Map(records3.map((record) => [record.id, record]));
  }
  static async create(api, roots) {
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
    const candidates = /* @__PURE__ */ new Map();
    for (const configuredRoot of configuredRoots) {
      for (const packageRoot of await discoverUnder(configuredRoot)) {
        if (candidates.has(packageRoot)) throw new Error("A package was discovered through multiple roots");
        candidates.set(packageRoot, configuredRoot);
      }
    }
    const supported = /* @__PURE__ */ new Set([
      api.PUBLIC_EQUITY_PROFILE_URI,
      api.WORKBOOK_BINDING_PROFILE_URI
    ]);
    const records3 = [];
    for (const [packageRoot, configuredRoot] of [...candidates].sort(([left], [right]) => left.localeCompare(right))) {
      const rootIndex = configuredRoots.indexOf(configuredRoot);
      const packagePath = relative(configuredRoot, packageRoot).split(sep).join("/");
      const id = opaqueId("pkg", `${rootIndex}\0${packagePath}`);
      const core = await api.evaluatePackage({
        packageRoot,
        evaluatedAt: DISCOVERY_TIME,
        requestedProfiles: []
      });
      let evaluated = core;
      if (core.kind === "packageResult") {
        const declared = strings(core.normalized.packageIdentity?.declaredProfiles);
        const requestedProfiles = declared.filter((uri) => supported.has(uri)).sort();
        if (requestedProfiles.length > 0) {
          evaluated = await api.evaluatePackage({ packageRoot, evaluatedAt: DISCOVERY_TIME, requestedProfiles });
        }
      }
      records3.push(summarize(id, packageRoot, configuredRoot, evaluated));
    }
    return new _PackageCatalog(records3.sort((left, right) => left.id.localeCompare(right.id)));
  }
  list() {
    return [...this.#records.values()];
  }
  get(id) {
    return this.#records.get(id);
  }
};
function resourceOpaqueId(packageId, resourceId) {
  return opaqueId("res", `${packageId}\0${resourceId}`);
}

// src/off-api.ts
import { readFile } from "node:fs/promises";
import { dirname, join as join2, resolve as resolve2 } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
async function isRepositoryRoot(candidate) {
  try {
    const document = JSON.parse(await readFile(join2(candidate, "package.json"), "utf8"));
    await readFile(join2(candidate, "dist", "off.mjs"));
    return document.name === "@open-finance-format/reference";
  } catch {
    return false;
  }
}
async function locateRepositoryRoot(explicit) {
  const starts = [
    explicit,
    process.env.OFF_REPOSITORY_ROOT,
    process.cwd(),
    dirname(fileURLToPath(import.meta.url))
  ].filter((value) => typeof value === "string" && value.length > 0);
  for (const start of starts) {
    let candidate = resolve2(start);
    for (let depth = 0; depth < 8; depth += 1) {
      if (await isRepositoryRoot(candidate)) return candidate;
      const parent = dirname(candidate);
      if (parent === candidate) break;
      candidate = parent;
    }
  }
  throw new Error("OFF repository root with built evaluator was not found");
}
async function loadOffApi(repositoryRoot) {
  const moduleUrl = pathToFileURL(join2(repositoryRoot, "dist", "off.mjs")).href;
  const loaded = await import(moduleUrl);
  if (typeof loaded.evaluatePackage !== "function" || typeof loaded.PUBLIC_EQUITY_PROFILE_URI !== "string" || typeof loaded.WORKBOOK_BINDING_PROFILE_URI !== "string") {
    throw new Error("Built OFF evaluator API is incompatible");
  }
  return loaded;
}

// src/server.ts
import { readFile as readFile2 } from "node:fs/promises";
import { createServer } from "node:http";
import { join as join3 } from "node:path";

// src/evaluate.ts
var WHOLE_SECOND_UTC = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})Z$/u;
function nowWholeSecond() {
  return new Date(Math.floor(Date.now() / 1e3) * 1e3).toISOString().replace(".000Z", "Z");
}
function parseEvaluatedAt(value, fallback = nowWholeSecond()) {
  if (value === null || value === "") return fallback;
  const match = WHOLE_SECOND_UTC.exec(value);
  const year = Number(match?.[1]);
  const month = Number(match?.[2]);
  const day = Number(match?.[3]);
  const hour = Number(match?.[4]);
  const minute = Number(match?.[5]);
  const second = Number(match?.[6]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (match === null || month < 1 || month > 12 || day < 1 || day > (daysInMonth[month - 1] ?? 0) || hour > 23 || minute > 59 || second > 59) {
    throw new RequestError(400, "invalid_evaluated_at", "evaluated_at must be a real whole-second UTC timestamp");
  }
  return value;
}
var RequestError = class extends Error {
  status;
  code;
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
};
function requestedFromUrl(url) {
  const repeated = url.searchParams.getAll("profile");
  const packed = url.searchParams.get("profiles")?.split(",").filter(Boolean) ?? [];
  if (repeated.length === 0 && packed.length === 0) return void 0;
  const values = [...repeated, ...packed];
  if (values.length > 16 || new Set(values).size !== values.length) {
    throw new RequestError(400, "invalid_profiles", "Profiles must be unique and limited to 16 values");
  }
  if (values.some((value) => {
    try {
      return new URL(value).protocol.length === 0;
    } catch {
      return true;
    }
  })) {
    throw new RequestError(400, "invalid_profiles", "Every requested profile must be an absolute URI");
  }
  return values.sort();
}
async function evaluateRecord(api, record, url, defaultEvaluatedAt) {
  const evaluatedAt = parseEvaluatedAt(url.searchParams.get("evaluated_at"), defaultEvaluatedAt);
  const explicit = requestedFromUrl(url);
  const supported = /* @__PURE__ */ new Set([api.PUBLIC_EQUITY_PROFILE_URI, api.WORKBOOK_BINDING_PROFILE_URI]);
  const requestedProfiles = explicit ?? record.declaredProfiles.filter((uri) => supported.has(uri)).sort();
  const result = await api.evaluatePackage({
    packageRoot: record.packageRoot,
    evaluatedAt,
    requestedProfiles
  });
  return { record, evaluatedAt, requestedProfiles, result };
}

// src/files.ts
import { createHash as createHash2 } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { lstat as lstat2, open, realpath as realpath2 } from "node:fs/promises";
import { basename as basename2, isAbsolute as isAbsolute2, relative as relative2, resolve as resolve3, sep as sep2 } from "node:path";
var MAX_VIEWER_BYTES = 8 * 1024 * 1024;
var MAX_VIEWER_TOTAL_BYTES = 8 * 1024 * 1024;
var MAX_DOWNLOAD_BYTES = 64 * 1024 * 1024;
var SAFE_INLINE_TYPES = /* @__PURE__ */ new Set([
  "text/plain",
  "text/csv",
  "text/markdown",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp"
]);
function records(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "object" && item !== null && !Array.isArray(item)) : [];
}
function contained(root, candidate) {
  const value = relative2(root, candidate);
  return value !== "" && value !== ".." && !value.startsWith(`..${sep2}`) && !isAbsolute2(value);
}
function validRelativePath(value) {
  return !isAbsolute2(value) && !value.includes("\\") && !value.includes("%") && value.split("/").every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}
function sameIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino && left.size === right.size && left.mtimeMs === right.mtimeMs && left.ctimeMs === right.ctimeMs;
}
function dataType(mediaType) {
  const known = {
    "text/plain": "txt",
    "text/csv": "csv",
    "text/markdown": "md",
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp"
  };
  return known[mediaType] ?? "bin";
}
async function verifiedFile(state, fileId, maxBytes = MAX_DOWNLOAD_BYTES) {
  if (state.result.kind !== "packageResult") {
    throw new RequestError(409, "evaluation_degraded", "No evaluator-verified local resources are available");
  }
  const resources2 = records(state.result.normalized.resourceInventory);
  const resource = resources2.find(
    (item) => typeof item.id === "string" && resourceOpaqueId(state.record.id, item.id) === fileId
  );
  if (resource === void 0) throw new RequestError(404, "file_not_found", "The opaque file ID is unavailable for this package");
  const location = records(resource.locations).find(
    (item) => item.kind === "local" && item.availability === "available" && item.integrity === "verified"
  );
  if (location === void 0 || typeof location.path !== "string" || !validRelativePath(location.path)) {
    throw new RequestError(409, "file_not_verified", "The resource has no evaluator-verified local file");
  }
  if (typeof resource.byteSize !== "number" || resource.byteSize < 0 || resource.byteSize > maxBytes) {
    throw new RequestError(413, "file_too_large", "The verified resource exceeds this endpoint's byte limit");
  }
  if (typeof resource.sha256 !== "string" || !/^[a-f0-9]{64}$/u.test(resource.sha256)) {
    throw new RequestError(409, "file_not_verified", "The resource lacks a verified digest");
  }
  const rootBefore = await lstat2(state.record.packageRoot);
  if (!rootBefore.isDirectory() || rootBefore.isSymbolicLink()) {
    throw new RequestError(409, "package_identity_changed", "The package directory identity changed after discovery");
  }
  const realRoot = await realpath2(state.record.packageRoot);
  if (realRoot !== state.record.packageRoot) {
    throw new RequestError(409, "package_identity_changed", "The package directory identity changed after discovery");
  }
  const candidate = resolve3(realRoot, location.path);
  if (!contained(realRoot, candidate)) throw new RequestError(403, "file_boundary_violation", "The resource escaped the selected package");
  let cursor = realRoot;
  for (const segment of location.path.split("/")) {
    cursor = resolve3(cursor, segment);
    const stat = await lstat2(cursor);
    if (stat.isSymbolicLink()) throw new RequestError(403, "file_boundary_violation", "Symlinked resources are not served");
  }
  if (!contained(realRoot, await realpath2(candidate))) throw new RequestError(403, "file_boundary_violation", "The resource escaped the selected package");
  const handle = await open(candidate, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
  try {
    const before = await handle.stat();
    if (!before.isFile() || before.size !== resource.byteSize) {
      throw new RequestError(409, "file_identity_changed", "The resource identity changed after evaluation");
    }
    const bytes = new Uint8Array(before.size);
    let offset = 0;
    while (offset < bytes.length) {
      const { bytesRead } = await handle.read(bytes, offset, Math.min(64 * 1024, bytes.length - offset), offset);
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    const after = await handle.stat();
    const pathAfter = await lstat2(candidate);
    const rootAfter = await lstat2(realRoot);
    if (offset !== bytes.length || !sameIdentity(before, after) || !sameIdentity(before, pathAfter) || !sameIdentity(rootBefore, rootAfter)) {
      throw new RequestError(409, "file_identity_changed", "The resource identity changed while it was read");
    }
    const digest = createHash2("sha256").update(bytes).digest("hex");
    if (digest !== resource.sha256) throw new RequestError(409, "file_digest_changed", "The resource digest changed after evaluation");
    const mediaType = typeof resource.mediaType === "string" ? resource.mediaType : "application/octet-stream";
    return {
      bytes,
      filename: basename2(location.path).replaceAll(/[\r\n"\\]/gu, "_"),
      mediaType,
      inline: SAFE_INLINE_TYPES.has(mediaType)
    };
  } finally {
    await handle.close();
  }
}
async function viewerFiles(state, fileIds) {
  const output = [];
  let totalBytes = 0;
  for (const fileId of fileIds) {
    try {
      const remainingBytes = Math.min(MAX_VIEWER_BYTES, MAX_VIEWER_TOTAL_BYTES - totalBytes);
      const file = await verifiedFile(state, fileId, remainingBytes);
      totalBytes += file.bytes.byteLength;
      if (!file.inline) {
        output.push({ error_type: "unsafe_inline_format", content: "This verified file is download-only and is not rendered inline." });
      } else {
        output.push({
          content: Buffer.from(file.bytes).toString("base64"),
          data_format: { data_type: dataType(file.mediaType), filename: file.filename }
        });
      }
    } catch (error) {
      output.push({
        error_type: error instanceof RequestError ? error.code : "file_unavailable",
        content: error instanceof RequestError ? error.message : "The verified file could not be read safely."
      });
    }
  }
  return output;
}
function sanitizeMarkdown(value) {
  return value.replaceAll(/<[^>]*>/gu, "").replaceAll(/\]\(\s*(?:javascript|data|vbscript):/giu, "](blocked:").replaceAll(/\0/gu, "").slice(0, 2 * 1024 * 1024);
}

// src/projections.ts
var CLAIM_LIMITATIONS = [
  "Traceable \u2014 author-declared lineage is structural conformance, not independent lineage review or financial correctness.",
  "Bound \u2014 author-declared workbook locators does not prove locator existence, cell values, formulas, recalculation, or live-sheet equivalence.",
  "Remote resources remain notEvaluated unless the normative evaluator says otherwise.",
  "A warning-bearing package may still be structurally valid.",
  "OpenBB is a non-normative OFF consumer and does not prove interoperability, adoption, deployment readiness, or financial correctness.",
  "This local inspection service provides no investment advice, trading, execution, or live market data."
];
function object(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}
function records2(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "object" && item !== null && !Array.isArray(item)) : [];
}
function publicEntities(normalized2, api) {
  return object(normalized2.profileEntities?.[api.PUBLIC_EQUITY_PROFILE_URI]);
}
function workbookEntities(normalized2, api) {
  return object(normalized2.profileEntities?.[api.WORKBOOK_BINDING_PROFILE_URI]);
}
function unitIndex(entities) {
  return new Map(records2(entities.units).map((unit) => [String(unit.id), unit]));
}
function entityIndex(entities, name) {
  return new Map(records2(entities[name]).map((item) => [String(item.id), item]));
}
function valueFields(item) {
  const value = object(item.value);
  return {
    value: typeof value.value === "string" ? value.value : null,
    value_type: typeof value.type === "string" ? value.type : null
  };
}
function unitFields(item, units) {
  const unitId = typeof item.unitId === "string" ? item.unitId : null;
  const unit = unitId === null ? void 0 : units.get(unitId);
  return {
    unit_id: unitId,
    unit_label: typeof unit?.label === "string" ? unit.label : null,
    unit_symbol: typeof unit?.symbol === "string" ? unit.symbol : null,
    unit_kind: typeof unit?.kind === "string" ? unit.kind : null,
    unit_currency: typeof unit?.currency === "string" ? unit.currency : null
  };
}
function requireNormalized(state) {
  return state.result.kind === "packageResult" ? state.result.normalized : void 0;
}
function timed(state, row) {
  return { ...row, evaluated_at: state.evaluatedAt };
}
function overview(state) {
  if (state.result.kind === "evaluatorFailure") {
    return {
      package_id: state.record.id,
      evaluated_at: state.evaluatedAt,
      state: "degraded",
      outcome: "evaluatorFailure",
      evaluator_failure: {
        code: state.result.code,
        operation: state.result.operation
      },
      requested_profiles: state.requestedProfiles,
      limitations: CLAIM_LIMITATIONS
    };
  }
  const normalized2 = state.result.normalized;
  const identity = object(normalized2.packageIdentity);
  return {
    package_id: state.record.id,
    evaluated_at: state.evaluatedAt,
    state: normalized2.outcome === "invalid" ? "degraded" : "evaluated",
    outcome: normalized2.outcome,
    package_identity: identity,
    release_id: identity.releaseId ?? null,
    release_version: identity.releaseVersion ?? null,
    requested_profiles: state.requestedProfiles,
    declared_profiles: Array.isArray(identity.declaredProfiles) ? identity.declaredProfiles : [],
    profile_results: normalized2.profileResults,
    diagnostic_counts: {
      errors: normalized2.diagnostics.filter((item) => item.severity === "error").length,
      warnings: normalized2.diagnostics.filter((item) => item.severity === "warning").length
    },
    limitations: CLAIM_LIMITATIONS
  };
}
function markdownValue(value) {
  return String(value ?? "unknown").replaceAll(/[\\`*_{}\[\]<>#|]/gu, "\\$&");
}
function contextMarkdown(state) {
  const view = overview(state);
  const identity = object(view.package_identity);
  const declared = Array.isArray(view.declared_profiles) ? view.declared_profiles : [];
  return [
    `# ${markdownValue(identity.title ?? state.record.title)}`,
    "",
    `**Package:** \`${markdownValue(state.record.id)}\`  `,
    `**Release:** ${markdownValue(view.release_version)}  `,
    `**Outcome:** ${markdownValue(view.outcome)}  `,
    `**Evaluated at:** \`${markdownValue(state.evaluatedAt)}\`  `,
    `**Declared profiles:** ${declared.length === 0 ? "None" : declared.map((item) => `\`${markdownValue(item)}\``).join(", ")}`,
    "",
    "OFF is the normative package authority. This OpenBB projection is a read-only, non-normative inspection surface."
  ].join("\n");
}
function claimsMarkdown(state) {
  return [
    "# Claims boundary",
    "",
    `Evaluation context: \`${markdownValue(state.evaluatedAt)}\``,
    "",
    ...CLAIM_LIMITATIONS.map((item) => `- ${item}`),
    "",
    "Workbook Binding is a post-v0.1-rc.1 sidecar profile. It is not part of the frozen v0.1-rc.1 release closure."
  ].join("\n");
}
function profileResults(state) {
  if (state.result.kind !== "packageResult") return [];
  const results = state.result.normalized.profileResults;
  return [
    timed(state, {
      profile: "OFF Core",
      declared: true,
      requested: true,
      status: results.core.status,
      claim: "Structural Core evaluation"
    }),
    ...records2(results.declared).map((result) => timed(state, {
      profile: result.uri ?? null,
      declared: true,
      requested: result.requested ?? false,
      status: result.status ?? "notEvaluated",
      claim: result.claim ?? null
    }))
  ];
}
function normalizedMarkdown(state) {
  return [
    "# Canonical normalized result",
    "",
    `Evaluated at: \`${markdownValue(state.evaluatedAt)}\``,
    "",
    "The JSON below is the evaluator-produced normalized result. Canonical strings and identifiers are preserved; use `/off/normalized` for the JSON export response.",
    "",
    "```json",
    JSON.stringify(normalized(state), null, 2).replaceAll("```", "`\\`\\`"),
    "```"
  ].join("\n");
}
function headlineOutputs(state, api) {
  const normalized2 = requireNormalized(state);
  if (normalized2 === void 0) return [];
  const entities = publicEntities(normalized2, api);
  const units = unitIndex(entities);
  const scenarios = entityIndex(entities, "scenarios");
  const attestations = entityIndex(entities, "attestations");
  const freshness2 = new Map(records2(normalized2.freshness?.headlines).map((row) => [String(row.entityId), row]));
  return records2(entities.outputs).filter((output) => output.headline === true).map((output) => {
    const scenario = typeof output.scenarioId === "string" ? scenarios.get(output.scenarioId) : void 0;
    const attestation = typeof output.attestationId === "string" ? attestations.get(output.attestationId) : void 0;
    const fresh = freshness2.get(String(output.id));
    return timed(state, {
      id: output.id,
      label: output.label ?? null,
      ...valueFields(output),
      ...unitFields(output, units),
      scenario_id: output.scenarioId ?? null,
      scenario: scenario?.label ?? null,
      as_of_date: output.asOfDate ?? null,
      methodology: output.methodology ?? null,
      attestation_id: output.attestationId ?? null,
      attestation: attestation ?? null,
      freshness_status: fresh?.status ?? "unknown",
      stale_dependency_ids: Array.isArray(fresh?.staleDependencyIds) ? fresh.staleDependencyIds : []
    });
  });
}
function assumptions(state, api) {
  const normalized2 = requireNormalized(state);
  if (normalized2 === void 0) return [];
  const entities = publicEntities(normalized2, api);
  const units = unitIndex(entities);
  const freshness2 = new Map(records2(normalized2.freshness?.leaves).map((row) => [String(row.entityId), row]));
  return records2(entities.assumptions).map((item) => timed(state, {
    id: item.id,
    label: item.label ?? null,
    ...valueFields(item),
    ...unitFields(item, units),
    scenario_ids: Array.isArray(item.scenarioIds) ? item.scenarioIds : [],
    designation: item.designation ?? null,
    effective_date: item.effectiveDate ?? null,
    review_by: item.reviewBy ?? null,
    freshness_status: freshness2.get(String(item.id))?.status ?? "unknown"
  }));
}
function sourceFacts(state, api) {
  const normalized2 = requireNormalized(state);
  if (normalized2 === void 0) return [];
  const entities = publicEntities(normalized2, api);
  const units = unitIndex(entities);
  const sources2 = entityIndex(entities, "sources");
  const freshness2 = new Map(records2(normalized2.freshness?.leaves).map((row) => [String(row.entityId), row]));
  return records2(entities.sourceFacts).map((item) => timed(state, {
    id: item.id,
    label: item.label ?? null,
    ...valueFields(item),
    ...unitFields(item, units),
    effective_date: item.effectiveDate ?? null,
    stale_at: item.staleAt ?? null,
    source_id: item.sourceId ?? null,
    source: typeof item.sourceId === "string" ? sources2.get(item.sourceId) ?? null : null,
    freshness_status: freshness2.get(String(item.id))?.status ?? "unknown"
  }));
}
function sources(state, api) {
  const normalized2 = requireNormalized(state);
  if (normalized2 === void 0) return [];
  const entities = publicEntities(normalized2, api);
  const resources2 = new Map(records2(normalized2.resourceInventory).map((item) => [String(item.id), item]));
  return records2(entities.sources).map((item) => timed(state, {
    id: item.id,
    title: item.title ?? null,
    publisher: item.publisher ?? null,
    url: item.url ?? null,
    evidence_resource_id: item.evidenceResourceId ?? null,
    evidence_resource: typeof item.evidenceResourceId === "string" ? resources2.get(item.evidenceResourceId) ?? null : null
  }));
}
function freshness(state) {
  const normalized2 = requireNormalized(state);
  if (normalized2 === void 0) return [];
  return [
    ...records2(normalized2.freshness?.leaves).map((row) => timed(state, { kind: "leaf", ...row })),
    ...records2(normalized2.freshness?.headlines).map((row) => timed(state, { kind: "headline", ...row }))
  ];
}
function lineage(state) {
  const normalized2 = requireNormalized(state);
  return normalized2 === void 0 ? [] : records2(normalized2.resolvedLineage).map((row) => timed(state, row));
}
function diagnostics(state) {
  if (state.result.kind === "evaluatorFailure") {
    return [timed(state, {
      code: state.result.code,
      severity: "error",
      rule: null,
      instance_location: null,
      entity_id: null,
      parameters: { operation: state.result.operation }
    })];
  }
  return state.result.normalized.diagnostics.map((item) => timed(state, {
    code: item.code ?? null,
    severity: item.severity ?? null,
    rule: item.ruleId ?? null,
    instance_location: item.instanceLocation ?? null,
    entity_id: item.entityId ?? null,
    parameters: object(item.parameters)
  }));
}
function resources(state) {
  const normalized2 = requireNormalized(state);
  if (normalized2 === void 0) return [];
  return records2(normalized2.resourceInventory).flatMap((resource) => {
    const fileId = typeof resource.id === "string" ? resourceOpaqueId(state.record.id, resource.id) : null;
    const locations = records2(resource.locations);
    return (locations.length === 0 ? [{}] : locations).map((location) => timed(state, {
      id: resource.id ?? null,
      file_id: fileId,
      media_type: resource.mediaType ?? null,
      roles: Array.isArray(resource.roles) ? resource.roles : [],
      byte_size: resource.byteSize ?? null,
      sha256: resource.sha256 ?? null,
      location_kind: location.kind ?? null,
      availability: location.availability ?? "unknown",
      integrity: location.integrity ?? "unknown",
      remote_url: location.kind === "remote" ? location.url ?? null : null,
      local_file_exposed: location.kind === "local" && location.availability === "available" && location.integrity === "verified"
    }));
  });
}
function workbookBindings(state, api) {
  const normalized2 = requireNormalized(state);
  if (normalized2 === void 0) return [];
  const entities = workbookEntities(normalized2, api);
  const workbooks = entityIndex(entities, "workbooks");
  const subjects = entityIndex(entities, "subjects");
  const unevaluated = object(entities.unevaluated);
  return records2(entities.bindings).map((binding) => timed(state, {
    id: binding.id,
    subject_id: binding.subjectId ?? null,
    subject: typeof binding.subjectId === "string" ? subjects.get(binding.subjectId) ?? null : null,
    workbook_id: binding.workbookId ?? null,
    workbook: typeof binding.workbookId === "string" ? workbooks.get(binding.workbookId) ?? null : null,
    locator: object(binding.locator),
    role: binding.role ?? null,
    status: binding.status ?? "notEvaluated",
    unevaluated
  }));
}
function normalized(state) {
  return state.result.kind === "packageResult" ? state.result.normalized : {
    evaluationContext: { evaluatedAt: state.evaluatedAt, requestedProfiles: state.requestedProfiles },
    outcome: "evaluatorFailure",
    failure: { code: state.result.code, operation: state.result.operation }
  };
}

// src/server.ts
var MAX_JSON_BODY = 32 * 1024;
var MAX_PAGE_SIZE = 200;
var DEFAULT_ALLOWED_ORIGINS = ["https://pro.openbb.co"];
function baseHeaders() {
  return {
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; sandbox",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff"
  };
}
function applyCors(request, response, allowedOrigins) {
  const origin = request.headers.origin;
  response.setHeader("Vary", "Origin");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, X-OpenBB-User");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (origin === void 0) {
    if (request.headers["sec-fetch-site"] === "cross-site") {
      if (request.method === "GET" && request.url === "/assets/off-workspace.svg") return;
      throw new RequestError(403, "origin_not_allowed", "Cross-site browser requests are not allowed by this local service");
    }
    return;
  }
  if (!allowedOrigins.has(origin)) {
    throw new RequestError(403, "origin_not_allowed", "The request origin is not allowed by this local service");
  }
  response.setHeader("Access-Control-Allow-Origin", origin);
}
function sendJson(response, status, body, headers = {}) {
  response.writeHead(status, { ...baseHeaders(), "Content-Type": "application/json; charset=utf-8", ...headers });
  response.end(JSON.stringify(body));
}
function sendError(response, error) {
  if (error instanceof RequestError) {
    sendJson(response, error.status, { error: { code: error.code, message: error.message } });
    return;
  }
  sendJson(response, 500, { error: { code: "internal_error", message: "The local OFF service could not complete the request." } });
}
function packageRecord(catalog, url) {
  const packageId = url.searchParams.get("package_id");
  if (packageId === null || packageId.length === 0) {
    throw new RequestError(400, "package_id_required", "package_id is required");
  }
  const record = catalog.get(packageId);
  if (record === void 0) throw new RequestError(404, "package_not_found", "The opaque package ID was not found");
  return record;
}
function page(url, rows) {
  const offsetRaw = url.searchParams.get("offset") ?? "0";
  const limitRaw = url.searchParams.get("limit") ?? String(MAX_PAGE_SIZE);
  if (!/^\d+$/u.test(offsetRaw) || !/^\d+$/u.test(limitRaw)) {
    throw new RequestError(400, "invalid_pagination", "offset and limit must be non-negative integers");
  }
  const offset = Number(offsetRaw);
  const limit = Number(limitRaw);
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
    throw new RequestError(400, "invalid_pagination", `limit must be between 1 and ${MAX_PAGE_SIZE}`);
  }
  return {
    rows: rows.slice(offset, offset + limit),
    headers: {
      "X-OFF-Total": String(rows.length),
      "X-OFF-Offset": String(offset),
      "X-OFF-Limit": String(limit),
      "X-OFF-Truncated": String(offset + limit < rows.length)
    }
  };
}
async function jsonBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.byteLength;
    if (size > MAX_JSON_BODY) throw new RequestError(413, "request_too_large", "The JSON request exceeds 32 KiB");
    chunks.push(bytes);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new RequestError(400, "invalid_json", "A valid JSON request body is required");
  }
}
async function staticConfiguration(response, projectRoot, name) {
  try {
    const bytes = await readFile2(join3(projectRoot, name));
    if (bytes.byteLength > 2 * 1024 * 1024) throw new Error("configuration too large");
    JSON.parse(bytes.toString("utf8"));
    response.writeHead(200, { ...baseHeaders(), "Content-Type": "application/json; charset=utf-8" });
    response.end(bytes);
  } catch {
    sendJson(response, 503, {
      error: { code: "configuration_unavailable", message: `${name} is not available or valid in this local project.` }
    });
  }
}
async function staticAsset(response, projectRoot) {
  try {
    const bytes = await readFile2(join3(projectRoot, "assets", "off-workspace.svg"));
    if (bytes.byteLength > 128 * 1024) throw new Error("asset too large");
    response.writeHead(200, {
      ...baseHeaders(),
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Content-Length": String(bytes.byteLength)
    });
    response.end(bytes);
  } catch {
    sendJson(response, 404, { error: { code: "asset_not_found", message: "The local app image is unavailable." } });
  }
}
function createApp(options) {
  const allowedOrigins = new Set(options.allowedOrigins ?? DEFAULT_ALLOWED_ORIGINS);
  const defaultEvaluatedAt = nowWholeSecond();
  return async (request, response) => {
    try {
      applyCors(request, response, allowedOrigins);
      if (request.method === "OPTIONS") {
        response.writeHead(204, baseHeaders());
        response.end();
        return;
      }
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      let parsedBody;
      if (request.method === "POST" && url.pathname === "/off/files") {
        parsedBody = await jsonBody(request);
        const document = typeof parsedBody === "object" && parsedBody !== null ? parsedBody : {};
        if (typeof document.package_id === "string" && !url.searchParams.has("package_id")) {
          url.searchParams.set("package_id", document.package_id);
        }
        if (typeof document.evaluated_at === "string" && !url.searchParams.has("evaluated_at")) {
          url.searchParams.set("evaluated_at", document.evaluated_at);
        }
      }
      if (request.method === "GET" && url.pathname === "/health") {
        sendJson(response, 200, {
          status: "ok",
          service: "OFF Research Workspace local adapter",
          version: "0.1.0",
          package_count: options.catalog.list().length,
          read_only: true,
          default_evaluated_at: defaultEvaluatedAt
        });
        return;
      }
      if (request.method === "GET" && (url.pathname === "/widgets.json" || url.pathname === "/apps.json")) {
        await staticConfiguration(response, options.projectRoot, url.pathname.slice(1));
        return;
      }
      if (request.method === "GET" && url.pathname === "/assets/off-workspace.svg") {
        await staticAsset(response, options.projectRoot);
        return;
      }
      if (request.method === "GET" && url.pathname === "/off/packages/options") {
        sendJson(response, 200, options.catalog.list().map((record2) => ({
          label: record2.title,
          value: record2.id,
          extraInfo: { description: `${record2.releaseVersion ?? "release unknown"} \xB7 ${record2.outcome}` }
        })));
        return;
      }
      const record = packageRecord(options.catalog, url);
      const state = await evaluateRecord(options.api, record, url, defaultEvaluatedAt);
      const evaluationHeaders = { "X-OFF-Evaluated-At": state.evaluatedAt };
      if (request.method === "GET" && url.pathname === "/off/overview") {
        sendJson(response, 200, overview(state), evaluationHeaders);
        return;
      }
      if (request.method === "GET" && url.pathname === "/off/context") {
        response.writeHead(200, { ...baseHeaders(), ...evaluationHeaders, "Content-Type": "text/markdown; charset=utf-8" });
        response.end(contextMarkdown(state));
        return;
      }
      if (request.method === "GET" && url.pathname === "/off/claims") {
        response.writeHead(200, { ...baseHeaders(), ...evaluationHeaders, "Content-Type": "text/markdown; charset=utf-8" });
        response.end(claimsMarkdown(state));
        return;
      }
      const tableRoutes = {
        "/off/headline-outputs": () => headlineOutputs(state, options.api),
        "/off/assumptions": () => assumptions(state, options.api),
        "/off/source-facts": () => sourceFacts(state, options.api),
        "/off/sources": () => sources(state, options.api),
        "/off/freshness": () => freshness(state),
        "/off/lineage": () => lineage(state),
        "/off/diagnostics": () => diagnostics(state),
        "/off/resources": () => resources(state),
        "/off/workbook-bindings": () => workbookBindings(state, options.api),
        "/off/profile-results": () => profileResults(state)
      };
      const table = request.method === "GET" ? tableRoutes[url.pathname] : void 0;
      if (table !== void 0) {
        const paged = page(url, table());
        sendJson(response, 200, paged.rows, { ...evaluationHeaders, ...paged.headers });
        return;
      }
      if (request.method === "GET" && url.pathname === "/off/normalized") {
        if (state.result.kind === "packageResult") {
          const bytes = Buffer.from(state.result.canonicalBytes);
          response.writeHead(200, {
            ...baseHeaders(),
            ...evaluationHeaders,
            "Content-Type": "application/json; charset=utf-8",
            "Content-Length": String(bytes.byteLength)
          });
          response.end(bytes);
        } else {
          sendJson(response, 200, normalized(state), evaluationHeaders);
        }
        return;
      }
      if (request.method === "GET" && url.pathname === "/off/normalized-view") {
        response.writeHead(200, { ...baseHeaders(), ...evaluationHeaders, "Content-Type": "text/markdown; charset=utf-8" });
        response.end(normalizedMarkdown(state));
        return;
      }
      if (request.method === "GET" && url.pathname === "/off/narrative") {
        if (state.result.kind !== "packageResult") {
          response.writeHead(200, { ...baseHeaders(), ...evaluationHeaders, "Content-Type": "text/markdown; charset=utf-8" });
          response.end("# Narrative unavailable\n\nThe evaluator could not verify a local entrypoint narrative.");
          return;
        }
        const identity = state.result.normalized.packageIdentity;
        const resourceId = typeof identity?.entrypointResourceId === "string" ? identity.entrypointResourceId : void 0;
        if (resourceId === void 0) {
          response.writeHead(200, { ...baseHeaders(), ...evaluationHeaders, "Content-Type": "text/markdown; charset=utf-8" });
          response.end("# Narrative unavailable\n\nThis degraded package has no evaluator-verified entrypoint.");
          return;
        }
        try {
          const file = await verifiedFile(state, resourceOpaqueId(record.id, resourceId), 2 * 1024 * 1024);
          if (file.mediaType !== "text/markdown" && file.mediaType !== "text/plain") {
            throw new RequestError(409, "narrative_format_unsupported", "The verified entrypoint is not safe Markdown or plain text");
          }
          response.writeHead(200, { ...baseHeaders(), ...evaluationHeaders, "Content-Type": "text/markdown; charset=utf-8" });
          response.end(sanitizeMarkdown(Buffer.from(file.bytes).toString("utf8")));
        } catch (error) {
          if (!(error instanceof RequestError)) throw error;
          response.writeHead(200, { ...baseHeaders(), ...evaluationHeaders, "Content-Type": "text/markdown; charset=utf-8" });
          response.end(`# Narrative unavailable

${error.message}`);
        }
        return;
      }
      if (request.method === "POST" && url.pathname === "/off/files") {
        const body = parsedBody;
        const document = typeof body === "object" && body !== null ? body : {};
        const selection = document.file_id ?? document.resource_id;
        const fileIds = typeof selection === "string" ? [selection] : Array.isArray(selection) ? selection : [];
        if (fileIds.length > 20 || new Set(fileIds).size !== fileIds.length || !fileIds.every((id) => typeof id === "string" && /^res_[A-Za-z0-9_-]{24}$/u.test(id))) {
          throw new RequestError(400, "invalid_file_selection", "file_id must select no more than 20 unique opaque file IDs");
        }
        sendJson(response, 200, await viewerFiles(state, fileIds), evaluationHeaders);
        return;
      }
      if (request.method === "GET" && url.pathname === "/off/files/options") {
        const rows = resources(state).filter((row) => row.local_file_exposed === true && typeof row.file_id === "string");
        sendJson(response, 200, rows.map((row) => ({
          label: `${String(row.id)} \xB7 ${String(row.media_type ?? "file")}`,
          value: row.file_id,
          extraInfo: { description: "Evaluator-verified local resource" }
        })), evaluationHeaders);
        return;
      }
      if (request.method === "GET" && url.pathname.startsWith("/off/files/")) {
        const fileId = url.pathname.slice("/off/files/".length);
        if (!/^res_[A-Za-z0-9_-]{24}$/u.test(fileId)) throw new RequestError(404, "file_not_found", "The opaque file ID was not found");
        const file = await verifiedFile(state, fileId);
        const disposition = file.inline ? "inline" : "attachment";
        response.writeHead(200, {
          ...baseHeaders(),
          ...evaluationHeaders,
          "Content-Type": file.mediaType,
          "Content-Length": String(file.bytes.byteLength),
          "Content-Disposition": `${disposition}; filename="${file.filename}"`
        });
        response.end(file.bytes);
        return;
      }
      throw new RequestError(404, "route_not_found", "The requested local OFF endpoint does not exist");
    } catch (error) {
      sendError(response, error);
    }
  };
}
function createHttpServer(options) {
  const app = createApp(options);
  return createServer((request, response) => void app(request, response));
}

// src/index.ts
async function startServer(options = {}) {
  const repositoryRoot = await locateRepositoryRoot(options.repositoryRoot);
  const projectRoot = resolve4(options.projectRoot ?? join4(repositoryRoot, "integrations", "openbb-workspace"));
  const additionalRoots = (process.env.OFF_PACKAGE_ROOTS ?? "").split(delimiter).filter((value) => value.length > 0);
  const roots = options.roots ?? [join4(repositoryRoot, "examples"), ...additionalRoots];
  const api = await loadOffApi(repositoryRoot);
  const catalog = await PackageCatalog.create(api, roots);
  const host = options.host ?? process.env.OFF_HOST ?? "127.0.0.1";
  if (host !== "127.0.0.1" && host !== "::1") {
    throw new Error("OFF Research Workspace v1 only permits loopback binding");
  }
  const port = options.port ?? Number(process.env.OFF_PORT ?? "7779");
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("OFF_PORT must be an integer from 0 through 65535");
  const configuredOrigins = (process.env.OFF_ALLOWED_ORIGINS ?? "").split(",").filter((value) => value.length > 0);
  const allowedOrigins = options.allowedOrigins ?? (configuredOrigins.length > 0 ? configuredOrigins : void 0);
  if (allowedOrigins?.some((value) => {
    try {
      const url = new URL(value);
      return url.protocol !== "https:" || url.origin !== value;
    } catch {
      return true;
    }
  })) {
    throw new Error("OFF_ALLOWED_ORIGINS must contain comma-delimited HTTPS origins without paths");
  }
  const server = createHttpServer({ api, catalog, projectRoot, ...allowedOrigins === void 0 ? {} : { allowedOrigins } });
  await new Promise((accept, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      accept();
    });
  });
  return { server, catalog, host, port: server.address().port };
}
async function main() {
  const running = await startServer();
  process.stdout.write(`OFF Research Workspace listening on http://${running.host}:${running.port}
`);
}
if (process.argv[1] !== void 0 && import.meta.url === pathToFileURL2(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : "Unable to start OFF Research Workspace"}
`);
    process.exitCode = 1;
  });
}
export {
  CLAIM_LIMITATIONS,
  PackageCatalog,
  RequestError,
  assumptions,
  claimsMarkdown,
  contextMarkdown,
  createApp,
  createHttpServer,
  diagnostics,
  evaluateRecord,
  freshness,
  headlineOutputs,
  lineage,
  loadOffApi,
  locateRepositoryRoot,
  normalized,
  normalizedMarkdown,
  nowWholeSecond,
  overview,
  parseEvaluatedAt,
  profileResults,
  resourceOpaqueId,
  resources,
  sanitizeMarkdown,
  sourceFacts,
  sources,
  startServer,
  verifiedFile,
  viewerFiles,
  workbookBindings
};
