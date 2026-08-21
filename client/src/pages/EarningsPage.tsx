import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { CreatorRewardRow } from "../api/types";
import { formatRewardSol, formatSol, truncateMiddle } from "../lib/format";
import { popBtnCls, solIcon } from "../lib/styles";
import { toast } from "../stores/toast";
import { useUiStore } from "../stores/ui";

function CreatorRewards() {
  const [rows, setRows] = useState<CreatorRewardRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getCreatorRewards();
      setRows(data.wallets.filter((w) => w.claimableSol > 0));
      setTotal(data.totalClaimableSol);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to load rewards", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const claim = async (pubkey: string) => {
    setClaiming(pubkey);
    try {
      const result = await api.claimCreatorRewards(pubkey);
      toast(`Claimed ${formatRewardSol(result.claimedSol)} SOL ✓`, "success");
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Claim failed", "error");
    } finally {
      setClaiming(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-semibold text-primary">Creator Rewards</div>
          <div className="text-[11px] text-dim mt-0.5">Claim creator rewards from your pump.fun deploys</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-mono text-primary bg-white/[0.04] border border-line rounded-sm px-2.5 py-1.5">
            {solIcon}
            {formatRewardSol(total)}
          </div>
          <button
            className={popBtnCls}
            onClick={() => void load()}
            disabled={loading || claiming !== null}
          >
            <span className="flex items-center gap-1.5">
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                className={loading ? "[animation:spin_0.8s_linear_infinite]" : undefined}
              >
                <path d="M10 6a4 4 0 1 1-1.17-2.83" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                <path d="M10 2v2.5H7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Reload
            </span>
          </button>
        </div>
      </div>

      {loading && rows.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-dim text-xs">Loading rewards…</div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 bg-panel border border-line rounded-md">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="12" stroke="#252530" strokeWidth="1.5" />
            <path d="M14 8v8M10 14h8" stroke="#3a3a4a" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <p className="text-dim text-xs">No creator rewards to claim.</p>
        </div>
      ) : (
        <div className="bg-panel border border-line rounded-md overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_120px_88px] gap-2 px-3 py-2 border-b border-line text-[10px] font-bold text-dim tracking-[0.08em]">
            <div>NAME</div>
            <div>REWARDS</div>
            <div>BALANCE</div>
            <div />
          </div>
          {rows.map((w) => (
            <div
              key={w.pubkey}
              className="grid grid-cols-[1fr_1fr_120px_88px] gap-2 px-3 py-2.5 items-center border-b border-line/50 last:border-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-green shrink-0" />
                <span className="text-xs text-primary truncate">{w.name}</span>
                {w.isDev && (
                  <span className="text-[8px] font-bold text-accent bg-accent/10 border border-accent/30 rounded px-1 py-px shrink-0">
                    Dev
                  </span>
                )}
                <span className="text-[10px] font-mono text-dim truncate hidden sm:inline">
                  {truncateMiddle(w.pubkey, 4, 4)}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-mono text-primary">
                {solIcon}
                {formatRewardSol(w.claimableSol)}
              </div>
              <div className="flex items-center gap-1 text-[11px] font-mono text-muted">
                {solIcon}
                {w.balance !== null ? formatSol(w.balance) : "—"}
              </div>
              <div className="flex justify-end">
                <button
                  className="h-6 px-3 rounded-sm bg-accent text-black text-[11px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  disabled={claiming !== null}
                  onClick={() => void claim(w.pubkey)}
                >
                  {claiming === w.pubkey ? "Claiming…" : "Claim"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReferralEarnings() {
  return (
    <div>
      <div className="mb-4">
        <div className="text-sm font-semibold text-primary">Referral Earnings</div>
        <div className="text-[11px] text-dim mt-0.5">Earn rewards by referring new users to the platform</div>
      </div>
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="12" stroke="#252530" strokeWidth="1.5" />
          <path d="M8 20L13 15M13 15v-4M13 15h4M17 11V7M17 7l3 3M17 7l-3 3" stroke="#3a3a4a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="text-dim text-xs">No referral activity yet.</p>
      </div>
    </div>
  );
}

export function EarningsPage() {
  const tab = useUiStore((s) => s.activeEarningsTab);
  const setTab = useUiStore((s) => s.setActiveEarningsTab);

  return (
    <div className="h-full flex">
      <div className="w-[180px] shrink-0 border-r border-line bg-panel/50 p-3 flex flex-col gap-1">
        <div className="text-[10px] font-bold text-dim uppercase tracking-[0.08em] px-2 py-2">
          Earnings
        </div>
        {(
          [
            { key: "creator", label: "Creator Rewards" },
            { key: "referral", label: "Referral Earnings" },
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`flex items-center gap-2 px-2.5 py-2 rounded-sm text-xs text-left transition-colors ${
              tab === item.key ? "bg-white/[0.06] text-primary" : "text-muted hover:text-primary hover:bg-white/[0.03]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {tab === "creator" ? <CreatorRewards /> : <ReferralEarnings />}
      </div>
    </div>
  );
}
