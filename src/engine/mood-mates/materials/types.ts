import type { Ring } from '../geometry';
import type { Palette } from '../types';

export interface MaterialContext {
  id: string;
  defs: SVGDefsElement;
  headRing: Ring;
  palette: Palette;
  silMinY: number;
  silMaxY: number;
  silMaxW: number;
}

export interface MaterialInstance {
  setColor: (color: string) => void;
  setSketch: (on: boolean, color: string) => void;
  body: () => SVGElement[];
}

export interface Material {
  create: (ctx: MaterialContext) => MaterialInstance;
}
