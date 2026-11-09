import type { Point, Ring } from '../../geometry';

const RING_POINTS = 192;
const LEG_POINTS = 8;
const AXIS = (-147 * Math.PI) / 180;
const HALF_OPENING = (17.5 * Math.PI) / 180;
const DEPTH_OF_CHORD = 0.42;
const DEPTH_OF_WIDTH = 1;
const WIDTH_PROBES = 36;
const MAX_STEP = 0.6;
const THIN_EYE = 8.5;
const FULL_CUT_EYE = 20;
const MIN_DEPTH = 1.2;

function areaOf(ring: Ring): number {
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i] as Point;
    const b = ring[(i + 1) % ring.length] as Point;
    area += a[0] * b[1] - b[0] * a[1];
  }
  return area;
}

function centroidOf(ring: Ring): Point {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i] as Point;
    const b = ring[(i + 1) % ring.length] as Point;
    const cross = a[0] * b[1] - b[0] * a[1];
    area += cross;
    cx += (a[0] + b[0]) * cross;
    cy += (a[1] + b[1]) * cross;
  }
  return [cx / (3 * area), cy / (3 * area)];
}

function densify(ring: Ring): Ring {
  const out: Ring = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i] as Point;
    const b = ring[(i + 1) % ring.length] as Point;
    const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / MAX_STEP));
    for (let s = 0; s < steps; s++)
      out.push([a[0] + ((b[0] - a[0]) * s) / steps, a[1] + ((b[1] - a[1]) * s) / steps]);
  }
  return out;
}

function farthestHit(ring: Ring, from: Point, dir: Point): number {
  let best = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i] as Point;
    const b = ring[(i + 1) % ring.length] as Point;
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const denom = dir[0] * ey - dir[1] * ex;
    if (Math.abs(denom) < 1e-12) continue;
    const t = ((a[0] - from[0]) * ey - (a[1] - from[1]) * ex) / denom;
    const u = ((a[0] - from[0]) * dir[1] - (a[1] - from[1]) * dir[0]) / denom;
    if (t > best && u >= 0 && u <= 1) best = t;
  }
  return best;
}

function narrowest(ring: Ring): number {
  let best = Number.POSITIVE_INFINITY;
  for (let k = 0; k < WIDTH_PROBES; k++) {
    const a = (Math.PI * k) / WIDTH_PROBES;
    const nx = Math.cos(a);
    const ny = Math.sin(a);
    let lo = Number.POSITIVE_INFINITY;
    let hi = Number.NEGATIVE_INFINITY;
    for (const [x, y] of ring) {
      const v = x * nx + y * ny;
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    best = Math.min(best, hi - lo);
  }
  return best;
}

function edgeHit(a: Point, b: Point, apex: Point, angle: number): Point {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const ex = b[0] - a[0];
  const ey = b[1] - a[1];
  const denom = dx * ey - dy * ex;
  const u = Math.abs(denom) < 1e-12 ? 0 : ((a[0] - apex[0]) * dy - (a[1] - apex[1]) * dx) / denom;
  const k = Math.min(1, Math.max(0, u));
  return [a[0] + ex * k, a[1] + ey * k];
}

function along(path: Point[], count: number): Point[] {
  const acc = [0];
  for (let i = 1; i < path.length; i++) {
    const p = path[i] as Point;
    const q = path[i - 1] as Point;
    acc.push((acc[i - 1] as number) + Math.hypot(p[0] - q[0], p[1] - q[1]));
  }
  const total = acc[acc.length - 1] as number;
  const out: Point[] = [];
  let j = 0;
  for (let k = 0; k < count; k++) {
    const d = (total * k) / count;
    while (j < acc.length - 2 && (acc[j + 1] as number) < d) j++;
    const p = path[j] as Point;
    const q = path[j + 1] as Point;
    const span = (acc[j + 1] as number) - (acc[j] as number);
    const u = span > 1e-9 ? (d - (acc[j] as number)) / span : 0;
    out.push([p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u]);
  }
  return out;
}

function smoothstep(lo: number, hi: number, v: number): number {
  const t = Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
}

function plainEye(ring: Ring, at: Point): Ring {
  let first = 0;
  let nearest = Number.POSITIVE_INFINITY;
  ring.forEach(([x, y], i) => {
    const d = Math.hypot(x - at[0], y - at[1]);
    if (d < nearest) {
      nearest = d;
      first = i;
    }
  });
  const path = Array.from({ length: ring.length + 1 }, (_, j) =>
    j === 0 ? at : (ring[(first + j - 1) % ring.length] as Point),
  );
  return along([...path, at], RING_POINTS);
}

export function notchEye(input: Ring): Ring {
  const ring = densify(areaOf(input) >= 0 ? input : [...input].reverse());
  const n = ring.length;
  const centre = centroidOf(ring);
  const dir: Point = [Math.cos(AXIS), Math.sin(AXIS)];
  const outer = farthestHit(ring, centre, dir);
  const inner = farthestHit(ring, centre, [-dir[0], -dir[1]]);
  const thickness = narrowest(ring);
  const depth =
    smoothstep(THIN_EYE, FULL_CUT_EYE, thickness) *
    Math.min(DEPTH_OF_CHORD * (outer + inner), DEPTH_OF_WIDTH * thickness);
  if (depth < MIN_DEPTH) return plainEye(ring, [centre[0] + dir[0] * outer, centre[1] + dir[1] * outer]);
  const apex: Point = [centre[0] + dir[0] * (outer - depth), centre[1] + dir[1] * (outer - depth)];
  const cosOpening = Math.cos(HALF_OPENING);
  const inside = ring.map(([x, y]) => {
    const vx = x - apex[0];
    const vy = y - apex[1];
    const len = Math.hypot(vx, vy);
    return len > 1e-9 && (vx * dir[0] + vy * dir[1]) / len >= cosOpening;
  });
  const start = inside.findIndex((v, i) => v && !inside[(i + n - 1) % n]);
  if (start < 0) throw new Error('[MoodMates] Woody eye has no outline inside the cut');
  let run = 0;
  while (run < n && inside[(start + run) % n]) run++;
  if (run >= n) throw new Error('[MoodMates] Woody eye is entirely inside the cut');
  const last = (start + run - 1) % n;
  const before = ring[(start + n - 1) % n] as Point;
  const after = ring[(last + 1) % n] as Point;
  const entry = edgeHit(before, ring[start] as Point, apex, AXIS - HALF_OPENING);
  const exit = edgeHit(ring[last] as Point, after, apex, AXIS + HALF_OPENING);
  const main: Point[] = [exit];
  for (let j = 0; j < n - run; j++) main.push(ring[(last + 1 + j) % n] as Point);
  main.push(entry);
  const mainPoints = RING_POINTS - 2 * LEG_POINTS;
  const sampled = along(main, mainPoints);
  const out: Ring = [];
  for (let i = 0; i < LEG_POINTS; i++) {
    const u = i / LEG_POINTS;
    out.push([apex[0] + (exit[0] - apex[0]) * u, apex[1] + (exit[1] - apex[1]) * u]);
  }
  out.push(...sampled);
  for (let i = 0; i < LEG_POINTS; i++) {
    const u = i / LEG_POINTS;
    out.push([entry[0] + (apex[0] - entry[0]) * u, entry[1] + (apex[1] - entry[1]) * u]);
  }
  return out;
}
