import { delimiter, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { PackageCatalog } from "./catalog.ts";
import { loadOffApi, locateRepositoryRoot } from "./off-api.ts";
import { createHttpServer } from "./server.ts";

interface StartOptions {
  readonly repositoryRoot?: string;
  readonly projectRoot?: string;
  readonly roots?: readonly string[];
  readonly port?: number;
  readonly host?: string;
  readonly allowedOrigins?: readonly string[];
}

export async function startServer(options: StartOptions = {}) {
  const repositoryRoot = await locateRepositoryRoot(options.repositoryRoot);
  const projectRoot = resolve(options.projectRoot ?? join(repositoryRoot, "integrations", "openbb-workspace"));
  const additionalRoots = (process.env.OFF_PACKAGE_ROOTS ?? "")
    .split(delimiter)
    .filter((value) => value.length > 0);
  const roots = options.roots ?? [join(repositoryRoot, "examples"), ...additionalRoots];
  const api = await loadOffApi(repositoryRoot);
  const catalog = await PackageCatalog.create(api, roots);
  const host = options.host ?? process.env.OFF_HOST ?? "127.0.0.1";
  if (host !== "127.0.0.1" && host !== "::1") {
    throw new Error("OFF Research Workspace v1 only permits loopback binding");
  }
  const port = options.port ?? Number(process.env.OFF_PORT ?? "7779");
  if (!Number.isInteger(port) || port < 0 || port > 65_535) throw new Error("OFF_PORT must be an integer from 0 through 65535");
  const configuredOrigins = (process.env.OFF_ALLOWED_ORIGINS ?? "")
    .split(",")
    .filter((value) => value.length > 0);
  const allowedOrigins = options.allowedOrigins ?? (configuredOrigins.length > 0 ? configuredOrigins : undefined);
  if (allowedOrigins?.some((value) => {
    try {
      const url = new URL(value);
      return url.protocol !== "https:" || url.origin !== value;
    } catch {
      return true;
    }
  })) {
    throw new Error("OFF_ALLOWED_ORIGINS must contain comma-delimited HTTPS origins without paths");
  }
  const server = createHttpServer({ api, catalog, projectRoot, ...(allowedOrigins === undefined ? {} : { allowedOrigins }) });
  await new Promise<void>((accept, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      accept();
    });
  });
  return { server, catalog, host, port: (server.address() as { port: number }).port };
}

async function main(): Promise<void> {
  const running = await startServer();
  process.stdout.write(`OFF Research Workspace listening on http://${running.host}:${running.port}\n`);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : "Unable to start OFF Research Workspace"}\n`);
    process.exitCode = 1;
  });
}

export * from "./catalog.ts";
export * from "./evaluate.ts";
export * from "./files.ts";
export * from "./off-api.ts";
export * from "./projections.ts";
export * from "./server.ts";
export type * from "./types.ts";
