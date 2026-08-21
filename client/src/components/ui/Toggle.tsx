interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
}

export function Toggle({ checked, onChange, disabled, ariaLabel }: ToggleProps) {
  return (
    <label className="toggle-switch">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="toggle-knob" />
    </label>
  );
}
