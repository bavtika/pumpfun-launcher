import { useRef, useState } from "react";
import { useUiStore } from "../stores/ui";
import {
  useSettingsStore,
  playNotificationSound,
  type FeesConfig,
} from "../stores/settings";
import { toast } from "../stores/toast";
import { Toggle } from "../components/ui/Toggle";
import { Slider } from "../components/ui/Slider";
import { inputCls } from "../lib/styles";

const SECTIONS = [
  { key: "filters", label: "Filters" },
  { key: "fees", label: "Fees" },
  { key: "notifications", label: "Notifications" },
  { key: "privacy", label: "Privacy" },
  { key: "theme", label: "Theme" },
  { key: "export", label: "Export / Import" },
] as const;

const HL_ITEMS = [
  { name: "Token Symbols", tag: "$ROAR", tagCls: "text-[#fcbb00] bg-[#fcbb0015] border-[#fcbb0030]", desc: "Symbol tokens like $ROAR, $PUMP, $SOL, etc", color: "#fcbb00" },
  { name: "Pump Addresses", tag: "G1oZqp...pump", tagCls: "text-[#4ade80] bg-[#4ade8015] border-[#4ade8030]", desc: "Pump.fun contract addresses", color: "#4ade80" },
  { name: "Hashtags", tag: "#solana", tagCls: "text-[#60a5fa] bg-[#60a5fa15] border-[#60a5fa30]", desc: "Twitter hashtags in tweets", color: "#60a5fa" },
  { name: "Mentions", tag: "@devving", tagCls: "text-[#60a5fa] bg-[#60a5fa15] border-[#60a5fa30]", desc: "User @mentions in tweets", color: "#60a5fa" },
  { name: "URLs", tag: "pump.fun/coin/...", tagCls: "text-[#60a5fa] bg-[#60a5fa15] border-[#60a5fa30]", desc: "Links embedded in tweets", color: "#60a5fa" },
];

const SECTION_TITLE = "text-[10px] font-bold text-dim uppercase tracking-[0.08em] mb-3";
const SECTION_WRAP = "glass-inset rounded-[18px] p-4 mb-3";
const SUB_TEXT = "text-[11px] text-dim leading-relaxed";

