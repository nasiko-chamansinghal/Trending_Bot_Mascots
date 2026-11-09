export type Vec3 = [number, number, number];
export type Vec2 = [number, number];
export type Mat3 = [number, number, number, number, number, number, number, number, number];

export interface BodyShape {
  ribs: number;
  sharp: number[];
  radius: number[];
  rim?: number[];
  rimSoft?: number[];
  puff?: number;
  skirt: number[];
  join: number;
  depth: number[];
  flat?: number;
}

export interface StemShape {
  base: Vec3;
  c1: Vec3;
  c2: Vec3;
  tip: Vec3;
  radius: Array<[number, number, number]>;
}

export interface LimbSpec {
  side: 1 | -1;
  base: Vec3;
  length: number;
  angle: number;
  bend: number;
  lift?: number;
  radius: Array<[number, number, number]>;
}

const DEG = Math.PI / 180;

export function limbShape(l: LimbSpec, raise: number): StemShape {
  const a = (l.angle + raise) * DEG;
  const dx = l.side * Math.cos(a);
  const dy = Math.sin(a);
  const out = l.side * (l.lift ?? 0) * Math.max(0, dy - Math.sin(l.angle * DEG));
  const base: Vec3 = [l.base[0] + out, l.base[1], l.base[2]];
  const at = (t: number, bend: number): Vec3 => [
    base[0] + dx * l.length * t - dy * l.side * l.bend * bend,
    base[1] + dy * l.length * t + dx * l.side * l.bend * bend,
    base[2],
  ];
  return { base, c1: at(0.33, 1), c2: at(0.66, 1), tip: at(1, 0), radius: l.radius };
}

export interface SolidAngles {
  yaw: number;
  pitch: number;
  roll: number;
}

export interface StemProjection {
  outline: Vec2[];
  root: Vec2[];
  cap: { cx: number; cy: number; rx: number; ry: number; angle: number } | null;
  front: boolean;
}

export const TAU = Math.PI * 2;
const STEM_ROOT = 0.16;
const FACING_SLACK = 0.02;
const SHEET_JUMP = 0.12;
const NEWTON_STEPS = 3;
const NEWTON_H = 1e-5;
const HIDE_FACING = 0.02;
const STICKER_LO = 0.45;
const STICKER_HI = 0.8;

export function rotation({ yaw, pitch, roll }: SolidAngles): Mat3 {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);
  const a: Mat3 = [cy, 0, sy, 0, 1, 0, -sy, 0, cy];
  const b: Mat3 = [1, 0, 0, 0, cp, sp, 0, -sp, cp];
  const c: Mat3 = [cr, sr, 0, -sr, cr, 0, 0, 0, 1];
  return mul(c, mul(b, a));
}

function mul(m: Mat3, n: Mat3): Mat3 {
  const o = new Array(9).fill(0) as Mat3;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      o[r * 3 + c] = m[r * 3] * n[c] + m[r * 3 + 1] * n[3 + c] + m[r * 3 + 2] * n[6 + c];
    }
  }
  return o;
}

export function apply(m: Mat3, p: Vec3): Vec3 {
  return [
    m[0] * p[0] + m[1] * p[1] + m[2] * p[2],
    m[3] * p[0] + m[4] * p[1] + m[5] * p[2],
    m[6] * p[0] + m[7] * p[1] + m[8] * p[2],
  ];
}

function cubic(a: number, b: number, c: number, d: number, t: number): number {
  return b + 0.5 * t * (c - a + t * (2 * a - 5 * b + 4 * c - d + t * (3 * (b - c) + d - a)));
}

function profile(knots: number[], theta: number): number {
  const n = knots.length;
  const u = (theta / Math.PI) * (n - 1);
  const i = Math.min(n - 2, Math.max(0, Math.floor(u)));
  const at = (k: number): number => knots[Math.min(n - 1, Math.max(0, k))] as number;
  return cubic(at(i - 1), at(i), at(i + 1), at(i + 2), u - i);
}

