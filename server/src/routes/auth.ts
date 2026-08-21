import { Router } from "express";
import {
  clearSessionCookie,
  cookieSid,
  createSession,
  destroySession,
  loginUser,
  normalizePassword,
  normalizeUsername,
  registerUser,
  setSessionCookie,
  userFromSession,
} from "../lib/auth.js";
import { errMsg } from "../lib/config.js";

const router = Router();

function statusOf(e: unknown): number {
  return (e as { status?: number }).status ?? 500;
}

/** GET /api/auth/me */
router.get("/me", async (req, res) => {
  try {
    const user = await userFromSession(cookieSid(req));
    res.json({ user });
  } catch {
    res.json({ user: null });
  }
});

/** POST /api/auth/register { username, password, sitePassword } */
router.post("/register", async (req, res) => {
  try {
    const username = normalizeUsername(req.body?.username);
    const password = normalizePassword(req.body?.password);
    const user = await registerUser(username, password, req.body?.sitePassword);
    const token = await createSession(user.id);
    setSessionCookie(req, res, token);
    res.json({ user });
  } catch (e) {
    res.status(statusOf(e)).json({ error: errMsg(e) });
  }
});

/** POST /api/auth/login { username, password, sitePassword } */
router.post("/login", async (req, res) => {
  try {
    const username = normalizeUsername(req.body?.username);
    const password = normalizePassword(req.body?.password);
    const user = await loginUser(username, password, req.body?.sitePassword);
    const token = await createSession(user.id);
    setSessionCookie(req, res, token);
    res.json({ user });
  } catch (e) {
    res.status(statusOf(e)).json({ error: errMsg(e) });
  }
});

/** POST /api/auth/logout */
router.post("/logout", async (req, res) => {
  try {
    await destroySession(cookieSid(req));
    clearSessionCookie(req, res);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: errMsg(e) });
  }
});

export default router;
