import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface FeesConfig {
  /** Jito bundle tip, SOL */
  jito: number;
  /** compute-unit price priority fee, SOL */
  priority: number;
  /** trade slippage tolerance, percent */
  slippage: number;
}

export interface NotificationsConfig {
  enabled: boolean;
  /** 0–100 */
  volume: number;
  sound: "Pop" | "Chime" | "Bell";
}

export const DEFAULT_FEES: FeesConfig = { jito: 0.001, priority: 0.0001, slippage: 25 };
export const DEFAULT_NOTIFICATIONS: NotificationsConfig = { enabled: true, volume: 70, sound: "Pop" };

interface SettingsState {
  fees: FeesConfig;
  notifications: NotificationsConfig;
  keywords: string[];
  /** per-highlight notification bell state, keyed by highlight name */
  bells: Record<string, boolean>;

  setFees: (f: FeesConfig) => void;
  setNotifications: (n: Partial<NotificationsConfig>) => void;
  addKeyword: (k: string) => void;
  removeKeyword: (k: string) => void;
  toggleBell: (name: string) => void;
  importState: (raw: unknown) => boolean;
}

type LegacyFees = { jito?: number; priority?: number; slippage?: number };

// Hard sanity caps — mirrored server-side; anything beyond these is a typo.
const MAX_JITO_TIP = 0.5;
const MAX_PRIORITY = 1;
const MAX_SLIPPAGE = 100;

function coerceFees(v: unknown): Partial<FeesConfig> {
  if (!v || typeof v !== "object") return {};
  const o = v as LegacyFees;
  const out: Partial<FeesConfig> = {};
  if (typeof o.jito === "number" && o.jito >= 0) out.jito = Math.min(o.jito, MAX_JITO_TIP);
  if (typeof o.priority === "number" && o.priority >= 0) out.priority = Math.min(o.priority, MAX_PRIORITY);
  if (typeof o.slippage === "number" && o.slippage >= 0) out.slippage = Math.min(o.slippage, MAX_SLIPPAGE);
  return out;
}

function coerceNotifications(v: unknown): Partial<NotificationsConfig> {
  if (!v || typeof v !== "object") return {};
  const o = v as Partial<NotificationsConfig>;
  const out: Partial<NotificationsConfig> = {};
  if (typeof o.enabled === "boolean") out.enabled = o.enabled;
  if (typeof o.volume === "number") out.volume = Math.min(100, Math.max(0, o.volume));
  if (o.sound === "Pop" || o.sound === "Chime" || o.sound === "Bell") out.sound = o.sound;
  return out;
}

/** Persisted under "feesConfig" (same key as legacy). Consumed by deploy + trade flows. */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      fees: DEFAULT_FEES,
      notifications: DEFAULT_NOTIFICATIONS,
      keywords: [],
      bells: {},

      setFees: (fees) => set({ fees: { ...DEFAULT_FEES, ...coerceFees(fees) } }),
      setNotifications: (n) => set((s) => ({ notifications: { ...s.notifications, ...n } })),
      addKeyword: (k) =>
        set((s) => {
          const kw = k.trim().toLowerCase();
          return kw && !s.keywords.includes(kw) ? { keywords: [...s.keywords, kw] } : s;
        }),
      removeKeyword: (k) => set((s) => ({ keywords: s.keywords.filter((x) => x !== k) })),
      toggleBell: (name) => set((s) => ({ bells: { ...s.bells, [name]: !s.bells[name] } })),

      importState: (raw) => {
        if (!raw || typeof raw !== "object") return false;
        const o = raw as Record<string, unknown>;
        // accept both the export shape and the raw zustand-persist shape
        const src = (o.state as Record<string, unknown> | undefined) ?? o;
        const fees = coerceFees(src.fees ?? src); // legacy wrote fees at top level
        const notifications = coerceNotifications(src.notifications);
        const keywords = Array.isArray(src.keywords)
          ? src.keywords.filter((k): k is string => typeof k === "string")
          : undefined;
        const bells =
          src.bells && typeof src.bells === "object" ? (src.bells as Record<string, boolean>) : undefined;
        if (!Object.keys(fees).length && !Object.keys(notifications).length && !keywords && !bells) {
          return false;
        }
        set((s) => ({
          fees: { ...s.fees, ...fees },
          notifications: { ...s.notifications, ...notifications },
          keywords: keywords ?? s.keywords,
          bells: bells ?? s.bells,
        }));
        return true;
      },
    }),
    {
      name: "feesConfig",
      merge: (persisted, current) => {
        const p = persisted as (Partial<SettingsState> & LegacyFees) | undefined;
        const legacyFees = p ? coerceFees(p) : {};
        return {
          ...current,
          fees: { ...current.fees, ...(p?.fees ?? {}), ...legacyFees },
          notifications: { ...current.notifications, ...(p?.notifications ?? {}) },
          keywords: p?.keywords ?? current.keywords,
          bells: p?.bells ?? current.bells,
        };
      },
    }
  )
);

/** Plays a short synthesized notification beep at the configured volume. */
export function playNotificationSound(cfg: NotificationsConfig) {
  if (!cfg.enabled || cfg.volume === 0) return;
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const gain = ctx.createGain();
    gain.gain.value = (cfg.volume / 100) * 0.15;
    gain.connect(ctx.destination);
    const freqs: Record<NotificationsConfig["sound"], [number, number]> = {
      Pop: [660, 440],
      Chime: [880, 1320],
      Bell: [520, 780],
    };
    const [f1, f2] = freqs[cfg.sound];
    [f1, f2].forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = f;
      osc.connect(gain);
      const t = ctx.currentTime + i * 0.09;
      osc.start(t);
      osc.stop(t + 0.12);
    });
    setTimeout(() => void ctx.close(), 600);
  } catch {
    /* audio is best-effort */
  }
}
