import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, realpath, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, describe, test } from "node:test";

import { PackageCatalog, resourceOpaqueId } from "../src/catalog.ts";
import { evaluateRecord } from "../src/evaluate.ts";
import { sanitizeMarkdown, verifiedFile } from "../src/files.ts";
import { loadOffApi, locateRepositoryRoot } from "../src/off-api.ts";
import { createHttpServer } from "../src/server.ts";
import type { NormalizedResult, OffApi } from "../src/types.ts";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const fixed = "2026-07-17T23:59:59Z";
let api: OffApi;
let catalog: PackageCatalog;
let origin: string;
let server: ReturnType<typeof createHttpServer>;

function recordNamed(fragment: string) {
  const record = catalog.list().find((candidate) => candidate.title.includes(fragment));
  assert.ok(record, `catalog record matching ${fragment}`);
  return record;
}

async function get(path: string) {
  return fetch(`${origin}${path}`);
}

async function post(path: string, body: unknown) {
  return fetch(`${origin}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function treeDigest(root: string): Promise<string> {
  const entries: string[] = [];
  async function visit(path: string, prefix: string): Promise<void> {
    for (const entry of (await readdir(path, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const relative = prefix.length === 0 ? entry.name : `${prefix}/${entry.name}`;
      if (entry.isDirectory()) await visit(join(path, entry.name), relative);
      else if (entry.isFile()) entries.push(`${relative}\0${createHash("sha256").update(await readFile(join(path, entry.name))).digest("hex")}`);
    }
  }
  await visit(root, "");
  return createHash("sha256").update(entries.join("\n")).digest("hex");
}

before(async () => {
  assert.equal(await locateRepositoryRoot(repositoryRoot), repositoryRoot);
  api = await loadOffApi(repositoryRoot);
  catalog = await PackageCatalog.create(api, [
    join(repositoryRoot, "examples"),
    join(repositoryRoot, "conformance", "packages"),
    join(repositoryRoot, "conformance", "fixtures"),
  ]);
  server = createHttpServer({
    api,
    catalog,
    projectRoot: resolve(import.meta.dirname, ".."),
  });
  await new Promise<void>((accept) => server.listen(0, "127.0.0.1", accept));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  origin = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise<void>((accept, reject) => server.close((error) => error ? reject(error) : accept()));
});

describe("bounded package catalog", () => {
  test("discovers valid, warning, invalid, and stable opaque package records", async () => {
    const second = await PackageCatalog.create(api, [
      join(repositoryRoot, "examples"),
      join(repositoryRoot, "conformance", "packages"),
      join(repositoryRoot, "conformance", "fixtures"),
    ]);
    assert.deepEqual(second.list().map((item) => item.id), catalog.list().map((item) => item.id));
    assert.ok(catalog.list().every((item) => /^pkg_[A-Za-z0-9_-]{24}$/u.test(item.id)));
    assert.ok(catalog.list().every((item) => !JSON.stringify({ ...item, packageRoot: undefined, configuredRoot: undefined }).includes(repositoryRoot)));
    assert.equal(recordNamed("Minimal Core").outcome, "valid");
    assert.equal(recordNamed("Public Equity Traceable").outcome, "validWithWarnings");
    assert.equal(recordNamed("Lineage cycle").outcome, "invalid");
  });

  test("includes evaluator failures as degraded records", async () => {
    const temporary = await mkdtemp(join(tmpdir(), "off-openbb-failure-"));
    await writeFile(join(temporary, "off.json"), "{}");
    const failing: OffApi = {
      ...api,
      evaluatePackage: async () => ({ kind: "evaluatorFailure", code: "OFF-T1002", operation: "rootAccess" }),
    };
    const degraded = await PackageCatalog.create(failing, [temporary]);
    assert.equal(degraded.list()[0]?.outcome, "evaluatorFailure");
    assert.deepEqual(degraded.list()[0]?.evaluatorFailure, { code: "OFF-T1002", operation: "rootAccess" });
  });

  test("rejects duplicate roots and symlink roots while ignoring nested symlink packages", async () => {
    const temporary = await mkdtemp(join(tmpdir(), "off-openbb-root-"));
    const outside = await mkdtemp(join(tmpdir(), "off-openbb-outside-"));
    await writeFile(join(outside, "off.json"), "{}");
    await symlink(outside, join(temporary, "linked"));
    assert.equal((await PackageCatalog.create(api, [temporary])).list().length, 0);
    await assert.rejects(PackageCatalog.create(api, [temporary, temporary]), /Duplicate/);
    await assert.rejects(PackageCatalog.create(api, [join(temporary, "linked")]), /symlink/);
  });
});

describe("evaluator-authoritative semantics", () => {
  test("defaults to declared supported profiles and preserves explicit selection distinctions", async () => {
    const core = recordNamed("Minimal Core");
    const defaultState = await evaluateRecord(api, core, new URL(`http://local/off/overview?evaluated_at=${fixed}`));
    assert.deepEqual(defaultState.requestedProfiles, []);
    assert.equal(defaultState.result.kind === "packageResult" && defaultState.result.normalized.outcome, "valid");
    const selected = await evaluateRecord(api, core, new URL(`http://local/off/overview?evaluated_at=${fixed}&profile=${encodeURIComponent(api.PUBLIC_EQUITY_PROFILE_URI)}`));
    assert.equal(selected.result.kind === "packageResult" && selected.result.normalized.outcome, "invalid");
    assert.deepEqual(selected.requestedProfiles, [api.PUBLIC_EQUITY_PROFILE_URI]);
  });

  test("preserves current/stale results, canonical numeric strings, units, and stable entity IDs", async () => {
    const item = recordNamed("Public Equity Traceable");
    const current = await get(`/off/headline-outputs?package_id=${item.id}&evaluated_at=2026-07-17T23:59:59Z`);
    assert.equal(current.status, 200);
    const currentRows = await current.json() as Array<Record<string, unknown>>;
    assert.equal(currentRows[0]?.value, "110");
    assert.equal(currentRows[0]?.unit_currency, "USD");
    assert.equal(currentRows[0]?.freshness_status, "current");
    assert.equal(typeof currentRows[0]?.id, "string");
    const staleRows = await (await get(`/off/headline-outputs?package_id=${item.id}&evaluated_at=2026-07-18T00:00:00Z`)).json() as Array<Record<string, unknown>>;
    assert.equal(staleRows[0]?.freshness_status, "stale");
    assert.deepEqual(staleRows[0]?.stale_dependency_ids, [
      "https://openfinanceformat.org/examples/public-equity-traceable/entities/assumption/growth",
      "https://openfinanceformat.org/examples/public-equity-traceable/entities/fact/revenue",
    ]);
  });

  test("preserves Workbook Binding notEvaluated boundaries", async () => {
    const item = recordNamed("Workbook Binding Google snapshot");
    const rows = await (await get(`/off/workbook-bindings?package_id=${item.id}&evaluated_at=${fixed}`)).json() as Array<Record<string, unknown>>;
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.status, "author-declared-not-evaluated");
    assert.deepEqual(rows[0]?.unevaluated, {
      workbookContents: "notEvaluated",
      locatorExistence: "notEvaluated",
      cellValues: "notEvaluated",
      formulas: "notEvaluated",
      recalculation: "notEvaluated",
    });
  });

  test("degrades empty profile views and invalid packages without hiding diagnostics", async () => {
    const core = recordNamed("Minimal Core");
    assert.deepEqual(await (await get(`/off/assumptions?package_id=${core.id}&evaluated_at=${fixed}`)).json(), []);
    const invalid = recordNamed("Lineage cycle");
    const overview = await (await get(`/off/overview?package_id=${invalid.id}&evaluated_at=${fixed}`)).json() as Record<string, unknown>;
    assert.equal(overview.state, "degraded");
    const rows = await (await get(`/off/diagnostics?package_id=${invalid.id}&evaluated_at=${fixed}`)).json() as unknown[];
    assert.ok(rows.length > 0);
  });

  test("keeps unsupported declared profiles notEvaluated by default and failed when explicitly selected", async () => {
    const item = recordNamed("Unsupported requested profile fixture");
    const defaultState = await evaluateRecord(api, item, new URL(`http://local/off/overview?evaluated_at=${fixed}`));
    assert.deepEqual(defaultState.requestedProfiles, []);
    assert.equal(defaultState.result.kind, "packageResult");
    if (defaultState.result.kind !== "packageResult") return;
    const defaultProfile = defaultState.result.normalized.profileResults.declared.find((row) => row.uri === "urn:off:test:profile:unsupported");
    assert.equal(defaultProfile?.requested, false);
    assert.equal(defaultProfile?.status, "notEvaluated");
    const explicit = await evaluateRecord(api, item, new URL(`http://local/off/overview?evaluated_at=${fixed}&profile=${encodeURIComponent("urn:off:test:profile:unsupported")}`));
    assert.equal(explicit.result.kind, "packageResult");
    if (explicit.result.kind !== "packageResult") return;
    const selectedProfile = explicit.result.normalized.profileResults.declared.find((row) => row.uri === "urn:off:test:profile:unsupported");
    assert.equal(selectedProfile?.requested, true);
    assert.equal(selectedProfile?.status, "failed");
  });
});

