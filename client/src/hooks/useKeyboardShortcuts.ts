import { useEffect } from "react";
import { useUiStore } from "../stores/ui";

/**
 * Legacy shortcuts (app.js):
 *  - Ctrl/Cmd+Enter → confirm deploy when the modal is open, otherwise open it
 *  - Escape → close modal → close popover → close fees dropdown → back to feed
 */
export function useKeyboardShortcuts(opts: {
  onDeployIntent: () => void;
  onConfirmDeploy: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ui = useUiStore.getState();
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (ui.deployBusy) return;
        if (ui.deployModalOpen) opts.onConfirmDeploy();
        else opts.onDeployIntent();
        return;
      }
      if (e.key === "Escape") {
        // Overlays close even when Escape comes from an input, but the
        // "back to feed" fallback must not fire while the user is editing text
        // (e.g. inline wallet rename uses Escape to cancel the edit).
        const t = e.target as HTMLElement | null;
        const editing =
          !!t &&
          (t.tagName === "INPUT" ||
            t.tagName === "TEXTAREA" ||
            t.tagName === "SELECT" ||
            t.isContentEditable);

        if (ui.deployModalOpen) ui.setDeployModalOpen(false);
        else if (ui.activePopover) ui.closePopover();
        else if (ui.feesOpen) ui.setFeesOpen(false);
        else if (ui.vampOpen) ui.setVampOpen(false);
        else if (!editing && ui.activePage !== "feed") ui.setActivePage("feed");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // opts callbacks are stable useCallbacks; store reads go through getState()
  }, [opts]);
}
