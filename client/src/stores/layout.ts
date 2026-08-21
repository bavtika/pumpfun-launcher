import { create } from "zustand";

export type WinId = "ct" | "form" | "deploys";

export interface WinRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface WinState extends WinRect {
  z: number;
  hidden: boolean;
}

export const MIN_W = 220;
export const MIN_H = 120;
const ADJ_TOL = 3;
/** snap distance in px when dragging/resizing near another window or workspace edge */
export const SNAP_TOL = 12;

export interface SnapGuides {
  /** vertical guide x (px), null when not snapped horizontally */
  v: number | null;
  /** horizontal guide y (px), null when not snapped vertically */
  h: number | null;
}

const NO_GUIDES: SnapGuides = { v: null, h: null };

interface LayoutState {
  wins: Record<WinId, WinState>;
  maxZ: number;
  initialized: boolean;
  guides: SnapGuides;

  initLayout: (wsW: number, wsH: number) => void;
  bringToFront: (id: WinId) => void;
  moveWin: (id: WinId, left: number, top: number) => void;
  resizeAll: (next: Record<WinId, WinRect>) => void;
  setGuides: (g: SnapGuides) => void;
  closeWin: (id: WinId) => void;
  openWin: (id: WinId) => void;
}

const DEFAULT_WINS: Record<WinId, WinState> = {
  ct: { left: 0, top: 0, width: 320, height: 400, z: 1, hidden: false },
  form: { left: 320, top: 0, width: 480, height: 400, z: 2, hidden: false },
  deploys: { left: 800, top: 0, width: 260, height: 400, z: 3, hidden: false },
};

export const useLayoutStore = create<LayoutState>((set) => ({
  wins: DEFAULT_WINS,
  maxZ: 10,
  initialized: false,
  guides: NO_GUIDES,

  initLayout: (wsW, wsH) =>
    set((s) => {
      if (s.initialized) return s;
      const GAP = 12;
      const ctW = 312;
      const deplW = 260;
      const formW = Math.max(MIN_W, wsW - ctW - deplW - GAP * 2);
      return {
        initialized: true,
        wins: {
          ct: { left: 0, top: 0, width: ctW, height: wsH, z: 1, hidden: false },
          form: { left: ctW + GAP, top: 0, width: formW, height: wsH, z: 10, hidden: false },
          deploys: { left: ctW + GAP + formW + GAP, top: 0, width: deplW, height: wsH, z: 3, hidden: false },
        },
        maxZ: 10,
      };
    }),

  bringToFront: (id) =>
    set((s) => {
      const maxZ = s.maxZ + 1;
      return { maxZ, wins: { ...s.wins, [id]: { ...s.wins[id], z: maxZ } } };
    }),

  moveWin: (id, left, top) =>
    set((s) => ({ wins: { ...s.wins, [id]: { ...s.wins[id], left, top } } })),

  resizeAll: (next) =>
    set((s) => {
      const wins = { ...s.wins };
      for (const id of Object.keys(next) as WinId[]) {
        wins[id] = { ...wins[id], ...next[id] };
      }
      return { wins };
    }),

  setGuides: (guides) =>
    set((s) =>
      s.guides.v === guides.v && s.guides.h === guides.h ? s : { guides }
    ),

  closeWin: (id) => set((s) => ({ wins: { ...s.wins, [id]: { ...s.wins[id], hidden: true } } })),

  openWin: (id) =>
    set((s) => {
      const maxZ = s.maxZ + 1;
      return { maxZ, wins: { ...s.wins, [id]: { ...s.wins[id], hidden: false, z: maxZ } } };
    }),
}));

type Dir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

/**
 * Computes the rects after a resize drag of window `id` by (dx, dy),
 * pushing/pulling adjacent windows that share the dragged edge.
 * `start` is a snapshot of all rects at drag start (adjacency is fixed during a drag).
 * Mirrors the legacy window manager formulas from app.js.
 */
