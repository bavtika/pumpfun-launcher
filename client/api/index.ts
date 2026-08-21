import type { IncomingMessage, ServerResponse } from "node:http";

type App = (req: IncomingMessage, res: ServerResponse) => void;

let app: App | undefined;
let appError: string | undefined;

function pathnameOf(req: IncomingMessage): string {
  const raw = req.url || "/";
  const q = raw.indexOf("?");
  return q === -1 ? raw : raw.slice(0, q);
}

/** Vercel rewrites /api/* onto this function; keep the browser path for Express. */
function restoreOriginalUrl(req: IncomingMessage): void {
  const current = pathnameOf(req);
  if (current !== "/api" && current !== "/api/") return;
  const invoke = req.headers["x-invoke-path"];
  if (typeof invoke !== "string" || !invoke.startsWith("/api")) return;
  const path = invoke.split("?")[0];
  const searchIdx = (req.url || "").indexOf("?");
  const search = searchIdx >= 0 ? (req.url || "").slice(searchIdx) : "";
  req.url = path + search;
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

async function getApp(): Promise<App> {
  if (app) return app;
  if (appError) throw new Error(appError);
  try {
    const { createApp } = await import("../../server/src/app.js");
    app = createApp() as unknown as App;
    return app;
  } catch (e) {
    appError = e instanceof Error ? e.stack || e.message : String(e);
    throw e;
  }
}

function runExpress(expressApp: App, req: IncomingMessage, res: ServerResponse): Promise<void> {
  return new Promise((resolve, reject) => {
    const done = () => resolve();
    res.once("finish", done);
    res.once("close", done);
    res.once("error", reject);
    try {
      expressApp(req, res);
      if (res.writableEnded) done();
    } catch (e) {
      reject(e);
    }
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  restoreOriginalUrl(req);
  if (pathnameOf(req) === "/api/health" || pathnameOf(req) === "/health") {
    json(res, 200, { ok: true });
    return;
  }
  try {
    const expressApp = await getApp();
    await runExpress(expressApp, req, res);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[api]", e);
    if (!res.headersSent) json(res, 500, { error: message });
  }
}
