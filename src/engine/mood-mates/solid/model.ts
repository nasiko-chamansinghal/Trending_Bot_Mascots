export type Vec3 = [number, number, number];
export type Vec2 = [number, number];
export type Mat3 = [number, number, number, number, number, number, number, number, number];

export interface BodyShape {
  aspect: number;
  squareness: number;
  ribs: number;
  groove: number;
  grooveSharp: number;
  grooveTop: number;
  grooveBottom: number;
  topDip: number;
  topDipWidth: number;
  bottomDip: number;
  bottomDipWidth: number;
  taper: number;
}

export interface StemShape {
  base: Vec3;
  c1: Vec3;
  c2: Vec3;
  tip: Vec3;
  radius: Vec3;
}

export interface SolidAngles {
  yaw: number;
  pitch: number;
  roll: number;
}

export interface StemProjection {
  outline: Vec2[];
  cap: { cx: number; cy: number; rx: number; ry: number; angle: number } | null;
  front: boolean;
}

export const TAU = Math.PI * 2;

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

function spow(v: number, e: number): number {
  return Math.sign(v) * Math.abs(v) ** e;
}

export function lobe(s: BodyShape, theta: number, phi: number): number {
  const ct = Math.cos(theta);
  const depth = s.groove * (1 + s.grooveTop * Math.max(0, ct) ** 2 + s.grooveBottom * Math.max(0, -ct) ** 2);
  return 1 - depth * (1 - Math.abs(Math.sin((s.ribs * phi) / 2))) ** s.grooveSharp;
}

export function bodyPoint(s: BodyShape, theta: number, phi: number): Vec3 {
  const st = Math.sin(theta);
  const ct = Math.cos(theta);
  const h = spow(st, s.squareness) * (1 + s.taper * ct) * lobe(s, theta, phi);
  const y =
    s.aspect *
    (spow(ct, s.squareness) -
      s.topDip * Math.exp(-((theta / s.topDipWidth) ** 2)) +
      s.bottomDip * Math.exp(-(((Math.PI - theta) / s.bottomDipWidth) ** 2)));
  return [h * Math.sin(phi), y, h * Math.cos(phi)];
}

export interface BodyMesh {
  points: Vec3[];
}

export function bodyMesh(s: BodyShape, lat = 64, lon = 7 * 48): BodyMesh {
  const points: Vec3[] = [];
  for (let i = 1; i < lat; i++) {
    const theta = (Math.PI * i) / lat;
    for (let j = 0; j < lon; j++) points.push(bodyPoint(s, theta, (TAU * j) / lon - Math.PI));
  }
  points.push(bodyPoint(s, 1e-4, 0), bodyPoint(s, Math.PI - 1e-4, 0));
  return { points };
}

