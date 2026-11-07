import { EMOTION_SEED } from '../../../emotion-ball/emotions';
import { RINGS } from '../../../emotion-ball/rings';
import type { EyePair, Point, Ring } from '../../geometry';
import { centroid } from '../../util';
import { grokPairPlacer, normalizeRing } from '../grok-rings';
import { WOODY_SPEC } from './spec';

export const WOODY_MOTION = 0.62;

const GROK_SCALE = WOODY_MOTION;
const GROK_SPREAD = WOODY_MOTION;
const GROK_REACH = 0.2;
const GROK_ASPECT = 1;
const RING_POINTS = 192;
const OVAL_POINTS = 96;
const EYE_DX = 22.8;
const EYE_Y = 95.6;
const OVAL_RX = 16;
const OVAL_RY = 24.5;
const CUT_FROM = (-163 * Math.PI) / 180;
const CUT_TO = (-138 * Math.PI) / 180;
const CUT_TIP: Point = [-0.08, -0.13];
const CUT_MIN_HEIGHT = 30;
const CUT_MIN_RATIO = 1.25;

interface Box {
  cx: number;
  cy: number;
  hw: number;
  hh: number;
}

function box(ring: Ring): Box {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const [x, y] of ring) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, hw: (maxX - minX) / 2, hh: (maxY - minY) / 2 };
}

function cuttable(ring: Ring): boolean {
  const { hw, hh } = box(ring);
  return hh * 2 >= CUT_MIN_HEIGHT && hh >= hw * CUT_MIN_RATIO;
}

function carve(ring: Ring): Ring {
  const { cx, cy, hw, hh } = box(ring);
  const n = ring.length;
  const inCut = ring.map(([x, y]) => {
    const a = Math.atan2((y - cy) / hh, (x - cx) / hw);
    return a >= CUT_FROM && a <= CUT_TO;
  });
  const start = inCut.findIndex((v, i) => v && !inCut[(i + n - 1) % n]);
  if (start < 0) return ring;
  let run = 0;
  while (run < n && inCut[(start + run) % n]) run++;
  const out: Ring = [[cx + CUT_TIP[0] * hw, cy + CUT_TIP[1] * hh]];
  for (let j = run; j < n; j++) out.push(ring[(start + j) % n] as Point);
  return out;
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
  anchor: [WOODY_SPEC.center[0], EYE_Y],
  idle: idleMid(),
  scale: GROK_SCALE,
  spread: GROK_SPREAD,
  reach: GROK_REACH,
  aspect: GROK_ASPECT,
});
const cut = (ring: Ring): Ring => (cuttable(ring) ? carve(ring) : ring);

const rings: Record<string, EyePair> = {
  calm: [cut(oval(WOODY_SPEC.center[0] - EYE_DX)), cut(oval(WOODY_SPEC.center[0] + EYE_DX))],
};
RINGS.EXPRESSIONS.forEach((pair, i) => {
  const [left, right] = place(pair);
  rings[`g${i}`] = [cut(left), cut(right)];
});

export const WOODY_RINGS: Record<string, EyePair> = Object.fromEntries(
  Object.entries(rings).map(([slot, [l, r]]) => [
    slot,
    [normalizeRing(l, RING_POINTS, false), normalizeRing(r, RING_POINTS, false)] as EyePair,
  ]),
);
