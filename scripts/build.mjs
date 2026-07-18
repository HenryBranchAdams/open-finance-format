import { builtinModules, createRequire } from "node:module";
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rename,
  rm,
} from "node:fs/promises";
import { dirname, extname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

import { readAllowlist } from "./checksums.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const trustedRequire = createRequire(resolve(repositoryRoot, "package.json"));
const trustedPackageNames = new Set([
  "ajv",
  "fast-deep-equal",
  "fast-uri",
  "json-schema-traverse",
  "require-from-string",
]);
const builtins = new Set([
  ...builtinModules,
  ...builtinModules.map((name) => `node:${name}`),
]);
const dependencyNamespace = "off-trusted-dependency";
const maxTrustedDependencyBytes = 16 * 1024 * 1024;

function outputPath(args) {
  if (args.length === 0) return resolve(repositoryRoot, "dist/off.mjs");
  if (args.length === 2 && args[0] === "--outfile" && args[1].length > 0) {
    return resolve(args[1]);
  }
  throw new Error("Usage: node scripts/build.mjs [--outfile <path>]");
}

function inside(root, path) {
  const candidate = relative(root, path);
  return candidate === "" ||
    (!candidate.startsWith(`..${sep}`) && candidate !== ".." &&
      !isAbsolute(candidate));
}

function packageName(specifier) {
  if (specifier.startsWith("@")) {
    return specifier.split("/", 2).join("/");
  }
  return specifier.split("/", 1)[0];
}

function releasePath(root, path) {
  return relative(root, path).split(sep).join("/");
}

async function assertAllowlistedRegularFile(root, path, allowedInputPaths) {
  if (!inside(root, path)) throw new Error("build input escaped source root");
  const segments = relative(root, path).split(sep).filter(Boolean);
  let current = root;
  for (const segment of segments) {
    current = resolve(current, segment);
    const stats = await lstat(current);
    if (stats.isSymbolicLink()) throw new Error("build input used a symlink");
  }
  const stats = await lstat(path);
  if (!stats.isFile()) throw new Error("build input was not a regular file");
  if (!allowedInputPaths.has(releasePath(root, path))) {
    throw new Error("build input was not release-allowlisted");
  }
}

async function trustedResolutionPlugin(sourceRoot, allowedInputPaths) {
  const absoluteSourceRoot = resolve(sourceRoot);
  const trustedNodeModules = await realpath(resolve(repositoryRoot, "node_modules"));
  const virtualToActual = new Map();

  function virtualize(actualPath) {
    const virtualPath = relative(trustedNodeModules, actualPath).split(sep).join("/");
    if (virtualPath === "" || virtualPath.startsWith("../")) {
      throw new Error("trusted dependency escaped node_modules");
    }
    virtualToActual.set(virtualPath, actualPath);
    return { namespace: dependencyNamespace, path: virtualPath };
  }

  async function resolveTrusted(specifier, importer) {
    if (!trustedPackageNames.has(packageName(specifier))) {
      throw new Error("unapproved build dependency");
    }
    const request = importer === undefined
      ? trustedRequire
      : createRequire(importer);
    const actualPath = await realpath(request.resolve(specifier));
    if (!inside(trustedNodeModules, actualPath)) {
      throw new Error("trusted dependency escaped node_modules");
    }
    return virtualize(actualPath);
  }

  return {
    name: "off-release-input-guard",
    setup(context) {
      context.onResolve({ filter: /.*/ }, async (args) => {
        if (args.pluginData?.offDefaultResolution === true) return undefined;
        if (builtins.has(args.path)) return { external: true, path: args.path };

        if (args.namespace === dependencyNamespace) {
          const importer = virtualToActual.get(args.importer);
          if (importer === undefined) throw new Error("unknown trusted importer");
          if (args.path.startsWith(".") || isAbsolute(args.path)) {
            const request = createRequire(importer);
            const actualPath = await realpath(request.resolve(args.path));
            if (!inside(trustedNodeModules, actualPath)) {
              throw new Error("trusted dependency escaped node_modules");
            }
            return virtualize(actualPath);
          }
          return resolveTrusted(args.path, importer);
        }

        const relativeLike = args.path.startsWith(".") ||
          isAbsolute(args.path) || args.kind === "entry-point";
        if (!relativeLike) {
          if (packageName(args.path) !== "ajv") {
            throw new Error("candidate requested an unapproved dependency");
          }
          return resolveTrusted(args.path, undefined);
        }

        const lexicalBase = args.kind === "entry-point"
          ? absoluteSourceRoot
          : resolve(args.resolveDir);
        if (!inside(absoluteSourceRoot, lexicalBase)) {
          throw new Error("candidate resolver escaped source root");
        }
        const lexicalTarget = isAbsolute(args.path)
          ? resolve(args.path)
          : resolve(lexicalBase, args.path);
        if (!inside(absoluteSourceRoot, lexicalTarget)) {
          throw new Error("candidate import escaped source root");
        }

        const resolved = await context.resolve(args.path, {
          importer: args.importer,
          kind: args.kind,
          namespace: args.namespace,
          resolveDir: args.resolveDir,
          pluginData: { offDefaultResolution: true },
          with: args.with,
        });
        if (resolved.errors.length > 0) return resolved;
        await assertAllowlistedRegularFile(
          absoluteSourceRoot,
          resolved.path,
          allowedInputPaths,
        );
        return resolved;
      });

      context.onLoad(
        { filter: /.*/, namespace: dependencyNamespace },
        async (args) => {
          const actualPath = virtualToActual.get(args.path);
          if (actualPath === undefined) throw new Error("unknown trusted module");
          const stats = await lstat(actualPath);
          if (!stats.isFile() || stats.size > maxTrustedDependencyBytes) {
            throw new Error("trusted dependency exceeded build limits");
          }
          const contents = await readFile(actualPath);
          const extension = extname(actualPath);
          const loader = extension === ".json" ? "json" : "js";
          return { contents, loader };
        },
      );
    },
  };
}

export async function buildDistribution({
  sourceRoot = repositoryRoot,
  outfile = resolve(sourceRoot, "dist/off.mjs"),
  allowedInputPaths,
} = {}) {
  const absoluteSourceRoot = await realpath(resolve(sourceRoot));
  const releaseInputs = allowedInputPaths ??
    (await readAllowlist(absoluteSourceRoot)).files;
  if (
    !Array.isArray(releaseInputs) ||
    !releaseInputs.every((path) => typeof path === "string")
  ) {
    throw new Error("build input allowlist was invalid");
  }
  const allowedInputs = new Set(releaseInputs);
  const absoluteOutput = resolve(outfile);
  const outputDirectory = dirname(absoluteOutput);
  await mkdir(outputDirectory, { recursive: true });
  try {
    const existing = await lstat(absoluteOutput);
    if (existing.isSymbolicLink() || !existing.isFile()) {
      throw new Error("build output must be a regular file or absent");
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const temporaryDirectory = await mkdtemp(resolve(outputDirectory, ".off-build-"));
  const temporaryOutput = resolve(temporaryDirectory, "off.mjs");
  const inputGuard = await trustedResolutionPlugin(
    absoluteSourceRoot,
    allowedInputs,
  );
  try {
    await build({
      absWorkingDir: absoluteSourceRoot,
      entryPoints: ["src/cli.ts"],
      outfile: temporaryOutput,
      bundle: true,
      platform: "node",
      format: "esm",
      target: "node22.13",
      banner: { js: "#!/usr/bin/env node" },
      charset: "utf8",
      legalComments: "none",
      logLevel: "silent",
      minify: false,
      plugins: [inputGuard],
      sourcemap: false,
      treeShaking: true,
      // Candidate tsconfig inheritance can introduce build inputs which do not
      // pass through the module resolver. The release build needs only syntax
      // transformation, so keep that configuration inside the trusted builder.
      tsconfigRaw: {
        compilerOptions: {
          verbatimModuleSyntax: true,
        },
      },
    });
    await chmod(temporaryOutput, 0o755);
    await rename(temporaryOutput, absoluteOutput);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

const isMain = process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  await buildDistribution({ outfile: outputPath(process.argv.slice(2)) });
}
