import type { Ring } from '../geometry';
import type { BodyTint } from '../tint';
import type { BodyShape, LimbSpec, SolidAngles, StemShape } from './model';

export type { BodyTint };

export interface StemShading {
  edge: string;
  light: string;
  ball?: { radius: number; light: string; dark: string };
}

export interface PlateSpec {
  ring: Ring;
  top: string;
  bottom: string;
  inverse?: { top: string; bottom: string };
  tint?: BodyTint;
  darkTint?: BodyTint;
  marks?: Array<{ ring: Ring; fill: string }>;
  follow?: { anchor: [number, number]; gain: number; lean: number; limit: [number, number, number] };
}

export interface EarSpec {
  center: [number, number, number];
  radius: number;
  half: number;
  inner: { radius: number; fill: string };
}

export interface SolidSpec {
  body: BodyShape;
  tint?: BodyTint;
  stem?: StemShape;
  stemShading?: StemShading;
  plate?: PlateSpec;
  topper?: { ring: Ring; sway: number };
  wrapDecals?: boolean;
  ears?: EarSpec[];
  limbs?: LimbSpec[];
  rest: SolidAngles;
  scale: number;
  stretch: [number, number];
  center: [number, number];
  stemColor: string;
  capColor: string;
  edge: number;
}
