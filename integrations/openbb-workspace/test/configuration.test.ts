import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { after, before, describe, test } from "node:test";

import { PackageCatalog } from "../src/catalog.ts";
import { loadOffApi } from "../src/off-api.ts";
import { createHttpServer } from "../src/server.ts";
import type { OffApi } from "../src/types.ts";

const projectRoot = resolve(import.meta.dirname, "..");
const repositoryRoot = resolve(projectRoot, "../..");
const fixed = "2026-07-17T23:59:59Z";
const promptMention = /@\[id:([A-Za-z0-9_-]+)\]/gu;

type Widget = Record<string, unknown> & {
  name: string;
  type: string;
  endpoint: string;
  params?: Array<Record<string, unknown>>;
};

async function document<T>(name: string): Promise<T> {
  return JSON.parse(await readFile(join(projectRoot, name), "utf8")) as T;
}

function expectedPackageId(rootIndex: number, packagePath: string): string {
  return `pkg_${createHash("sha256").update(`pkg\0${rootIndex}\0${packagePath}`).digest("base64url").slice(0, 24)}`;
}

describe("OpenBB configuration contract", () => {
  test("uses one four-tab app with valid widget, group, layout, and prompt references", async () => {
    const widgets = await document<Record<string, Widget>>("widgets.json");
    const apps = await document<Array<Record<string, unknown>>>("apps.json");
    assert.equal(Object.keys(widgets).length, 15);
    assert.equal(apps.length, 1);
    const app = apps[0] as Record<string, unknown>;
    assert.equal(app.name, "OFF Research Workspace");
    assert.equal(app.allowCustomization, true);
    assert.equal("selected_agent" in app, false);
    assert.deepEqual(Object.keys(app.tabs as object), ["research", "evidence", "files", "conformance"]);

    const widgetIds = new Set(Object.keys(widgets));
    const aiExcluded = new Set(["native_files", "diagnostics", "normalized_view"]);
    for (const [widgetId, widget] of Object.entries(widgets)) {
      assert.ok(widget.name.length > 0, widgetId);
      assert.ok(["table", "markdown", "multi_file_viewer"].includes(widget.type), widgetId);
      assert.match(widget.endpoint, /^\/off\//u, widgetId);
      assert.equal("mcp_tool" in widget, false, widgetId);
      assert.equal(typeof widget.ai, "boolean", widgetId);
      assert.equal(widget.ai, !aiExcluded.has(widgetId), widgetId);
      const params = widget.params ?? [];
      assert.ok(params.some((item) => item.paramName === "package_id"), widgetId);
      assert.ok(params.some((item) => item.paramName === "evaluated_at"), widgetId);
    }

    for (const tab of Object.values(app.tabs as Record<string, Record<string, unknown>>)) {
      const positions: Array<[number, number, number, number]> = [];
      for (const item of tab.layout as Array<Record<string, unknown>>) {
        assert.ok(widgetIds.has(String(item.i)), `unknown widget ${String(item.i)}`);
        const x = Number(item.x);
        const y = Number(item.y);
        const w = Number(item.w);
        const h = Number(item.h);
        assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= 40);
        assert.equal(positions.some(([ox, oy, ow, oh]) => !(x + w <= ox || ox + ow <= x || y + h <= oy || oy + oh <= y)), false);
        positions.push([x, y, w, h]);
      }
      assert.equal((tab.layout as Array<Record<string, unknown>>)[0]?.i, "package_context");
    }

    const groups = app.groups as Array<Record<string, unknown>>;
    assert.deepEqual(groups.map((group) => group.paramName), ["package_id", "evaluated_at"]);
    for (const group of groups) assert.deepEqual(new Set(group.widgetIds as string[]), widgetIds);
    for (const prompt of app.prompts as string[]) {
      const mentions = [...prompt.matchAll(promptMention)].map((match) => match[1]);
      assert.ok(mentions.length > 0);
      assert.ok(mentions.every((id) => id !== undefined && widgetIds.has(id)));
      assert.ok(mentions.every((id) => id !== undefined && widgets[id]?.ai === true));
      assert.ok(mentions.every((id) => id !== undefined && !aiExcluded.has(id)));
    }
  });

  test("uses a real discovered default package and only approved local endpoints", async () => {
    const widgets = await document<Record<string, Widget>>("widgets.json");
    const apps = await document<Array<Record<string, unknown>>>("apps.json");
    const expected = expectedPackageId(0, "apple-dcf");
    const defaults = Object.values(widgets).flatMap((widget) => widget.params ?? [])
      .filter((param) => param.paramName === "package_id")
      .map((param) => param.value);
    assert.ok(defaults.length > 0);
    assert.deepEqual(new Set(defaults), new Set([expected]));
    assert.equal((apps[0]?.groups as Array<Record<string, unknown>>)[0]?.defaultValue, expected);
    assert.equal(JSON.stringify({ widgets, apps }).includes(repositoryRoot), false);
    assert.equal(JSON.stringify({ widgets, apps }).includes("../"), false);
    assert.equal(JSON.stringify({ widgets, apps }).includes("mcp_server"), false);
  });
});

