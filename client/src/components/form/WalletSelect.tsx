import { useEffect, useRef, useState } from "react";
import { useWalletsStore } from "../../stores/wallets";
import { truncateAddress, formatSol } from "../../lib/format";
import { ChevronDownIcon } from "../ui/icons";
import { solIcon } from "../../lib/styles";

/** Wallet selector + balance shown in the Create Coin window header. */
export function WalletSelect() {
  const wallets = useWalletsStore((s) => s.wallets);
  const selectedPubkey = useWalletsStore((s) => s.selectedPubkey);
  const selectWallet = useWalletsStore((s) => s.selectWallet);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = wallets.find((w) => w.pubkey === selectedPubkey) ?? null;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative flex items-center gap-1.5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 h-6 px-2 rounded-full glass-inset text-[11px] text-muted hover:text-primary hover:bg-hover transition-colors max-w-[190px]"
      >
        <span className="text-[9px] font-semibold text-accent bg-accent/10 border border-accent/30 rounded px-1 py-px shrink-0">
          Dev
        </span>
        <span className="truncate">{selected ? selected.name : "Select wallet"}</span>
        <ChevronDownIcon size={9} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {selected && (
        <>
          <span className="flex items-center gap-1 text-[11px] font-mono text-dim">
            {solIcon}
            {formatSol(selected.balance)}
          </span>
          <a
            href={`https://solscan.io/account/${selected.pubkey}`}
            target="_blank"
            rel="noreferrer"
            title="View on Solscan"
            className="w-6 h-6 flex items-center justify-center rounded-sm text-dim hover:text-primary hover:bg-hover transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M4 2h6v6M10 2L5.5 6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M9 7v2.5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </a>
        </>
      )}

      {open && (
        <div className="absolute top-7 right-0 z-[150] w-[240px] glass rounded-[18px] overflow-hidden">
          {wallets.length === 0 ? (
            <div className="px-3 py-3 text-[11px] text-dim">No wallets. Create one on the Wallets page.</div>
          ) : (
            wallets.map((w) => (
              <button
                key={w.pubkey}
                onClick={() => {
                  selectWallet(w.pubkey);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-white/[0.04] transition-colors ${
                  w.pubkey === selectedPubkey ? "bg-white/[0.05]" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[11px] text-primary truncate">{w.name}</span>
                    {w.isDev && (
                      <span className="text-[9px] font-semibold text-accent bg-accent/10 border border-accent/30 rounded px-1 py-px shrink-0">
                        Dev
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-dim font-mono">{truncateAddress(w.pubkey)}</div>
                </div>
                <span className="flex items-center gap-1 text-[10px] font-mono text-dim shrink-0">
                  {solIcon}
                  {formatSol(w.balance)}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
