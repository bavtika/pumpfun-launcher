import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../api/client";
import { toast } from "../../stores/toast";
import { useSettingsStore } from "../../stores/settings";
import { truncateMiddle } from "../../lib/format";
import { coinImg } from "../../lib/img";
import { ExternalIcon } from "../ui/icons";

export interface TradeViewProps {
  mint: string;
  walletPubkey: string | null;
  coinName: string;
  coinTicker: string;
  imageUrl?: string | null;
  pumpUrl: string;
}

interface TxEntry {
  side: "buy" | "sell";
  sig: string;
}

const QUICK_SOL = [0.1, 0.5, 1, 2];
const SELL_PCTS = [25, 50, 75, 100];

export function TradeView({ mint, walletPubkey, coinName, coinTicker, imageUrl, pumpUrl }: TradeViewProps) {
  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const [solBal, setSolBal] = useState<string | null>(null);
  const [tokBal, setTokBal] = useState<bigint>(0n);
  const [balLoaded, setBalLoaded] = useState(false);
  const [buyAmount, setBuyAmount] = useState("");
  const [buySlip, setBuySlip] = useState(() => useSettingsStore.getState().fees.slippage || 15);
  const [sellSlip, setSellSlip] = useState(() => useSettingsStore.getState().fees.slippage || 15);
  const [sellPct, setSellPct] = useState(100);
  const [busy, setBusy] = useState(false);
  const [txLog, setTxLog] = useState<TxEntry[]>([]);
  const [imgError, setImgError] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshBal = useCallback(async () => {
    if (!mint || !walletPubkey) return;
    try {
      const d = await api.tradeBalance(mint, walletPubkey);
      setSolBal(parseFloat(d.solBalance).toFixed(4));
      setTokBal(BigInt(d.tokenBalance || "0"));
      setBalLoaded(true);
    } catch {
      /* balance refresh is best-effort */
    }
  }, [mint, walletPubkey]);

  useEffect(() => {
    void refreshBal();
    timerRef.current = setInterval(() => void refreshBal(), 15000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [refreshBal]);

  const logTx = (side: "buy" | "sell", sig: string) =>
    setTxLog((l) => [{ side, sig }, ...l]);

  const tokDisplay =
    tokBal > 0n
      ? (Number(tokBal) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 })
      : balLoaded
        ? "0"
        : "—";

  const onBuy = async () => {
    const solAmount = parseFloat(buyAmount);
    if (!solAmount || solAmount <= 0) {
      toast("Enter SOL amount", "error");
      return;
    }
    setBusy(true);
    try {
      const d = await api.tradeBuy({ mint, walletPubkey: walletPubkey ?? "", solAmount, slippage: buySlip || 15 });
      toast(`✓ Bought! ${d.signature.slice(0, 10)}…`, "success");
      logTx("buy", d.signature);
      setTimeout(() => void refreshBal(), 3000);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Buy failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const onSell = async () => {
    if (tokBal === 0n) {
      toast("No tokens to sell", "error");
      return;
    }
    const tokenAmount = ((tokBal * BigInt(sellPct)) / 100n).toString();
    setBusy(true);
    try {
      const d = await api.tradeSell({ mint, walletPubkey: walletPubkey ?? "", tokenAmount, slippage: sellSlip || 15 });
      toast(`✓ Sold! ${d.signature.slice(0, 10)}…`, "success");
      logTx("sell", d.signature);
      setTimeout(() => void refreshBal(), 3000);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Sell failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const firstLetter = (coinTicker || coinName || "?")[0]?.toUpperCase() ?? "?";

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-line bg-white/[0.02] shrink-0">
        {imageUrl && !imgError ? (
          <img
            src={coinImg(imageUrl)!}
            alt=""
            onError={() => setImgError(true)}
            className="w-8 h-8 rounded-full object-cover bg-white/[0.08] shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-white/[0.06] border border-line flex items-center justify-center text-[13px] font-bold text-dim shrink-0">
            {firstLetter}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold text-primary truncate">{coinName || "—"}</div>
          <div className="text-[10px] text-muted font-mono">${coinTicker || "—"}</div>
        </div>
        <div className="flex items-center gap-1.5 bg-white/[0.05] border border-line rounded px-2 py-1 text-[10px] text-muted font-mono shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00d294] shadow-[0_0_5px_rgba(0,210,148,0.6)]" />
          {walletPubkey ? truncateMiddle(walletPubkey, 5, 4) : "—"}
        </div>
      </div>

      {/* balances */}
      <div className="flex gap-px border-b border-line shrink-0">
        <div className="flex-1 flex flex-col items-center py-2 bg-white/[0.02]">
          <div className="text-[9px] uppercase tracking-[0.06em] text-muted mb-0.5">SOL</div>
          <div className="text-sm font-bold font-mono text-[#a685ff]">{solBal ?? "—"}</div>
        </div>
        <div className="flex-1 flex flex-col items-center py-2 bg-white/[0.02] border-l border-line">
          <div className="text-[9px] uppercase tracking-[0.06em] text-muted mb-0.5">Tokens</div>
          <div className="text-sm font-bold font-mono text-[#00d294]">{tokDisplay}</div>
        </div>
      </div>

      {/* tabs */}
      <div className="flex gap-px border-b border-line shrink-0">
        <button
          onClick={() => setTab("buy")}
          className={`flex-1 py-2 text-xs font-semibold transition-colors border-b-2 ${
            tab === "buy"
              ? "text-[#00d294] border-[#00d294] bg-[#00d29408]"
              : "text-muted border-transparent hover:bg-white/[0.03]"
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setTab("sell")}
          className={`flex-1 py-2 text-xs font-semibold transition-colors border-b-2 ${
            tab === "sell"
              ? "text-[#ff4d6d] border-[#ff4d6d] bg-[#ff4d6d08]"
              : "text-muted border-transparent hover:bg-white/[0.03]"
          }`}
        >
          Sell
        </button>
      </div>

      {/* body */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 min-h-0">
        {tab === "buy" ? (
          <>
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] text-muted uppercase tracking-[0.05em]">Amount (SOL)</div>
              <div className="flex">
                <input
                  type="number"
                  value={buyAmount}
                  onChange={(e) => setBuyAmount(e.target.value)}
                  placeholder="0.1"
                  step={0.01}
                  min={0}
                  className="flex-1 h-9 bg-white/[0.04] border border-line rounded-l-md px-3 text-[13px] font-mono text-primary outline-none focus:border-white/20 transition-colors"
                />
                <div className="bg-white/[0.06] border border-l-0 border-line rounded-r-md px-2.5 flex items-center text-[11px] text-muted">
                  SOL
                </div>
              </div>
              <div className="flex gap-1">
                {QUICK_SOL.map((v) => (
                  <button
                    key={v}
                    onClick={() => setBuyAmount(String(v))}
                    className="flex-1 py-1.5 rounded border border-line bg-white/[0.04] text-[11px] font-semibold text-muted hover:bg-white/[0.09] hover:text-primary transition-colors"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted">Slippage</span>
              <input
                type="number"
                value={buySlip}
                min={1}
                max={100}
                onChange={(e) => setBuySlip(parseFloat(e.target.value) || 15)}
                className="w-16 h-7 bg-white/[0.05] border border-line rounded px-2 text-[11px] font-mono text-primary text-right outline-none focus:border-white/20"
              />
            </div>
            <button
              onClick={() => void onBuy()}
              disabled={busy}
              className="w-full h-10 rounded-md bg-[#00d294] text-black text-[13px] font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(0,210,148,0.3)] hover:shadow-[0_0_28px_rgba(0,210,148,0.5)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {busy ? "…" : "Buy"}
            </button>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] text-muted uppercase tracking-[0.05em]">Sell %</div>
              <div className="flex gap-1">
                {SELL_PCTS.map((v) => (
                  <button
                    key={v}
                    onClick={() => setSellPct(v)}
                    className={`flex-1 py-1.5 rounded border text-[11px] font-semibold transition-colors ${
                      sellPct === v
                        ? "bg-[#ff4d6d26] border-[#ff4d6d66] text-[#ff4d6d]"
                        : "border-line bg-white/[0.04] text-muted hover:bg-white/[0.09] hover:text-primary"
                    }`}
                  >
                    {v}%
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted">Slippage</span>
              <input
                type="number"
                value={sellSlip}
                min={1}
                max={100}
                onChange={(e) => setSellSlip(parseFloat(e.target.value) || 15)}
                className="w-16 h-7 bg-white/[0.05] border border-line rounded px-2 text-[11px] font-mono text-primary text-right outline-none focus:border-white/20"
              />
            </div>
            <button
              onClick={() => void onSell()}
              disabled={busy}
              className="w-full h-10 rounded-md bg-[#ff4d6d] text-white text-[13px] font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(255,77,109,0.3)] hover:shadow-[0_0_28px_rgba(255,77,109,0.5)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {busy ? "…" : `Sell ${sellPct}%`}
            </button>
          </>
        )}

        {/* tx log */}
        {txLog.length > 0 && (
          <div className="flex flex-col gap-1 mt-1">
            {txLog.map((t, i) => (
              <div
                key={`${t.sig}-${i}`}
                className="flex items-center justify-between px-2.5 py-1.5 bg-white/[0.03] border border-line rounded text-[10px]"
              >
                <span className={`font-bold ${t.side === "buy" ? "text-[#00d294]" : "text-[#ff4d6d]"}`}>
                  {t.side.toUpperCase()}
                </span>
                <a
                  href={`https://solscan.io/tx/${t.sig}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#a685ff] font-mono hover:underline"
                >
                  {truncateMiddle(t.sig, 10, 6)}
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* pump link */}
      <a
        href={pumpUrl || "#"}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-center gap-1.5 text-[11px] text-muted hover:text-primary py-2 border-t border-line transition-colors shrink-0"
      >
        <ExternalIcon size={10} />
        pump.fun
      </a>
    </div>
  );
}
