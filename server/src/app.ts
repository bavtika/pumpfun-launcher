import express, { type RequestHandler, type Router } from "express";
import path from "path";
import { existsSync } from "fs";
import { CLIENT_DIST } from "./lib/config.js";
import { requireAuth } from "./middleware/requireAuth.js";
import authRouter from "./routes/auth.js";

function lazy(load: () => Promise<{ default: Router }>): RequestHandler {
  let router: Router | undefined;
  let pending: Promise<Router> | undefined;
  return (req, res, next) => {
    const use = (r: Router) => {
      r(req, res, next);
    };
    if (router) {
      use(router);
      return;
    }
    pending ??= load()
      .then((m) => {
        router = m.default;
        return router;
      })
      .catch((err) => {
        pending = undefined;
        throw err;
      });
    pending.then(use).catch(next);
  };
}

export function createApp(): express.Express {
  const app = express();
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });
  app.use("/api/auth", authRouter);
  app.use("/api", requireAuth);
  app.use("/api", lazy(() => import("./routes/misc.js")));
  app.use("/api/wallets", lazy(() => import("./routes/wallets.js")));
  app.use("/api/deploy", lazy(() => import("./routes/deploy.js")));
  app.use("/api/trade", lazy(() => import("./routes/trade.js")));
  app.use("/api/vamp", lazy(() => import("./routes/vamp.js")));
  app.use("/api/vanity", lazy(() => import("./routes/vanity.js")));
  app.use("/api/earnings", lazy(() => import("./routes/earnings.js")));

  if (existsSync(CLIENT_DIST)) {
    app.use(express.static(CLIENT_DIST));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(path.join(CLIENT_DIST, "index.html"));
    });
  }

  app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) {
      next(err);
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api]", err);
    res.status(500).json({ error: message });
  });

  return app;
}
