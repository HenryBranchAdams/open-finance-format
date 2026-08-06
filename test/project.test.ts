import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const execFileAsync = promisify(execFile);

test("the mutable reference package is explicitly development-only and Git-native", async () => {
  const packageDocument = JSON.parse(
    await readFile(resolve(repositoryRoot, "package.json"), "utf8"),
  ) as {
    readonly version?: string;
    readonly private?: boolean;
    readonly repository?: { readonly url?: string };
    readonly bugs?: { readonly url?: string };
    readonly scripts?: Readonly<Record<string, string>>;
  };

  assert.equal(packageDocument.version, "0.1.0-dev");
  assert.equal(packageDocument.private, true);
  assert.equal(
    packageDocument.repository?.url,
    "https://github.com/HenryBranchAdams/open-finance-format.git",
  );
  assert.equal(
    packageDocument.bugs?.url,
    "https://github.com/HenryBranchAdams/open-finance-format/issues",
  );
  for (const command of [
    "pnpm build",
    "pnpm check",
    "pnpm test",
    "pnpm test:node22",
    "pnpm test:offline",
    "pnpm release:self-check",
  ]) {
    assert.match(packageDocument.scripts?.verify ?? "", new RegExp(command, "u"));
  }
});

test("tracked authored text contains no author-specific home-directory paths", async () => {
  const { stdout } = await execFileAsync("git", ["ls-files", "-z"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  const textExtensions = new Set([
    ".astro", ".css", ".js", ".json", ".jsx", ".md", ".mjs", ".py", ".ts", ".txt", ".yaml", ".yml",
  ]);
  const posixUserRoot = "/" + "Users" + "/";
  const posixHomeRoot = "/" + "home" + "/";
  const windowsUserRoot = "\\\\" + "Users" + "\\\\";
  const authorPathPatterns = [
    new RegExp(`${posixUserRoot}[^/\\s]+`, "u"),
    new RegExp(`${posixHomeRoot}[^/\\s]+`, "u"),
    new RegExp(`[A-Za-z]:${windowsUserRoot}[^\\\\\\s]+`, "u"),
  ];
  const offenders: string[] = [];
  for (const relativePath of stdout.split("\0").filter(Boolean)) {
    if (!textExtensions.has(extname(relativePath))) continue;
    const contents = await readFile(resolve(repositoryRoot, relativePath), "utf8");
    if (authorPathPatterns.some((pattern) => pattern.test(contents))) offenders.push(relativePath);
  }
  assert.deepEqual(offenders, []);
});

test("the NRXS OpenProse fixture resolves the attached repository portably", async () => {
  const fixturePath = resolve(
    repositoryRoot,
    ".agents/prose/src/nrxs-valuation/nrxs-valuation.test.prose.md",
  );
  const fixture = await readFile(fixturePath, "utf8");
  assert.ok(fixture.includes(
    "`repository_root`: resolve `../../../..` from this test file's directory",
  ));
  assert.equal(resolve(dirname(fixturePath), "../../../.."), repositoryRoot);
});
