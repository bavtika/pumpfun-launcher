import { useState } from "react";
import { api } from "../api/client";
import { useAuthStore } from "../stores/auth";
import { FlameIcon } from "../components/ui/icons";
import { inputCls } from "../lib/styles";

export function LoginPage() {
  const setUser = useAuthStore((s) => s.setUser);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [sitePassword, setSitePassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const fn = mode === "login" ? api.login : api.register;
      const { user } = await fn(username.trim(), password, sitePassword);
      setUser(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <form
        onSubmit={(e) => void submit(e)}
        className="w-full max-w-[360px] bg-panel border border-line rounded-lg p-6 flex flex-col gap-3.5"
      >
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-7 h-7 rounded-md bg-white/[0.06] border border-line flex items-center justify-center">
            <FlameIcon size={13} className="text-primary" />
          </div>
          <div>
            <div className="text-[12px] font-semibold tracking-[0.14em] text-primary">LAUNCHER</div>
            <div className="text-[10px] text-dim">Sign in to continue</div>
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] text-muted">Username</span>
          <input
            className={inputCls}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
            required
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] text-muted">Password</span>
          <input
            className={inputCls}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={6}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] text-muted">Access password</span>
          <input
            className={inputCls}
            type="password"
            value={sitePassword}
            onChange={(e) => setSitePassword(e.target.value)}
            autoComplete="off"
            required
          />
        </label>

        {error && <div className="text-[11px] text-danger">{error}</div>}

        <button
          type="submit"
          disabled={busy}
          className="h-9 rounded-md bg-primary text-black text-[12.5px] font-semibold hover:bg-white/85 transition-colors disabled:opacity-60"
        >
          {busy ? "…" : mode === "login" ? "Sign in" : "Create account"}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError(null);
          }}
          className="text-[11px] text-dim hover:text-primary transition-colors"
        >
          {mode === "login" ? "Need an account? Register" : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
