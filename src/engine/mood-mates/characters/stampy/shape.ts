import type { StampParams } from '../../geometry';

export const SIDE = 176;
export const BODY_ROT = -6.4;

export const STAMPY_BODY: StampParams = {
  width: SIDE,
  height: SIDE * 1.0185,
  corner: SIDE * 0.0504,
  bite: SIDE * 0.0739,
  biteOut: SIDE * 0.0114,
  bitePos: [-0.3, 0, 0.3],
  rot: BODY_ROT,
};
