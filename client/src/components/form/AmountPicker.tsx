import { useFormStore } from "../../stores/form";
import { inputCls, solIcon } from "../../lib/styles";

const PRESETS = [0, 0.5, 1, 2, 4];

export function AmountPicker() {
  const selectedAmount = useFormStore((s) => s.selectedAmount);
  const customAmount = useFormStore((s) => s.customAmount);
  const setField = useFormStore((s) => s.setField);

  return (
    <div>
      <div className="text-[11px] font-medium text-muted mb-1.5">Buy Amount</div>
      <div className="flex items-center gap-1.5">
        {PRESETS.map((v) => (
          <button
            key={v}
            onClick={() => {
              setField("selectedAmount", v);
              setField("customAmount", null);
            }}
            className={`flex items-center gap-1.5 h-9 px-3.5 rounded-md border text-[12px] font-mono transition-colors ${
              customAmount === null && selectedAmount === v
                ? "border-line-focus bg-white/[0.06] text-primary"
                : "border-line bg-card text-dim hover:text-muted hover:bg-hover"
            }`}
          >
            {solIcon}
            {v}
          </button>
        ))}
        <input
          type="number"
          value={customAmount ?? ""}
          onChange={(e) =>
            setField("customAmount", e.target.value === "" ? null : parseFloat(e.target.value) || 0)
          }
          onKeyDown={(e) => {
            // Erased the custom value and hit Enter → fall back to the 0 preset
            if (e.key === "Enter" && e.currentTarget.value === "") {
              setField("selectedAmount", 0);
              setField("customAmount", null);
              e.currentTarget.blur();
            }
          }}
          className={`${inputCls} !w-24 font-mono ${customAmount !== null ? "!border-line-focus !bg-white/[0.06]" : ""}`}
          placeholder="Custom"
          step={0.1}
          min={0.01}
        />
      </div>
    </div>
  );
}