function BellBtn({ name }: { name: string }) {
  const on = useSettingsStore((s) => !!s.bells[name]);
  const toggleBell = useSettingsStore((s) => s.toggleBell);
  return (
    <button
      onClick={() => toggleBell(name)}
      title={on ? "Notifications on" : "Notifications off"}
      className={`w-6 h-6 flex items-center justify-center rounded-sm transition-colors ${
        on ? "text-amber bg-[#fcbb0015]" : "text-dim hover:text-primary hover:bg-hover"
      }`}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path
          d="M6 2c-1.7 0-3 1.3-3 3v2.5L2 9h8L9 7.5V5c0-1.7-1.3-3-3-3zM5 10a1 1 0 002 0"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function FiltersSection() {
  const [keyword, setKeyword] = useState("");
  const keywords = useSettingsStore((s) => s.keywords);
  const addKeyword = useSettingsStore((s) => s.addKeyword);
  const removeKeyword = useSettingsStore((s) => s.removeKeyword);

  const submit = () => {
    if (!keyword.trim()) return;
    addKeyword(keyword);
    setKeyword("");
  };

  return (
    <>
      <div className="mb-4">
        <div className="text-sm font-semibold text-primary">Filters & Highlights</div>
        <div className={`${SUB_TEXT} mt-0.5`}>
          Customize how elements are highlighted in tweets. Enable the bell to get notified when matching content appears.
        </div>
      </div>

      <div className={SECTION_WRAP}>
        <div className="flex items-center justify-between mb-3">
          <div className={`${SECTION_TITLE} !mb-0`}>Highlight Colors</div>
        </div>
        <div className="flex flex-col gap-1.5">
          {HL_ITEMS.map((h) => (
            <div key={h.name} className="flex items-center gap-3 px-2.5 py-2 glass-inset rounded-[14px]">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-primary flex items-center gap-2">
                  {h.name}
                  <span className={`text-[9px] font-mono border rounded px-1 py-px ${h.tagCls}`}>{h.tag}</span>
                </div>
                <div className="text-[10px] text-dim">{h.desc}</div>
              </div>
              <BellBtn name={h.name} />
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: h.color }} />
            </div>
          ))}
        </div>
      </div>

      <div className={SECTION_WRAP}>
        <div className="flex items-center justify-between mb-1">
          <div className={`${SECTION_TITLE} !mb-0`}>Keywords Tracker</div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#fcbb00]" />
            <BellBtn name="keywords" />
          </div>
        </div>
        <div className={`${SUB_TEXT} mb-2`}>Highlight and get notified for specific words or phrases in tweets.</div>
        <div className="flex gap-1.5">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder="Type a keyword and press Enter..."
            className={inputCls}
          />
          <button
            onClick={submit}
            title="Add keyword"
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full glass-inset text-muted hover:text-primary hover:bg-hover transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {keywords.length === 0 ? (
          <div className="text-[11px] text-dim mt-2">No keywords added yet.</div>
        ) : (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {keywords.map((k) => (
              <span
                key={k}
                className="flex items-center gap-1 h-6 pl-2 pr-1 rounded-sm bg-[#fcbb0010] border border-[#fcbb0030] text-[11px] font-mono text-[#fcbb00]"
              >
                {k}
                <button
                  onClick={() => removeKeyword(k)}
                  title="Remove"
                  className="w-4 h-4 flex items-center justify-center rounded-sm text-[#fcbb00]/60 hover:text-[#fcbb00] hover:bg-[#fcbb0020] transition-colors"
                >
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className={SECTION_WRAP}>
        <div className={`${SECTION_TITLE} flex items-center gap-1.5`}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 6c1.5-2.5 4-4 5-4s3.5 1.5 5 4c-1.5 2.5-4 4-5 4s-3.5-1.5-5-4z" stroke="currentColor" strokeWidth="1" />
            <circle cx="6" cy="6" r="1.5" stroke="currentColor" strokeWidth="1" />
            <path d="M2.5 2.5l7 7" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          </svg>
          Hidden Accounts
        </div>
        <div className={`${SUB_TEXT} mb-2`}>Accounts hidden from the feed. Click the eye icon on any tweet card to hide.</div>
        <div className="text-[11px] text-dim">No hidden accounts.</div>
      </div>
    </>
  );
}

function FeeGrid({
  options,
  value,
  onPick,
}: {
  options: number[];
  value: number;
  onPick: (v: number) => void;
}) {
  return (
    <div className="grid grid-cols-6 gap-1.5">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onPick(o)}
          className={`h-7 rounded-sm border text-[11px] font-mono transition-colors ${
            value === o
              ? "border-accent/50 bg-accent/10 text-accent"
              : "border-line bg-white/[0.02] text-muted hover:text-primary hover:bg-white/[0.04]"
          }`}
        >
          {o < 1 ? String(o) : `${o}%`}
        </button>
      ))}
    </div>
  );
}

function FeesSection() {
  const fees = useSettingsStore((s) => s.fees);
  const setFees = useSettingsStore((s) => s.setFees);
  const [draft, setDraft] = useState<FeesConfig>(fees);
  const dirty = JSON.stringify(draft) !== JSON.stringify(fees);

  const save = () => {
    setFees(draft);
    toast("Fees saved ✓", "success");
  };

  return (
    <>
      <div className="mb-4">
        <div className="text-sm font-semibold text-primary">Fees</div>
        <div className={`${SUB_TEXT} mt-0.5`}>
          Configure transaction fees for your deploys and trades. Applies to new deploys and trade panels.
        </div>
      </div>

      <div className={SECTION_WRAP}>
        <div className={SECTION_TITLE}>Jito Tip</div>
        <FeeGrid
          options={[0.001, 0.005, 0.01, 0.05, 0.1, 0.2]}
          value={draft.jito}
          onPick={(v) => setDraft((d) => ({ ...d, jito: v }))}
        />
      </div>
      <div className={SECTION_WRAP}>
        <div className={SECTION_TITLE}>Priority Fee</div>
        <FeeGrid
          options={[0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05]}
          value={draft.priority}
          onPick={(v) => setDraft((d) => ({ ...d, priority: v }))}
        />
      </div>
      <div className={SECTION_WRAP}>
        <div className={SECTION_TITLE}>Slippage</div>
        <FeeGrid
          options={[5, 10, 20, 50, 75, 100]}
          value={draft.slippage}
          onPick={(v) => setDraft((d) => ({ ...d, slippage: v }))}
        />
      </div>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={!dirty}
          className={`flex items-center gap-1.5 h-8 px-4 rounded-sm bg-accent text-black text-xs font-medium transition-all ${
            dirty ? "hover:brightness-110" : "opacity-40 cursor-not-allowed"
          }`}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Save
        </button>
      </div>
    </>
  );
}

function NotificationsSection() {
  const notif = useSettingsStore((s) => s.notifications);
  const setNotifications = useSettingsStore((s) => s.setNotifications);

  return (
    <>
      <div className="mb-4">
        <div className="text-sm font-semibold text-primary">Notifications</div>
        <div className={`${SUB_TEXT} mt-0.5`}>Configure notification sounds and volume.</div>
      </div>

      <div className={`${SECTION_WRAP} flex items-center justify-between`}>
        <div>
          <div className="text-xs text-primary">Enable Notifications</div>
          <div className="text-[10px] text-dim mt-0.5">Play sounds for feed events and alerts</div>
        </div>
        <Toggle checked={notif.enabled} onChange={(v) => setNotifications({ enabled: v })} />
      </div>

      <div className={SECTION_WRAP}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-primary">Volume</div>
          <div className="text-[11px] font-mono text-muted">{notif.volume}%</div>
        </div>
        <Slider
          value={notif.volume}
          min={0}
          max={100}
          onChange={(v) => setNotifications({ volume: v })}
          labels={["Min", "Max"]}
        />
      </div>

      <div className={SECTION_WRAP}>
        <div className="text-xs text-primary mb-2">Notification Sound</div>
        <div className="flex gap-1.5">
          <select
            value={notif.sound}
            onChange={(e) => setNotifications({ sound: e.target.value as typeof notif.sound })}
            className={`${inputCls} appearance-none cursor-pointer`}
          >
            <option>Pop</option>
            <option>Chime</option>
            <option>Bell</option>
          </select>
          <button
            onClick={() => playNotificationSound({ ...notif, enabled: true })}
            title="Play test sound"
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full glass-inset text-muted hover:text-primary hover:bg-hover transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M3 2v6l5-3z" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}

function ThemeSection() {
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-semibold text-primary">Theme</div>
          <div className={`${SUB_TEXT} mt-0.5`}>Customize the look of the platform.</div>
        </div>
      </div>
      <div className={SECTION_WRAP}>
        <div className="text-[11px] text-dim">Dark theme is always on.</div>
      </div>
    </>
  );
}

function ExportImportSection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const importState = useSettingsStore((s) => s.importState);

  const doExport = () => {
    const s = useSettingsStore.getState();
    const payload = {
      fees: s.fees,
      notifications: s.notifications,
      keywords: s.keywords,
      bells: s.bells,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pumpfun-launcher-settings.json";
    a.click();
    URL.revokeObjectURL(url);
    toast("Settings exported ✓", "success");
  };

  const doImport = async (file: File) => {
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (importState(parsed)) {
        toast("Settings imported ✓", "success");
      } else {
        toast("File does not contain valid settings", "error");
      }
    } catch {
      toast("Could not parse settings file", "error");
    }
  };

  return (
    <>
      <div className="mb-4">
        <div className="text-sm font-semibold text-primary">Export / Import</div>
        <div className={`${SUB_TEXT} mt-0.5`}>Back up or restore your settings (fees, notifications, keywords).</div>
      </div>
      <div className={SECTION_WRAP}>
        <div className="flex gap-2">
          <button
            onClick={doExport}
            className="flex items-center gap-1.5 h-8 px-4 rounded-full glass-inset text-xs text-muted hover:text-primary hover:bg-hover transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M6 8V1M3.5 5.5L6 8l2.5-2.5M2 10.5h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Export JSON
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 h-8 px-4 rounded-full glass-inset text-xs text-muted hover:text-primary hover:bg-hover transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M6 4v7M3.5 6.5L6 4l2.5 2.5M2 1.5h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Import JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void doImport(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>
    </>
  );
}

export function SettingsPage() {
  const section = useUiStore((s) => s.activeSettingsSection);
  const setSection = useUiStore((s) => s.setActiveSettingsSection);

  return (
    <div className="h-full flex">
      <div className="w-[180px] shrink-0 border-r border-white/10 bg-white/[0.04] p-3 flex flex-col gap-1">
        <div className="text-[10px] font-bold text-dim uppercase tracking-[0.08em] px-2 py-2">
          Settings
        </div>
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className={`flex items-center gap-2 px-2.5 py-2 rounded-sm text-xs text-left transition-colors ${
              section === s.key ? "bg-white/[0.06] text-primary" : "text-muted hover:text-primary hover:bg-white/[0.03]"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {section === "filters" && <FiltersSection />}
        {section === "fees" && <FeesSection />}
        {section === "notifications" && <NotificationsSection />}
        {section === "privacy" && (
          <>
            <div className="mb-4">
              <div className="text-sm font-semibold text-primary">Privacy</div>
              <div className={`${SUB_TEXT} mt-0.5`}>Manage your privacy settings and connected apps.</div>
            </div>
            <div className="text-[11px] text-dim">No privacy settings available.</div>
          </>
        )}
        {section === "theme" && <ThemeSection />}
        {section === "export" && <ExportImportSection />}
      </div>
    </div>
  );
}
