import { RINGS } from '../../emotion-ball/rings';
import type { Point, Ring } from '../geometry';
import { centroid } from '../util';

const SMOOTH_TAPS = [0.333347, 0.235559, 0.083121, 0.014646];

export const GROK_HEAD = RINGS.HEAD_C;

function upsample(ring: Ring): Ring {
  const out: Ring = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i] as Point;
    const b = ring[(i + 1) % ring.length] as Point;
    out.push([a[0], a[1]], [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
  }
  return out;
}

export function grokPlacer(anchor: Point, scale: number, aspect: number): (ring: Ring) => Ring {
  return (ring) => {
    const [cx, cy] = centroid(ring);
    const ox = anchor[0] + (cx - GROK_HEAD) * scale;
    const oy = anchor[1] + (cy - GROK_HEAD) * scale * aspect;
    return upsample(ring).map(([x, y]) => [ox + (x - cx) * scale, oy + (y - cy) * scale]);
  };
}

export interface PairPlacement {
  anchor: Point;
  idle: Point;
  scale: number;
  spread: number;
  reach: number;
  aspect: number;
}

export function grokPairPlacer(p: PairPlacement): (pair: [Ring, Ring]) => [Ring, Ring] {
  return (pair) => {
    const centres = pair.map((ring) => centroid(ring)) as [Point, Point];
    const mid: Point = [(centres[0][0] + centres[1][0]) / 2, (centres[0][1] + centres[1][1]) / 2];
    const ox = p.anchor[0] + (mid[0] - p.idle[0]) * p.reach;
    const oy = p.anchor[1] + (mid[1] - p.idle[1]) * p.reach * p.aspect;
    const placed = pair.map((ring, i) => {
      const [cx, cy] = centres[i] as Point;
      const ex = ox + (cx - mid[0]) * p.spread;
      const ey = oy + (cy - mid[1]) * p.spread * p.aspect;
      return upsample(ring).map(([x, y]) => [ex + (x - cx) * p.scale, ey + (y - cy) * p.scale] as Point);
    });
    return [placed[0] as Ring, placed[1] as Ring];
  };
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

export function normalizeRing(input: Ring, points: number, soften = true): Ring {
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
  for (let k = 0; k < points; k++) {
    const d = (total * k) / points;
    while (j < acc.length - 2 && (acc[j + 1] as number) < d) j++;
    const p = pts[j] as Point;
    const q = pts[j + 1] as Point;
    const span = (acc[j + 1] as number) - (acc[j] as number);
    const u = span > 1e-9 ? (d - (acc[j] as number)) / span : 0;
    out.push([p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u]);
  }
  return soften ? smooth(out) : out;
}
