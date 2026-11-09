import type { BodyTint } from '../tint';
import type { BodyShape, LimbSpec, SolidAngles, StemShape } from './model';

export type { BodyTint };

export interface SolidSpec {
  body: BodyShape;
  tint?: BodyTint;
  stem?: StemShape;
  limbs?: LimbSpec[];
  rest: SolidAngles;
  scale: number;
  stretch: [number, number];
  center: [number, number];
  stemColor: string;
  capColor: string;
  edge: number;
}
