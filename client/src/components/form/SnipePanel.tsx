import { useFormStore } from "../../stores/form";
import { inputCls } from "../../lib/styles";

const LABEL = "text-[10px] font-semibold text-dim uppercase tracking-[0.06em] mb-1";

export function SnipePanel() {
  const snipe = useFormStore((s) => s.snipe);
  const setSnipeField = useFormStore((s) => s.setSnipeField);

  return (
    <div className="bg-white/[0.03] border border-line rounded-sm p-3">
      <div className="mb-2.5 text-[10px] font-bold text-dim uppercase tracking-[0.08em]">
        Snipe Settings
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <div className={LABEL}>Amount (SOL)</div>
          <input
            type="number"
            value={snipe.amount || ""}
            onChange={(e) => setSnipeField("amount", parseFloat(e.target.value) || 0)}
            className={inputCls}
            placeholder="0.1"
            step={0.01}
            min={0.001}
          />
        </div>
        <div>
          <div className={LABEL}>Slippage %</div>
          <input
            type="number"
            value={snipe.slippage || ""}
            onChange={(e) => setSnipeField("slippage", parseFloat(e.target.value) || 0)}
            className={inputCls}
            placeholder="15"
            step={1}
            min={1}
            max={100}
          />
        </div>
        <div>
          <div className={LABEL}>Priority Fee (SOL)</div>
          <input
            type="number"
            value={snipe.priority || ""}
            onChange={(e) => setSnipeField("priority", parseFloat(e.target.value) || 0)}
            className={inputCls}
            placeholder="0.001"
            step={0.001}
            min={0}
          />
        </div>
      </div>
    </div>
  );
}
