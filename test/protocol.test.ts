import assert from "node:assert/strict";
import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { Ajv2020 } from "ajv/dist/2020.js";

import { runCli } from "../src/cli.ts";
import { canonicalizeJsonText } from "../src/json/jcs.ts";
import {
  PUBLIC_EQUITY_PROFILE_URI,
  SUPPORTED_PROFILE_URIS,
  WORKBOOK_BINDING_PROFILE_URI,
} from "../src/profiles.ts";
import {
  explainProtocolResource,
  getProtocolCatalog,
  getSchemaCatalog,
  listProtocolResources,
} from "../src/protocol.ts";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function captureIo() {
  let stdout = "";
  let stderr = "";
  return {
    io: {
      stdout(value: string) {
        stdout += value;
      },
      stderr(value: string) {
        stderr += value;
      },
    },
    stdout: () => stdout,
    stderr: () => stderr,
  };
}

function staysInside(root: string, path: string): boolean {
  const candidate = relative(root, path);
  return candidate === "" ||
    (candidate !== ".." &&
      !candidate.startsWith(`..${sep}`) &&
      !isAbsolute(candidate));
}

async function assertSafeRepositoryFile(
  path: string,
  rootRealPath: string,
): Promise<void> {
  assert.equal(isAbsolute(path), false, path);
  const absolutePath = resolve(repositoryRoot, path);
  assert.equal(staysInside(repositoryRoot, absolutePath), true, path);
  let finalEntry: Awaited<ReturnType<typeof lstat>> | undefined;
  let candidate = repositoryRoot;
  for (const segment of path.split("/")) {
    candidate = join(candidate, segment);
    finalEntry = await lstat(candidate);
    assert.equal(finalEntry.isSymbolicLink(), false, path);
  }
  assert.ok(finalEntry);
  assert.equal(finalEntry.isFile(), true, path);
  assert.equal(staysInside(rootRealPath, await realpath(absolutePath)), true, path);
}

function collectExternalSchemaReferences(
  value: unknown,
  references: Set<string>,
): void {
  if (Array.isArray(value)) {
    for (const item of value) collectExternalSchemaReferences(item, references);
    return;
  }
  if (typeof value !== "object" || value === null) return;
  for (const [key, item] of Object.entries(value)) {
    if (
      key === "$ref" &&
      typeof item === "string" &&
      /^[A-Za-z][A-Za-z0-9+.-]*:/u.test(item)
    ) {
      const fragment = item.indexOf("#");
      references.add(fragment === -1 ? item : item.slice(0, fragment));
    } else {
      collectExternalSchemaReferences(item, references);
    }
  }
}

test("the closed protocol and schema catalogs validate offline", async () => {
  const protocolSchema = JSON.parse(
    await readFile(join(repositoryRoot, "schemas/protocol-catalog-0.1.schema.json"), "utf8"),
  );
  const schemaCatalogSchema = JSON.parse(
    await readFile(join(repositoryRoot, "schemas/schema-catalog-0.1.schema.json"), "utf8"),
  );
  const ajv = new Ajv2020({ strict: true, allErrors: true });
  const validateProtocolCatalog = ajv.compile(protocolSchema);
  const validateSchemaCatalog = ajv.compile(schemaCatalogSchema);
  assert.equal(validateProtocolCatalog(getProtocolCatalog()), true, JSON.stringify(validateProtocolCatalog.errors));
  assert.equal(validateSchemaCatalog(getSchemaCatalog()), true, JSON.stringify(validateSchemaCatalog.errors));

  assert.deepEqual(getProtocolCatalog().offline, {
    mode: "self-contained",
    networkRetrieval: "forbidden",
    uriSemantics: "identifier-only",
  });
  assert.deepEqual(getSchemaCatalog().resolution, {
    base: "repository-root",
    networkRetrieval: "forbidden",
    uriSemantics: "identifier-only",
  });

  for (const path of ["/spec/OFF-Core-0.1.md", "spec//OFF-Core-0.1.md", "spec/./OFF-Core-0.1.md", "spec/../README.md"]) {
    const unsafeCatalog = structuredClone(getProtocolCatalog()) as unknown as {
      resources: Array<{ path: string }>;
    };
    const firstResource = unsafeCatalog.resources.at(0);
    assert.ok(firstResource);
    firstResource.path = path;
    assert.equal(validateProtocolCatalog(unsafeCatalog), false, path);
  }
  const unknownProperty = structuredClone(getProtocolCatalog()) as Record<string, unknown>;
  unknownProperty.unknown = true;
  assert.equal(validateProtocolCatalog(unknownProperty), false);

  for (const path of ["/schemas/off-core-0.1.schema.json", "schemas//off-core-0.1.schema.json", "schemas/./off-core-0.1.schema.json", "schemas/../package.json"]) {
    const unsafeCatalog = structuredClone(getSchemaCatalog()) as {
      schemas: Record<string, string>;
    };
    const [id] = Object.keys(unsafeCatalog.schemas);
    assert.ok(id);
    unsafeCatalog.schemas[id] = path;
    assert.equal(validateSchemaCatalog(unsafeCatalog), false, path);
  }
});

