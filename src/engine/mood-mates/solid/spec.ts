import type { BodyShape, LimbSpec, SolidAngles, StemShape } from './model';

export interface SolidSpec {
  body: BodyShape;
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
