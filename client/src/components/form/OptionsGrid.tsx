import { useEffect } from "react";
import { useFormStore } from "../../stores/form";
import { useWalletsStore } from "../../stores/wallets";
import { useUiStore, type PopoverKey } from "../../stores/ui";
import { Toggle } from "../ui/Toggle";
import { MayhemIcon } from "../ui/icons";
import type { DeployOptions } from "../../api/types";
import { toast } from "../../stores/toast";
import { defaultFeeShares, resolveDevPubkey } from "../../lib/feeShares";

type OptionKey = keyof DeployOptions;

/** neutral checked-state color (design tokens get rebuilt from scratch) */
const CHECKED = "#e5e5e5";

const GEAR = (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
    <path
      d="M6 4.5A1.5 1.5 0 1 0 6 7.5 1.5 1.5 0 0 0 6 4.5ZM10 6a4 4 0 0 0-.05-.65l1.15-.9a.3.3 0 0 0 .07-.38l-1.09-1.89a.3.3 0 0 0-.36-.13l-1.36.55a4 4 0 0 0-1.12-.65L7.04.44a.3.3 0 0 0-.3-.23H5.26a.3.3 0 0 0-.3.23l-.2 1.51a4 4 0 0 0-1.13.65l-1.36-.55a.3.3 0 0 0-.36.13L.82 4.07a.3.3 0 0 0 .07.38l1.15.9a4 4 0 0 0 0 1.3l-1.15.9a.3.3 0 0 0-.07.38l1.09 1.89a.3.3 0 0 0 .36.13l1.36-.55a4 4 0 0 0 1.12.65l.2 1.51a.3.3 0 0 0 .3.23h1.48a.3.3 0 0 0 .3-.23l.2-1.51a4 4 0 0 0 1.13-.65l1.36.55a.3.3 0 0 0 .36-.13l1.09-1.89a.3.3 0 0 0-.07-.38l-1.15-.9c.03-.21.05-.43.05-.65Z"
      stroke="currentColor"
      strokeWidth="0.9"
    />
  </svg>
);

interface OptDef {
  key: OptionKey;
  icon: React.ReactNode;
  label: React.ReactNode;
  disabled?: boolean;
}