test("the schema catalog is the exact checked-in $id to safe local path closure", async () => {
  const schemaDirectory = join(repositoryRoot, "schemas");
  const relativeSchemaPaths = (await readdir(schemaDirectory, {
    recursive: true,
    withFileTypes: false,
  }))
    .filter((path) => path.endsWith(".json"))
    .map((path) => `schemas/${path.split(sep).join("/")}`)
    .sort();
  const discovered = new Map<string, string>();
  const references = new Set<string>();
  for (const path of relativeSchemaPaths) {
    const document = JSON.parse(await readFile(join(repositoryRoot, path), "utf8"));
    collectExternalSchemaReferences(document, references);
    if (typeof document.$id !== "string") continue;
    assert.equal(discovered.has(document.$id), false, document.$id);
    discovered.set(document.$id, path);
    assert.equal(document.$schema, getSchemaCatalog().dialect, path);
  }
  assert.deepEqual(
    Object.fromEntries(
      [...discovered.entries()].sort(([left], [right]) =>
        left < right ? -1 : left > right ? 1 : 0
      ),
    ),
    getSchemaCatalog().schemas,
  );

  const rootRealPath = await realpath(repositoryRoot);
  for (const [id, path] of Object.entries(getSchemaCatalog().schemas)) {
    await assertSafeRepositoryFile(path, rootRealPath);
    const absolutePath = resolve(repositoryRoot, path);
    const schema = JSON.parse(await readFile(absolutePath, "utf8"));
    assert.equal(schema.$id, id, path);
  }
  for (const reference of references) {
    assert.equal(
      Object.hasOwn(getSchemaCatalog().schemas, reference),
      true,
      `uncataloged schema reference: ${reference}`,
    );
  }
});

test("catalog identifiers are unique and every catalog path is a safe file", async () => {
  const catalog = getProtocolCatalog();
  assert.equal(
    catalog.$schema,
    "https://openfinanceformat.org/schemas/protocol-catalog-0.1.schema.json",
  );
  assert.equal(
    getSchemaCatalog().$schema,
    "https://openfinanceformat.org/schemas/schema-catalog-0.1.schema.json",
  );
  assert.equal(listProtocolResources(), catalog);
  const identifiers = [
    ...catalog.profiles.map(({ identifier }) => identifier),
    ...catalog.resources.map(({ identifier }) => identifier),
  ];
  assert.equal(new Set(identifiers).size, identifiers.length);
  const paths = [
    ...catalog.profiles.flatMap(({ specification, schema }) => [specification, schema]),
    ...catalog.resources.map(({ path }) => path),
  ];
  const rootRealPath = await realpath(repositoryRoot);
  for (const path of paths) {
    await assertSafeRepositoryFile(path, rootRealPath);
  }

  assert.deepEqual(
    catalog.profiles.map(({ uri }) => uri).sort(),
    [...SUPPORTED_PROFILE_URIS].sort(),
  );
  assert.deepEqual(catalog.profiles, [
    {
      identifier: "public-equity-research",
      uri: PUBLIC_EQUITY_PROFILE_URI,
      specification: "spec/profiles/public-equity-research-0.1.md",
      schema: "schemas/profiles/public-equity-research-0.1.schema.json",
      status: "frozen",
      rc1Membership: "frozen-bytes",
      claim: "Traceable — author-declared lineage",
    },
    {
      identifier: "workbook-binding",
      uri: WORKBOOK_BINDING_PROFILE_URI,
      specification: "spec/profiles/workbook-binding-0.1.md",
      schema: "schemas/profiles/workbook-binding-0.1.schema.json",
      status: "development",
      rc1Membership: "added-after-rc.1",
      claim: "Bound — author-declared workbook locators",
    },
  ]);
});

test("protocol API values are deeply read-only and lookup accepts stable identifiers and URIs", () => {
  const catalog = getProtocolCatalog();
  assert.equal(Object.isFrozen(catalog), true);
  assert.equal(Object.isFrozen(catalog.profiles), true);
  assert.equal(Object.isFrozen(catalog.profiles[0]), true);
  assert.deepEqual(explainProtocolResource(PUBLIC_EQUITY_PROFILE_URI), {
    kind: "profile",
    profile: catalog.profiles[0],
  });
  assert.equal(explainProtocolResource("workbook-binding")?.kind, "profile");
  assert.equal(explainProtocolResource("rule-registry")?.kind, "resource");
  assert.equal(
    explainProtocolResource("https://openfinanceformat.org/schemas/off-core-0.1.schema.json")?.kind,
    "json-schema",
  );
  assert.equal(explainProtocolResource("unknown"), undefined);
});

test("protocol CLI discovery is canonical, deterministic, and has exact unknown and usage exits", async () => {
  const first = captureIo();
  const second = captureIo();
  assert.equal(await runCli(["protocol", "list"], first.io), 0);
  assert.equal(await runCli(["protocol", "list"], second.io), 0);
  assert.equal(first.stdout(), `${canonicalizeJsonText(getProtocolCatalog())}\n`);
  assert.equal(second.stdout(), first.stdout());
  assert.equal(first.stderr(), "");

  const explained = captureIo();
  assert.equal(await runCli(["protocol", "explain", "workbook-binding"], explained.io), 0);
  assert.equal(
    explained.stdout(),
    `${canonicalizeJsonText(explainProtocolResource("workbook-binding"))}\n`,
  );
  assert.equal(explained.stderr(), "");

  const unknown = captureIo();
  assert.equal(await runCli(["protocol", "explain", "unknown"], unknown.io), 1);
  assert.equal(unknown.stdout(), "");
  assert.equal(
    unknown.stderr(),
    '{"code":"OFF-P1001","identifier":"unknown","kind":"protocolLookupFailure"}\n',
  );

  const usage = captureIo();
  assert.equal(await runCli(["protocol", "list", "extra"], usage.io), 64);
  assert.equal(usage.stdout(), "");
  assert.match(usage.stderr(), /^Usage:/u);
});
