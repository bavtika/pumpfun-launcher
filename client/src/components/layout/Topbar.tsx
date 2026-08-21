import { useEffect, useRef, useState } from "react";
import { useUiStore } from "../../stores/ui";
import { useFormStore } from "../../stores/form";
import { useWalletsStore } from "../../stores/wallets";
import { useDeployedStore } from "../../stores/deployed";
import { useTradePanelsStore } from "../../stores/tradePanels";
import { api } from "../../api/client";
import { toast } from "../../stores/toast";
import { truncateAddress } from "../../lib/format";
import { defaultFeeShares, feeShareError, feeSharesToPayload, resolveDevPubkey } from "../../lib/feeShares";
import { FlameIcon, VampIcon } from "../ui/icons";
import { useAuthStore } from "../../stores/auth";

export function Topbar() {
  const { setActivePage, vampOpen, setVampOpen } = useUiStore();
  const username = useAuthStore((s) => s.user?.username);
  const clearAuth = useAuthStore((s) => s.clear);
  const [vampAddr, setVampAddr] = useState("");
  const [vampBusy, setVampBusy] = useState(false);
  const vampRef = useRef<HTMLDivElement>(null);
  const vampInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (vampOpen) vampInputRef.current?.focus();
  }, [vampOpen]);

  useEffect(() => {
    if (!vampOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (vampRef.current && !vampRef.current.contains(e.target as Node)) {
        setVampOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [vampOpen, setVampOpen]);

  const handleVampDeploy = async () => {
    const addr = vampAddr.trim();
    if (!addr) {
      toast("Enter token address", "error");
      return;
    }
    setVampBusy(true);
    try {
      const { selectedPubkey } = useWalletsStore.getState();
      const form = useFormStore.getState();
      const buyAmount = form.customAmount ?? form.selectedAmount;
      if (form.options.agent && (buyAmount ?? 0) <= 0) {
        toast("Agent requires an initial buy > 0 SOL", "error");
        return;
      }
      if (form.options.feesharing && form.options.cashback) {
        toast("Fee sharing cannot be combined with cashback", "error");
        return;
      }
      const { wallets } = useWalletsStore.getState();
      const feeRows = form.feeShares.some((r) => r.address.trim())
        ? form.feeShares
        : defaultFeeShares(resolveDevPubkey(wallets, selectedPubkey));
      if (form.options.feesharing) {
        const shareErr = feeShareError(feeRows);
        if (shareErr) {
          toast(shareErr, "error");
          return;
        }
      }
      const data = await api.vampDeploy({
        sourceMint: addr,
        walletPublicKey: selectedPubkey || "",
        buyAmount,
        options: form.options,
        agentBuybackPct: form.agentBuybackPct,
        mayhemAgentMode: form.options.mayhem ? form.mayhemAgentMode : undefined,
        feeShares: form.options.feesharing ? feeSharesToPayload(feeRows) : undefined,
      });
      setVampOpen(false);
      setVampAddr("");
      toast(`✓ Vamped! tx: ${truncateAddress(data.signature ?? data.bundleId ?? "")}`, "success");
      useDeployedStore.getState().addCoin({
        name: data.name,
        ticker: data.ticker,
        mint: data.mint,
        pumpUrl: data.pumpUrl,
        imageUrl: data.imageUrl || null,
        ts: Date.now(),
      });
      if (form.tradePanelEnabled) {
        useTradePanelsStore.getState().open({
          mint: data.mint,
          walletPubkey: selectedPubkey,
          coinName: data.name,
          coinTicker: data.ticker,
          imageUrl: data.imageUrl || "",
          pumpUrl: data.pumpUrl,
          delayMs: 0,
        });
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Vamp failed", "error");
    } finally {
      setVampBusy(false);
    }
  };

  return (
    <header className="fixed top-2.5 left-2.5 right-2.5 h-12 bg-panel border border-line rounded-lg flex items-center justify-between px-4 z-[100]">
      <div className="flex items-center gap-2.5 select-none">
        <div className="w-6.5 h-6.5 rounded-md bg-white/[0.06] border border-line flex items-center justify-center">
          <FlameIcon size={12} className="text-primary" />
        </div>
        <span className="text-[11.5px] font-semibold tracking-[0.14em] text-primary">LAUNCHER</span>
        <span className="text-[9.5px] font-mono text-dim border border-line rounded-md px-1.5 py-0.5 ml-1">pump.fun</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative" ref={vampRef}>
          <button
            onClick={() => setVampOpen(!vampOpen)}
            className={`flex items-center gap-1.5 h-8 px-3.5 rounded-md border text-[12.5px] transition-colors ${
              vampOpen
                ? "border-line-focus text-primary bg-hover"
                : "border-line text-muted hover:text-primary hover:bg-hover"
            }`}
          >
            <VampIcon />
            Vamp
          </button>

          {vampOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] w-64 bg-panel border border-line rounded-lg shadow-[0_12px_32px_rgba(0,0,0,0.55)] p-3.5 z-[150] animate-[slideUp_0.14s_ease]">
              <div className="text-xs font-semibold text-primary mb-1">Vamp Coin</div>
              <div className="text-[11px] text-dim mb-2.5">
                Clone any existing Solana coin and relaunch instantly.
              </div>
              <input
                ref={vampInputRef}
                value={vampAddr}
                onChange={(e) => setVampAddr(e.target.value)}
                type="text"
                placeholder="Enter token address…"
                autoComplete="off"
                spellCheck={false}
                className="w-full h-9 px-3 mb-2 bg-input border border-line rounded-md text-[12.5px] text-primary font-mono placeholder:text-dim outline-none focus:border-line-focus transition-colors"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleVampDeploy();
                }}
              />
              <button
                onClick={handleVampDeploy}
                disabled={vampBusy}
                className={`w-full h-9 flex items-center justify-center gap-1.5 rounded-md bg-primary text-black text-[12.5px] font-semibold hover:bg-white/85 transition-colors disabled:opacity-60 ${vampBusy ? "btn-loading" : ""}`}
              >
                <FlameIcon size={12} />
                {vampBusy ? "Deploying…" : "Deploy"}
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => setActivePage("feed")}
          className="flex items-center gap-1.5 h-8 px-4 rounded-md bg-primary text-black text-[12.5px] font-semibold hover:bg-white/85 transition-colors"
        >
          <FlameIcon />
          Create Coin
        </button>
        <div className="flex items-center gap-2 pl-1 ml-1 border-l border-line">
          <span className="text-[11px] text-dim font-mono hidden sm:inline">{username}</span>
          <button
            onClick={() => {
              void api.logout().catch(() => {});
              clearAuth();
            }}
            className="h-8 px-2.5 rounded-md border border-line text-[11px] text-muted hover:text-primary hover:bg-hover transition-colors"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
