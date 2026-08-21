import { useEffect, useRef, useState } from "react";
import { useUiStore } from "../../stores/ui";
import { useLayoutStore, type WinId } from "../../stores/layout";
import { useSettingsStore, type FeesConfig } from "../../stores/settings";
import { toast } from "../../stores/toast";
import {
  ClockIcon,
  FlameIcon,
  DeploysIcon,
  ChartIcon,
  FeesIcon,
  CheckIcon,
  FeedIcon,
  WalletIcon,
  EarningsIcon,
  SettingsIcon,
} from "../ui/icons";
import { solIcon } from "../../lib/styles";
import type { PageTab } from "../../api/types";

const CHIP_SETS: { key: keyof FeesConfig; title: string; chips: number[]; fmt: (v: number) => string }[] = [
  { key: "jito", title: "Jito Tip", chips: [0.001, 0.003, 0.005, 0.01, 0.02, 0.05], fmt: String },
  { key: "priority", title: "Priority Fee", chips: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05], fmt: String },
  { key: "slippage", title: "Slippage", chips: [5, 10, 25, 50, 75, 100], fmt: (v) => `${v}%` },
];

function FeesDropdown() {
  const { setFeesOpen } = useUiStore();
  const saved = useSettingsStore((s) => s.fees);
  const setSaved = useSettingsStore((s) => s.setFees);
  const [fees, setFees] = useState<FeesConfig>(saved);
  const [customs, setCustoms] = useState<Record<keyof FeesConfig, string>>({
    jito: "",
    priority: "",
    slippage: "",
  });

  const pick = (key: keyof FeesConfig, val: number) => {
    setFees((f) => ({ ...f, [key]: val }));
    setCustoms((c) => ({ ...c, [key]: "" }));
  };

  const setCustom = (key: keyof FeesConfig, raw: string) => {
    setCustoms((c) => ({ ...c, [key]: raw }));
    const v = parseFloat(raw);
    if (Number.isFinite(v) && v >= 0) setFees((f) => ({ ...f, [key]: v }));
  };

  const save = () => {
    setSaved(fees);
    toast("Fees saved ✓", "success");
    setFeesOpen(false);
  };

  return (
    <div
      className="glass glass-pill absolute bottom-[calc(100%+12px)] right-0 w-[268px] p-4 z-[150] animate-[slideUp_0.18s_ease]"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {CHIP_SETS.map((set) => (
        <div key={set.key} className="mb-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-dim mb-1.5">
            <ChartIcon size={12} />
            {set.title}
          </div>
          <div className="grid grid-cols-3 gap-1">
            {set.chips.map((v) => (
              <button
                key={v}
                onClick={() => pick(set.key, v)}
                className={`px-1 py-1.5 rounded-full text-[11px] font-mono transition-colors ${
                  fees[set.key] === v && customs[set.key] === ""
                    ? "glass-inset text-primary"
                    : "text-muted hover:text-primary hover:bg-hover"
                }`}
              >
                {set.fmt(v)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <ChartIcon />
            <input
              type="number"
              step="any"
              placeholder="Custom"
              value={customs[set.key]}
              onChange={(e) => setCustom(set.key, e.target.value)}
              className="w-full px-3 py-1.5 glass-input rounded-full text-[11px] text-primary font-mono placeholder:text-dim outline-none transition-colors"
            />
          </div>
        </div>
      ))}

      <div className="pt-2 border-t border-white/10">
        <button
          onClick={save}
          className="w-full h-8 flex items-center justify-center gap-1.5 rounded-full bg-primary text-black text-xs font-semibold hover:bg-white/85 transition-colors"
        >
          <CheckIcon />
          Save
        </button>
      </div>
    </div>
  );
}

const WIN_BUTTONS: { id: WinId; label: string; icon: React.ReactNode }[] = [
  { id: "ct", label: "CT Tracker", icon: <ClockIcon /> },
  { id: "form", label: "Create Coin", icon: <FlameIcon size={12} /> },
  { id: "deploys", label: "Deploys", icon: <DeploysIcon /> },
];

const NAV_ITEMS: { key: PageTab; label: string; icon: React.ReactNode }[] = [
  { key: "feed", label: "Feed", icon: <FeedIcon /> },
  { key: "wallets", label: "Wallets", icon: <WalletIcon /> },
  { key: "earnings", label: "Earnings", icon: <EarningsIcon /> },
  { key: "settings", label: "Settings", icon: <SettingsIcon /> },
];

function useBackendHealth() {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const r = await fetch("/api/health");
        if (alive) setOk(r.ok);
      } catch {
        if (alive) setOk(false);
      }
    };
    void check();
    const t = setInterval(() => void check(), 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  return ok;
}

function useSolPrice() {
  const [usd, setUsd] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
        );
        const d = (await r.json()) as { solana?: { usd?: number } };
        if (alive && typeof d.solana?.usd === "number") setUsd(d.solana.usd);
      } catch {
        /* price feed is best-effort */
      }
    };
    void load();
    const t = setInterval(() => void load(), 60000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  return usd;
}

export function BottomBar() {
  const { activePage, setActivePage, feesOpen, setFeesOpen } = useUiStore();
  const { wins, openWin } = useLayoutStore();
  const feesRef = useRef<HTMLDivElement>(null);
  const health = useBackendHealth();
  const solUsd = useSolPrice();

  useEffect(() => {
    if (!feesOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (feesRef.current && !feesRef.current.contains(e.target as Node)) {
        setFeesOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [feesOpen, setFeesOpen]);

  return (
    <footer className="fixed bottom-3.5 left-0 right-0 z-[100] flex items-center justify-center gap-2.5 px-3 pointer-events-none">
      {/* status chip */}
      <div
        className="glass glass-pill pointer-events-auto h-12 flex items-center gap-2.5 px-5"
        title={health === false ? "Backend unreachable" : "Backend connected"}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full transition-colors ${
            health === false ? "bg-danger" : "bg-green"
          }`}
        />
        <span className="text-[11px] text-muted">{health === false ? "Offline" : "Connected"}</span>
        <span className="w-px h-4 bg-white/15" />
        <span className="flex items-center gap-1.5 text-[11px] font-mono text-muted" title="SOL / USD (CoinGecko, 60s)">
          {solIcon}
          <span className={solUsd === null ? "text-dim" : "text-primary"}>
            {solUsd === null ? "$—" : `$${solUsd.toFixed(2)}`}
          </span>
        </span>
      </div>

      {/* center dock: nav + window toggles */}
      <nav className="glass glass-pill pointer-events-auto h-12 flex items-center gap-1 px-1.5" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => {
          const active = activePage === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setActivePage(active ? "feed" : item.key)}
              aria-current={active ? "page" : undefined}
              className={`relative z-[1] flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[12.5px] transition-colors ${
                active
                  ? "bg-white/20 text-primary shadow-[0_0.5px_0_rgba(255,255,255,0.35)_inset]"
                  : "text-muted hover:text-primary hover:bg-white/10"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}

        <span className="w-px h-5 bg-white/15 mx-1" />

        {WIN_BUTTONS.map((b) => {
          const open = !wins[b.id].hidden;
          return (
            <button
              key={b.id}
              onClick={() => {
                setActivePage("feed");
                openWin(b.id);
              }}
              title={b.label}
              className={`relative z-[1] w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
                open ? "text-primary bg-white/18" : "text-dim hover:text-muted hover:bg-white/10"
              }`}
            >
              {b.icon}
            </button>
          );
        })}
      </nav>

      {/* fees chip */}
      <div className="relative pointer-events-auto" ref={feesRef}>
        <button
          onClick={() => setFeesOpen(!feesOpen)}
          className={`glass glass-pill h-12 px-5 flex items-center gap-1.5 text-[12.5px] transition-colors ${
            feesOpen ? "text-primary glass-active" : "text-muted hover:text-primary"
          }`}
        >
          <FeesIcon />
          Fees
        </button>
        {feesOpen && <FeesDropdown />}
      </div>
    </footer>
  );
}
