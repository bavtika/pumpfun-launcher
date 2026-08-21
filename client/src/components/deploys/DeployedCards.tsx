import { useEffect, useState } from "react";
import { useDeployedStore } from "../../stores/deployed";
import { useWalletsStore } from "../../stores/wallets";
import { useTradePanelsStore } from "../../stores/tradePanels";
import { api } from "../../api/client";
import { formatMcap, timeAgo } from "../../lib/format";
import { coinImg } from "../../lib/img";
import { TradeIcon, ExternalIcon } from "../ui/icons";
import type { DeployedCoin } from "../../api/types";

function DeployedCard({ coin }: { coin: DeployedCoin }) {
  const [mcap, setMcap] = useState<number | null>(null);
  const [imgError, setImgError] = useState(false);
  const selectedPubkey = useWalletsStore((s) => s.selectedPubkey);
  const openPanel = useTradePanelsStore((s) => s.open);
  const updateCoin = useDeployedStore((s) => s.updateCoin);

  // blob: URLs are session-local previews — they 404 after reload. A broken or
  // missing image is healed by fetching the coin's CDN image by mint.
  const storedImgOk = !!coin.imageUrl && !coin.imageUrl.startsWith("blob:") && !imgError;

  useEffect(() => {
    if (!coin.mint) return;
    let cancelled = false;
    api
      .getMcap(coin.mint)
      .then((d) => {
        if (!cancelled && d.mcap != null) setMcap(d.mcap);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [coin.mint]);

  useEffect(() => {
    if (storedImgOk || !coin.mint) return;
    let cancelled = false;
    api
      .getVampInfo(coin.mint)
      .then((d) => {
        if (!cancelled && d.imageUrl) updateCoin(coin.mint, { imageUrl: d.imageUrl });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [storedImgOk, coin.mint, updateCoin]);

  return (
    <div className="bg-white/[0.03] border border-line rounded-md p-2.5 flex flex-col gap-2 hover:border-line-focus transition-colors">
      <div className="flex items-center gap-2">
        {storedImgOk ? (
          <img
            src={coinImg(coin.imageUrl)!}
            alt=""
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-8 h-8 rounded-md object-cover bg-white/[0.08] shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded-md bg-white/[0.06] border border-line flex items-center justify-center text-xs font-bold text-dim shrink-0">
            {(coin.ticker || "?")[0]}
          </div>
        )}
        <div className="min-w-0">
          <div className="text-xs font-semibold text-primary truncate">{coin.name || "Unnamed"}</div>
          <div className="text-[10px] text-dim font-mono">${coin.ticker || "?"}</div>
        </div>
      </div>
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-dim">
          MCAP <span className="text-muted font-mono">{mcap != null ? formatMcap(mcap) : "—"}</span>
        </span>
        <span className="text-dim font-mono">{timeAgo(coin.ts)} ago</span>
      </div>
      <div className="flex gap-1.5">
        <button
          onClick={() =>
            openPanel({
              mint: coin.mint,
              walletPubkey: selectedPubkey,
              coinName: coin.name,
              coinTicker: coin.ticker,
              imageUrl: coin.imageUrl ?? "",
              pumpUrl: coin.pumpUrl,
              delayMs: 0,
            })
          }
          className="flex-1 flex items-center justify-center gap-1.5 h-7 rounded-sm border border-line bg-white/[0.04] text-[11px] text-muted hover:text-primary hover:border-line-focus hover:bg-hover transition-colors group/trade"
        >
          <TradeIcon size={11} className="text-dim group-hover/trade:text-accent transition-colors" />
          Trade Panel
        </button>
        <a
          href={coin.pumpUrl || (coin.mint ? `https://pump.fun/${coin.mint}` : "#")}
          target="_blank"
          rel="noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 h-7 rounded-sm border border-line bg-white/[0.04] text-[11px] text-muted hover:text-primary hover:border-line-focus hover:bg-hover transition-colors"
        >
          <ExternalIcon size={11} />
          pump.fun
        </a>
      </div>
    </div>
  );
}

export function DeployedCards() {
  const coins = useDeployedStore((s) => s.coins);
  const clear = useDeployedStore((s) => s.clear);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-line text-[10px] text-dim shrink-0">
        <span>{coins.length === 0 ? "Showing 0 / 0" : `Showing 1-${coins.length} / ${coins.length}`}</span>
        {coins.length > 0 && (
          <button onClick={clear} className="hover:text-danger transition-colors">
            Clear
          </button>
        )}
      </div>
      {coins.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-dim">
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none" opacity="0.25">
            <path d="M13 2L23 8v10l-10 6L3 18V8l10-6Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M13 12.5L23 8M13 12.5L3 8M13 12.5V24" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
          <p className="text-[11px]">No deployed coins yet</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
          {coins.map((c) => (
            <DeployedCard key={c.mint || c.ts} coin={c} />
          ))}
        </div>
      )}
    </div>
  );
}