export function silhouette(mesh: BodyMesh, m: Mat3, bins = 360): Vec2[] {
  const best = new Float64Array(bins).fill(-1);
  const bx = new Float64Array(bins);
  const by = new Float64Array(bins);
  for (const p of mesh.points) {
    const x = m[0] * p[0] + m[1] * p[1] + m[2] * p[2];
    const y = -(m[3] * p[0] + m[4] * p[1] + m[5] * p[2]);
    const r = x * x + y * y;
    const k = Math.min(bins - 1, Math.floor(((Math.atan2(y, x) + Math.PI) / TAU) * bins));
    if (r > (best[k] as number)) {
      best[k] = r;
      bx[k] = x;
      by[k] = y;
    }
  }
  const out: Vec2[] = [];
  for (let k = 0; k < bins; k++) {
    if ((best[k] as number) >= 0) {
      out.push([bx[k] as number, by[k] as number]);
      continue;
    }
    let a = k - 1;
    while (a >= 0 && (best[a] as number) < 0) a--;
    let b = k + 1;
    while (b < bins && (best[b] as number) < 0) b++;
    if (a < 0 || b >= bins) continue;
    const t = (k - a) / (b - a);
    out.push([
      (bx[a] as number) + ((bx[b] as number) - (bx[a] as number)) * t,
      (by[a] as number) + ((by[b] as number) - (by[a] as number)) * t,
    ]);
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

function stemRadius(s: StemShape, t: number): number {
  const [r0, r1, r2] = s.radius;
  return r0 * (1 - t) * (1 - t) + 2 * r1 * t * (1 - t) + r2 * t * t;
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
    const r = stemRadius(s, i / steps);
    left.push([p[0] - dy * r, -p[1] + dx * r]);
    right.push([p[0] + dy * r, -p[1] - dx * r]);
  }
  const outline = [...left, ...right.reverse()];
  const tip = pts[steps] as Vec3;
  const prev = pts[steps - 1] as Vec3;
  const tx = tip[0] - prev[0];
  const ty = -(tip[1] - prev[1]);
  const tz = tip[2] - prev[2];
  const tl = Math.hypot(tx, ty, tz) || 1;
  const facing = tz / tl;
  const rTip = stemRadius(s, 1);
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
  return { outline, cap, front: base[2] > 0 && up[2] > 0.25 };
}

export interface DepthMap {
  n: number;
  extent: number;
  z: Float32Array;
  nx: Float32Array;
  ny: Float32Array;
  nz: Float32Array;
}

export function buildDepthMap(
  s: BodyShape,
  rest: Mat3,
  n = 256,
  extent = 1.3,
  lat = 72,
  lon = 7 * 40,
): DepthMap {
  const size = n * n;
  const z = new Float32Array(size).fill(Number.NEGATIVE_INFINITY);
  const nx = new Float32Array(size);
  const ny = new Float32Array(size);
  const nz = new Float32Array(size);
  const grid: Vec3[] = [];
  for (let i = 0; i <= lat; i++) {
    const theta = Math.min(Math.PI - 1e-4, Math.max(1e-4, (Math.PI * i) / lat));
    for (let j = 0; j <= lon; j++) grid.push(apply(rest, bodyPoint(s, theta, (TAU * j) / lon - Math.PI)));
  }
  const cell = (2 * extent) / n;
  const tri = (a: Vec3, b: Vec3, c: Vec3): void => {
    const ux = b[0] - a[0];
    const uy = b[1] - a[1];
    const uz = b[2] - a[2];
    const vx = c[0] - a[0];
    const vy = c[1] - a[1];
    const vz = c[2] - a[2];
    let qx = uy * vz - uz * vy;
    let qy = uz * vx - ux * vz;
    let qz = ux * vy - uy * vx;
    const ql = Math.hypot(qx, qy, qz) || 1;
    if (qz < 0) {
      qx = -qx;
      qy = -qy;
      qz = -qz;
    }
    qx /= ql;
    qy /= ql;
    qz /= ql;
    const det = ux * vy - uy * vx;
    if (Math.abs(det) < 1e-12) return;
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
        const pz = a[2] + l1 * uz + l2 * vz;
        const k = r * n + col;
        if (pz > (z[k] as number)) {
          z[k] = pz;
          nx[k] = qx;
          ny[k] = qy;
          nz[k] = qz;
        }
      }
    }
  };
  const w = lon + 1;
  for (let i = 0; i < lat; i++) {
    for (let j = 0; j < lon; j++) {
      const a = grid[i * w + j] as Vec3;
      const b = grid[i * w + j + 1] as Vec3;
      const c = grid[(i + 1) * w + j] as Vec3;
      const d = grid[(i + 1) * w + j + 1] as Vec3;
      tri(a, b, c);
      tri(b, d, c);
    }
  }
  return { n, extent, z, nx, ny, nz };
}

export function surfaceAt(map: DepthMap, x: number, yUp: number): { p: Vec3; nrm: Vec3 } | null {
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
  let zz = 0;
  let ax = 0;
  let ay = 0;
  let az = 0;
  let wsum = 0;
  for (let i = 0; i < 4; i++) {
    const k = ks[i] as number;
    const zk = map.z[k] as number;
    if (!Number.isFinite(zk)) continue;
    const wi = ws[i] as number;
    zz += zk * wi;
    ax += (map.nx[k] as number) * wi;
    ay += (map.ny[k] as number) * wi;
    az += (map.nz[k] as number) * wi;
    wsum += wi;
  }
  if (wsum < 0.5) return null;
  zz /= wsum;
  const l = Math.hypot(ax, ay, az) || 1;
  return { p: [x, yUp, zz], nrm: [ax / l, ay / l, az / l] };
}

export function projectDecal(map: DepthMap, ring: Vec2[], m: Mat3, edge = 0.06): Vec2[] | null {
  const n = ring.length;
  const vis = new Array<boolean>(n);
  const scr = new Array<Vec2>(n);
  let any = false;
  const at = (x: number, yDown: number): { s: Vec2; v: boolean } | null => {
    const hit = surfaceAt(map, x, -yDown);
    if (!hit) return null;
    const q = apply(m, hit.p);
    const nn = apply(m, hit.nrm);
    return { s: [q[0], -q[1]], v: nn[2] > edge };
  };
  for (let i = 0; i < n; i++) {
    const r = ring[i] as Vec2;
    const h = at(r[0], r[1]);
    vis[i] = !!h && h.v;
    scr[i] = h ? h.s : [0, 0];
    if (vis[i]) any = true;
  }
  if (!any) return null;
  const visIdx: number[] = [];
  for (let i = 0; i < n; i++) if (vis[i]) visIdx.push(i);
  const out: Vec2[] = [];
  for (let i = 0; i < n; i++) {
    if (vis[i]) {
      out.push(scr[i] as Vec2);
      continue;
    }
    let best = visIdx[0] as number;
    let bd = n;
    for (const j of visIdx) {
      const d = Math.min(Math.abs(j - i), n - Math.abs(j - i));
      if (d < bd) {
        bd = d;
        best = j;
      }
    }
    const a = ring[best] as Vec2;
    const b = ring[i] as Vec2;
    let lo = 0;
    let hi = 1;
    let last = scr[best] as Vec2;
    for (let k = 0; k < 14; k++) {
      const t = (lo + hi) / 2;
      const h = at(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t);
      if (h?.v) {
        lo = t;
        last = h.s;
      } else hi = t;
    }
    out.push(last);
  }
  return out;
}