function rimAt(rim: number[], angle: number): number {
  const n = rim.length;
  const u = ((angle + Math.PI) / TAU) * n;
  const i = Math.floor(u);
  const at = (k: number): number => rim[((k % n) + n) % n] as number;
  return cubic(at(i - 1), at(i), at(i + 1), at(i + 2), u - i);
}

function inflate(s: BodyShape, rim: number[], nx: number, ny: number, nz: number): Vec3 {
  const angle = Math.atan2(ny, nx);
  const exact = rimAt(rim, angle);
  const outline = s.rimSoft ? exact + Math.min(0, rimAt(s.rimSoft, angle) - exact) * Math.abs(nz) : exact;
  const p = s.puff ?? 2;
  const r = ((Math.hypot(nx, ny) / outline) ** p + (Math.abs(nz) / (s.flat ?? 1)) ** p) ** (-1 / p);
  return [r * nx, r * ny, r * nz];
}

export function bodyPoint(s: BodyShape, theta: number, phi: number): Vec3 {
  const st = Math.sin(theta);
  if (s.rim) return inflate(s, s.rim, st * Math.sin(phi), Math.cos(theta), st * Math.cos(phi));
  const rib = (1 - Math.abs(Math.sin((s.ribs * phi) / 2))) ** profile(s.sharp, theta);
  const dome = profile(s.radius, theta);
  const skirt = profile(s.skirt, theta);
  const base = (dome ** s.join + skirt ** s.join) ** (1 / s.join);
  const r = base * (1 - profile(s.depth, theta) * rib);
  return [r * st * Math.sin(phi), r * Math.cos(theta), r * st * Math.cos(phi) * (s.flat ?? 1)];
}

export interface LimbGrid {
  nt: number;
  np: number;
  p: Float64Array;
  n: Float64Array;
}

export function limbGrid(s: BodyShape, nt = s.rim ? 360 : 120, np = s.ribs * 56): LimbGrid {
  const p = new Float64Array((nt + 1) * np * 3);
  const n = new Float64Array((nt + 1) * np * 3);
  const e = 1e-4;
  for (let i = 0; i <= nt; i++) {
    const theta = 1e-3 + ((Math.PI - 2e-3) * i) / nt;
    for (let j = 0; j < np; j++) {
      const phi = (TAU * j) / np - Math.PI;
      const c = bodyPoint(s, theta, phi);
      const a0 = bodyPoint(s, theta - e, phi);
      const a1 = bodyPoint(s, theta + e, phi);
      const b0 = bodyPoint(s, theta, phi - e);
      const b1 = bodyPoint(s, theta, phi + e);
      const tx = a1[0] - a0[0];
      const ty = a1[1] - a0[1];
      const tz = a1[2] - a0[2];
      const ux = b1[0] - b0[0];
      const uy = b1[1] - b0[1];
      const uz = b1[2] - b0[2];
      let nx = ty * uz - tz * uy;
      let ny = tz * ux - tx * uz;
      let nz = tx * uy - ty * ux;
      const l = Math.hypot(nx, ny, nz) || 1;
      const sign = nx * c[0] + ny * c[1] + nz * c[2] < 0 ? -1 : 1;
      nx = (nx / l) * sign;
      ny = (ny / l) * sign;
      nz = (nz / l) * sign;
      const k = (i * np + j) * 3;
      p[k] = c[0];
      p[k + 1] = c[1];
      p[k + 2] = c[2];
      n[k] = nx;
      n[k + 1] = ny;
      n[k + 2] = nz;
    }
  }
  return { nt, np, p, n };
}

