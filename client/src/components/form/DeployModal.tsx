import { useState } from "react";
import { Modal, ConfirmRow, ModalWarning } from "../ui/Modal";
import { useUiStore } from "../../stores/ui";
import { useFormStore } from "../../stores/form";
import { useWalletsStore } from "../../stores/wallets";
import { FlameIcon, WarnIcon } from "../ui/icons";
import { truncateAddress } from "../../lib/format";

interface DeployModalProps {
  onConfirm: () => Promise<void>;
}

const OPTION_LABELS: Record<string, string> = {
  bundle: "Bundle",
  snipe: "Snipe",
  multideploy: "Multideploy",
  farmsnipers: "Farmsnipers",
  feesharing: "Feesharing",
  mayhem: "Mayhem",
  cashback: "Cashback",
  agent: "Agent",
};

export function DeployModal({ onConfirm }: DeployModalProps) {
  const { deployModalOpen, setDeployModalOpen, deployBusy } = useUiStore();
  const [busy, setBusy] = useState(false);
  const signing = busy || deployBusy;

  const name = useFormStore((s) => s.name);
  const ticker = useFormStore((s) => s.ticker);
  const options = useFormStore((s) => s.options);
  const selectedAmount = useFormStore((s) => s.selectedAmount);
  const customAmount = useFormStore((s) => s.customAmount);
  const agentBuybackPct = useFormStore((s) => s.agentBuybackPct);
  const feeShares = useFormStore((s) => s.feeShares);
  const wallets = useWalletsStore((s) => s.wallets);
  const selectedPubkey = useWalletsStore((s) => s.selectedPubkey);
  const devWallet = wallets.find((w) => w.pubkey === selectedPubkey) ?? wallets.find((w) => w.isDev);

  const amount = customAmount ?? selectedAmount;
  const activeOptions = Object.entries(options)
    .filter(([, v]) => v)
    .map(([k]) => {
      if (k === "agent") return `Agent ${agentBuybackPct}%`;
      if (k === "mayhem") {
        const mode = useFormStore.getState().mayhemAgentMode;
        return `Mayhem (${mode === "trigger" ? "Trigger" : "Classic"})`;
      }
      if (k === "feesharing") {
        const n = feeShares.filter((r) => r.address.trim()).length;
        return n ? `Fee Sharing (${n})` : "Fee Sharing";
      }
      return OPTION_LABELS[k] ?? k;
    });

  const handleConfirm = async () => {
    if (signing) return;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={deployModalOpen}
      onClose={() => {
        if (!signing) setDeployModalOpen(false);
      }}
      title="Confirm Deploy"
      footer={
        <>
          <button
            onClick={() => setDeployModalOpen(false)}
            disabled={signing}
            className="h-8 px-4 rounded-sm border border-line text-xs text-muted hover:text-primary hover:bg-hover transition-colors disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={signing}
            className={`h-8 px-4 flex items-center gap-1.5 rounded-sm bg-primary text-black text-xs font-semibold hover:bg-white/85 transition-colors disabled:opacity-60 ${signing ? "btn-loading" : ""}`}
          >
            <FlameIcon size={14} />
            {signing ? "Signing…" : "Confirm Deploy"}
          </button>
        </>
      }
    >
      <ConfirmRow label="Coin Name" value={name.trim() || "—"} />
      <ConfirmRow label="Ticker" value={ticker.trim() ? `$${ticker.trim()}` : "—"} />
      <ConfirmRow
        label="Dev Wallet"
        value={devWallet ? `${devWallet.name} · ${truncateAddress(devWallet.pubkey)}` : "—"}
      />
      <ConfirmRow label="Buy Amount" value={amount === 0 ? "None (no dev buy)" : `${amount} SOL`} />
      <ConfirmRow label="Options" value={activeOptions.length ? activeOptions.join(", ") : "None"} />
      <ModalWarning>
        <WarnIcon />
        This transaction will be submitted to pump.fun. This action is irreversible.
      </ModalWarning>
    </Modal>
  );
}
