import type { NextFunction, Request, Response } from "express";
import { cookieSid, userFromSession } from "../lib/auth.js";
import { ensureSchema } from "../lib/db.js";
import { errMsg } from "../lib/config.js";

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const path = req.path;
  if (path === "/health" || path === "/api/health" || req.originalUrl.split("?")[0].endsWith("/health")) {
    next();
    return;
  }
  try {
    await ensureSchema();
    const user = await userFromSession(cookieSid(req));
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    (req as Request & { userId: string }).userId = user.id;
    next();
  } catch (e) {
    res.status(500).json({ error: errMsg(e) });
  }
}