export function computeResize(
  start: Record<WinId, WinRect>,
  visibleIds: WinId[],
  id: WinId,
  dir: Dir,
  dx: number,
  dy: number
): Record<WinId, WinRect> {
  const s = start[id];
  let { left: l, top: t, width: w, height: h } = s;

  const others = visibleIds.filter((w) => w !== id);

  const findAdjacent = (edgeDir: "e" | "w" | "s" | "n", edgeVal: number): WinId[] =>
    others.filter((wid) => {
      const r = start[wid];
      const v =
        edgeDir === "e"
          ? r.left
          : edgeDir === "w"
            ? r.left + r.width
            : edgeDir === "s"
              ? r.top
              : r.top + r.height;
      return Math.abs(v - edgeVal) <= ADJ_TOL;
    });

  const result: Record<WinId, WinRect> = { ...start };

  if (dir.includes("e")) {
    w = Math.max(MIN_W, s.width + dx);
    const adjs = findAdjacent("e", s.left + s.width);
    if (adjs.length) {
      const adjFarRight = Math.max(...adjs.map((a) => start[a].left + start[a].width));
      w = Math.min(w, adjFarRight - s.left - MIN_W);
      w = Math.max(MIN_W, w);
      const newBoundary = s.left + w;
      adjs.forEach((a) => {
        const as = start[a];
        result[a] = {
          ...as,
          left: newBoundary,
          width: Math.max(MIN_W, as.left + as.width - newBoundary),
        };
      });
    }
  }

  if (dir.includes("w")) {
    w = Math.max(MIN_W, s.width - dx);
    l = s.left + s.width - w;
    const adjs = findAdjacent("w", s.left);
    if (adjs.length) {
      const adjFarLeft = Math.min(...adjs.map((a) => start[a].left));
      w = Math.min(w, s.left + s.width - adjFarLeft - MIN_W);
      w = Math.max(MIN_W, w);
      l = s.left + s.width - w;
      adjs.forEach((a) => {
        const as = start[a];
        result[a] = { ...as, width: Math.max(MIN_W, l - as.left) };
      });
    }
  }

  if (dir.includes("s")) {
    h = Math.max(MIN_H, s.height + dy);
    const adjs = findAdjacent("s", s.top + s.height);
    if (adjs.length) {
      const adjFarBottom = Math.max(...adjs.map((a) => start[a].top + start[a].height));
      h = Math.min(h, adjFarBottom - s.top - MIN_H);
      h = Math.max(MIN_H, h);
      const newBoundary = s.top + h;
      adjs.forEach((a) => {
        const as = start[a];
        result[a] = {
          ...as,
          top: newBoundary,
          height: Math.max(MIN_H, as.top + as.height - newBoundary),
        };
      });
    }
  }

  if (dir.includes("n")) {
    h = Math.max(MIN_H, s.height - dy);
    t = s.top + s.height - h;
    const adjs = findAdjacent("n", s.top);
    if (adjs.length) {
      const adjFarTop = Math.min(...adjs.map((a) => start[a].top));
      h = Math.min(h, s.top + s.height - adjFarTop - MIN_H);
      h = Math.max(MIN_H, h);
      t = s.top + s.height - h;
      adjs.forEach((a) => {
        const as = start[a];
        result[a] = { ...as, height: Math.max(MIN_H, t - as.top) };
      });
    }
  }

  result[id] = { left: l, top: t, width: w, height: h };
  return result;
}

/* ────────────────────────────────────────────────────────────
   Edge snapping ("magnetic" windows)
   ──────────────────────────────────────────────────────────── */

interface SnapCandidate {
  /** guide line position (px) */
  line: number;
  /** resulting edge offset applied to the dragged value */
  apply: (edge: number) => number;
}