describe("configured widget response shapes", () => {
  let api: OffApi;
  let catalog: PackageCatalog;
  let origin: string;
  let server: ReturnType<typeof createHttpServer>;

  before(async () => {
    api = await loadOffApi(repositoryRoot);
    catalog = await PackageCatalog.create(api, [join(repositoryRoot, "examples")]);
    server = createHttpServer({ api, catalog, projectRoot });
    await new Promise<void>((accept) => server.listen(0, "127.0.0.1", accept));
    const address = server.address();
    assert.ok(address && typeof address === "object");
    origin = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    await new Promise<void>((accept, reject) => server.close((error) => error ? reject(error) : accept()));
  });

  test("serves configuration, local image, dynamic choices, and every widget shape", async () => {
    const preflight = await fetch(`${origin}/widgets.json`, {
      method: "OPTIONS",
      headers: {
        origin: "https://pro.openbb.co",
        "access-control-request-method": "GET",
        "access-control-request-headers": "x-openbb-user",
      },
    });
    assert.equal(preflight.status, 204);
    assert.ok((preflight.headers.get("access-control-allow-headers") ?? "")
      .split(",")
      .map((header) => header.trim().toLowerCase())
      .includes("x-openbb-user"));

    assert.equal((await fetch(`${origin}/widgets.json`)).status, 200);
    assert.equal((await fetch(`${origin}/apps.json`)).status, 200);
    const image = await fetch(`${origin}/assets/off-workspace.svg`);
    assert.equal(image.status, 200);
    assert.equal(image.headers.get("content-type"), "image/svg+xml; charset=utf-8");

    const widgets = await document<Record<string, Widget>>("widgets.json");
    const packageId: string | undefined = catalog.list().find((record) => record.title.includes("Apple DCF"))?.id;
    if (packageId === undefined) throw new Error("Apple DCF package was not discovered");
    const options = await (await fetch(`${origin}/off/packages/options`)).json() as Array<Record<string, unknown>>;
    assert.ok(options.some((option) => option.value === packageId));

    for (const [widgetId, widget] of Object.entries(widgets)) {
      const query: string = `package_id=${encodeURIComponent(packageId)}&evaluated_at=${encodeURIComponent(fixed)}`;
      const response: Response = widget.type === "multi_file_viewer"
        ? await fetch(`${origin}${widget.endpoint}?${query}`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ package_id: packageId, evaluated_at: fixed, file_id: [] }),
          })
        : await fetch(`${origin}${widget.endpoint}?${query}`);
      assert.equal(response.status, 200, widgetId);
      if (widget.type === "markdown") {
        assert.match(response.headers.get("content-type") ?? "", /^text\/markdown/u, widgetId);
        assert.ok((await response.text()).length > 0, widgetId);
      } else {
        assert.ok(Array.isArray(await response.json()), widgetId);
      }
      assert.equal(response.headers.get("x-off-evaluated-at"), fixed, widgetId);
    }

    const fileOptions = await (await fetch(`${origin}/off/files/options?package_id=${encodeURIComponent(packageId)}&evaluated_at=${fixed}`)).json() as Array<Record<string, unknown>>;
    assert.ok(fileOptions.length > 0);
    assert.ok(fileOptions.every((option) => /^res_[A-Za-z0-9_-]{24}$/u.test(String(option.value))));
    assert.equal(JSON.stringify(fileOptions).includes(repositoryRoot), false);
  });

  test("preserves application bounds and canonical export separately from presentation", async () => {
    const packageId: string | undefined = catalog.list().find((record) => record.title.includes("Apple DCF"))?.id;
    if (packageId === undefined) throw new Error("Apple DCF package was not discovered");
    const bounded = await fetch(`${origin}/off/assumptions?package_id=${encodeURIComponent(packageId)}&evaluated_at=${fixed}&limit=200`);
    assert.equal(bounded.status, 200);
    assert.equal((await fetch(`${origin}/off/assumptions?package_id=${encodeURIComponent(packageId)}&evaluated_at=${fixed}&limit=201`)).status, 400);
    const normalized = await fetch(`${origin}/off/normalized?package_id=${encodeURIComponent(packageId)}&evaluated_at=${fixed}`);
    assert.match(normalized.headers.get("content-type") ?? "", /^application\/json/u);
    const body = await normalized.json() as Record<string, unknown>;
    assert.equal((body.evaluationContext as Record<string, unknown>).evaluatedAt, fixed);
  });
});
