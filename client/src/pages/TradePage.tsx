import { useSearchParams } from "react-router-dom";
import { TradeView } from "../components/trade/TradeCore";
import { Toast } from "../components/ui/Toast";

export function TradePage() {
  const [params] = useSearchParams();

  const mint = params.get("mint") ?? "";
  const wallet = params.get("wallet") ?? "";
  const name = params.get("name") ?? "Unknown";
  const ticker = params.get("ticker") ?? "?";
  const imageUrl = params.get("image") ?? "";
  const pumpUrl = params.get("pumpUrl") || `https://pump.fun/${mint}`;

  return (
    <div className="h-full flex flex-col bg-bg">
      <div className="w-full max-w-[420px] mx-auto h-full flex flex-col border-x border-line">
        <TradeView
          mint={mint}
          walletPubkey={wallet || null}
          coinName={name}
          coinTicker={ticker}
          imageUrl={imageUrl || null}
          pumpUrl={pumpUrl}
        />
      </div>
      <Toast />
    </div>
  );
}
