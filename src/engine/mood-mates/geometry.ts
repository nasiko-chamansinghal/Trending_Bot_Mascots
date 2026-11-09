import type { Point, Ring } from '../shared/util';

export type { Point, Ring };
export type EyePair = [Ring, Ring];

export interface CutLid {
  y: number;
  angle?: number;
}

export interface CutArc {
  x?: number;
  y: number;
  r: number;
}

export interface CutEye {
  x: number;
  y: number;
  w: number;
  h: number;
  rTop: number;
  rBot: number;
  tilt: number;
  lid?: CutLid;
  arc?: CutArc;
  ellipse?: boolean;
  floor?: CutLid;
  cap?: CutArc;
  outline?: Point[];
}

export interface CutParams {
  kind: 'cut';
  rot: number;
  cx: number;
  cy: number;
  left: CutEye;
  right: CutEye;
}

export interface BodyDescriptor {
  type: string;
  vertices?: Point[];
  radius?: number;
  arcSteps?: number;
  edgeStep?: number;
  stamp?: StampParams;
}

export interface StampParams {
  width: number;
  height: number;
  corner: number;
  bite: number;
  biteOut: number;
  bitePos: number[];
  rot: number;
  cy?: number;
}

const TAU = Math.PI * 2;

export const C = 120;
export const EYE_N = 48;

function r2(v: number): number {
  return Math.round(v * 100) / 100;
}

export function roundedOutline(
  vertices: Point[],
  radius: number | number[],
  arcSteps: number,
  edgeStep: number,
): Ring {
  const n = vertices.length;
  const corners: Ring[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = vertices[(i - 1 + n) % n] as Point;
    const p1 = vertices[i] as Point;
    const p2 = vertices[(i + 1) % n] as Point;
    const l1 = Math.hypot(p0[0] - p1[0], p0[1] - p1[1]);
    const l2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    if (l1 < 1e-6 || l2 < 1e-6) {
      corners.push([p1]);
      continue;
    }
    const u1: Point = [(p0[0] - p1[0]) / l1, (p0[1] - p1[1]) / l1];
    const u2: Point = [(p2[0] - p1[0]) / l2, (p2[1] - p1[1]) / l2];
    const theta = Math.acos(clampUnit(u1[0] * u2[0] + u1[1] * u2[1]));
    if (theta < 0.05 || Math.PI - theta < 0.05) {
      corners.push([p1]);
      continue;
    }
    const corner = typeof radius === 'number' ? radius : (radius[i] as number);
    const t = Math.min(corner / Math.tan(theta / 2), l1 / 2, l2 / 2);
    const r = t * Math.tan(theta / 2);
    const bx = u1[0] + u2[0];
    const by = u1[1] + u2[1];
    const bl = Math.hypot(bx, by);
    const d = r / Math.sin(theta / 2);
    const cx = p1[0] + (bx / bl) * d;
    const cy = p1[1] + (by / bl) * d;
    const a0 = Math.atan2(p1[1] + u1[1] * t - cy, p1[0] + u1[0] * t - cx);
    const a1 = Math.atan2(p1[1] + u2[1] * t - cy, p1[0] + u2[0] * t - cx);
    let da = a1 - a0;
    while (da > Math.PI) da -= TAU;
    while (da < -Math.PI) da += TAU;
    const arc: Ring = [];
    for (let s = 0; s <= arcSteps; s++) {
      const ang = a0 + (da * s) / arcSteps;
      arc.push([cx + r * Math.cos(ang), cy + r * Math.sin(ang)]);
    }
    corners.push(arc);
  }
  const ring: Ring = [];
  for (let i = 0; i < n; i++) {
    const arc = corners[i] as Ring;
    for (const p of arc) ring.push([r2(p[0]), r2(p[1])]);
    const from = arc[arc.length - 1] as Point;
    const to = (corners[(i + 1) % n] as Ring)[0] as Point;
    const segs = Math.max(1, Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1]) / edgeStep));
    for (let s = 1; s < segs; s++) {
      const k = s / segs;
      ring.push([r2(from[0] + (to[0] - from[0]) * k), r2(from[1] + (to[1] - from[1]) * k)]);
    }
  }
  return ring;
}

