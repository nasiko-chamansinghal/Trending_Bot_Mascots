import { RINGS } from '../../../emotion-ball/rings';
import type { EyePair, Ring } from '../../geometry';
import { grokPlacer, normalizeRing } from '../grok-rings';
import RAW from './data/rings.json';
import { eyeShapes } from './shapes';
import { SHOW_SLOTS } from './show';
import { PUMPKIN_SPEC } from './spec';

const GROK_SCALE = 0.7036;
const GROK_ANCHOR = PUMPKIN_SPEC.center;
const GROK_ASPECT = 0.8873;
const RING_POINTS = 96;

const grok = grokPlacer(GROK_ANCHOR, GROK_SCALE, GROK_ASPECT);
const normalize = (ring: Ring): Ring => normalizeRing(ring, RING_POINTS);

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
Object.assign(rings, eyeShapes(rings.pill as EyePair));

export const PUMPKIN_RINGS: Record<string, EyePair> = Object.fromEntries(
  Object.entries(rings).map(([k, [l, r]]) => [k, [normalize(l), normalize(r)] as EyePair]),
);
export const FOLD_MS: number[] = RAW.foldMs;
export const UNFOLD_MS: number[] = RAW.unfoldMs;
