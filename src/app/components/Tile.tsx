import type { CSSProperties, ReactNode } from 'react';

interface TileProps {
  group: string;
  value: string;
  label: string;
  title?: string;
  index: number;
  checked: boolean;
  onSelect: () => void;
  children: ReactNode;
}

export function Tile({ group, value, label, title, index, checked, onSelect, children }: TileProps) {
  return (
    <label
      className="tile"
      title={title}
      data-checked={checked || undefined}
      style={{ '--i': index } as CSSProperties}
    >
      <input
        className="visually-hidden"
        type="radio"
        name={group}
        value={value}
        checked={checked}
        onChange={onSelect}
      />
      <span className="tile-art">{children}</span>
      <span className="tile-label">{label}</span>
    </label>
  );
}
