import type { IncomingMessage, ServerResponse } from "node:http";

type App = (req: IncomingMessage, res: ServerResponse) => void;

let app: App | undefined;
let appError: string | undefined;

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

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const expressApp = await getApp();
    expressApp(req, res);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[api]", e);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: message }));
    }
  }
}
