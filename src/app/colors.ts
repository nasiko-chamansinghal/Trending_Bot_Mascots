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

const BLACK = '#111111';
const WHITE = '#FFFFFF';

const EYES_IN_GRID_ORDER: Array<[string, string]> = [
  ['ball', BLACK],
  ['nubby', WHITE],
  ['stampy', WHITE],
  ['pumpkin', BLACK],
  ['peak', WHITE],
  ['ghosty', WHITE],
  ['bloom', WHITE],
  ['hexo', WHITE],
  ['ninjo', BLACK],
  ['jelo', WHITE],
  ['drip', BLACK],
  ['flame', BLACK],
  ['germy', BLACK],
  ['spiky', WHITE],
  ['mokey', BLACK],
  ['inky', WHITE],
  ['dewy', WHITE],
  ['tufty', WHITE],
  ['ember', BLACK],
  ['cheffy', BLACK],
  ['bunni', WHITE],
  ['blaze', WHITE],
  ['glowy', BLACK],
  ['googly', BLACK],
  ['wispy', BLACK],
  ['cheeky', BLACK],
  ['blobby', WHITE],
  ['fuzzy', WHITE],
  ['limey', BLACK],
  ['bao', WHITE],
  ['nimbo', BLACK],
  ['grokky', WHITE],
  ['chimpy', BLACK],
  ['puffy', BLACK],
];

const EYE_COLORS = new Map(EYES_IN_GRID_ORDER);

export function eyeColorOf(character: string): string | null {
  return EYE_COLORS.get(character) ?? null;
}
