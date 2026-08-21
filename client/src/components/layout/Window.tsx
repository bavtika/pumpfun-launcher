import { useCallback, useRef, type ReactNode, type MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import {
  useLayoutStore,
  computeResize,
  snapMoveRect,
  snapResizeDelta,
  MIN_W,
  type WinId,
  type WinRect,
} from "../../stores/layout";
import { CloseIcon } from "../ui/icons";

const DIRS = ["n", "s", "e", "w", "ne", "nw", "se", "sw"] as const;

interface WindowProps {
  id: WinId;
  title: string;
  icon?: ReactNode;
  headerRight?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
}

export function Window({ id, title, icon, headerRight, children, bodyClassName }: WindowProps) {
  const win = useLayoutStore((s) => s.wins[id]);
  const isActive = useLayoutStore((s) => s.maxZ === win.z && !win.hidden);
  const { bringToFront, moveWin, resizeAll, closeWin, setGuides } = useLayoutStore.getState();
  const frameRef = useRef<HTMLDivElement>(null);

  const workspaceEl = useCallback(
    () => frameRef.current?.parentElement ?? null,
    []
  );

  const visibleOthers = (state: ReturnType<typeof useLayoutStore.getState>): WinRect[] =>
    (Object.keys(state.wins) as WinId[])
      .filter((w) => w !== id && !state.wins[w].hidden)
      .map((w) => state.wins[w]);

  /* ── Drag by header (with magnetic snapping) ────────────── */
  const onHeaderMouseDown = (e: ReactMouseEvent) => {
    if ((e.target as HTMLElement).closest("button, input, select, a")) return;
    e.preventDefault();
    const startLeft = win.left;
    const startTop = win.top;
    const ox = e.clientX - startLeft;
    const oy = e.clientY - startTop;
    document.body.style.cursor = "grabbing";

    const onMove = (ev: MouseEvent) => {
      const ws = workspaceEl();
      const wsW = ws?.offsetWidth ?? window.innerWidth;
      const wsH = ws?.offsetHeight ?? window.innerHeight;
      const x = Math.max(0, Math.min(ev.clientX - ox, wsW - 80));
      const y = Math.max(0, Math.min(ev.clientY - oy, wsH - 36));
      const state = useLayoutStore.getState();
      const w = state.wins[id];
      const snapped = snapMoveRect(
        { left: x, top: y, width: w.width, height: w.height },
        visibleOthers(state),
        wsW,
        wsH
      );
      moveWin(id, snapped.left, snapped.top);
      setGuides(snapped.guides);
    };
    const onUp = () => {
      document.body.style.cursor = "";
      setGuides({ v: null, h: null });
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  /* ── Resize via 8 handles (linked + snapping) ───────────── */
  const onHandleMouseDown = (e: ReactMouseEvent, dir: (typeof DIRS)[number]) => {
    e.preventDefault();
    e.stopPropagation();
    bringToFront(id);

    const sx = e.clientX;
    const sy = e.clientY;
    const state = useLayoutStore.getState();
    const start: Record<WinId, WinRect> = {
      ct: { ...state.wins.ct },
      form: { ...state.wins.form },
      deploys: { ...state.wins.deploys },
    };
    const visibleIds = (Object.keys(start) as WinId[]).filter((w) => !state.wins[w].hidden);

    const onMove = (ev: MouseEvent) => {
      const ws = workspaceEl();
      const wsW = ws?.offsetWidth ?? window.innerWidth;
      const wsH = ws?.offsetHeight ?? window.innerHeight;
      const others = visibleIds.filter((w) => w !== id).map((w) => start[w]);
      const snapped = snapResizeDelta(
        start[id],
        others,
        dir,
        ev.clientX - sx,
        ev.clientY - sy,
        wsW,
        wsH
      );
      const next = computeResize(start, visibleIds, id, dir, snapped.dx, snapped.dy);
      resizeAll(next);
      setGuides(snapped.guides);
    };
    const onUp = () => {
      setGuides({ v: null, h: null });
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  if (win.hidden) return null;

  return (
    <div
      ref={frameRef}
      className={`absolute flex flex-col bg-panel border rounded-lg overflow-hidden min-w-[220px] transition-shadow duration-150 ${
        isActive
          ? "border-line-focus shadow-[0_16px_48px_rgba(0,0,0,0.55)]"
          : "border-line shadow-[0_6px_20px_rgba(0,0,0,0.35)]"
      }`}
      style={{
        left: win.left,
        top: win.top,
        width: win.width,
        height: win.height,
        zIndex: win.z,
        minWidth: MIN_W,
      }}
      onMouseDownCapture={(e) => {
        if (!(e.target as HTMLElement).closest(".win-resize")) bringToFront(id);
      }}
    >
      {DIRS.map((d) => (
        <div key={d} className={`win-resize win-resize-${d}`} onMouseDown={(e) => onHandleMouseDown(e, d)} />
      ))}

      <div
        className={`flex items-center justify-between h-10 px-3 border-b border-line cursor-grab select-none shrink-0 transition-colors ${
          isActive ? "bg-white/[0.03]" : "bg-transparent"
        }`}
        onMouseDown={onHeaderMouseDown}
      >
        <div className="flex items-center gap-1.5 text-dim">
          {icon}
          <span
            className={`text-[10px] font-semibold tracking-[0.12em] uppercase transition-colors ${
              isActive ? "text-primary" : "text-muted"
            }`}
          >
            {title}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {headerRight}
          <button
            className="w-[22px] h-[22px] flex items-center justify-center rounded-sm text-dim hover:text-primary hover:bg-hover transition-colors"
            title="Close"
            onClick={(e) => {
              e.stopPropagation();
              closeWin(id);
            }}
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto overflow-x-hidden ${bodyClassName ?? ""}`}>
        {children}
      </div>
    </div>
  );
}

/** Full-area overlay used by page panels (wallets/earnings/settings). */
export function PageOverlay({ children }: { children: ReactNode }) {
  return createPortal(
    <div className="fixed left-2.5 right-2.5 top-topbar bottom-bottombar bg-panel border border-line rounded-lg z-[90] flex flex-col overflow-hidden animate-[fadeIn_0.15s_ease]">
      {children}
    </div>,
    document.body
  );
}
