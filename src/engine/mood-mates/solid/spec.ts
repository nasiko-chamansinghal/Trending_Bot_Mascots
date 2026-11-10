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
  follow?: { anchor: [number, number]; gain: number; limit: [number, number] };
}

export interface SolidSpec {
  body: BodyShape;
  tint?: BodyTint;
  stem?: StemShape;
  stemShading?: StemShading;
  plate?: PlateSpec;
  limbs?: LimbSpec[];
  rest: SolidAngles;
  scale: number;
  stretch: [number, number];
  center: [number, number];
  stemColor: string;
  capColor: string;
  edge: number;
}
