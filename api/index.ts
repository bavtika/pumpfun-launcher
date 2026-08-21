import type { IncomingMessage, ServerResponse } from "node:http";

type App = (req: IncomingMessage, res: ServerResponse) => void;

let app: App | undefined;

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    if (!app) {
      const { createApp } = await import("../server/src/app.js");
      app = createApp() as unknown as App;
    }
    app(req, res);
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
