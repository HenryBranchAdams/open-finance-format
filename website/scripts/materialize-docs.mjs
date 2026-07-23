#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const websiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(websiteRoot, "..");
const contentRoot = path.join(websiteRoot, "src", "content", "docs");
const repositoryUrl =
  "https://github.com/HenryBranchAdams/open-finance-format";

const documents = [
  {
    source: "CONCEPTS.md",
    target: "docs/concepts/index.mdx",
    title: "Core concepts",
    description:
      "The evidence layers and release concepts that keep OFF claims precise.",
    authority: "guidance",
  },
  {
    source: "spec/OFF-Core-0.1.md",
    target: "docs/specification/core.mdx",
    title: "OFF Core 0.1",
    description:
      "The normative package, resource, integrity, and identity contract.",
    authority: "normative",
  },
  {
    source: "spec/profiles/public-equity-research-0.1.md",
    target: "docs/specification/public-equity-research.mdx",
    title: "Public Equity Research 0.1",
    description:
      "The normative public-equity profile for scenarios, sources, freshness, and author-declared lineage.",
    authority: "normative",
  },
  {
    source: "spec/normalization-0.1.md",
    target: "docs/specification/normalization.mdx",
    title: "Normalization 0.1",
    description:
      "The normative admission and canonical normalized-output rules.",
    authority: "normative",
  },
  {
    source: "spec/diagnostics-0.1.md",
    target: "docs/specification/diagnostics.mdx",
    title: "Diagnostics 0.1",
    description:
      "The stable diagnostic envelope, codes, parameters, and ordering rules.",
    authority: "normative",
  },
  {
    source: "spec/conformance-0.1.md",
    target: "docs/specification/conformance.mdx",
    title: "Conformance 0.1",
    description:
      "The normative evaluation stages, result classes, and clean-room promotion boundary.",
    authority: "normative",
  },
  {
    source: "examples/apple-dcf/OFF.md",
    target: "docs/examples/apple-dcf.mdx",
    title: "Apple DCF example",
    description:
      "A tracked, formula-driven public-equity package demonstrating OFF resources, outputs, sources, and lineage.",
    authority: "example",
  },
  {
    source: "docs/PUBLICATION.md",
    target: "docs/conformance/publication.mdx",
    title: "Publishing the experimental candidate",
    description:
      "How to publish rc.1 without overstating authentication, interoperability, or promotion.",
    authority: "guidance",
  },
  {
    source: "clean-room/CONSUMER_TASK.md",
    target: "docs/conformance/consumer-task.mdx",
    title: "Clean-room consumer task",
    description:
      "The public task for an unaffiliated consumer implementation.",
    authority: "guidance",
  },
  {
    source: "clean-room/PRODUCER_TASK.md",
    target: "docs/conformance/producer-task.mdx",
    title: "Clean-room producer task",
    description:
      "The public task for an unaffiliated producer authoring a new package.",
    authority: "guidance",
  },
  {
    source: "clean-room/INTEROPERABILITY_REPORT.template.md",
    target: "docs/conformance/report-template.mdx",
    title: "Interoperability report template",
    description:
      "The review template for recording independent clean-room evidence.",
    authority: "guidance",
  },
  {
    source: "docs/PROJECT_BRIEF.md",
    target: "docs/status/product-boundary.mdx",
    title: "Product boundary",
    description:
      "The current product thesis, users, normative profiles, and deferred work.",
    authority: "guidance",
  },
  {
    source: "docs/ROADMAP.md",
    target: "docs/status/roadmap.mdx",
    title: "Roadmap",
    description:
      "The current release line, promotion gate, and later product tracks.",
    authority: "guidance",
  },
];

const routeBySource = new Map(
  documents.map(({ source, target }) => [
    source,
    `/${target.replace(/\.mdx$/u, "").replace(/\/index$/u, "")}/`,
  ]),
);

function json(value) {
  return JSON.stringify(value);
}

function stripFirstHeading(markdown) {
  return markdown.replace(/^# [^\n]+\n+/u, "");
}

function makeMdxSafe(markdown) {
  return markdown
    .replace(
      /<!-- OFF-INTEROPERABILITY-RECORD-BEGIN\n([\s\S]*?)\nOFF-INTEROPERABILITY-RECORD-END -->/gu,
      "```json\n$1\n```",
    )
    .replace(
      /^ {4}(node dist\/off\.mjs[^\n]*<[^>\n]+>[^\n]*)$/gmu,
      "```sh\n$1\n```",
    );
}

function githubTarget(resolvedPath, fragment = "") {
  const encoded = resolvedPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${repositoryUrl}/blob/main/${encoded}${fragment}`;
}

function rewriteLinks(markdown, sourcePath) {
  const sourceDirectory = path.posix.dirname(sourcePath);

  return markdown.replace(/\]\(([^)\s]+)(\s+"[^"]*")?\)/gu, (match, raw, title = "") => {
    if (
      raw.startsWith("#") ||
      raw.startsWith("/") ||
      /^[a-z][a-z0-9+.-]*:/iu.test(raw)
    ) {
      return match;
    }

    const [pathname, fragmentValue] = raw.split("#", 2);
    const fragment = fragmentValue ? `#${fragmentValue}` : "";
    const resolved = path.posix.normalize(
      path.posix.join(sourceDirectory, pathname),
    );
    const route = routeBySource.get(resolved);
    const destination = route
      ? `${route}${fragment}`
      : githubTarget(resolved, fragment);
    return `](${destination}${title})`;
  });
}

for (const document of documents) {
  const sourceFile = path.join(repositoryRoot, document.source);
  const targetFile = path.join(contentRoot, document.target);
  const source = await readFile(sourceFile, "utf8");
  const body = makeMdxSafe(
    rewriteLinks(stripFirstHeading(source), document.source),
  ).trim();
  const sourceUrl = githubTarget(document.source);

  const frontmatter = [
    "---",
    `title: ${json(document.title)}`,
    `description: ${json(document.description)}`,
    `authority: ${json(document.authority)}`,
    `sourcePath: ${json(document.source)}`,
    ...(document.authority === "normative"
      ? [
          "banner:",
          "  type: caution",
          `  content: ${json(
            "Experimental v0.1-rc.1. This page reproduces the current normative source; it does not claim promotion, adoption, financial correctness, or independent interoperability.",
          )}`,
        ]
      : []),
    "---",
    "",
  ].join("\n");

  const provenance = [
    `> Source-backed from [\`${document.source}\`](${sourceUrl}).`,
    "> The repository file remains authoritative; this publishing copy is regenerated before every build.",
    "",
  ].join("\n");

  await mkdir(path.dirname(targetFile), { recursive: true });
  await writeFile(targetFile, `${frontmatter}${provenance}${body}\n`, "utf8");
}

console.log(`Materialized ${documents.length} source-backed documentation pages.`);
