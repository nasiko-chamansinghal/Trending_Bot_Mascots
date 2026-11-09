import type { CutEye, Point, Ring } from '../../geometry';

const HALF = 96;
const ARC_STEPS = 24;
const SPLINE_STEPS = 16;
const GRID = 2400;
const BISECT = 48;

interface Profile {
  xl: number;
  xr: number;
  top: (x: number) => number;
  bot: (x: number) => number;
}

function roundedBox(w: number, h: number, rTop: number, rBot: number): Point[] {
  const hw = w / 2;
  const hh = h / 2;
  const rt = Math.min(rTop, hw, hh);
  const rb = Math.min(rBot, hw, hh);
  const corners: Array<[number, number, number, number]> = [
    [-hw + rt, -hh + rt, rt, Math.PI],
    [hw - rt, -hh + rt, rt, Math.PI * 1.5],
    [hw - rb, hh - rb, rb, 0],
    [-hw + rb, hh - rb, rb, Math.PI / 2],
  ];
  const out: Point[] = [];
  for (const [cx, cy, r, start] of corners) {
    for (let s = 0; s <= ARC_STEPS; s++) {
      const a = start + (Math.PI / 2) * (s / ARC_STEPS);
      out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  }
  return out;
}

function splineOutline(ring: Point[]): Point[] {
  const n = ring.length;
  const out: Point[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = ring[(i - 1 + n) % n] as Point;
    const p1 = ring[i] as Point;
    const p2 = ring[(i + 1) % n] as Point;
    const p3 = ring[(i + 2) % n] as Point;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    for (let s = 0; s < SPLINE_STEPS; s++) {
      const t = s / SPLINE_STEPS;
      const u = 1 - t;
      out.push([
        u * u * u * p1[0] + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * p2[0],
        u * u * u * p1[1] + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * p2[1],
      ]);
    }
  }
  return out;
}

function outlineOf(eye: CutEye): Point[] {
  const base = eye.outline
    ? splineOutline(eye.outline.map(([x, y]): Point => [x * eye.w, y * eye.h]))
    : roundedBox(eye.w, eye.h, eye.rTop, eye.rBot);
  const tilt = (eye.tilt * Math.PI) / 180;
  const tc = Math.cos(tilt);
  const ts = Math.sin(tilt);
  return base.map(([x, y]): Point => [x * tc - y * ts, x * ts + y * tc]);
}

function monotone(chain: Point[]): Point[] {
  let m = Number.NEGATIVE_INFINITY;
  return chain.map(([x, y]): Point => {
    m = Math.max(m, x);
    return [m, y];
  });
}

function splitChains(poly: Point[]): [Point[], Point[]] {
  const n = poly.length;
  let lo = 0;
  let hi = 0;
  for (let i = 1; i < n; i++) {
    const x = (poly[i] as Point)[0];
    if (x < (poly[lo] as Point)[0]) lo = i;
    if (x > (poly[hi] as Point)[0]) hi = i;
  }
  const walk = (from: number, to: number): Point[] => {
    const out: Point[] = [];
    for (let i = from; ; i = (i + 1) % n) {
      out.push(poly[i] as Point);
      if (i === to) break;
    }
    return out;
  };
  const a = monotone(walk(lo, hi));
  const b = monotone(walk(hi, lo).reverse());
  const meanY = (c: Point[]) => c.reduce((s, p) => s + p[1], 0) / c.length;
  return meanY(a) <= meanY(b) ? [a, b] : [b, a];
}

function sampleChain(chain: Point[], x: number): number {
  let lo = 0;
  let hi = chain.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if ((chain[mid] as Point)[0] <= x) lo = mid;
    else hi = mid;
  }
  const a = chain[lo] as Point;
  const b = chain[hi] as Point;
  const span = b[0] - a[0];
  return span <= 0 ? a[1] : a[1] + ((b[1] - a[1]) * (x - a[0])) / span;
}

function profileOf(eye: CutEye): Profile {
  const [upper, lower] = splitChains(outlineOf(eye));
  const { lid, arc } = eye;
  const slope = lid ? Math.tan(((lid.angle || 0) * Math.PI) / 180) : 0;
  const top = (x: number) => {
    const y = sampleChain(upper, x);
    return lid ? Math.max(y, lid.y + slope * x) : y;
  };
  const bot = (x: number) => {
    const y = sampleChain(lower, x);
    if (!arc) return y;
    const d = x - (arc.x || 0);
    return Math.abs(d) < arc.r ? Math.min(y, arc.y - Math.sqrt(arc.r * arc.r - d * d)) : y;
  };
  const thick = (x: number) => bot(x) - top(x);
  const x0 = (upper[0] as Point)[0];
  const x1 = (upper[upper.length - 1] as Point)[0];
  let best = 0;
  let bestThick = Number.NEGATIVE_INFINITY;
  for (let g = 0; g <= GRID; g++) {
    const t = thick(x0 + ((x1 - x0) * g) / GRID);
    if (t > bestThick) {
      bestThick = t;
      best = g;
    }
  }
  if (bestThick <= 0) throw new Error('[MoodMates] eye shape is fully clipped away');
  const at = (g: number) => x0 + ((x1 - x0) * g) / GRID;
  let left = best;
  while (left > 0 && thick(at(left - 1)) > 0) left--;
  let right = best;
  while (right < GRID && thick(at(right + 1)) > 0) right++;
  const refine = (inside: number, outside: number) => {
    let a = inside;
    let b = outside;
    for (let i = 0; i < BISECT; i++) {
      const m = (a + b) / 2;
      if (thick(m) > 0) a = m;
      else b = m;
    }
    return a;
  };
  const xl = left === 0 ? x0 : refine(at(left), at(left - 1));
  const xr = right === GRID ? x1 : refine(at(right), at(right + 1));
  return { xl, xr, top, bot };
}

export function eyeRing(eye: CutEye, rot: number, ox: number, oy: number): Ring {
  const { xl, xr, top, bot } = profileOf(eye);
  const xs: number[] = [];
  for (let i = 0; i <= HALF; i++) xs.push(xl + (xr - xl) * ((1 - Math.cos((Math.PI * i) / HALF)) / 2));
  const pts: Point[] = [];
  for (let i = 0; i <= HALF; i++) {
    const x = xs[i] as number;
    const y = i === 0 || i === HALF ? (top(x) + bot(x)) / 2 : top(x);
    pts.push([x, y]);
  }
  for (let i = HALF - 1; i >= 1; i--) {
    const x = xs[i] as number;
    pts.push([x, bot(x)]);
  }
  const r = (rot * Math.PI) / 180;
  const rc = Math.cos(r);
  const rs = Math.sin(r);
  return pts.map(([x, y]): Point => {
    const px = x + eye.x;
    const py = y + eye.y;
    return [ox + px * rc - py * rs, oy + px * rs + py * rc];
  });
}