function clampUnit(v: number): number {
  return v < -1 ? -1 : v > 1 ? 1 : v;
}

const BODY_GEN: Record<string, (p: BodyDescriptor) => Ring> = {
  outline(p) {
    if (!p.vertices || p.vertices.length < 3) {
      throw new Error('[MoodMates] outline body needs at least 3 vertices');
    }
    return roundedOutline(p.vertices, p.radius ?? 6, p.arcSteps ?? 8, p.edgeStep ?? 3);
  },

  stamp(p) {
    if (!p.stamp) throw new Error('[MoodMates] stamp body needs stamp parameters');
    return stampOutline(p.stamp, p.edgeStep ?? 2);
  },
};

function stampSide(len: number, halfDepth: number, s: StampParams, step: number): Point[] {
  const out: Point[] = [];
  const reach = Math.sqrt(Math.max(s.bite * s.bite - s.biteOut * s.biteOut, 0));
  const start = -len / 2 + s.corner;
  const end = len / 2 - s.corner;
  let x = start;
  const bites = s.bitePos.map((f) => f * Math.min(s.width, s.height)).sort((a, b) => a - b);
  for (const b of bites) {
    const from = b - reach;
    const segs = Math.max(1, Math.ceil((from - x) / step));
    for (let k = 0; k < segs; k++) out.push([x + ((from - x) * k) / segs, -halfDepth]);
    const a0 = Math.atan2(s.biteOut, -reach);
    const a1 = Math.atan2(s.biteOut, reach);
    const arcSegs = Math.max(6, Math.ceil((s.bite * Math.abs(a0 - a1)) / step));
    for (let k = 0; k < arcSegs; k++) {
      const a = a0 + ((a1 - a0) * k) / arcSegs;
      out.push([b + s.bite * Math.cos(a), -halfDepth - s.biteOut + s.bite * Math.sin(a)]);
    }
    x = b + reach;
  }
  const segs = Math.max(1, Math.ceil((end - x) / step));
  for (let k = 0; k < segs; k++) out.push([x + ((end - x) * k) / segs, -halfDepth]);
  return out;
}

export function stampOutline(s: StampParams, step = 2): Ring {
  const hw = s.width / 2;
  const hh = s.height / 2;
  const cornerSegs = Math.max(4, Math.ceil((s.corner * Math.PI) / 2 / step));
  const raw: Point[] = [];
  const sides: Array<{ len: number; depth: number; angle: number }> = [
    { len: s.width, depth: hh, angle: 0 },
    { len: s.height, depth: hw, angle: Math.PI / 2 },
    { len: s.width, depth: hh, angle: Math.PI },
    { len: s.height, depth: hw, angle: (3 * Math.PI) / 2 },
  ];
  for (const side of sides) {
    const c = Math.cos(side.angle);
    const sn = Math.sin(side.angle);
    const pts = stampSide(side.len, side.depth, s, step);
    for (const [x, y] of pts) raw.push([x * c - y * sn, x * sn + y * c]);
    const cxL = side.len / 2 - s.corner;
    const cyL = -side.depth + s.corner;
    for (let k = 0; k < cornerSegs; k++) {
      const a = -Math.PI / 2 + ((Math.PI / 2) * k) / cornerSegs;
      const x = cxL + s.corner * Math.cos(a);
      const y = cyL + s.corner * Math.sin(a);
      raw.push([x * c - y * sn, x * sn + y * c]);
    }
  }
  const rot = (s.rot * Math.PI) / 180;
  const rc = Math.cos(rot);
  const rs = Math.sin(rot);
  const cy = C + (s.cy || 0);
  return raw.map(([x, y]) => [r2(C + x * rc - y * rs), r2(cy + x * rs + y * rc)]);
}

export function buildBody(desc: BodyDescriptor): Ring {
  const gen = BODY_GEN[desc.type];
  if (!gen) throw new Error(`[MoodMates] Unknown body generator: ${desc.type}`);
  return gen(desc);
}

