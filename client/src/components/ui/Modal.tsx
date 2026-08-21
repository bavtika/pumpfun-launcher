import type { ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}

export function Modal({ open, onClose, title, children, footer, width = 420 }: ModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="glass rounded-[28px] shadow-[0_24px_64px_rgba(0,0,0,0.45)] max-w-[90vw] animate-[slideUp_0.18s_ease]"
        style={{ width }}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3.5 border-b border-white/10">
          <h3 className="text-sm font-semibold text-primary">{title}</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-dim hover:text-primary hover:bg-hover transition-colors"
            aria-label="Close"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 1l8 8M9 1L1 9" />
            </svg>
          </button>
        </div>
        <div className="px-[18px] py-4 flex flex-col gap-2.5">{children}</div>
        {footer && (
          <div className="flex gap-2 justify-end px-5 pt-3.5 pb-4 border-t border-white/10">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function ConfirmRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted">{label}</span>
      <span className="text-primary font-medium font-mono">{value}</span>
    </div>
  );
}

export function ModalWarning({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 px-3 py-2.5 bg-amber/7 border border-amber/22 rounded-sm text-[11px] text-amber leading-relaxed mt-1.5">
      {children}
    </div>
  );
}