export function outline(grid: LimbGrid, m: Mat3, bins = 720): Vec2[] {
  const { nt, np, p, n } = grid;
  const count = (nt + 1) * np;
  const g = new Float64Array(count);
  for (let k = 0; k < count; k++) g[k] = n[k * 3] * m[6] + n[k * 3 + 1] * m[7] + n[k * 3 + 2] * m[8];
  const best = new Float64Array(bins).fill(-1);
  const bx = new Float64Array(bins);
  const by = new Float64Array(bins);
  const put = (x0: number, y0: number, z0: number): void => {
    const x = m[0] * x0 + m[1] * y0 + m[2] * z0;
    const y = -(m[3] * x0 + m[4] * y0 + m[5] * z0);
    const r = x * x + y * y;
    const bin = Math.min(bins - 1, Math.floor(((Math.atan2(y, x) + Math.PI) / TAU) * bins));
    if (r > (best[bin] as number)) {
      best[bin] = r;
      bx[bin] = x;
      by[bin] = y;
    }
  };
  const hits: number[] = [];
  const cross = (a: number, b: number): void => {
    const ga = g[a] as number;
    const gb = g[b] as number;
    if (ga > 0 === gb > 0) return;
    const t = ga / (ga - gb);
    for (let c = 0; c < 3; c++)
      hits.push((p[a * 3 + c] as number) + ((p[b * 3 + c] as number) - (p[a * 3 + c] as number)) * t);
  };
  const step = (Math.PI / bins) * 0.5;
  for (let i = 0; i < nt; i++) {
    for (let j = 0; j < np; j++) {
      const k00 = i * np + j;
      const k01 = i * np + ((j + 1) % np);
      const k10 = k00 + np;
      const k11 = k01 + np;
      hits.length = 0;
      cross(k00, k01);
      cross(k01, k11);
      cross(k11, k10);
      cross(k10, k00);
      for (let h = 0; h + 5 < hits.length; h += 6) {
        const ax = hits[h] as number;
        const ay = hits[h + 1] as number;
        const az = hits[h + 2] as number;
        const dx = (hits[h + 3] as number) - ax;
        const dy = (hits[h + 4] as number) - ay;
        const dz = (hits[h + 5] as number) - az;
        const n = Math.max(1, Math.ceil(Math.hypot(dx, dy, dz) / step));
        for (let q = 0; q <= n; q++) put(ax + (dx * q) / n, ay + (dy * q) / n, az + (dz * q) / n);
      }
    }
  }
  const ang: number[] = [];
  const rad: number[] = [];
  for (let k = 0; k < bins; k++) {
    if ((best[k] as number) < 0) continue;
    ang.push(Math.atan2(by[k] as number, bx[k] as number));
    rad.push(Math.sqrt(best[k] as number));
  }
  const count2 = ang.length;
  const out: Vec2[] = [];
  if (!count2) return out;
  let j = 0;
  for (let k = 0; k < bins; k++) {
    const psi = -Math.PI + ((k + 0.5) * TAU) / bins;
    while (j < count2 && (ang[j] as number) < psi) j++;
    const ia = (j - 1 + count2) % count2;
    const ib = j % count2;
    let a0 = ang[ia] as number;
    let a1 = ang[ib] as number;
    if (j === 0) a0 -= TAU;
    if (j === count2) a1 += TAU;
    const t = a1 - a0 > 1e-9 ? (psi - a0) / (a1 - a0) : 0;
    const r = (rad[ia] as number) + ((rad[ib] as number) - (rad[ia] as number)) * t;
    out.push([r * Math.cos(psi), r * Math.sin(psi)]);
  }
  return out;
}

function bezier(s: StemShape, t: number): Vec3 {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [
    a * s.base[0] + b * s.c1[0] + c * s.c2[0] + d * s.tip[0],
    a * s.base[1] + b * s.c1[1] + c * s.c2[1] + d * s.tip[1],
    a * s.base[2] + b * s.c1[2] + c * s.c2[2] + d * s.tip[2],
  ];
}