function roundedRectPoint(phi: number, w: number, h: number, rTop: number, rBot: number): Point {
  const hw = w / 2;
  const hh = h / 2;
  const dx = Math.cos(phi);
  const dy = Math.sin(phi);
  const r = Math.min(dy < 0 ? rTop : rBot, hw, hh);
  const tx = dx === 0 ? Number.POSITIVE_INFINITY : hw / Math.abs(dx);
  const ty = dy === 0 ? Number.POSITIVE_INFINITY : hh / Math.abs(dy);
  const t = Math.min(tx, ty);
  const px = dx * t;
  const py = dy * t;
  const cx = Math.sign(px) * (hw - r);
  const cy = Math.sign(py) * (hh - r);
  if (r > 0 && Math.abs(px) > hw - r && Math.abs(py) > hh - r) {
    const qx = px - cx;
    const qy = py - cy;
    const k = r / Math.hypot(qx, qy);
    return [cx + qx * k, cy + qy * k];
  }
  return [px, py];
}

function ellipsePoint(phi: number, w: number, h: number, squareTop: boolean): Point {
  const hw = w / 2;
  const hh = h / 2;
  const dx = Math.cos(phi);
  const dy = Math.sin(phi);
  if (squareTop && dy < 0) {
    const t = Math.min(dx === 0 ? Number.POSITIVE_INFINITY : hw / Math.abs(dx), hh / -dy);
    return [dx * t, dy * t];
  }
  const t = 1 / Math.sqrt((dx * dx) / (hw * hw) + (dy * dy) / (hh * hh));
  return [dx * t, dy * t];
}

export function cutRing(eye: CutEye, rot: number, ox: number, oy: number): Ring {
  const tilt = (eye.tilt * Math.PI) / 180;
  const tc = Math.cos(tilt);
  const ts = Math.sin(tilt);
  const lidSlope = eye.lid ? Math.tan(((eye.lid.angle || 0) * Math.PI) / 180) : 0;
  if (eye.outline && eye.outline.length !== EYE_N) {
    throw new Error(`[MoodMates] eye outline needs exactly ${EYE_N} points`);
  }
  const pts: Point[] = [];
  for (let k = 0; k < EYE_N; k++) {
    const phi = -Math.PI / 2 + (TAU * k) / EYE_N;
    const traced = eye.outline?.[k];
    const [lx, ly] = traced
      ? [traced[0] * eye.w, traced[1] * eye.h]
      : eye.ellipse
        ? ellipsePoint(phi, eye.w, eye.h, eye.lid != null)
        : roundedRectPoint(phi, eye.w, eye.h, eye.lid ? 0 : eye.rTop, eye.rBot);
    const x = lx * tc - ly * ts;
    let y = lx * ts + ly * tc;
    if (eye.lid) {
      const yl = eye.lid.y + lidSlope * x;
      if (y < yl) y = yl;
    }
    if (eye.floor) {
      const yf = eye.floor.y + Math.tan(((eye.floor.angle || 0) * Math.PI) / 180) * x;
      if (y > yf) y = yf;
    }
    if (eye.cap) {
      const d = x - (eye.cap.x || 0);
      if (Math.abs(d) < eye.cap.r) {
        const yc = eye.cap.y + Math.sqrt(eye.cap.r * eye.cap.r - d * d);
        if (y < yc) y = yc;
      }
    }
    if (eye.arc) {
      const ax = eye.arc.x || 0;
      const d = x - ax;
      if (Math.abs(d) < eye.arc.r) {
        const ya = eye.arc.y - Math.sqrt(eye.arc.r * eye.arc.r - d * d);
        if (y > ya) y = ya;
      }
    }
    pts.push([x + eye.x, y + eye.y]);
  }
  const r = (rot * Math.PI) / 180;
  const rc = Math.cos(r);
  const rs = Math.sin(r);
  return pts.map(([x, y]) => [r2(ox + x * rc - y * rs), r2(oy + x * rs + y * rc)]);
}

export function buildEyePair(spec: CutParams): EyePair {
  return [cutRing(spec.left, spec.rot, spec.cx, spec.cy), cutRing(spec.right, spec.rot, spec.cx, spec.cy)];
}
