import express from "express";
import path from "path";
import { existsSync } from "fs";
import { CLIENT_DIST } from "./lib/config.js";
import { requireAuth } from "./middleware/requireAuth.js";
import authRouter from "./routes/auth.js";
import walletsRouter from "./routes/wallets.js";
import deployRouter from "./routes/deploy.js";
import tradeRouter from "./routes/trade.js";
import vampRouter from "./routes/vamp.js";
import vanityRouter from "./routes/vanity.js";
import earningsRouter from "./routes/earnings.js";
import miscRouter from "./routes/misc.js";

export function createApp(): express.Express {
  const app = express();
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "2mb" }));

  app.use("/api/auth", authRouter);
  app.use("/api", requireAuth);
  app.use("/api", miscRouter);
  app.use("/api/wallets", walletsRouter);
  app.use("/api/deploy", deployRouter);
  app.use("/api/trade", tradeRouter);
  app.use("/api/vamp", vampRouter);
  app.use("/api/vanity", vanityRouter);
  app.use("/api/earnings", earningsRouter);

  // Serve the built SPA only — never the project root (protects .env).
  if (existsSync(CLIENT_DIST)) {
    app.use(express.static(CLIENT_DIST));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(path.join(CLIENT_DIST, "index.html"));
    });
  }

  return app;
}
