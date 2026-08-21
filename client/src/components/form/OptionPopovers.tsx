import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useUiStore, type PopoverKey } from "../../stores/ui";
import { useWalletsStore } from "../../stores/wallets";
import { useFormStore, resolveCloneWalletPubkeys } from "../../stores/form";
import { Slider } from "../ui/Slider";
import { Toggle } from "../ui/Toggle";
import { inputCls, popBtnCls, solIcon } from "../../lib/styles";
import { truncateAddress } from "../../lib/format";
import {
  MAX_FEE_SHAREHOLDERS,
  applyDevToFeeShares,
  defaultFeeShares,
  feeShareError,
  resolveDevPubkey,
  setSharePct,
  splitEqualPct,
  withDevRemainder,
} from "../../lib/feeShares";

/* ---------- shell ---------- */

function PopoverShell({
  popKey,
  width,
  children,
}: {
  popKey: Exclude<PopoverKey, null>;
  width: number;
  children: React.ReactNode;
}) {
  const active = useUiStore((s) => s.activePopover);
  const anchor = useUiStore((s) => s.popoverAnchor);
  const closePopover = useUiStore((s) => s.closePopover);
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({ visibility: "hidden" });

  const open = active === popKey && anchor;

  useLayoutEffect(() => {
    if (!open) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const next: React.CSSProperties = { top: anchor.top, left: anchor.left };
    if (anchor.left + rect.width > window.innerWidth - 10) {
      next.left = Math.max(10, window.innerWidth - rect.width - 10);
    }
    if (anchor.top + rect.height > window.innerHeight) {
      next.top = Math.max(10, window.innerHeight - rect.height - 10);
    }
    setStyle(next);
  }, [open, anchor]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      onMouseDown={(e) => e.stopPropagation()}
      className="fixed z-[200] glass rounded-[22px] overflow-hidden animate-[slideUp_0.18s_ease]"
      style={{ ...style, width }}
    >
      {children}
    </div>
  );
}

const POP_HEADER =
  "flex items-center justify-between px-3 py-2 border-b border-white/10 text-[11px] font-semibold text-primary";
const POP_BODY = "p-3 flex flex-col gap-2.5";
const POP_FOOT =
  "flex items-center justify-between px-3 py-2 border-t border-white/10 text-[10px] text-dim";

/* ---------- bundle ---------- */