function stemRadius(s: StemShape, t: number, side: 1 | 2): number {
  const k = s.radius;
  const n = k.length;
  let i = 0;
  while (i < n - 2 && t > ((k[i + 1] as number[])[0] as number)) i++;
  const at = (j: number): [number, number] => {
    const e = k[Math.min(n - 1, Math.max(0, j))] as number[];
    return [e[0] as number, e[side] as number];
  };
  const slope = (j: number): number => {
    const a = at(j - 1);
    const b = at(j + 1);
    return (b[1] - a[1]) / (b[0] - a[0]);
  };
  const [t0, r0] = at(i);
  const [t1, r1] = at(i + 1);
  const h = t1 - t0;
  const u = Math.min(1, Math.max(0, (t - t0) / h));
  const u2 = u * u;
  const u3 = u2 * u;
  return (
    (2 * u3 - 3 * u2 + 1) * r0 +
    (u3 - 2 * u2 + u) * h * slope(i) +
    (-2 * u3 + 3 * u2) * r1 +
    (u3 - u2) * h * slope(i + 1)
  );
}

export function projectStem(s: StemShape, m: Mat3, steps = 24): StemProjection {
  const pts: Vec3[] = [];
  for (let i = 0; i <= steps; i++) pts.push(apply(m, bezier(s, i / steps)));
  const left: Vec2[] = [];
  const right: Vec2[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = pts[Math.max(0, i - 1)] as Vec3;
    const b = pts[Math.min(steps, i + 1)] as Vec3;
    let dx = b[0] - a[0];
    let dy = -(b[1] - a[1]);
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const p = pts[i] as Vec3;
    const rl = stemRadius(s, i / steps, 1);
    const rr = stemRadius(s, i / steps, 2);
    left.push([p[0] - dy * rl, -p[1] + dx * rl]);
    right.push([p[0] + dy * rr, -p[1] - dx * rr]);
  }
  const outline = [...left, ...right.reverse()];
  const b0 = pts[0] as Vec3;
  const b1 = pts[1] as Vec3;
  const dl = Math.hypot(b1[0] - b0[0], b1[1] - b0[1], b1[2] - b0[2]) || 1;
  const sink = STEM_ROOT / dl;
  const l0 = left[0] as Vec2;
  const r0 = right[right.length - 1] as Vec2;
  const ox = (b0[0] - b1[0]) * sink;
  const oy = -(b0[1] - b1[1]) * sink;
  const root: Vec2[] = [
    left[2] as Vec2,
    l0,
    [l0[0] + ox, l0[1] + oy],
    [r0[0] + ox, r0[1] + oy],
    r0,
    right[right.length - 3] as Vec2,
  ];
  const tip = pts[steps] as Vec3;
  const prev = pts[steps - 1] as Vec3;
  const tx = tip[0] - prev[0];
  const ty = -(tip[1] - prev[1]);
  const tz = tip[2] - prev[2];
  const tl = Math.hypot(tx, ty, tz) || 1;
  const facing = tz / tl;
  const rTip = (stemRadius(s, 1, 1) + stemRadius(s, 1, 2)) / 2;
  const cap =
    facing > 0.05
      ? {
          cx: tip[0],
          cy: -tip[1],
          rx: rTip,
          ry: rTip * facing,
          angle: (Math.atan2(ty, tx) * 180) / Math.PI + 90,
        }
      : null;
  const base = apply(m, s.base);
  const up = apply(m, [0, 1, 0]);
  return { outline, root, cap, front: base[2] > 0 && up[2] > 0.25 };
}

export interface DecalMap {
  n: number;
  extent: number;
  th: Float32Array;
  ph: Float32Array;
  rest: Mat3;
}

