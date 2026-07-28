import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));

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
