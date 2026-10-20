import { RINGS } from '../../../emotion-ball/rings';
import type { EyePair, Point, Ring } from '../../geometry';
import { centroid } from '../../util';
import RAW from './data/rings.json';
import { SHOW_SLOTS } from './show';
import { PUMPKIN_SPEC } from './spec';

const HC = RINGS.HEAD_C;
const GROK_SCALE = 0.7036;
const GROK_ANCHOR = PUMPKIN_SPEC.center;
const GROK_ASPECT = PUMPKIN_SPEC.body.aspect;

function upsample(ring: Ring): Ring {
  const out: Ring = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i] as Point;
    const b = ring[(i + 1) % ring.length] as Point;
    out.push([a[0], a[1]], [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
  }
  return out;
}

function grok(ring: Ring): Ring {
  const [cx, cy] = centroid(ring);
  const ox = GROK_ANCHOR[0] + (cx - HC) * GROK_SCALE;
  const oy = GROK_ANCHOR[1] + (cy - HC) * GROK_SCALE * GROK_ASPECT;
  return upsample(ring).map(([x, y]) => [ox + (x - cx) * GROK_SCALE, oy + (y - cy) * GROK_SCALE]);
}

const pair = (p: number[][][]): EyePair => [p[0] as Ring, p[1] as Ring] as EyePair;

const rings: Record<string, EyePair> = {
  calm: pair(RAW.pill),
  pill: pair(RAW.pill),
  round: pair(RAW.round),
  dot: pair(RAW.dot),
  arc: pair(RAW.arc),
};
RINGS.EXPRESSIONS.forEach((p, i) => {
  rings[`g${i}`] = [grok(p[0]), grok(p[1])];
});
RAW.fold.forEach((p, i) => {
  rings[`fold${i}`] = pair(p);
});
RAW.unfold.forEach((p, i) => {
  rings[`unfold${i}`] = pair(p);
});

for (const [slot, p] of Object.entries(SHOW_SLOTS)) rings[slot] = pair(p);

export const PUMPKIN_RINGS = rings;
export const FOLD_MS: number[] = RAW.foldMs;
export const UNFOLD_MS: number[] = RAW.unfoldMs;
