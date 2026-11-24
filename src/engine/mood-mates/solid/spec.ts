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
  follow?: { anchor: [number, number]; gain: number; lean: number; limit: [number, number, number] };
}

export interface DecalSpec {
  ring: Ring;
  fill: string;
  opacity?: number;
  front?: boolean;
  follow?: boolean;
}

export interface ShadeTone {
  color: string;
  tone: 'light' | 'deep' | 'vivid' | 'fixed';
  amount?: number;
  hue?: number;
}

export interface HaloSpec extends ShadeTone {
  blur: number;
  grow: number;
  stops: Array<[number, number]>;
}

export interface ShadeSpec extends ShadeTone {
  from: [number, number];
  to: [number, number];
  stops: Array<[number, number]>;
  rim?: { width: number; blur: number };
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
  tintSpan?: [number, number];
  halo?: HaloSpec;
  stem?: StemShape;
  stemShading?: StemShading;
  stemFollow?: boolean;
  stemRoot?: boolean;
  plate?: PlateSpec;
  decals?: DecalSpec[];
  shades?: ShadeSpec[];
  topper?: {
    ring: Ring;
    sway: number;
    thin?: number;
    fill?: string;
    edge?: string;
    accent?: { ring: Ring; fill: string };
  };
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
