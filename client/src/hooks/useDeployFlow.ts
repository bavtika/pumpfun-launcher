import { useCallback } from "react";
import { api } from "../api/client";
import type { DeployResult, PublicWallet } from "../api/types";
import { useFormStore, resolveCloneWalletPubkeys } from "../stores/form";
import { useWalletsStore } from "../stores/wallets";
import { useDeployedStore } from "../stores/deployed";
import { useTradePanelsStore } from "../stores/tradePanels";
import { useUiStore } from "../stores/ui";
import { useSettingsStore } from "../stores/settings";
import { toast } from "../stores/toast";
import { truncateAddress } from "../lib/format";
import { defaultFeeShares, feeShareError, feeSharesToPayload, resolveDevPubkey } from "../lib/feeShares";

/** Renders ASCII art to a PNG blob so pump.fun metadata always has a real image. */
function asciiToPngBlob(art: string): Promise<Blob | null> {
  const lines = art.replace(/\t/g, "  ").split("\n");
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  if (!lines.length) return Promise.resolve(null);

  const fontSize = 24;
  const lineHeight = Math.round(fontSize * 1.25);
  const font = `${fontSize}px "Courier New", monospace`;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);

  ctx.font = font;
  const charWidth = ctx.measureText("M").width;
  const maxCols = Math.max(...lines.map((l) => l.length));
  const pad = Math.round(fontSize * 1.5);

  canvas.width = Math.ceil(charWidth * maxCols + pad * 2);
  canvas.height = lineHeight * lines.length + pad * 2;

  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = font;
  ctx.textBaseline = "top";
  ctx.fillStyle = "#e5e5e5";
  lines.forEach((l, i) => ctx.fillText(l, pad, pad + i * lineHeight));

  return new Promise((res) => canvas.toBlob((b) => res(b), "image/png"));
}

async function buildDeployFormData(): Promise<FormData> {
  const s = useFormStore.getState();
  const { selectedPubkey } = useWalletsStore.getState();
  const { fees } = useSettingsStore.getState();

  const fd = new FormData();
  fd.append("name", s.name.trim());
  fd.append("ticker", s.ticker.trim());
  fd.append("description", s.description.trim());
  fd.append("buyAmount", String(s.customAmount ?? s.selectedAmount));
  fd.append("walletPublicKey", selectedPubkey || "");
  fd.append("jitoTip", String(fees.jito));

  if (s.imageFile) {
    fd.append("image", s.imageFile);
  } else if (s.imageUrl) {
    fd.append("imageUrl", s.imageUrl);
  } else if (s.imageTab === "ascii" && s.asciiArt.trim()) {
    const blob = await asciiToPngBlob(s.asciiArt);
    if (!blob) throw new Error("Failed to render ASCII art to image");
    fd.append("image", blob, "ascii.png");
  }

  fd.append("social[twitter]", s.twitter.trim());
  fd.append("social[telegram]", s.telegram.trim());
  fd.append("social[website]", s.website.trim());

  fd.append("options", JSON.stringify(s.options));
  if (s.options.agent) fd.append("agentBuybackPct", String(s.agentBuybackPct));
  if (s.options.mayhem) fd.append("mayhemAgentMode", s.mayhemAgentMode);
  if (s.options.feesharing) {
    const { wallets, selectedPubkey: sel } = useWalletsStore.getState();
    const shares =
      s.feeShares.some((r) => r.address.trim())
        ? s.feeShares
        : defaultFeeShares(resolveDevPubkey(wallets, sel));
    fd.append("feeShares", JSON.stringify(feeSharesToPayload(shares)));
  }

  if (s.options.bundle) {
    const { bundleSelection, selectedPubkey } = useWalletsStore.getState();
    const extras = [...bundleSelection]
      .filter((pk) => pk !== selectedPubkey)
      .map((pk) => ({ pubkey: pk, amountSol: s.bundleAmounts[pk] ?? 0.5 }))
      .filter((e) => e.amountSol > 0)
      .slice(0, 3);
    if (extras.length) fd.append("bundleWallets", JSON.stringify(extras));
  }

  if (s.options.snipe) {
    fd.append(
      "snipe",
      JSON.stringify({
        amount: s.snipe.amount || 0.1,
        slippage: s.snipe.slippage || 15,
        priority: s.snipe.priority || 0.001,
      })
    );
  }

  return fd;
}

function cloneFormData(src: FormData): FormData {
  const fd = new FormData();
  for (const [k, v] of src.entries()) fd.append(k, v);
  return fd;
}

async function deployOnce(
  walletPubkey: string | null,
  template?: FormData,
  buyAmount?: number
): Promise<DeployResult> {
  const fd = template ? cloneFormData(template) : await buildDeployFormData();
  const s = useFormStore.getState();
  const selected = useWalletsStore.getState().selectedPubkey;
  const wallet = walletPubkey || selected || "";
  fd.set("walletPublicKey", wallet);
  if (buyAmount !== undefined) fd.set("buyAmount", String(buyAmount));
  if (s.options.multideploy && wallet !== selected) fd.delete("bundleWallets");

  // Multideploy: vanity mint only on the header-selected wallet; other clones get a random CA.
  const applyCustomCA =
    s.customCAEnabled &&
    Boolean(s.customCASecret.trim()) &&
    (!s.options.multideploy || wallet === selected);
  if (applyCustomCA) fd.append("customCA", s.customCASecret.trim());

  return api.deploy(fd);
}

