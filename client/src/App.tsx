import { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import { LauncherPage } from "./pages/LauncherPage";
import { TradePage } from "./pages/TradePage";
import { LoginPage } from "./pages/LoginPage";
import { SolanaGradientDefs } from "./lib/styles";
import { api } from "./api/client";
import { useAuthStore } from "./stores/auth";

export default function App() {
  const user = useAuthStore((s) => s.user);
  const ready = useAuthStore((s) => s.ready);
  const setUser = useAuthStore((s) => s.setUser);
  const clear = useAuthStore((s) => s.clear);

  useEffect(() => {
    void api
      .me()
      .then(({ user: next }) => setUser(next))
      .catch(() => clear());
  }, [clear, setUser]);

  if (!ready) {
    return (
      <>
        <SolanaGradientDefs />
        <div className="h-full flex items-center justify-center text-dim text-xs">Loading…</div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <SolanaGradientDefs />
        <LoginPage />
      </>
    );
  }

  return (
    <>
      <SolanaGradientDefs />
      <Routes>
        <Route path="/" element={<LauncherPage />} />
        <Route path="/trade" element={<TradePage />} />
      </Routes>
    </>
  );
}
