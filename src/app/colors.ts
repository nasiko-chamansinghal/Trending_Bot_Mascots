export interface SavedColor {
  hex: string;
  name: string;
}

export const SAVED_COLORS: SavedColor[] = [
  { hex: '#EF4444', name: 'Red' },
  { hex: '#F97316', name: 'Orange' },
  { hex: '#FBBF24', name: 'Amber' },
  { hex: '#4ADE80', name: 'Green' },
  { hex: '#2DD4BF', name: 'Teal' },
  { hex: '#3B82F6', name: 'Blue' },
  { hex: '#4F46E5', name: 'Indigo' },
  { hex: '#EC4899', name: 'Pink' },
  { hex: '#E11D48', name: 'Rose' },
  { hex: '#D946EF', name: 'Fuchsia' },
  { hex: '#8B5CF6', name: 'Violet' },
  { hex: '#0EA5E9', name: 'Sky' },
  { hex: '#10B981', name: 'Emerald' },
  { hex: '#84CC16', name: 'Lime' },
];

export function isSavedColor(hex: string | null): hex is string {
  return hex !== null && SAVED_COLORS.some((c) => c.hex === hex);
}

export type EyeTone = 'black' | 'white';

export interface EyeOption {
  tone: EyeTone;
  name: string;
  hex: string;
}

export const EYE_OPTIONS: EyeOption[] = [
  { tone: 'black', name: 'Black', hex: '#111111' },
  { tone: 'white', name: 'White', hex: '#FFFFFF' },
];

export function isEyeTone(value: unknown): value is EyeTone {
  return value === 'black' || value === 'white';
}

export function eyeHex(tone: EyeTone | null): string | null {
  return EYE_OPTIONS.find((o) => o.tone === tone)?.hex ?? null;
}
