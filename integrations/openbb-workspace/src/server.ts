import { readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { join } from "node:path";

import { PackageCatalog, resourceOpaqueId } from "./catalog.ts";
import { evaluateRecord, nowWholeSecond, RequestError } from "./evaluate.ts";
import { sanitizeMarkdown, verifiedFile, viewerFiles } from "./files.ts";
import type { OffApi, PackageRecord } from "./types.ts";
import {
  assumptions,
  claimsMarkdown,
  contextMarkdown,
  diagnostics,
  freshness,
  headlineOutputs,
  lineage,
  normalized,
  overview,
  normalizedMarkdown,
  profileResults,
  resources,
  sourceFacts,
  sources,
  workbookBindings,
} from "./projections.ts";

const MAX_JSON_BODY = 32 * 1024;
const MAX_PAGE_SIZE = 200;
const DEFAULT_ALLOWED_ORIGINS = ["https://pro.openbb.co"] as const;

export interface AppOptions {
  readonly api: OffApi;
  readonly catalog: PackageCatalog;
  readonly projectRoot: string;
  readonly allowedOrigins?: readonly string[];
}

function baseHeaders(): Record<string, string> {
  return {
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; sandbox",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  };
}

function applyCors(request: IncomingMessage, response: ServerResponse, allowedOrigins: ReadonlySet<string>): void {
  const origin = request.headers.origin;
  response.setHeader("Vary", "Origin");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, X-OpenBB-User");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (origin === undefined) {
    if (request.headers["sec-fetch-site"] === "cross-site") {
      if (request.method === "GET" && request.url === "/assets/off-workspace.svg") return;
      throw new RequestError(403, "origin_not_allowed", "Cross-site browser requests are not allowed by this local service");
    }
    return;
  }
  if (!allowedOrigins.has(origin)) {
    throw new RequestError(403, "origin_not_allowed", "The request origin is not allowed by this local service");
  }
  response.setHeader("Access-Control-Allow-Origin", origin);
}

function sendJson(response: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}): void {
  response.writeHead(status, { ...baseHeaders(), "Content-Type": "application/json; charset=utf-8", ...headers });
  response.end(JSON.stringify(body));
}

function sendError(response: ServerResponse, error: unknown): void {
  if (error instanceof RequestError) {
    sendJson(response, error.status, { error: { code: error.code, message: error.message } });
    return;
  }
  sendJson(response, 500, { error: { code: "internal_error", message: "The local OFF service could not complete the request." } });
}

function packageRecord(catalog: PackageCatalog, url: URL): PackageRecord {
  const packageId = url.searchParams.get("package_id");
  if (packageId === null || packageId.length === 0) {
    throw new RequestError(400, "package_id_required", "package_id is required");
  }
  const record = catalog.get(packageId);
  if (record === undefined) throw new RequestError(404, "package_not_found", "The opaque package ID was not found");
  return record;
}

function page(url: URL, rows: readonly Record<string, unknown>[]): {
  readonly rows: readonly Record<string, unknown>[];
  readonly headers: Record<string, string>;
} {
  const offsetRaw = url.searchParams.get("offset") ?? "0";
  const limitRaw = url.searchParams.get("limit") ?? String(MAX_PAGE_SIZE);
  if (!/^\d+$/u.test(offsetRaw) || !/^\d+$/u.test(limitRaw)) {
    throw new RequestError(400, "invalid_pagination", "offset and limit must be non-negative integers");
  }
  const offset = Number(offsetRaw);
  const limit = Number(limitRaw);
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
    throw new RequestError(400, "invalid_pagination", `limit must be between 1 and ${MAX_PAGE_SIZE}`);
  }
  return {
    rows: rows.slice(offset, offset + limit),
    headers: {
      "X-OFF-Total": String(rows.length),
      "X-OFF-Offset": String(offset),
      "X-OFF-Limit": String(limit),
      "X-OFF-Truncated": String(offset + limit < rows.length),
    },
  };
}

async function jsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.byteLength;
    if (size > MAX_JSON_BODY) throw new RequestError(413, "request_too_large", "The JSON request exceeds 32 KiB");
    chunks.push(bytes);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new RequestError(400, "invalid_json", "A valid JSON request body is required");
  }
}

async function staticConfiguration(response: ServerResponse, projectRoot: string, name: "widgets.json" | "apps.json"): Promise<void> {
  try {
    const bytes = await readFile(join(projectRoot, name));
    if (bytes.byteLength > 2 * 1024 * 1024) throw new Error("configuration too large");
    JSON.parse(bytes.toString("utf8"));
    response.writeHead(200, { ...baseHeaders(), "Content-Type": "application/json; charset=utf-8" });
    response.end(bytes);
  } catch {
    sendJson(response, 503, {
      error: { code: "configuration_unavailable", message: `${name} is not available or valid in this local project.` },
    });
  }
}