export function buildDecalMap(
  s: BodyShape,
  rest: Mat3,
  n = 256,
  extent = 1.3,
  lat = 96,
  lon = s.ribs * 48,
): DecalMap {
  const size = n * n;
  const z = new Float32Array(size).fill(Number.NEGATIVE_INFINITY);
  const th = new Float32Array(size).fill(Number.NaN);
  const ph = new Float32Array(size).fill(Number.NaN);
  const grid: Vec3[] = [];
  const par: Vec2[] = [];
  for (let i = 0; i <= lat; i++) {
    const theta = Math.min(Math.PI - 1e-4, Math.max(1e-4, (Math.PI * i) / lat));
    for (let j = 0; j <= lon; j++) {
      const phi = (TAU * j) / lon - Math.PI;
      grid.push(apply(rest, bodyPoint(s, theta, phi)));
      par.push([theta, phi]);
    }
  }
  const cell = (2 * extent) / n;
  const tri = (ia: number, ib: number, ic: number): void => {
    const a = grid[ia] as Vec3;
    const b = grid[ib] as Vec3;
    const c = grid[ic] as Vec3;
    const ux = b[0] - a[0];
    const uy = b[1] - a[1];
    const vx = c[0] - a[0];
    const vy = c[1] - a[1];
    const det = ux * vy - uy * vx;
    if (Math.abs(det) < 1e-12) return;
    const pa = par[ia] as Vec2;
    const pb = par[ib] as Vec2;
    const pc = par[ic] as Vec2;
    const c0 = Math.max(0, Math.floor((Math.min(a[0], b[0], c[0]) + extent) / cell));
    const c1 = Math.min(n - 1, Math.ceil((Math.max(a[0], b[0], c[0]) + extent) / cell));
    const r0 = Math.max(0, Math.floor((extent - Math.max(a[1], b[1], c[1])) / cell));
    const r1 = Math.min(n - 1, Math.ceil((extent - Math.min(a[1], b[1], c[1])) / cell));
    for (let r = r0; r <= r1; r++) {
      const py = extent - (r + 0.5) * cell;
      for (let col = c0; col <= c1; col++) {
        const px = (col + 0.5) * cell - extent;
        const wx = px - a[0];
        const wy = py - a[1];
        const l1 = (wx * vy - wy * vx) / det;
        const l2 = (ux * wy - uy * wx) / det;
        if (l1 < -1e-6 || l2 < -1e-6 || l1 + l2 > 1 + 1e-6) continue;
        const pz = a[2] + l1 * (b[2] - a[2]) + l2 * (c[2] - a[2]);
        const k = r * n + col;
        if (pz > (z[k] as number)) {
          z[k] = pz;
          th[k] = pa[0] + l1 * (pb[0] - pa[0]) + l2 * (pc[0] - pa[0]);
          ph[k] = pa[1] + l1 * (pb[1] - pa[1]) + l2 * (pc[1] - pa[1]);
        }
      }
    }
  };
  const w = lon + 1;
  for (let i = 0; i < lat; i++) {
    for (let j = 0; j < lon; j++) {
      tri(i * w + j, i * w + j + 1, (i + 1) * w + j);
      tri(i * w + j + 1, (i + 1) * w + j + 1, (i + 1) * w + j);
    }
  }
  return { n, extent, th, ph, rest };
}

function paramAt(map: DecalMap, x: number, yUp: number): Vec2 | null {
  const { n, extent } = map;
  const cell = (2 * extent) / n;
  const fc = (x + extent) / cell - 0.5;
  const fr = (extent - yUp) / cell - 0.5;
  const c0 = Math.floor(fc);
  const r0 = Math.floor(fr);
  if (c0 < 0 || r0 < 0 || c0 + 1 >= n || r0 + 1 >= n) return null;
  const tx = fc - c0;
  const ty = fr - r0;
  const ks = [r0 * n + c0, r0 * n + c0 + 1, (r0 + 1) * n + c0, (r0 + 1) * n + c0 + 1];
  const ws = [(1 - tx) * (1 - ty), tx * (1 - ty), (1 - tx) * ty, tx * ty];
  let a = 0;
  let b = 0;
  let wsum = 0;
  let lo = Number.POSITIVE_INFINITY;
  let hi = Number.NEGATIVE_INFINITY;
  let near = -1;
  for (let i = 0; i < 4; i++) {
    const k = ks[i] as number;
    const t = map.th[k] as number;
    if (Number.isNaN(t)) continue;
    const wi = ws[i] as number;
    a += t * wi;
    b += (map.ph[k] as number) * wi;
    wsum += wi;
    lo = Math.min(lo, t);
    hi = Math.max(hi, t);
    if (near < 0 || wi > (ws[near] as number)) near = i;
  }
  if (wsum < 0.5) return null;
  if (hi - lo > SHEET_JUMP) {
    const k = ks[near] as number;
    return [map.th[k] as number, map.ph[k] as number];
  }
  return [a / wsum, b / wsum];
}

