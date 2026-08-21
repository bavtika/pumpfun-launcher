interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  labels?: [string, string];
  ariaLabel?: string;
}

export function Slider({ value, onChange, min = 0, max = 100, step = 1, labels, ariaLabel }: SliderProps) {
  return (
    <div>
      <input
        type="range"
        className="volume-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {labels && (
        <div className="flex justify-between text-[10px] text-dim uppercase tracking-widest mt-1">
          <span>{labels[0]}</span>
          <span>{labels[1]}</span>
        </div>
      )}
    </div>
  );
}
