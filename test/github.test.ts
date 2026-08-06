import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));

test("GitHub CI is read-only, pinned, and runs the complete local matrix", async () => {
  const workflow = await readFile(
    resolve(repositoryRoot, ".github/workflows/ci.yml"),
    "utf8",
  );

  assert.match(workflow, /workflow_dispatch:/u);
  assert.match(workflow, /candidate_ref:/u);
  assert.match(
    workflow,
    /default: "2570e38998dd735b83da301a5b6f0e95aca47073"/u,
  );
  assert.match(
    workflow,
    /test "\$REQUESTED_REF" = "\$FROZEN_CANDIDATE_COMMIT"/u,
  );
  assert.match(
    workflow,
    /ref: \$\{\{ inputs\.candidate_ref \|\| github\.sha \}\}/u,
  );
  assert.match(
    workflow,
    /FROZEN_RELEASE_TREE: "d688aef11d951c86582f4fcd698400c0095d2a02"/u,
  );
  assert.match(workflow, /git rev-parse HEAD\^\{tree\}/u);
  assert.match(workflow, /git rev-parse HEAD:release\/v0\.1-rc\.1/u);
  assert.match(workflow, /GITHUB_STEP_SUMMARY/u);
  assert.match(workflow, /^permissions:\n  contents: read$/mu);
  assert.match(workflow, /runs-on: ubuntu-24\.04/u);
  assert.match(
    workflow,
    /actions\/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6\.0\.2/u,
  );
  assert.match(workflow, /fetch-depth: 0/u);
  assert.match(workflow, /persist-credentials: false/u);
  assert.match(
    workflow,
    /actions\/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6\.4\.0/u,
  );
  assert.match(workflow, /node-version: 22\.13\.0/u);
  assert.match(workflow, /corepack@0\.35\.0/u);
  assert.match(workflow, /pnpm@10\.34\.1/u);
  assert.match(workflow, /COREPACK_ENABLE_NETWORK: "0"/u);
  assert.doesNotMatch(workflow, /secrets\./u);

  assert.match(workflow, /^        run: pnpm verify$/mu);
});

test("repository intake routes protocol and security work without overstating evidence", async () => {
  const read = (path: string): Promise<string> =>
    readFile(resolve(repositoryRoot, path), "utf8");
  const [config, bug, question, proposal, pullRequest, dependabot] =
    await Promise.all([
      read(".github/ISSUE_TEMPLATE/config.yml"),
      read(".github/ISSUE_TEMPLATE/bug.yml"),
      read(".github/ISSUE_TEMPLATE/implementation-question.yml"),
      read(".github/ISSUE_TEMPLATE/protocol-change.yml"),
      read(".github/PULL_REQUEST_TEMPLATE.md"),
      read(".github/dependabot.yml"),
    ]);

  assert.match(config, /security\/policy/u);
  assert.match(config, /Do not disclose vulnerability details/u);
  assert.match(bug, /public, non-sensitive defects/u);
  assert.match(question, /clean-room attempt/u);
  assert.match(question, /restart rules/u);
  assert.match(proposal, /OFF Change Proposal/u);
  assert.match(proposal, /^title: "ofcp: "$/mu);
  assert.match(proposal, /Breaking normative change/u);
  assert.match(proposal, /Security and privacy impact/u);
  assert.match(pullRequest, /release\/v0\.1-rc\.1\/\*\*/u);
  assert.match(pullRequest, /claim of interoperability, adoption, independent review, or financial correctness/u);
  assert.match(dependabot, /package-ecosystem: npm/u);
  assert.match(dependabot, /package-ecosystem: github-actions/u);
});