describe("HTTP determinism and bounds", () => {
  test("serves health and deterministic fixed-time semantic endpoints", async () => {
    assert.deepEqual(await (await get("/health")).json(), {
      status: "ok",
      service: "OFF Research Workspace local adapter",
      version: "0.1.0",
      package_count: catalog.list().length,
      read_only: true,
    });
    const item = recordNamed("Public Equity Traceable");
    const path = `/off/normalized?package_id=${item.id}&evaluated_at=${fixed}`;
    assert.equal(await (await get(path)).text(), await (await get(path)).text());
    const options = await (await get("/off/packages/options")).json() as Array<Record<string, unknown>>;
    assert.ok(options.some((option) => option.value === item.id));
  });

  test("bounds pagination and exposes totals without changing table response shape", async () => {
    const item = recordNamed("Public Equity Traceable");
    const response = await get(`/off/resources?package_id=${item.id}&evaluated_at=${fixed}&offset=1&limit=1`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-off-limit"), "1");
    assert.ok(Number(response.headers.get("x-off-total")) >= 3);
    assert.equal((await response.json() as unknown[]).length, 1);
    assert.equal((await get(`/off/resources?package_id=${item.id}&evaluated_at=${fixed}&limit=201`)).status, 400);
    assert.equal((await get(`/off/resources?package_id=${item.id}&evaluated_at=${fixed}&limit=1e9`)).status, 400);
  });

  test("rejects impossible calendar timestamps with the bounded 400 contract", async () => {
    const item = recordNamed("Minimal Core");
    for (const evaluatedAt of [
      "2026-13-01T00:00:00Z",
      "2026-02-29T00:00:00Z",
      "2026-02-30T00:00:00Z",
      "2026-04-31T00:00:00Z",
    ]) {
      const response = await get(`/off/overview?package_id=${item.id}&evaluated_at=${evaluatedAt}`);
      assert.equal(response.status, 400, evaluatedAt);
      assert.deepEqual(await response.json(), {
        error: {
          code: "invalid_evaluated_at",
          message: "evaluated_at must be a real whole-second UTC timestamp",
        },
      });
    }
    assert.equal((await get(`/off/overview?package_id=${item.id}&evaluated_at=2024-02-29T00:00:00Z`)).status, 200);
  });

  test("rejects raw paths, traversal, absolute and encoded injection", async () => {
    const item = recordNamed("Minimal Core");
    assert.equal((await get("/off/overview?package_id=../../examples/apple-dcf")).status, 404);
    assert.equal((await get("/off/overview?package_id=/etc/passwd")).status, 404);
    assert.notEqual((await get(`/off/files/%2e%2e%2f%2e%2e%2foff.json?package_id=${item.id}&evaluated_at=${fixed}`)).status, 200);
    assert.notEqual((await get(`/off/files/../../off.json?package_id=${item.id}&evaluated_at=${fixed}`)).status, 200);
  });
});

describe("resource and narrative security", () => {
  test("serves only evaluator-verified local files and refuses remote-only descriptors", async () => {
    const equity = recordNamed("Public Equity Traceable");
    const inventory = await (await get(`/off/resources?package_id=${equity.id}&evaluated_at=${fixed}`)).json() as Array<Record<string, unknown>>;
    const evidence = inventory.find((row) => row.location_kind === "local" && row.media_type === "text/plain");
    assert.equal(typeof evidence?.file_id, "string");
    const viewed = await (await post(`/off/files?package_id=${equity.id}&evaluated_at=${fixed}`, { file_id: [evidence?.file_id] })).json() as Array<Record<string, unknown>>;
    assert.equal(Buffer.from(String(viewed[0]?.content), "base64").toString("utf8").includes("Synthetic issuer filing evidence"), true);

    const workbook = recordNamed("Workbook Binding Google snapshot");
    const workbookInventory = await (await get(`/off/resources?package_id=${workbook.id}&evaluated_at=${fixed}`)).json() as Array<Record<string, unknown>>;
    const remote = workbookInventory.find((row) => row.location_kind === "remote");
    const refused = await (await post(`/off/files?package_id=${workbook.id}&evaluated_at=${fixed}`, { file_id: [remote?.file_id] })).json() as Array<Record<string, unknown>>;
    assert.equal(refused[0]?.error_type, "file_not_verified");
  });

  test("degrades a missing verified narrative and exposes no unsafe boundary resource", async () => {
    const missing = recordNamed("Digest mismatch fixture");
    const narrative = await get(`/off/narrative?package_id=${missing.id}&evaluated_at=${fixed}`);
    assert.equal(narrative.status, 200);
    assert.match(await narrative.text(), /Narrative unavailable/u);
    const unsafe = recordNamed("Unsafe resource path fixture");
    const rows = await (await get(`/off/resources?package_id=${unsafe.id}&evaluated_at=${fixed}`)).json() as Array<Record<string, unknown>>;
    assert.equal(rows.some((row) => row.local_file_exposed === true), false);
  });

  test("forces unsafe workbook formats to download and refuses them in the inline viewer", async () => {
    const item = recordNamed("Workbook Binding Google snapshot");
    const inventory = await (await get(`/off/resources?package_id=${item.id}&evaluated_at=${fixed}`)).json() as Array<Record<string, unknown>>;
    const snapshot = inventory.find((row) => row.location_kind === "local" && row.media_type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    assert.equal(typeof snapshot?.file_id, "string");
    const viewer = await (await post(`/off/files?package_id=${item.id}&evaluated_at=${fixed}`, { file_id: [snapshot?.file_id] })).json() as Array<Record<string, unknown>>;
    assert.equal(viewer[0]?.error_type, "unsafe_inline_format");
    const download = await get(`/off/files/${snapshot?.file_id}?package_id=${item.id}&evaluated_at=${fixed}`);
    assert.equal(download.status, 200);
    assert.match(download.headers.get("content-disposition") ?? "", /^attachment;/u);
    assert.equal(download.headers.get("content-type"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  });

  test("sanitizes active Markdown constructs", () => {
    const value = sanitizeMarkdown("# Safe\n<script>alert(1)</script>\n[x](javascript:alert(1))\0");
    assert.doesNotMatch(value, /<script|javascript:|\0/iu);
    assert.match(value, /blocked:/u);
  });

  test("re-checks symlink containment even for a claimed verified resource", async () => {
    const packageRoot = await realpath(await mkdtemp(join(tmpdir(), "off-openbb-symlink-")));
    const outside = await mkdtemp(join(tmpdir(), "off-openbb-file-outside-"));
    const bytes = Buffer.from("outside");
    await writeFile(join(outside, "outside.txt"), bytes);
    await symlink(join(outside, "outside.txt"), join(packageRoot, "linked.txt"));
    const packageId = "pkg_AAAAAAAAAAAAAAAAAAAAAAAA";
    const resourceId = "urn:test:linked";
    const state = {
      record: { id: packageId, packageRoot, configuredRoot: packageRoot, title: "Symlink", declaredProfiles: [], outcome: "valid" as const },
      evaluatedAt: fixed,
      requestedProfiles: [],
      result: {
        kind: "packageResult" as const,
        canonicalBytes: new Uint8Array(),
        normalized: {
          evaluationContext: { offVersion: "0.1", normalizerVersion: "0.1", evaluatedAt: fixed, requestedProfiles: [] },
          outcome: "valid" as const,
          profileResults: { core: { status: "passed" as const }, declared: [] },
          diagnostics: [],
          resourceInventory: [{
            id: resourceId,
            mediaType: "text/plain",
            roles: [],
            byteSize: bytes.length,
            sha256: createHash("sha256").update(bytes).digest("hex"),
            locations: [{ kind: "local", path: "linked.txt", availability: "available", integrity: "verified" }],
          }],
        },
      },
    };
    await assert.rejects(verifiedFile(state, resourceOpaqueId(packageId, resourceId)), /Symlinked resources/);
  });

  test("evaluation and file access do not mutate packages or the frozen release", async () => {
    const packageRoot = join(repositoryRoot, "conformance", "packages", "public-equity-traceable");
    const releaseRoot = join(repositoryRoot, "release", "v0.1-rc.1");
    const beforePackage = await treeDigest(packageRoot);
    const beforeRelease = await treeDigest(releaseRoot);
    const item = recordNamed("Public Equity Traceable");
    await get(`/off/normalized?package_id=${item.id}&evaluated_at=${fixed}`);
    await get(`/off/narrative?package_id=${item.id}&evaluated_at=${fixed}`);
    assert.equal(await treeDigest(packageRoot), beforePackage);
    assert.equal(await treeDigest(releaseRoot), beforeRelease);
  });
});

describe("large collection cap", () => {
  test("caps a 300-row evaluator projection at 200", async () => {
    const temporary = await mkdtemp(join(tmpdir(), "off-openbb-large-"));
    await writeFile(join(temporary, "off.json"), "{}");
    const assumptions = Array.from({ length: 300 }, (_, index) => ({
      id: `urn:test:assumption:${String(index).padStart(3, "0")}`,
      label: `Assumption ${index}`,
      value: { type: "decimal", value: String(index) },
    }));
    const normalized: NormalizedResult = {
      evaluationContext: { offVersion: "0.1", normalizerVersion: "0.1", evaluatedAt: fixed, requestedProfiles: [api.PUBLIC_EQUITY_PROFILE_URI] },
      outcome: "valid",
      profileResults: { core: { status: "passed" }, declared: [{ uri: api.PUBLIC_EQUITY_PROFILE_URI, requested: true, status: "passed" }] },
      diagnostics: [],
      packageIdentity: { id: "urn:test:large", releaseId: "urn:test:large:release", releaseVersion: "1", title: "Large package", declaredProfiles: [api.PUBLIC_EQUITY_PROFILE_URI], entrypointResourceId: "urn:test:none" },
      resourceInventory: [],
      profileEntities: { [api.PUBLIC_EQUITY_PROFILE_URI]: { assumptions, units: [] } },
    };
    const fake: OffApi = { ...api, evaluatePackage: async () => ({ kind: "packageResult", normalized, canonicalBytes: new Uint8Array() }) };
    const largeCatalog = await PackageCatalog.create(fake, [temporary]);
    const largeServer = createHttpServer({ api: fake, catalog: largeCatalog, projectRoot: temporary });
    await new Promise<void>((accept) => largeServer.listen(0, "127.0.0.1", accept));
    try {
      const address = largeServer.address();
      assert.ok(address && typeof address === "object");
      const item = largeCatalog.list()[0];
      assert.ok(item);
      const response = await fetch(`http://127.0.0.1:${address.port}/off/assumptions?package_id=${item.id}&evaluated_at=${fixed}&limit=200`);
      assert.equal(response.headers.get("x-off-total"), "300");
      assert.equal((await response.json() as unknown[]).length, 200);
    } finally {
      await new Promise<void>((accept, reject) => largeServer.close((error) => error ? reject(error) : accept()));
    }
  });
});
