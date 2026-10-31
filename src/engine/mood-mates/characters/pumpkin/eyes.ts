import { RINGS } from '../../../emotion-ball/rings';
import type { EyePair, Point, Ring } from '../../geometry';
import { centroid } from '../../util';
import RAW from './data/rings.json';
import { eyeShapes } from './shapes';
import { SHOW_SLOTS } from './show';
import { PUMPKIN_SPEC } from './spec';

const HC = RINGS.HEAD_C;
const GROK_SCALE = 0.7036;
const GROK_ANCHOR = PUMPKIN_SPEC.center;
const GROK_ASPECT = 0.8873;
const RING_POINTS = 96;
const SMOOTH_TAPS = [0.333347, 0.235559, 0.083121, 0.014646];

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

function topStart(ring: Ring): { seg: number; t: number } {
  const [cx] = centroid(ring);
  let best = { seg: 0, t: 0, y: Number.POSITIVE_INFINITY };
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i] as Point;
    const b = ring[(i + 1) % ring.length] as Point;
    if (a[0] === b[0] || (a[0] - cx) * (b[0] - cx) > 0) continue;
    const t = (cx - a[0]) / (b[0] - a[0]);
    const y = a[1] + (b[1] - a[1]) * t;
    if (y < best.y) best = { seg: i, t, y };
  }
  return best;
}

function normalize(input: Ring): Ring {
  let area = 0;
  for (let i = 0; i < input.length; i++) {
    const a = input[i] as Point;
    const b = input[(i + 1) % input.length] as Point;
    area += a[0] * b[1] - b[0] * a[1];
  }
  const cw = area >= 0 ? input : [...input].reverse();
  const { seg, t } = topStart(cw);
  const n = cw.length;
  const a0 = cw[seg] as Point;
  const b0 = cw[(seg + 1) % n] as Point;
  const pts: Point[] = [[a0[0] + (b0[0] - a0[0]) * t, a0[1] + (b0[1] - a0[1]) * t]];
  for (let k = 1; k <= n; k++) pts.push(cw[(seg + k) % n] as Point);
  pts.push(pts[0] as Point);
  const acc = [0];
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i] as Point;
    const q = pts[i - 1] as Point;
    acc.push((acc[i - 1] as number) + Math.hypot(p[0] - q[0], p[1] - q[1]));
  }
  const total = acc[acc.length - 1] as number;
  const out: Ring = [];
  let j = 0;
  for (let k = 0; k < RING_POINTS; k++) {
    const d = (total * k) / RING_POINTS;
    while (j < acc.length - 2 && (acc[j + 1] as number) < d) j++;
    const p = pts[j] as Point;
    const q = pts[j + 1] as Point;
    const span = (acc[j + 1] as number) - (acc[j] as number);
    const u = span > 1e-9 ? (d - (acc[j] as number)) / span : 0;
    out.push([p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u]);
  }
  return smooth(out);
}

function smooth(ring: Ring): Ring {
  const n = ring.length;
  return ring.map((_, i) => {
    let x = 0;
    let y = 0;
    for (let k = -SMOOTH_TAPS.length + 1; k < SMOOTH_TAPS.length; k++) {
      const w = SMOOTH_TAPS[Math.abs(k)] as number;
      const p = ring[(i + k + n) % n] as Point;
      x += p[0] * w;
      y += p[1] * w;
    }
    return [x, y] as Point;
  });
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
Object.assign(rings, eyeShapes(rings.pill as EyePair));

export const PUMPKIN_RINGS: Record<string, EyePair> = Object.fromEntries(
  Object.entries(rings).map(([k, [l, r]]) => [k, [normalize(l), normalize(r)] as EyePair]),
);
export const FOLD_MS: number[] = RAW.foldMs;
export const UNFOLD_MS: number[] = RAW.unfoldMs;
