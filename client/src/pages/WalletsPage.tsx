import { useEffect, useState } from "react";
import { useWalletsStore } from "../stores/wallets";
import { api } from "../api/client";
import { toast } from "../stores/toast";
import { Modal, ModalWarning } from "../components/ui/Modal";
import { truncateMiddle, formatSol } from "../lib/format";
import { inputCls, popBtnCls } from "../lib/styles";

const X_ICON = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
const COPY_ICON = (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
    <rect x="4" y="4" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" />
    <path d="M4 3V2a1 1 0 011-1h5a1 1 0 011 1v5a1 1 0 01-1 1H9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

export function WalletsPage() {
  const wallets = useWalletsStore((s) => s.wallets);
  const loading = useWalletsStore((s) => s.loading);
  const loadWallets = useWalletsStore((s) => s.loadWallets);
  const deleteWallet = useWalletsStore((s) => s.deleteWallet);

  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exportKey, setExportKey] = useState<string | null>(null);

  useEffect(() => {
    void loadWallets();
  }, [loadWallets]);

  const onExport = async (pubkey: string) => {
    try {
      const data = await api.exportWallet(pubkey);
      if (data.secretKey) setExportKey(data.secretKey);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Export failed", "error");
    }
  };

  return (
    <div className="h-full flex flex-col p-6 gap-4 max-w-[1100px] mx-auto w-full">
      {/* header */}
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold text-primary flex items-center gap-2">
          Wallets
          <span className="text-xs font-mono text-dim">{wallets.length}</span>
        </h1>
        <div className="flex gap-2">
          <button
            className={popBtnCls}
            onClick={() => void loadWallets()}
            disabled={loading}
          >
            <span className="flex items-center gap-1.5">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M9.5 5.5a4 4 0 1 1-1.17-2.83M9.5 1v2.2H7.3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Refresh
            </span>
          </button>
          <button className={popBtnCls} onClick={() => setCreateOpen(true)}>
            <span className="flex items-center gap-1.5">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Create Wallet
            </span>
          </button>
          <button className={popBtnCls} onClick={() => setImportOpen(true)}>
            <span className="flex items-center gap-1.5">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M5.5 7.5V1.5M3 5l2.5 2.5L8 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M1.5 9.5h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              Import
            </span>
          </button>
        </div>
      </div>

      {/* table */}
      {wallets.length > 0 ? (
        <div className="glass-inset rounded-[20px] overflow-hidden">
          <div className="grid grid-cols-[160px_1fr_130px_88px] gap-2 px-3 py-2 border-b border-white/10 text-[10px] font-bold text-dim tracking-[0.08em]">
            <div>NAME</div>
            <div>ADDRESS</div>
            <div>BALANCE</div>
            <div />
          </div>
          <div>
            {wallets.map((w) => (
              <div
                key={w.pubkey}
                className="group grid grid-cols-[160px_1fr_130px_88px] gap-2 px-3 py-2.5 border-b border-line/50 last:border-0 items-center hover:bg-white/[0.02] transition-colors"
              >
                <WalletNameCell pubkey={w.pubkey} name={w.name} isDev={w.isDev} />
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-mono text-[11px] text-muted truncate">
                    {truncateMiddle(w.pubkey, 16, 8)}
                  </span>
                  <button
                    title="Copy address"
                    className="w-6 h-6 shrink-0 flex items-center justify-center rounded-sm text-dim opacity-50 hover:opacity-100 hover:text-primary hover:bg-hover transition-all"
                    onClick={() => {
                      void navigator.clipboard.writeText(w.pubkey);
                      toast("Address copied ✓", "success");
                    }}
                  >
                    {COPY_ICON}
                  </button>
                </div>
                <div className="font-mono text-xs text-muted">
                  {w.balance !== null ? `${formatSol(w.balance)} SOL` : "—"}
                </div>
                <div className="flex gap-1 justify-end pr-1">
                  <button
                    title="Export private key"
                    className="w-7 h-7 flex items-center justify-center rounded-sm text-dim opacity-50 hover:opacity-100 hover:text-primary hover:bg-hover transition-all"
                    onClick={() => void onExport(w.pubkey)}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M6 1v7M3.5 5.5L6 8l2.5-2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M1.5 10h9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  </button>
                  <button
                    title="Delete"
                    className="w-7 h-7 flex items-center justify-center rounded-sm text-danger opacity-50 hover:opacity-100 hover:bg-hover transition-all"
                    onClick={() => {
                      if (window.confirm("Delete this wallet? This cannot be undone.")) {
                        void deleteWallet(w.pubkey);
                      }
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 3h8M4.5 1h3M5 5v4M7 5v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                      <rect x="2" y="3" width="8" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-16 glass-inset rounded-[20px]">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect x="4" y="7" width="20" height="15" rx="2.5" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
            <path d="M4 12h20" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
            <circle cx="20" cy="18" r="2" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
          </svg>
          <p className="text-dim text-xs">No wallets yet — create or import one</p>
        </div>
      )}

      <CreateWalletModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <ImportWalletModal open={importOpen} onClose={() => setImportOpen(false)} />
      <ExportKeyModal secretKey={exportKey} onClose={() => setExportKey(null)} />
    </div>
  );
}

/* ---------- inline wallet rename ---------- */

const PENCIL_ICON = (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
    <path
      d="M8.4 1.6l2 2L3.8 11.2l-2.6.6.6-2.6L8.4 1.6Z"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinejoin="round"
    />
  </svg>
);

function WalletNameCell({ pubkey, name, isDev }: { pubkey: string; name: string; isDev: boolean }) {
  const renameWallet = useWalletsStore((s) => s.renameWallet);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  const commit = async () => {
    const next = draft.trim();
    setEditing(false);
    if (!next || next === name) {
      setDraft(name);
      return;
    }
    await renameWallet(pubkey, next);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          value={draft}
          maxLength={32}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void commit()}
          onKeyDown={(e) => {
            if (e.key === "Enter") void commit();
            if (e.key === "Escape") {
              setDraft(name);
              setEditing(false);
            }
          }}
          className="h-7 w-full glass-input rounded-full px-3 text-xs text-primary outline-none"
        />
      </div>
    );
  }

  return (
    <div className="text-xs text-primary font-medium flex items-center gap-1.5 min-w-0">
      <span className="truncate">{name}</span>
      {isDev && (
        <span className="text-[9px] font-semibold text-accent bg-accent/10 border border-accent/30 rounded px-1 py-px shrink-0">
          Dev
        </span>
      )}
      <button
        title="Rename wallet"
        onClick={() => {
          setDraft(name);
          setEditing(true);
        }}
        className="w-6 h-6 shrink-0 flex items-center justify-center rounded-md text-dim opacity-0 group-hover:opacity-100 hover:text-primary hover:bg-hover transition-all"
      >
        {PENCIL_ICON}
      </button>
    </div>
  );
}

/* ---------- modals ---------- */

function CreateWalletModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createWallets = useWalletsStore((s) => s.createWallets);
  const [count, setCount] = useState(1);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    await createWallets(Math.min(10, Math.max(1, count)));
    setBusy(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Wallets"
      footer={
        <>
          <button className={popBtnCls} onClick={onClose}>
            Cancel
          </button>
          <button
            className="h-7 px-3 rounded-full bg-accent text-black text-xs font-medium hover:bg-accent/90 transition-colors disabled:opacity-60"
            onClick={() => void submit()}
            disabled={busy}
          >
            Generate
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <label className="text-xs text-muted">Number of wallets to generate (1–10)</label>
        <input
          type="number"
          value={count}
          min={1}
          max={10}
          onChange={(e) => setCount(parseInt(e.target.value) || 1)}
          className={inputCls}
        />
      </div>
      <p className="text-[11px] text-dim leading-relaxed mt-1">
        New keypairs will be generated and saved to the server. Private keys are stored in{" "}
        <code className="font-mono text-muted">.wallets.json</code> — keep it safe.
      </p>
    </Modal>
  );
}

function ImportWalletModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const importWallet = useWalletsStore((s) => s.importWallet);
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!key.trim()) {
      toast("Private key is required", "error");
      return;
    }
    setBusy(true);
    const ok = await importWallet(key.trim(), name.trim());
    setBusy(false);
    if (ok) {
      setKey("");
      setName("");
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Import Wallet"
      footer={
        <>
          <button className={popBtnCls} onClick={onClose}>
            Cancel
          </button>
          <button
            className="h-7 px-3 rounded-full bg-accent text-black text-xs font-medium hover:bg-accent/90 transition-colors disabled:opacity-60"
            onClick={() => void submit()}
            disabled={busy}
          >
            Import
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted">Private Key (Base58)</label>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Paste base58 private key…"
          autoComplete="off"
          className={`${inputCls} font-mono`}
        />
      </div>
      <div className="flex flex-col gap-1.5 mt-2">
        <label className="text-xs text-muted">
          Name <span className="text-dim">(optional)</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My wallet"
          className={inputCls}
        />
      </div>
    </Modal>
  );
}

function ExportKeyModal({ secretKey, onClose }: { secretKey: string | null; onClose: () => void }) {
  const [visible, setVisible] = useState(false);

  return (
    <Modal
      open={secretKey !== null}
      onClose={() => {
        setVisible(false);
        onClose();
      }}
      title="Export Private Key"
      footer={
        <button
          className={popBtnCls}
          onClick={() => {
            setVisible(false);
            onClose();
          }}
        >
          Close
        </button>
      }
    >
      <ModalWarning>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 mt-px">
          <path d="M7 1.5L12.5 11.5H1.5L7 1.5Z" stroke="#f59e0b" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M7 6v2.5M7 10v.5" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        Never share your private key. Anyone with it has full control of your funds.
      </ModalWarning>
      <div className="flex flex-col gap-1.5 mt-2">
        <label className="text-xs text-muted">Private Key (Base58)</label>
        <div className="flex gap-1.5">
          <input
            type={visible ? "text" : "password"}
            value={secretKey ?? ""}
            readOnly
            className={`${inputCls} font-mono flex-1`}
          />
          <button
            title="Show/hide"
            className={popBtnCls}
            onClick={() => setVisible((v) => !v)}
          >
            {visible ? "Hide" : "Show"}
          </button>
          <button
            title="Copy"
            className={popBtnCls}
            onClick={() => {
              if (secretKey) {
                void navigator.clipboard.writeText(secretKey);
                toast("Private key copied ✓", "success");
              }
            }}
          >
            Copy
          </button>
        </div>
      </div>
    </Modal>
  );
}
