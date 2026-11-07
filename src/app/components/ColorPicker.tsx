import { SAVED_COLORS } from '../colors';

interface ColorPickerProps {
  color: string | null;
  onSelect: (hex: string) => void;
}

export function ColorPicker({ color, onSelect }: ColorPickerProps) {
  return (
    <div className="swatch-grid" role="radiogroup" aria-label="Colour">
      {SAVED_COLORS.map((c) => (
        <label key={c.hex} className="swatch" title={c.name}>
          <input
            className="visually-hidden"
            type="radio"
            name="colour"
            value={c.hex}
            checked={c.hex === color}
            onChange={() => onSelect(c.hex)}
            aria-label={c.name}
          />
          <span className="swatch-fill" style={{ backgroundColor: c.hex }} />
        </label>
      ))}
    </div>
  );
}
