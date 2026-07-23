import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const client = new URL("../dist/client/", import.meta.url);
const expectedOrigin = process.env.OFF_SITE_URL ?? "http://localhost:4321";

async function read(relativePath) {
  return readFile(new URL(relativePath, client), "utf8");
}

test("emits the human documentation routes and canonical metadata", async () => {
  const requiredPages = [
    "index.html",
    "docs/index.html",
    "docs/get-started/index.html",
    "docs/guides/author-core-package/index.html",
    "docs/specification/core/index.html",
    "docs/specification/public-equity-research/index.html",
    "docs/examples/apple-dcf/index.html",
    "docs/conformance/publication/index.html",
    "docs/status/index.html",
    "404.html",
  ];

  await Promise.all(requiredPages.map((page) => access(new URL(page, client))));

  const home = await read("index.html");
  assert.match(home, /Publish the model/);
  assert.match(home, /v0\.1-rc\.1/);
  assert.match(home, /property="og:image"[^>]+og\.png/);
  assert.match(home, /application\/ld\+json/);
  assert.match(home, new RegExp(`<link rel="canonical" href="${expectedOrigin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/">`));

  const core = await read("docs/specification/core/index.html");
  assert.match(core, /Normative/);
  assert.match(core, /OFF Core 0\.1/);
  assert.match(core, /github\.com\/HenryBranchAdams\/open-finance-format\/edit\/main\/spec\/OFF-Core-0\.1\.md/);
});

test("emits agent, discovery, search, and Sites packaging surfaces", async () => {
  const requiredFiles = [
    "llms.txt",
    "llms-full.txt",
    "docs/llms.txt",
    "docs/specification/core/index.md",
    "docs/specification/core/index.mdx",
    "robots.txt",
    "sitemap-index.xml",
    "pagefind/pagefind.js",
    "../server/index.js",
    "../.openai/hosting.json",
  ];

  await Promise.all(requiredFiles.map((file) => access(new URL(file, client))));

  const markdown = await read("docs/specification/core/index.md");
  assert.match(markdown, /authority/i);
  assert.match(markdown, /github\.com\/HenryBranchAdams\/open-finance-format\/blob\/main\/spec\/OFF-Core-0\.1\.md/);
});