function BundlePopover() {
  const wallets = useWalletsStore((s) => s.wallets);
  const selection = useWalletsStore((s) => s.bundleSelection);
  const toggle = useWalletsStore((s) => s.toggleBundleSelection);
  const bundleAmounts = useFormStore((s) => s.bundleAmounts);
  const setActivePage = useUiStore((s) => s.setActivePage);
  const closePopover = useUiStore((s) => s.closePopover);

  const amountFor = (pk: string) => bundleAmounts[pk] ?? 0.5;
  const total = wallets
    .filter((w) => selection.has(w.pubkey))
    .reduce((sum, w) => sum + amountFor(w.pubkey), 0);

  return (
    <PopoverShell popKey="bundle" width={300}>
      <div className={POP_HEADER}>
        <span>Bundle Configuration</span>
        <button
          className={popBtnCls}
          onClick={() =>
            useWalletsStore.setState({
              bundleSelection: new Set(wallets.map((w) => w.pubkey)),
            })
          }
        >
          Select All
        </button>
      </div>
      {wallets.length === 0 ? (
        <div className="flex items-center justify-between gap-2 px-3 py-4">
          <span className="text-[11px] text-dim">No wallets available. Create or import wallets first.</span>
          <button
            className={`${popBtnCls} !bg-accent !border-accent !text-black shrink-0`}
            onClick={() => {
              setActivePage("wallets");
              closePopover();
            }}
          >
            Wallets
          </button>
        </div>
      ) : (
        <div className="max-h-[220px] overflow-y-auto">
          <div className="flex items-center justify-between px-3 pt-2 text-[9px] font-bold text-dim tracking-[0.08em]">
            <span>WALLET</span>
            <span>BUY</span>
          </div>
          {wallets.map((w) => {
            const isSelected = selection.has(w.pubkey);
            return (
            <div
              key={w.pubkey}
              className={`flex items-center justify-between gap-2 px-3 py-1.5 transition-colors ${
                isSelected ? "bg-white/[0.05]" : "hover:bg-white/[0.02]"
              }`}
            >
              <label className="flex items-center gap-2 min-w-0 cursor-pointer">
                <input
                  type="checkbox"
                  className="hidden"
                  checked={isSelected}
                  onChange={() => toggle(w.pubkey)}
                />
                <span
                  className="w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center shrink-0 transition-colors"
                  style={
                    isSelected
                      ? { background: "#e5e5e5", borderColor: "#e5e5e5" }
                      : { borderColor: "rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.04)" }
                  }
                >
                  {isSelected && (
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1.5 4L3 5.5L6.5 2" stroke="#0a0a0a" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <div className="min-w-0">
                  <div className="text-[11px] text-primary truncate flex items-center gap-1.5">
                    <span className="truncate">{w.name}</span>
                    {w.isDev && (
                      <span className="text-[9px] font-semibold text-accent bg-accent/10 border border-accent/30 rounded px-1 py-px shrink-0">
                        Dev
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-dim font-mono">
                    <span>{truncateAddress(w.pubkey)}</span>
                    <span className="flex items-center gap-0.5">
                      {solIcon}
                      {w.balance !== null ? Number(w.balance).toFixed(4) : "0.0000"}
                    </span>
                  </div>
                </div>
              </label>
              <div className="flex items-center gap-1 shrink-0 text-[#3b82f6]">
                {solIcon}
                <input
                  type="number"
                  step={0.1}
                  value={amountFor(w.pubkey)}
                  onChange={(e) =>
                    useFormStore.setState((s) => ({
                      bundleAmounts: { ...s.bundleAmounts, [w.pubkey]: parseFloat(e.target.value) || 0 },
                    }))
                  }
                  className="w-14 h-6 glass-input rounded-full px-2 text-[11px] text-primary outline-none"
                />
              </div>
            </div>
            );
          })}
        </div>
      )}
      <div className={POP_FOOT}>
        <span>
          Selected {selection.size} / {wallets.length}
          {selection.size > 4 ? " · max 3 extra buys (Jito)" : ""}
        </span>
        <span className="flex items-center gap-1 text-primary font-mono">
          {solIcon}
          {total.toFixed(3)}
        </span>
      </div>
      <div className="px-3 pb-2 text-[10px] text-dim leading-relaxed">
        Creator buy = Dev Buy on the form. Other selected wallets buy in the same Jito bundle (max 3 extra).
      </div>
    </PopoverShell>
  );
}

/* ---------- snipe ---------- */

function SnipePopover() {
  const [delay, setDelay] = useState(500);
  const [protection, setProtection] = useState(true);

  return (
    <PopoverShell popKey="snipe" width={260}>
      <div className={POP_HEADER}>
        <span>Snipe Delay</span>
        <span className="text-[10px] font-mono text-accent bg-accent/10 border border-accent/30 rounded px-1.5 py-px">
          {delay} ms
        </span>
      </div>
      <div className={POP_BODY}>
        <Slider value={delay} min={0} max={5000} step={50} onChange={setDelay} />
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted">Protection</span>
          <Toggle checked={protection} onChange={setProtection} />
        </div>
        <div className="glass-inset rounded-[14px] p-2.5 text-[10px] text-dim leading-relaxed">
          <div className="text-[10px] font-bold text-muted uppercase tracking-[0.08em] mb-1">Tips</div>
          Delayed snipes reduce the chance of being front-run. Higher priority fees land bundles faster.
        </div>
      </div>
    </PopoverShell>
  );
}

/* ---------- multideploy ---------- */

function MultideployPopover() {
  const cloneCount = useFormStore((s) => s.cloneCount);
  const setField = useFormStore((s) => s.setField);
  const cloneWallets = useFormStore((s) => s.cloneWallets);
  const cloneAmounts = useFormStore((s) => s.cloneAmounts);
  const wallets = useWalletsStore((s) => s.wallets);

  const amountFor = (i: number) => cloneAmounts[i] ?? 0;
  const total = Array.from({ length: cloneCount }, (_, i) => amountFor(i)).reduce((a, b) => a + b, 0);

  return (
    <PopoverShell popKey="multideploy" width={320}>
      <div className={POP_HEADER}>
        <span className="text-[10px] font-bold text-dim uppercase tracking-[0.08em]">Clones</span>
        <span className="text-[10px] font-mono text-accent bg-accent/10 border border-accent/30 rounded px-1.5 py-px">
          {cloneCount}
        </span>
      </div>
      <div className={POP_BODY}>
        <Slider value={cloneCount} min={1} max={10} step={1} onChange={(v) => setField("cloneCount", v)} />
        <div className="flex flex-col gap-1.5 max-h-[240px] overflow-y-auto">
          {(() => {
            const effective = resolveCloneWalletPubkeys(wallets, cloneWallets, cloneCount);
            return Array.from({ length: cloneCount }, (_, i) => {
              const selected = effective[i] ?? "";
              const available = wallets.filter(
                (w) => w.pubkey === selected || !effective.includes(w.pubkey)
              );
              return (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] text-dim min-w-8">Clone {i + 1}</span>
                <select
                  value={selected}
                  onChange={(e) =>
                    useFormStore.setState((s) => ({
                      cloneWallets: { ...s.cloneWallets, [i]: e.target.value },
                    }))
                  }
                  className="flex-1 min-w-0 h-7 glass-input rounded-full px-2.5 text-[11px] text-primary outline-none cursor-pointer"
                >
                  {selected === "" && <option value="">No wallet available</option>}
                  {available.map((w) => (
                    <option key={w.pubkey} value={w.pubkey}>
                      {w.name} · {truncateAddress(w.pubkey)}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-1 shrink-0 text-[#54a2ff]">
                  {solIcon}
                  <input
                    type="number"
                    step={0.1}
                    value={amountFor(i)}
                    onChange={(e) =>
                      useFormStore.setState((s) => ({
                        cloneAmounts: { ...s.cloneAmounts, [i]: parseFloat(e.target.value) || 0 },
                      }))
                    }
                    className="w-14 h-7 glass-input rounded-full px-2 text-[11px] text-primary outline-none"
                  />
                </div>
              </div>
              );
            });
          })()}
        </div>
      </div>
      <div className={POP_FOOT}>
        <span>TOTAL DEPLOYED</span>
        <span className="text-primary font-mono">{total.toFixed(3)} SOL</span>
      </div>
    </PopoverShell>
  );
}

/* ---------- farmsnipers ---------- */

function FarmSnipersPopover() {
  const [delay, setDelay] = useState(500);
  const [group, setGroup] = useState("");

  return (
    <PopoverShell popKey="farmsnipers" width={300}>
      <div className={POP_HEADER}>
        <span>Farm Snipers</span>
      </div>
      <div className={POP_BODY}>
        <div className="grid grid-cols-2 gap-2">
          <div className="glass-inset rounded-[14px] p-2">
            <div className="text-[9px] font-bold text-dim uppercase tracking-[0.08em]">Delay</div>
            <div className="text-xs font-mono text-primary mt-0.5">{delay} ms</div>
          </div>
          <div className="glass-inset rounded-[14px] p-2">
            <div className="text-[9px] font-bold text-dim uppercase tracking-[0.08em]">Sell %</div>
            <div className="text-xs font-mono text-primary mt-0.5">100</div>
          </div>
        </div>
        <Slider value={delay} min={100} max={5000} step={100} onChange={setDelay} />
        <input
          type="text"
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          className={inputCls}
          placeholder="Wallet group"
        />
      </div>
    </PopoverShell>
  );
}

/* ---------- mayhem ---------- */

function MayhemPopover() {
  const mode = useFormStore((s) => s.mayhemAgentMode);
  const setField = useFormStore((s) => s.setField);

  const copy =
    mode === "trigger"
      ? "The agent only trades when you prompt it. Direction and size are still random. Mode cannot be changed after creation."
      : "The Mayhem agent randomly enters and exits the coin automatically. Mode cannot be changed after creation.";

  return (
    <PopoverShell popKey="mayhem" width={340}>
      <div className={POP_HEADER}>
        <span>Mayhem agent mode</span>
      </div>
      <div className={POP_BODY}>
        <div className="flex p-1 rounded-full glass-inset">
          {(["classic", "trigger"] as const).map((m) => {
            const on = mode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setField("mayhemAgentMode", m)}
                className={`flex-1 h-8 rounded-full text-[12.5px] font-medium capitalize transition-colors ${
                  on ? "bg-accent text-black" : "text-muted hover:text-primary"
                }`}
              >
                {m === "classic" ? "Classic" : "Trigger"}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-dim leading-relaxed">
          {copy}{" "}
          <a
            href="https://pump.fun/docs/mayhem-mode"
            target="_blank"
            rel="noreferrer"
            className="text-primary underline underline-offset-2 hover:text-accent"
          >
            Learn more
          </a>
        </p>
      </div>
    </PopoverShell>
  );
}

/* ---------- feesharing ---------- */

function FeeSharingPopover() {
  const rows = useFormStore((s) => s.feeShares);
  const setField = useFormStore((s) => s.setField);
  const wallets = useWalletsStore((s) => s.wallets);
  const selectedPubkey = useWalletsStore((s) => s.selectedPubkey);
  const active = useUiStore((s) => s.activePopover);
  const devPk = resolveDevPubkey(wallets, selectedPubkey);

  useEffect(() => {
    if (!devPk) return;
    const current = useFormStore.getState().feeShares;
    if (active !== "feesharing" && !current.length) return;
    const base = current.length ? current : defaultFeeShares(devPk);
    // Strip empty extras when the popover is closed (former Apply behavior).
    const source =
      active === "feesharing"
        ? base
        : [base[0] ?? { address: devPk, pct: 100 }, ...base.slice(1).filter((r) => r.address.trim())];
    const next = applyDevToFeeShares(source, devPk);
    if (
      next.length !== current.length ||
      next.some((r, i) => r.address !== current[i]?.address || r.pct !== current[i]?.pct)
    ) {
      setField("feeShares", next);
    }
  }, [active, devPk, setField]);

  const setRows = (next: typeof rows) => setField("feeShares", withDevRemainder(next));
  const update = (i: number, patch: Partial<(typeof rows)[number]>) => {
    if (patch.pct !== undefined && i > 0) {
      setRows(setSharePct(rows, i, Number(patch.pct)));
      return;
    }
    setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  const total = rows.reduce((a, r) => a + (Number(r.pct) || 0), 0);
  const err = feeShareError(rows);
  const canAdd = rows.length < MAX_FEE_SHAREHOLDERS;

  return (
    <PopoverShell popKey="feesharing" width={400}>
      <div className={POP_HEADER}>
        <span>Fee Sharing</span>
        <span className={`text-[10px] font-mono ${total === 100 ? "text-accent" : "text-[#fcbb00]"}`}>
          {total}%
        </span>
      </div>
      <div className={POP_BODY}>
        <p className="text-[10px] text-dim leading-relaxed">
          Dev keeps the remainder. Extra wallets take from Dev; the total is always 100%.
          Locked after launch (max {MAX_FEE_SHAREHOLDERS}).
        </p>
        <div className="flex flex-col gap-1.5 max-h-[240px] overflow-y-auto">
          {rows.map((r, i) => {
            const isDevRow = i === 0;
            return (
              <div key={i} className="flex items-center gap-1.5">
                {isDevRow ? (
                  <div className={`${inputCls} !h-7 !px-2 flex items-center gap-1.5 flex-1 min-w-0`}>
                    <span className="text-[9px] font-semibold text-accent bg-accent/10 border border-accent/30 rounded px-1 py-px shrink-0">
                      Dev
                    </span>
                    <span className="text-[11px] font-mono text-primary truncate">
                      {devPk || r.address ? truncateAddress(devPk || r.address) : "Dev wallet"}
                    </span>
                  </div>
                ) : (
                  <input
                    className={`${inputCls} !h-7 !text-[11px] font-mono flex-1`}
                    placeholder="Wallet address"
                    value={r.address}
                    onChange={(e) => update(i, { address: e.target.value.trim() })}
                    spellCheck={false}
                  />
                )}
                <input
                  type="number"
                  min={0}
                  max={
                    isDevRow
                      ? 100
                      : Math.max(
                          0,
                          100 -
                            rows.slice(1).reduce((a, x, j) => a + (j + 1 === i ? 0 : Number(x.pct) || 0), 0)
                        )
                  }
                  step={1}
                  readOnly={isDevRow}
                  tabIndex={isDevRow ? -1 : undefined}
                  className={`${inputCls} !h-7 !w-14 !px-1.5 !text-[11px] font-mono text-right shrink-0 ${isDevRow ? "opacity-80 cursor-default" : ""}`}
                  value={Number.isFinite(r.pct) ? r.pct : ""}
                  onChange={(e) => {
                    if (isDevRow) return;
                    const raw = e.target.value;
                    update(i, { pct: raw === "" ? 0 : Number(raw) });
                  }}
                />
                <span className="text-[10px] text-dim w-3 shrink-0">%</span>
                {isDevRow ? (
                  <span className="w-6 h-6 shrink-0" />
                ) : (
                  <button
                    type="button"
                    className="w-6 h-6 shrink-0 rounded text-dim hover:text-primary hover:bg-white/[0.08]"
                    onClick={() => setRows(rows.filter((_, idx) => idx !== i))}
                    title="Remove"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex gap-2">
          <button
            className={`${popBtnCls} flex-1 !h-7`}
            disabled={!canAdd}
            onClick={() => canAdd && setRows([...rows, { address: "", pct: 0 }])}
          >
            Add wallet
          </button>
          <button
            className={`${popBtnCls} flex-1 !h-7`}
            onClick={() => {
              if (!rows.length) return;
              const pcts = splitEqualPct(rows.length);
              setRows(rows.map((r, i) => ({ ...r, pct: pcts[i] })));
            }}
          >
            Split Equal
          </button>
          <button
            className={`${popBtnCls} flex-1 !h-7`}
            onClick={() => setRows(defaultFeeShares(devPk))}
          >
            Reset 100%
          </button>
        </div>
        {err && <p className="text-[10px] text-[#fcbb00] leading-relaxed">{err}</p>}
      </div>
    </PopoverShell>
  );
}

/* ---------- buyback slider popovers (agent / cashback) ---------- */

function AgentPopover() {
  const pct = useFormStore((s) => s.agentBuybackPct);
  const setField = useFormStore((s) => s.setField);
  const setPct = (v: number) => setField("agentBuybackPct", v);

  return (
    <PopoverShell popKey="agent" width={300}>
      <div className={POP_HEADER}>
        <span>Tokenized Agent</span>
        <span className="text-[10px] font-mono text-accent bg-accent/10 border border-accent/30 rounded px-1.5 py-px">
          {pct}%
        </span>
      </div>
      <div className={POP_BODY}>
        <div className="bg-[#fcbb0010] border border-[#fcbb0030] rounded-sm p-2 text-[10px] text-[#fcbb00] leading-relaxed">
          Requires an initial buy. {pct}% of agent revenue auto-buys and burns the token on a
          schedule; the rest is claimable by you.
        </div>
        <Slider value={pct} min={1} max={100} step={1} onChange={setPct} />
        <p className="text-[10px] text-dim leading-relaxed">
          Buyback {pct}% · claimable {100 - pct}%. This is on-chain via pump.fun agent payments.
        </p>
        <button className={`${popBtnCls} !h-7`} onClick={() => setPct(10)}>
          Reset to 10
        </button>
      </div>
    </PopoverShell>
  );
}

function CashbackPopover() {
  return (
    <PopoverShell popKey="cashback" width={300}>
      <div className={POP_HEADER}>
        <span>Trader Cashback</span>
      </div>
      <div className={POP_BODY}>
        <div className="bg-[#fcbb0010] border border-[#fcbb0030] rounded-sm p-2 text-[10px] text-[#fcbb00] leading-relaxed">
          Locked at launch. 100% of creator trading fees go to traders as claimable cashback instead
          of you. CTOs cannot be performed on cashback coins.
        </div>
        <p className="text-[10px] text-dim leading-relaxed">
          This is pump.fun&apos;s cashback coin flag on create. It is all-or-nothing — there is no
          on-chain percentage.
        </p>
      </div>
    </PopoverShell>
  );
}

/* ---------- root ---------- */

export function OptionPopovers() {
  const active = useUiStore((s) => s.activePopover);
  const closePopover = useUiStore((s) => s.closePopover);

  useEffect(() => {
    if (!active) return;
    const onDown = () => closePopover();
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [active, closePopover]);

  return (
    <>
      <BundlePopover />
      <SnipePopover />
      <MultideployPopover />
      <FarmSnipersPopover />
      <MayhemPopover />
      <FeeSharingPopover />
      <AgentPopover />
      <CashbackPopover />
    </>
  );
}
