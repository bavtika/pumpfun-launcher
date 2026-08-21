/** Shared Tailwind class strings matching the legacy field/button styles. */

export const inputCls =
  "h-9 w-full bg-input border border-line rounded-md px-3 text-[13px] text-primary placeholder:text-dim outline-none focus:border-line-focus transition-colors";

export const textareaCls =
  "w-full bg-input border border-line rounded-md px-3 py-2.5 text-[13px] text-primary placeholder:text-dim outline-none focus:border-line-focus transition-colors resize-none";

export const fieldLabelCls =
  "flex items-center justify-between text-[11.5px] font-medium text-muted mb-1.5";

export const iconBtnCls =
  "w-8 h-8 flex items-center justify-center rounded-md text-dim hover:text-primary hover:bg-hover transition-colors";

export const popBtnCls =
  "h-7 px-3 rounded-md border border-line bg-white/[0.03] text-[11.5px] text-muted hover:text-primary hover:bg-hover transition-colors";

/**
 * Brand gradient for the Solana logomark. Mounted once at the app root so every
 * `url(#solana-grad)` reference resolves even as icon instances mount/unmount.
 */
export function SolanaGradientDefs() {
  return (
    <svg aria-hidden="true" width="0" height="0" style={{ position: "absolute" }}>
      <defs>
        <linearGradient id="solana-grad" x1="100%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#00FFA3" />
          <stop offset="100%" stopColor="#DC1FFF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** Official Solana logomark with the brand gradient. */
export const solIcon = (
  <svg width="10" height="10" viewBox="0 0 397.7 311.7" fill="url(#solana-grad)" aria-hidden="true">
    <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z" />
    <path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z" />
    <path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z" />
  </svg>
);