const OPTIONS: OptDef[] = [
  {
    key: "bundle",
    icon: (
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
        <path d="M6.5 1L11 3.25v5L6.5 10.5 2 8.25v-5L6.5 1Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
        <path d="M6.5 5.75L11 3.25M6.5 5.75L2 3.25M6.5 5.75v4.75" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
      </svg>
    ),
    label: "Bundle",
  },
  {
    key: "snipe",
    icon: (
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
        <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.1" />
        <path d="M6.5 2v1.5M6.5 9.5V11M2 6.5h1.5M9.5 6.5H11" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        <circle cx="6.5" cy="6.5" r="1.2" fill="currentColor" />
      </svg>
    ),
    label: "Snipe",
    disabled: true,
  },
  {
    key: "multideploy",
    icon: (
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
        <rect x="1.5" y="1.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.1" />
        <rect x="7" y="1.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.1" />
        <rect x="1.5" y="7" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.1" />
        <rect x="7" y="7" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.1" />
      </svg>
    ),
    label: "Multideploy",
  },
  {
    key: "mayhem",
    icon: <MayhemIcon />,
    label: "Mayhem",
  },
  {
    key: "farmsnipers",
    icon: (
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
        <path d="M11.5 2.5c-2 0-5 .5-6.5 2L3.5 3C3 2.5 2.5 3 2.5 3.5V5l1.5 1.5c1.5-1.5 2-4.5 2-4.5" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
        <path d="M1.5 11.5c1-3 3-6 5.5-8l2.5 2.5c-2 2.5-5 4.5-8 5.5Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
      </svg>
    ),
    label: "Farm Snipers",
    disabled: true,
  },
  {
    key: "feesharing",
    icon: (
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
        <rect x="1" y="3" width="11" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="1.1" />
        <path d="M1 5.5h11" stroke="currentColor" strokeWidth="1.1" />
        <path d="M3 8.5h2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      </svg>
    ),
    label: "Fee Sharing",
  },
  {
    key: "agent",
    icon: (
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
        <rect x="2" y="4" width="9" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.1" />
        <path d="M6.5 1.5V4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        <circle cx="6.5" cy="1.5" r="0.8" fill="currentColor" />
        <circle cx="4.5" cy="7" r="0.8" fill="currentColor" />
        <circle cx="8.5" cy="7" r="0.8" fill="currentColor" />
      </svg>
    ),
    label: "Agent",
  },
  {
    key: "cashback",
    icon: (
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
        <path d="M11 7A5 5 0 1 1 8 2.8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        <path d="M11 2v2.5H8.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    label: "Cashback",
  },
];

export function OptionsGrid() {
  const options = useFormStore((s) => s.options);
  const setOption = useFormStore((s) => s.setOption);
  const tradePanelEnabled = useFormStore((s) => s.tradePanelEnabled);
  const setField = useFormStore((s) => s.setField);
  const togglePopover = useUiStore((s) => s.togglePopover);

  // Options marked as disabled (in development) can never stay on.
  useEffect(() => {
    OPTIONS.forEach((o) => {
      if (o.disabled && useFormStore.getState().options[o.key]) setOption(o.key, false);
    });
  }, [setOption]);

  return (
    <div>
      <div className="flex items-center justify-between text-[11px] font-medium text-muted mb-1.5">
        <span>Options</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-dim">Trade Panel</span>
          <Toggle checked={tradePanelEnabled} onChange={(v) => setField("tradePanelEnabled", v)} />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 mt-1">
        {OPTIONS.map((o) => {
          const checked = options[o.key];
          return (
            <label
              key={o.key}
              className={`group relative flex items-center gap-2 px-3.5 py-2.5 cursor-pointer rounded-md border transition-colors select-none ${
                o.disabled
                  ? "opacity-35 cursor-not-allowed border-line bg-white/[0.02]"
                  : checked
                    ? "border-line-focus bg-white/[0.08]"
                    : "border-line bg-white/[0.02] hover:bg-white/[0.05]"
              }`}
            >
              <input
                type="checkbox"
                className="hidden"
                checked={checked}
                disabled={o.disabled}
                onChange={(e) => {
                  const on = e.target.checked;
                  if (o.key === "feesharing" && on && options.cashback) {
                    toast("Fee sharing cannot be combined with cashback", "error");
                    return;
                  }
                  if (o.key === "cashback" && on && options.feesharing) {
                    toast("Cashback cannot be combined with fee sharing", "error");
                    return;
                  }
                  if (o.key === "feesharing" && on) {
                    const { wallets, selectedPubkey } = useWalletsStore.getState();
                    useFormStore.getState().setField(
                      "feeShares",
                      defaultFeeShares(resolveDevPubkey(wallets, selectedPubkey))
                    );
                  }
                  setOption(o.key, on);
                }}
              />
              <span
                className="w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center shrink-0 transition-colors"
                style={
                  checked
                    ? { background: CHECKED, borderColor: CHECKED }
                    : { borderColor: "rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.04)" }
                }
              >
                {checked && (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4L3 5.5L6.5 2" stroke="#0a0a0a" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className={`shrink-0 transition-colors flex items-center ${checked ? "text-primary" : "text-dim"}`}>
                {o.icon}
              </span>
              <span className={`text-xs font-medium whitespace-nowrap transition-colors ${checked ? "text-primary" : "text-muted"}`}>
                {o.label}
              </span>
              {!o.disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    togglePopover(o.key as Exclude<PopoverKey, null>, e.currentTarget.getBoundingClientRect());
                  }}
                  className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 items-center justify-center rounded text-dim hover:text-primary hover:bg-white/[0.08] transition-colors ${
                    checked ? "flex" : "hidden group-hover:flex"
                  }`}
                >
                  {GEAR}
                </button>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}
