import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));

test("CircleCI captures complete acceptance provenance for the rc.1 tag", async () => {
  const config = await readFile(resolve(repositoryRoot, ".circleci/config.yml"), "utf8");

  assert.match(config, /image: cimg\/node:22\.13\.0@sha256:47504124be519c77780c25843a2dfe37a87e238a2325487af84c61f126dd05d6/u);
  assert.match(config, /pnpm@10\.34\.1/u);
  assert.match(config, /run_acceptance\(\)/u);
  assert.match(config, /OFF_CI_OUTCOMES/u);
  for (const command of [
    "build",
    "typecheck",
    "contract-tests",
    "test",
    "node22",
    "offline",
    "corpus",
    "release-validation",
  ]) {
    assert.match(config, new RegExp(`run_acceptance ${command}`, "u"));
  }
  assert.match(config, /destination: off-v0\.1-rc\.1-ci-evidence/u);
  assert.match(config, /only: \/\^v0\\\.1-rc\\\.1\$\//u);
});