async function staticAsset(response: ServerResponse, projectRoot: string): Promise<void> {
  try {
    const bytes = await readFile(join(projectRoot, "assets", "off-workspace.svg"));
    if (bytes.byteLength > 128 * 1024) throw new Error("asset too large");
    response.writeHead(200, {
      ...baseHeaders(),
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Content-Length": String(bytes.byteLength),
    });
    response.end(bytes);
  } catch {
    sendJson(response, 404, { error: { code: "asset_not_found", message: "The local app image is unavailable." } });
  }
}

export function createApp(options: AppOptions): (request: IncomingMessage, response: ServerResponse) => Promise<void> {
  const allowedOrigins = new Set(options.allowedOrigins ?? DEFAULT_ALLOWED_ORIGINS);
  const defaultEvaluatedAt = nowWholeSecond();
  return async (request, response) => {
    try {
      applyCors(request, response, allowedOrigins);
      if (request.method === "OPTIONS") {
        response.writeHead(204, baseHeaders());
        response.end();
        return;
      }
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      let parsedBody: unknown;
      if (request.method === "POST" && url.pathname === "/off/files") {
        parsedBody = await jsonBody(request);
        const document = typeof parsedBody === "object" && parsedBody !== null ? parsedBody as Record<string, unknown> : {};
        if (typeof document.package_id === "string" && !url.searchParams.has("package_id")) {
          url.searchParams.set("package_id", document.package_id);
        }
        if (typeof document.evaluated_at === "string" && !url.searchParams.has("evaluated_at")) {
          url.searchParams.set("evaluated_at", document.evaluated_at);
        }
      }
      if (request.method === "GET" && url.pathname === "/health") {
        sendJson(response, 200, {
          status: "ok",
          service: "OFF Research Workspace local adapter",
          version: "0.1.0",
          package_count: options.catalog.list().length,
          read_only: true,
          default_evaluated_at: defaultEvaluatedAt,
        });
        return;
      }
      if (request.method === "GET" && (url.pathname === "/widgets.json" || url.pathname === "/apps.json")) {
        await staticConfiguration(response, options.projectRoot, url.pathname.slice(1) as "widgets.json" | "apps.json");
        return;
      }
      if (request.method === "GET" && url.pathname === "/assets/off-workspace.svg") {
        await staticAsset(response, options.projectRoot);
        return;
      }
      if (request.method === "GET" && url.pathname === "/off/packages/options") {
        sendJson(response, 200, options.catalog.list().map((record) => ({
          label: record.title,
          value: record.id,
          extraInfo: { description: `${record.releaseVersion ?? "release unknown"} · ${record.outcome}` },
        })));
        return;
      }

      const record = packageRecord(options.catalog, url);
      const state = await evaluateRecord(options.api, record, url, defaultEvaluatedAt);
      const evaluationHeaders = { "X-OFF-Evaluated-At": state.evaluatedAt };

      if (request.method === "GET" && url.pathname === "/off/overview") {
        sendJson(response, 200, overview(state), evaluationHeaders);
        return;
      }
      if (request.method === "GET" && url.pathname === "/off/context") {
        response.writeHead(200, { ...baseHeaders(), ...evaluationHeaders, "Content-Type": "text/markdown; charset=utf-8" });
        response.end(contextMarkdown(state));
        return;
      }
      if (request.method === "GET" && url.pathname === "/off/claims") {
        response.writeHead(200, { ...baseHeaders(), ...evaluationHeaders, "Content-Type": "text/markdown; charset=utf-8" });
        response.end(claimsMarkdown(state));
        return;
      }
      const tableRoutes: Readonly<Record<string, () => Record<string, unknown>[]>> = {
        "/off/headline-outputs": () => headlineOutputs(state, options.api),
        "/off/assumptions": () => assumptions(state, options.api),
        "/off/source-facts": () => sourceFacts(state, options.api),
        "/off/sources": () => sources(state, options.api),
        "/off/freshness": () => freshness(state),
        "/off/lineage": () => lineage(state),
        "/off/diagnostics": () => diagnostics(state),
        "/off/resources": () => resources(state),
        "/off/workbook-bindings": () => workbookBindings(state, options.api),
        "/off/profile-results": () => profileResults(state),
      };
      const table = request.method === "GET" ? tableRoutes[url.pathname] : undefined;
      if (table !== undefined) {
        const paged = page(url, table());
        sendJson(response, 200, paged.rows, { ...evaluationHeaders, ...paged.headers });
        return;
      }
      if (request.method === "GET" && url.pathname === "/off/normalized") {
        if (state.result.kind === "packageResult") {
          const bytes = Buffer.from(state.result.canonicalBytes);
          response.writeHead(200, {
            ...baseHeaders(),
            ...evaluationHeaders,
            "Content-Type": "application/json; charset=utf-8",
            "Content-Length": String(bytes.byteLength),
          });
          response.end(bytes);
        } else {
          sendJson(response, 200, normalized(state), evaluationHeaders);
        }
        return;
      }
      if (request.method === "GET" && url.pathname === "/off/normalized-view") {
        response.writeHead(200, { ...baseHeaders(), ...evaluationHeaders, "Content-Type": "text/markdown; charset=utf-8" });
        response.end(normalizedMarkdown(state));
        return;
      }
      if (request.method === "GET" && url.pathname === "/off/narrative") {
        if (state.result.kind !== "packageResult") {
          response.writeHead(200, { ...baseHeaders(), ...evaluationHeaders, "Content-Type": "text/markdown; charset=utf-8" });
          response.end("# Narrative unavailable\n\nThe evaluator could not verify a local entrypoint narrative.");
          return;
        }
        const identity = state.result.normalized.packageIdentity;
        const resourceId = typeof identity?.entrypointResourceId === "string" ? identity.entrypointResourceId : undefined;
        if (resourceId === undefined) {
          response.writeHead(200, { ...baseHeaders(), ...evaluationHeaders, "Content-Type": "text/markdown; charset=utf-8" });
          response.end("# Narrative unavailable\n\nThis degraded package has no evaluator-verified entrypoint.");
          return;
        }
        try {
          const file = await verifiedFile(state, resourceOpaqueId(record.id, resourceId), 2 * 1024 * 1024);
          if (file.mediaType !== "text/markdown" && file.mediaType !== "text/plain") {
            throw new RequestError(409, "narrative_format_unsupported", "The verified entrypoint is not safe Markdown or plain text");
          }
          response.writeHead(200, { ...baseHeaders(), ...evaluationHeaders, "Content-Type": "text/markdown; charset=utf-8" });
          response.end(sanitizeMarkdown(Buffer.from(file.bytes).toString("utf8")));
        } catch (error) {
          if (!(error instanceof RequestError)) throw error;
          response.writeHead(200, { ...baseHeaders(), ...evaluationHeaders, "Content-Type": "text/markdown; charset=utf-8" });
          response.end(`# Narrative unavailable\n\n${error.message}`);
        }
        return;
      }
      if (request.method === "POST" && url.pathname === "/off/files") {
        const body = parsedBody;
        const document = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
        const selection = document.file_id ?? document.resource_id;
        const fileIds = typeof selection === "string" ? [selection] : Array.isArray(selection) ? selection : [];
        if (
          fileIds.length > 20 ||
          new Set(fileIds).size !== fileIds.length ||
          !fileIds.every((id): id is string => typeof id === "string" && /^res_[A-Za-z0-9_-]{24}$/u.test(id))
        ) {
          throw new RequestError(400, "invalid_file_selection", "file_id must select no more than 20 unique opaque file IDs");
        }
        sendJson(response, 200, await viewerFiles(state, fileIds), evaluationHeaders);
        return;
      }
      if (request.method === "GET" && url.pathname === "/off/files/options") {
        const rows = resources(state).filter((row) => row.local_file_exposed === true && typeof row.file_id === "string");
        sendJson(response, 200, rows.map((row) => ({
          label: `${String(row.id)} · ${String(row.media_type ?? "file")}`,
          value: row.file_id,
          extraInfo: { description: "Evaluator-verified local resource" },
        })), evaluationHeaders);
        return;
      }
      if (request.method === "GET" && url.pathname.startsWith("/off/files/")) {
        const fileId = url.pathname.slice("/off/files/".length);
        if (!/^res_[A-Za-z0-9_-]{24}$/u.test(fileId)) throw new RequestError(404, "file_not_found", "The opaque file ID was not found");
        const file = await verifiedFile(state, fileId);
        const disposition = file.inline ? "inline" : "attachment";
        response.writeHead(200, {
          ...baseHeaders(),
          ...evaluationHeaders,
          "Content-Type": file.mediaType,
          "Content-Length": String(file.bytes.byteLength),
          "Content-Disposition": `${disposition}; filename="${file.filename}"`,
        });
        response.end(file.bytes);
        return;
      }
      throw new RequestError(404, "route_not_found", "The requested local OFF endpoint does not exist");
    } catch (error) {
      sendError(response, error);
    }
  };
}

export function createHttpServer(options: AppOptions): Server {
  const app = createApp(options);
  return createServer((request, response) => void app(request, response));
}

export { PackageCatalog };
