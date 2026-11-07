import { EYE_OPTIONS, type EyeTone } from '../colors';

interface EyePickerProps {
  tone: EyeTone | null;
  onSelect: (tone: EyeTone) => void;
}

export function EyePicker({ tone, onSelect }: EyePickerProps) {
  return (
    <div className="chip-grid" role="radiogroup" aria-label="Eye colour">
      {EYE_OPTIONS.map((option) => (
        <label key={option.tone} className="chip" data-checked={option.tone === tone || undefined}>
          <input
            className="visually-hidden"
            type="radio"
            name="eyes"
            value={option.tone}
            checked={option.tone === tone}
            onChange={() => onSelect(option.tone)}
          />
          <span className="chip-eye" style={{ backgroundColor: option.hex }} />
          <span className="chip-label">{option.name}</span>
        </label>
      ))}
    </div>
  );
}