function snap1D(
  pos: number,
  size: number,
  candidates: SnapCandidate[],
  tol: number
): { pos: number; line: number | null } {
  let best: { pos: number; line: number; d: number } | null = null;
  for (const c of candidates) {
    for (const edge of [pos, pos + size]) {
      const d = Math.abs(c.line - edge);
      if (d <= tol && (!best || d < best.d)) {
        best = { pos: c.apply(edge), line: c.line, d };
      }
    }
  }
  return best ? { pos: best.pos, line: best.line } : { pos, line: null };
}

/**
 * Snaps a moving window rect to workspace edges and to other windows' edges.
 * Returns adjusted left/top plus the active guide lines (for rendering).
 */
export function snapMoveRect(
  rect: WinRect,
  others: WinRect[],
  wsW: number,
  wsH: number,
  tol: number = SNAP_TOL
): { left: number; top: number; guides: SnapGuides } {
  const cx: SnapCandidate[] = [
    { line: 0, apply: () => 0 },
    { line: wsW, apply: (edge) => (edge === rect.left ? wsW - rect.width : wsW - rect.width) },
    ...others.flatMap((o) => [
      { line: o.left, apply: (edge: number) => (edge === rect.left ? o.left : o.left - rect.width) },
      {
        line: o.left + o.width,
        apply: (edge: number) => (edge === rect.left ? o.left + o.width : o.left + o.width - rect.width),
      },
    ]),
  ];
  const cy: SnapCandidate[] = [
    { line: 0, apply: () => 0 },
    { line: wsH, apply: () => wsH - rect.height },
    ...others.flatMap((o) => [
      { line: o.top, apply: (edge: number) => (edge === rect.top ? o.top : o.top - rect.height) },
      {
        line: o.top + o.height,
        apply: (edge: number) => (edge === rect.top ? o.top + o.height : o.top + o.height - rect.height),
      },
    ]),
  ];

  const sx = snap1D(rect.left, rect.width, cx, tol);
  const sy = snap1D(rect.top, rect.height, cy, tol);
  return { left: sx.pos, top: sy.pos, guides: { v: sx.line, h: sy.line } };
}

/**
 * Snaps the dragged resize edge(s) to workspace edges and other windows,
 * returning corrected dx/dy plus guide lines. Apply before computeResize.
 */
export function snapResizeDelta(
  start: WinRect,
  others: WinRect[],
  dir: Dir,
  dx: number,
  dy: number,
  wsW: number,
  wsH: number,
  tol: number = SNAP_TOL
): { dx: number; dy: number; guides: SnapGuides } {
  const xs: number[] = [0, wsW, ...others.flatMap((o) => [o.left, o.left + o.width])];
  const ys: number[] = [0, wsH, ...others.flatMap((o) => [o.top, o.top + o.height])];

  let gx: number | null = null;
  let gy: number | null = null;

  const snapEdge = (edge: number, cands: number[]): { d: number; line: number } | null => {
    let best: { d: number; line: number } | null = null;
    for (const c of cands) {
      const diff = c - edge;
      if (Math.abs(diff) <= tol && (!best || Math.abs(diff) < Math.abs(best.d))) {
        best = { d: diff, line: c };
      }
    }
    return best;
  };

  if (dir.includes("e")) {
    const s = snapEdge(start.left + start.width + dx, xs);
    if (s) {
      dx += s.d;
      gx = s.line;
    }
  } else if (dir.includes("w")) {
    const s = snapEdge(start.left + dx, xs);
    if (s) {
      dx += s.d;
      gx = s.line;
    }
  }
  if (dir.includes("s")) {
    const s = snapEdge(start.top + start.height + dy, ys);
    if (s) {
      dy += s.d;
      gy = s.line;
    }
  } else if (dir.includes("n")) {
    const s = snapEdge(start.top + dy, ys);
    if (s) {
      dy += s.d;
      gy = s.line;
    }
  }

  return { dx, dy, guides: { v: gx, h: gy } };
}
