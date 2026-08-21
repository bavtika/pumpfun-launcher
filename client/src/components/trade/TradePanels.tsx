import { useTradePanelsStore, type TradePanelData } from "../../stores/tradePanels";
import { TradeView } from "./TradeCore";

function TradePanel({ panel, index }: { panel: TradePanelData; index: number }) {
  const close = useTradePanelsStore((s) => s.close);
  if (!panel.shown) return null;

  return (
    <div
      className="fixed bottom-bottombar w-[300px] h-[480px] bg-panel border border-line rounded-t-md shadow-[0_-8px_24px_rgba(0,0,0,0.5)] z-[160] flex flex-col overflow-hidden"
      style={{ right: 10 + index * 310 }}
    >
      <div className="relative">
        <button
          onClick={() => close(panel.id)}
          title="Close"
          className="absolute top-2 right-2 z-10 w-5 h-5 flex items-center justify-center rounded text-dim hover:text-primary hover:bg-white/[0.08] transition-colors"
        >
          <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
            <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <TradeView
          mint={panel.mint}
          walletPubkey={panel.walletPubkey}
          coinName={panel.coinName}
          coinTicker={panel.coinTicker}
          imageUrl={panel.imageUrl}
          pumpUrl={panel.pumpUrl}
        />
      </div>
    </div>
  );
}

export function TradePanels() {
  const panels = useTradePanelsStore((s) => s.panels);
  return (
    <>
      {panels.map((p, i) => (
        <TradePanel key={p.id} panel={p} index={i} />
      ))}
    </>
  );
}
