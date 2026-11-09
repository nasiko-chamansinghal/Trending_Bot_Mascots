import { EMOTION_SEED } from '../../../emotion-ball/emotions';
import { RINGS } from '../../../emotion-ball/rings';
import type { EyePair, Point, Ring } from '../../geometry';
import { centroid } from '../../util';
import { grokPairPlacer, normalizeRing } from '../grok-rings';
import { PEAK_SPEC } from './spec';

export const PEAK_MOTION = 0.62;

const GROK_SCALE = 0.66;
const GROK_SPREAD = 0.66;
const GROK_REACH = 0.1;
const GROK_ASPECT = 0.55;
const RING_POINTS = 192;
const OVAL_POINTS = 96;
const EYE_DX = 15;
const EYE_X = PEAK_SPEC.center[0] + 4.8;
const EYE_Y = 127;
const OVAL_RX = 11;
const OVAL_RY = 20;
const MIN_HEIGHT = 34;
const MIN_LINE = 16;
const MAX_GROW = 1.4;

function heightOf(ring: Ring): number {
  const ys = ring.map((p) => p[1]);
  return Math.max(...ys) - Math.min(...ys);
}

function grow(pair: EyePair): EyePair {
  const tallest = Math.max(heightOf(pair[0]), heightOf(pair[1]));
  const k = tallest < MIN_LINE ? 1 : Math.min(MAX_GROW, Math.max(1, MIN_HEIGHT / tallest));
  return pair.map((ring) => {
    const [cx, cy] = centroid(ring);
    return ring.map(([x, y]): Point => [cx + (x - cx) * k, cy + (y - cy) * k]);
  }) as EyePair;
}

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
  anchor: [EYE_X, EYE_Y],
  idle: idleMid(),
  scale: GROK_SCALE,
  spread: GROK_SPREAD,
  reach: GROK_REACH,
  aspect: GROK_ASPECT,
});

const rings: Record<string, EyePair> = {
  calm: [oval(EYE_X - EYE_DX), oval(EYE_X + EYE_DX)],
};
RINGS.EXPRESSIONS.forEach((pair, i) => {
  rings[`g${i}`] = grow(place(pair));
});

export const PEAK_RINGS: Record<string, EyePair> = Object.fromEntries(
  Object.entries(rings).map(([slot, [l, r]]) => [
    slot,
    [normalizeRing(l, RING_POINTS, false), normalizeRing(r, RING_POINTS, false)] as EyePair,
  ]),
);