function surface(s: BodyShape, theta: number, phi: number): { nz: Vec3 } {
  const e = 1e-4;
  const c = bodyPoint(s, theta, phi);
  const a0 = bodyPoint(s, theta - e, phi);
  const a1 = bodyPoint(s, theta + e, phi);
  const b0 = bodyPoint(s, theta, phi - e);
  const b1 = bodyPoint(s, theta, phi + e);
  const tx = a1[0] - a0[0];
  const ty = a1[1] - a0[1];
  const tz = a1[2] - a0[2];
  const ux = b1[0] - b0[0];
  const uy = b1[1] - b0[1];
  const uz = b1[2] - b0[2];
  const nx = ty * uz - tz * uy;
  const ny = tz * ux - tx * uz;
  const nz = tx * uy - ty * ux;
  const l = (nx * c[0] + ny * c[1] + nz * c[2] < 0 ? -1 : 1) / (Math.hypot(nx, ny, nz) || 1);
  return { nz: [nx * l, ny * l, nz * l] };
}

function restXY(s: BodyShape, rest: Mat3, theta: number, phi: number): Vec2 {
  const p = bodyPoint(s, theta, phi);
  return [rest[0] * p[0] + rest[1] * p[1] + rest[2] * p[2], rest[3] * p[0] + rest[4] * p[1] + rest[5] * p[2]];
}

function refine(s: BodyShape, rest: Mat3, guess: Vec2, x: number, yUp: number): Vec2 {
  let [t, f] = guess;
  let cur = restXY(s, rest, t, f);
  let err = Math.hypot(cur[0] - x, cur[1] - yUp);
  for (let k = 0; k < NEWTON_STEPS && err > 1e-7; k++) {
    const a = restXY(s, rest, t + NEWTON_H, f);
    const b = restXY(s, rest, t, f + NEWTON_H);
    const j00 = (a[0] - cur[0]) / NEWTON_H;
    const j10 = (a[1] - cur[1]) / NEWTON_H;
    const j01 = (b[0] - cur[0]) / NEWTON_H;
    const j11 = (b[1] - cur[1]) / NEWTON_H;
    const det = j00 * j11 - j01 * j10;
    if (Math.abs(det) < 1e-9) break;
    const ex = x - cur[0];
    const ey = yUp - cur[1];
    const nt = t + (j11 * ex - j01 * ey) / det;
    const nf = f + (j00 * ey - j10 * ex) / det;
    const next = restXY(s, rest, nt, nf);
    const nerr = Math.hypot(next[0] - x, next[1] - yUp);
    if (!(nerr < err)) break;
    t = nt;
    f = nf;
    cur = next;
    err = nerr;
  }
  return [t, f];
}

export function skinOf(s: BodyShape): BodyShape {
  return { ...s, depth: [0, 0] };
}

function smoothstep(lo: number, hi: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
}

function screenJacobian(mm: Mat3, pc: Vec3, pt: Vec3, pf: Vec3): [number, number, number, number] {
  const a = apply(mm, pc);
  const b = apply(mm, pt);
  const c = apply(mm, pf);
  return [
    (b[0] - a[0]) / NEWTON_H,
    (c[0] - a[0]) / NEWTON_H,
    (b[1] - a[1]) / NEWTON_H,
    (c[1] - a[1]) / NEWTON_H,
  ];
}

