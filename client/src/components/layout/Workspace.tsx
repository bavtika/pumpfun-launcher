import { useEffect, useRef } from "react";
import { useLayoutStore } from "../../stores/layout";
import { Window } from "./Window";
import { CreateCoinForm } from "../form/CreateCoinForm";
import { WalletSelect } from "../form/WalletSelect";
import { DeployedCards } from "../deploys/DeployedCards";
import { FeedIcon, SettingsIcon, FlameIcon, DeploysIcon } from "../ui/icons";
import { useUiStore } from "../../stores/ui";

function CtTrackerBody() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 text-dim">
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none" opacity="0.18">
        <circle cx="16" cy="16" r="6" fill="currentColor" />
        <circle cx="16" cy="16" r="11" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" />
        <circle cx="16" cy="16" r="15" stroke="currentColor" strokeWidth="1.5" opacity="0.5" strokeDasharray="3 4" />
      </svg>
      <p className="text-xs">No tweets yet</p>
    </div>
  );
}

function SnapGuides() {
  const guides = useLayoutStore((s) => s.guides);
  if (guides.v === null && guides.h === null) return null;
  return (
    <>
      {guides.v !== null && (
        <div
          className="absolute top-0 bottom-0 w-px bg-accent/70 shadow-[0_0_8px_rgba(255,255,255,0.25)] pointer-events-none z-[999]"
          style={{ left: guides.v }}
        />
      )}
      {guides.h !== null && (
        <div
          className="absolute left-0 right-0 h-px bg-accent/70 shadow-[0_0_8px_rgba(255,255,255,0.25)] pointer-events-none z-[999]"
          style={{ top: guides.h }}
        />
      )}
    </>
  );
}

export function Workspace() {
  const wsRef = useRef<HTMLDivElement>(null);
  const initLayout = useLayoutStore((s) => s.initLayout);
  const setActivePage = useUiStore((s) => s.setActivePage);

  useEffect(() => {
    if (wsRef.current) {
      initLayout(wsRef.current.offsetWidth, wsRef.current.offsetHeight);
    }
  }, [initLayout]);

  return (
    <div ref={wsRef} className="fixed top-topbar bottom-bottombar left-3 right-3 overflow-hidden">
      <Window
        id="ct"
        title="CT Tracker"
        icon={<FeedIcon size={12} className="text-dim" />}
        headerRight={
          <button
            className="w-[22px] h-[22px] flex items-center justify-center rounded-sm text-dim hover:text-primary hover:bg-hover transition-colors"
            title="Settings"
            onClick={() => setActivePage("settings")}
          >
            <SettingsIcon size={13} />
          </button>
        }
      >
        <CtTrackerBody />
      </Window>

      <Window
        id="form"
        title="Create Coin"
        icon={<FlameIcon size={12} className="text-dim" />}
        headerRight={<WalletSelect />}
      >
        <CreateCoinForm />
      </Window>

      <Window id="deploys" title="Deploys" icon={<DeploysIcon size={12} className="text-dim" />}>
        <DeployedCards />
      </Window>

      <SnapGuides />
    </div>
  );
}
