import { EMOTION_SEED } from '../../../emotion-ball/emotions';
import { RINGS } from '../../../emotion-ball/rings';
import type { EyePair, Point, Ring } from '../../geometry';
import { centroid } from '../../util';
import { grokPairPlacer } from '../grok-rings';
import { notchEye } from './cut';
import { WOODY_SPEC } from './spec';

export const WOODY_MOTION = 0.62;

const GROK_SCALE = WOODY_MOTION;
const GROK_SPREAD = WOODY_MOTION;
const GROK_REACH = 0.2;
const GROK_ASPECT = 1;
const OVAL_POINTS = 96;
const EYE_DX = 22.8;
const EYE_Y = 95.6;
const OVAL_RX = 16;
const OVAL_RY = 24.5;

function oval(cx: number): Ring {
  return Array.from({ length: OVAL_POINTS }, (_, i) => {
    const t = (i / OVAL_POINTS) * Math.PI * 2;
    return [cx + OVAL_RX * Math.cos(t), EYE_Y + OVAL_RY * Math.sin(t)] as Point;
  });
}

function idleMid(): Point {
  const idle = EMOTION_SEED.find((e) => e.id === '02');
  const [left, right] = RINGS.EXPRESSIONS[idle?.pool?.[0] ?? 0] as [Ring, Ring];
  const [lx, ly] = centroid(left);
  const [rx, ry] = centroid(right);
  return [(lx + rx) / 2, (ly + ry) / 2];
}

const place = grokPairPlacer({
  anchor: [WOODY_SPEC.center[0], EYE_Y],
  idle: idleMid(),
  scale: GROK_SCALE,
  spread: GROK_SPREAD,
  reach: GROK_REACH,
  aspect: GROK_ASPECT,
});
export const WOODY_RINGS: Record<string, EyePair> = {
  calm: [notchEye(oval(WOODY_SPEC.center[0] - EYE_DX)), notchEye(oval(WOODY_SPEC.center[0] + EYE_DX))],
};
RINGS.EXPRESSIONS.forEach((pair, i) => {
  const [left, right] = place(pair);
  WOODY_RINGS[`g${i}`] = [notchEye(left), notchEye(right)];
});