function wrapPoints(
  s: BodyShape,
  map: DecalMap,
  ring: Vec2[],
  m: Mat3,
  edge: number,
  center: Vec2,
): Vec2[] | null {
  const n = ring.length;
  let cx = 0;
  let cy = 0;
  for (const p of ring) {
    cx += p[0];
    cy += p[1];
  }
  cx /= n;
  cy /= n;
  const params = new Array<Vec2>(n);
  for (let i = 0; i < n; i++) {
    const r = ring[i] as Vec2;
    let hit = paramAt(map, r[0], -r[1]);
    if (!hit) {
      let lo = 0;
      let hi = 1;
      hit = center;
      for (let k = 0; k < 14; k++) {
        const t = (lo + hi) / 2;
        const h = paramAt(map, cx + (r[0] - cx) * t, -(cy + (r[1] - cy) * t));
        if (h) {
          lo = t;
          hit = h;
        } else hi = t;
      }
    }
    params[i] = refine(s, map.rest, hit, r[0], -r[1]);
  }
  const at = (q: Vec2): { s: Vec2; v: boolean } => {
    const p = apply(m, bodyPoint(s, q[0], q[1]));
    const nrm = surface(s, q[0], q[1]).nz;
    const limit = Math.min(edge, apply(map.rest, nrm)[2] - FACING_SLACK);
    return { s: [p[0], -p[1]], v: apply(m, nrm)[2] > limit };
  };
  const res = params.map(at);
  const visIdx: number[] = [];
  for (let i = 0; i < n; i++) if ((res[i] as { v: boolean }).v) visIdx.push(i);
  if (!visIdx.length) return null;
  const cVis = at(center).v;
  const out: Vec2[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const ri = res[i] as { s: Vec2; v: boolean };
    if (ri.v) {
      out[i] = ri.s;
      continue;
    }
    let a = center;
    if (!cVis) {
      let best = visIdx[0] as number;
      let bd = n;
      for (const j of visIdx) {
        const d = Math.min(Math.abs(j - i), n - Math.abs(j - i));
        if (d < bd) {
          bd = d;
          best = j;
        }
      }
      a = params[best] as Vec2;
    }
    const b = params[i] as Vec2;
    let lo = 0;
    let hi = 1;
    let last = at(a).s;
    for (let k = 0; k < 14; k++) {
      const t = (lo + hi) / 2;
      const h = at([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      if (h.v) {
        lo = t;
        last = h.s;
      } else hi = t;
    }
    out[i] = last;
  }
  return out;
}

export function projectEye(s: BodyShape, map: DecalMap, ring: Vec2[], m: Mat3, edge = 0.06): Vec2[] | null {
  const n = ring.length;
  let cx = 0;
  let cy = 0;
  for (const p of ring) {
    cx += p[0];
    cy += p[1];
  }
  cx /= n;
  cy /= n;
  const guess = paramAt(map, cx, -cy);
  if (!guess) return null;
  const center = refine(s, map.rest, guess, cx, -cy);
  const nrm = surface(s, center[0], center[1]).nz;
  const facing = apply(m, nrm)[2];
  if (facing <= HIDE_FACING) return null;
  const restFacing = apply(map.rest, nrm)[2];
  const pc = bodyPoint(s, center[0], center[1]);
  const pt = bodyPoint(s, center[0] + NEWTON_H, center[1]);
  const pf = bodyPoint(s, center[0], center[1] + NEWTON_H);
  const [r00, r01, r10, r11] = screenJacobian(map.rest, pc, pt, pf);
  const det = r00 * r11 - r01 * r10;
  const w =
    Math.abs(det) < 1e-9 ? 1 : smoothstep(STICKER_LO, STICKER_HI, facing / Math.max(restFacing, 1e-3));
  const wrapped = w > 0 ? wrapPoints(s, map, ring, m, edge, center) : null;
  if (w >= 1 || Math.abs(det) < 1e-9) return wrapped;
  const [n00, n01, n10, n11] = screenJacobian(m, pc, pt, pf);
  const now = apply(m, pc);
  const out: Vec2[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const r = ring[i] as Vec2;
    const dx = r[0] - cx;
    const dy = -(r[1] - cy);
    const u = (r11 * dx - r01 * dy) / det;
    const v = (r00 * dy - r10 * dx) / det;
    const ax = now[0] + n00 * u + n01 * v;
    const ay = now[1] + n10 * u + n11 * v;
    const q = wrapped ? (wrapped[i] as Vec2) : null;
    out[i] = q ? [q[0] * w + ax * (1 - w), q[1] * w - ay * (1 - w)] : [ax, -ay];
  }
  return out;
}