export function useDeployFlow() {
  const deployIntent = useCallback(() => {
    const s = useFormStore.getState();
    const errors: string[] = [];
    const name = s.name.trim();
    const ticker = s.ticker.trim();

    if (!name) errors.push("Coin Name is required");
    if (!ticker) errors.push("Ticker is required");
    if (ticker.length < 1 || ticker.length > 10) errors.push("Ticker must be 1–10 chars");
    const hasImage = Boolean(
      s.imageFile || s.imageUrl || (s.imageTab === "ascii" && s.asciiArt.trim())
    );
    if (!hasImage) {
      errors.push(s.imageTab === "ascii" ? "ASCII art is empty" : "Image / GIF is required");
    }
    const amount = s.customAmount ?? s.selectedAmount;
    if (amount === null || amount === undefined || amount < 0) errors.push("Invalid buy amount");
    if (s.options.agent && (amount ?? 0) <= 0) {
      errors.push("Agent requires an initial buy > 0 SOL");
    }
    if (s.options.feesharing && s.options.cashback) {
      errors.push("Fee sharing cannot be combined with cashback");
    }
    if (s.options.feesharing) {
      const shareErr = feeShareError(s.feeShares);
      if (shareErr) errors.push(shareErr);
    }

    if (errors.length) {
      toast(errors[0], "error");
      return;
    }
    useUiStore.getState().setDeployModalOpen(true);
  }, []);

  const confirmDeploy = useCallback(async () => {
    const ui = useUiStore.getState();
    const s = useFormStore.getState();
    const wallets = useWalletsStore.getState().wallets;
    const tradeOpen = s.tradePanelEnabled;
    const imgForCard = s.imagePreviewUrl || s.imageUrl || null;
    const coinName = s.name.trim();
    const coinTicker = s.ticker.trim();

    const afterDeploy = (result: DeployResult, walletPubkey: string | null) => {
      // Prefer the persistent CDN image from the server; blob: previews die on reload.
      const persistentImg =
        result.imageUrl || (imgForCard && !imgForCard.startsWith("blob:") ? imgForCard : null);
      useDeployedStore.getState().addCoin({
        name: coinName,
        ticker: coinTicker,
        mint: result.mint,
        pumpUrl: result.pumpUrl,
        imageUrl: persistentImg,
        ts: Date.now(),
      });
      if (tradeOpen) {
        useTradePanelsStore.getState().open({
          mint: result.mint,
          walletPubkey,
          coinName,
          coinTicker,
          imageUrl: persistentImg || "",
          pumpUrl: result.pumpUrl,
          delayMs: 0,
        });
      } else if (result.pumpUrl) {
        window.open(result.pumpUrl, "_blank");
      }
    };

    try {
      if (s.options.multideploy) {
        const n = Math.max(1, s.cloneCount || 1);
        const cloneWallets = resolveCloneWalletPubkeys(wallets, s.cloneWallets, n)
          .map((pk) => wallets.find((w) => w.pubkey === pk))
          .filter((w): w is PublicWallet => Boolean(w));
        if (cloneWallets.length === 0) {
          throw new Error("No wallets available for multi-deploy");
        }

        ui.setDeployModalOpen(false);
        const template = await buildDeployFormData();
        const settled = await Promise.allSettled(
          cloneWallets.map((w, i) =>
            deployOnce(w.pubkey, template, s.cloneAmounts[i]).then((result) => {
              toast(`✓ Clone ${i + 1} deployed (${truncateAddress(w.pubkey)})`, "success");
              afterDeploy(result, w.pubkey);
              return result;
            })
          )
        );
        let successCount = 0;
        settled.forEach((r, i) => {
          if (r.status === "fulfilled") successCount++;
          else {
            const reason = r.reason;
            toast(
              `Clone ${i + 1} failed: ${reason instanceof Error ? reason.message : reason}`,
              "error"
            );
          }
        });
        if (successCount > 0) {
          toast(`Multi-deploy done: ${successCount}/${cloneWallets.length} succeeded`, "success");
        }
      } else {
        const result = await deployOnce(null);
        ui.setDeployModalOpen(false);
        toast(`✓ Deployed! tx: ${truncateAddress(result.signature ?? result.bundleId ?? "")}`, "success");
        afterDeploy(result, useWalletsStore.getState().selectedPubkey);
      }
    } catch (e) {
      console.error("Deploy error:", e);
      toast(e instanceof Error ? e.message : "Deploy failed", "error");
    }
  }, []);

  return { deployIntent, confirmDeploy };
}
