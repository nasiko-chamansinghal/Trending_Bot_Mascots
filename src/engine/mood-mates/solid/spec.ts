import type { BodyShape, SolidAngles, StemShape } from './model';

export interface SolidSpec {
  body: BodyShape;
  stem: StemShape;
  rest: SolidAngles;
  scale: number;
  stretch: [number, number];
  center: [number, number];
  stemColor: string;
  capColor: string;
  edge: number;
}
