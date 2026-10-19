import type { Point, Ring } from '../shared/util';

export type { Point, Ring };
export type EyePair = [Ring, Ring];

export interface EyeStyle {
  dx: number;
  cy: number;
  w: number;
  h: number;
  taper: number;
  tilt: number;
  bend: number;
}

export interface LensParams {
  w: number;
  h: number;
  bend?: number;
  slope?: number;
  taper?: number;
  shift?: number;
  tilt?: number;
}

export interface LidEdge {
  y: number;
  angle?: number;
  bow?: number;
}

export interface LidParams {
  kind: 'lid';
  rx: number;
  ry: number;
  top: LidEdge;
  bottom: LidEdge;
  soften?: number;
}

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
}

export interface CutParams {
  kind: 'cut';
  rot: number;
  cx: number;
  cy: number;
  left: CutEye;
  right: CutEye;
}

export type EyeShapeSpec = (Partial<LensParams> & { kind?: 'lens' }) | LidParams | CutParams;

export interface MouthLensParams {
  w: number;
  h: number;
  bend?: number;
  taper?: number;
}

export interface MouthBase {
  w: number;
}

export interface RadialOptions {
  cx?: number;
  cy?: number;
  rot?: number;
}

export interface BodyWave {
  amp?: number;
  k?: number;
  phase?: number;
}

export interface BodyDescriptor extends RadialOptions {
  type: string;
  r?: number;
  lobes?: number;
  amp?: number;
  flat?: number;
  points?: number;
  sharp?: number;
  inner?: number;
  waves?: BodyWave[];
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
export const R = 104;
export const BODY_N = 96;
export const EYE_N = 48;
export const MOUTH_N = 24;

function r2(v: number): number {
  return Math.round(v * 100) / 100;
}

export function sampleRadial(radialFn: (theta: number) => number, opts: RadialOptions = {}): Ring {
  const cx = opts.cx != null ? opts.cx : C;
  const cy = opts.cy != null ? opts.cy : C;
  const rot = opts.rot || 0;
  const ring: Ring = [];
  for (let i = 0; i < BODY_N; i++) {
    const th = (TAU * i) / BODY_N - Math.PI / 2 + rot;
    const r = radialFn(th);
    ring.push([r2(cx + r * Math.cos(th)), r2(cy + r * Math.sin(th))]);
  }
  return ring;
}

export function roundedOutline(vertices: Point[], radius: number, arcSteps: number, edgeStep: number): Ring {
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
    const t = Math.min(radius / Math.tan(theta / 2), l1 / 2, l2 / 2);
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
  cloud(p) {
    const base = (p.r || 0.98) * R;
    const lobes = p.lobes || 7;
    const amp = p.amp != null ? p.amp : 0.075;
    const flat = p.flat != null ? p.flat : 0.1;
    return sampleRadial((th) => {
      const scallop = Math.abs(Math.sin((lobes * th) / 2)) ** 1.4;
      const seat = 1 - flat * Math.max(0, Math.sin(th)) ** 3;
      return base * seat * (1 + amp * scallop);
    }, p);
  },

  star(p) {
    const outer = (p.r || 1.04) * R;
    const inner = outer * (p.inner != null ? p.inner : 0.72);
    const pts = p.points || 5;
    const k = 1 + 3 * (p.sharp != null ? p.sharp : 0.55);
    return sampleRadial((th) => {
      const w = (0.5 + 0.5 * Math.cos(pts * (th + Math.PI / 2))) ** k;
      return inner + (outer - inner) * w;
    }, p);
  },

  puff(p) {
    const base = (p.r || 1) * R;
    const waves = p.waves || [];
    return sampleRadial((th) => {
      let v = 1;
      for (let i = 0; i < waves.length; i++) {
        const w = waves[i] as BodyWave;
        v += (w.amp || 0) * Math.sin((w.k || 2) * th + (w.phase || 0));
      }
      return base * v;
    }, p);
  },

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

export function lens(cx: number, cy: number, o: LensParams, mirror = 1): Ring {
  const w = o.w;
  const h = o.h;
  const bend = (o.bend || 0) * h;
  const slope = (o.slope || 0) * h * mirror;
  const taper = o.taper != null ? o.taper : 0.55;
  const shift = o.shift || 0;
  const tiltRad = (((o.tilt || 0) * Math.PI) / 180) * mirror;

  const ring: Ring = [];
  const cs = Math.cos(tiltRad);
  const sn = Math.sin(tiltRad);
  for (let k = 0; k < EYE_N; k++) {
    const phi = (TAU * k) / EYE_N;
    const u = (1 - Math.cos(phi)) / 2;
    const x = (u - 0.5) * w * mirror;
    const arch = Math.sin(Math.PI * u);
    const mid = -bend * arch + slope * (u - 0.5);
    const th = (h / 2) * arch ** taper;
    const y = Math.sin(phi) >= 0 ? mid - th * (1 - shift) : mid + th * (1 + shift);
    ring.push([r2(cx + x * cs - y * sn), r2(cy + x * sn + y * cs)]);
  }
  return ring;
}

export function lidRing(cx: number, cy: number, o: LidParams, mirror = 1): Ring {
  const ring: Ring = [];
  const edgeY = (e: LidEdge, x: number): number =>
    e.y * o.ry +
    Math.tan(((e.angle || 0) * Math.PI) / 180) * x -
    (e.bow || 0) * o.ry * (1 - (x / o.rx) * (x / o.rx));
  for (let k = 0; k < EYE_N; k++) {
    const th = (TAU * k) / EYE_N;
    const x = o.rx * Math.cos(th);
    let yTop = edgeY(o.top, x);
    let yBot = edgeY(o.bottom, x);
    if (yTop > yBot - 0.2) {
      const mid = (yTop + yBot) / 2;
      yTop = mid - 0.1;
      yBot = mid + 0.1;
    }
    const y = Math.min(Math.max(o.ry * Math.sin(th), yTop), yBot);
    ring.push([x * mirror, y]);
  }
  const k = o.soften != null ? o.soften : 0.16;
  const n = ring.length;
  return ring.map((p, i) => {
    const a = ring[(i - 1 + n) % n] as Point;
    const b = ring[(i + 1) % n] as Point;
    return [r2(cx + p[0] * (1 - 2 * k) + (a[0] + b[0]) * k), r2(cy + p[1] * (1 - 2 * k) + (a[1] + b[1]) * k)];
  });
}

const EYE_SLOTS: Record<string, (s: EyeStyle) => LensParams> = {
  calm: (s) => ({ w: s.w, h: s.h, bend: s.bend, taper: s.taper, tilt: s.tilt }),
  calm2: (s) => ({ w: s.w * 0.96, h: s.h * 1.05, bend: s.bend + 0.04, taper: s.taper, tilt: s.tilt }),
  happy: (s) => ({ w: s.w * 1.05, h: s.h * 0.5, bend: 0.62, taper: 1.15, tilt: s.tilt }),
  happy2: (s) => ({ w: s.w * 1.1, h: s.h * 0.42, bend: 0.5, taper: 0.9, tilt: s.tilt + 2 }),
  wide: (s) => ({ w: s.w * 1.12, h: s.h * 1.3, bend: 0, taper: Math.max(s.taper * 0.8, 0.3), tilt: 0 }),
  wide2: (s) => ({ w: s.w * 1.05, h: s.h * 1.42, bend: 0.05, taper: Math.max(s.taper * 0.7, 0.3), tilt: 0 }),
  closed: (s) => ({ w: s.w * 0.95, h: s.h * 0.12, bend: -0.25, taper: 0.9, tilt: s.tilt }),
  closed2: (s) => ({ w: s.w * 0.9, h: s.h * 0.1, bend: 0.2, taper: 0.9, tilt: s.tilt }),
  sleepy: (s) => ({ w: s.w, h: s.h * 0.34, bend: -0.3, taper: 0.7, shift: 0.35, tilt: s.tilt }),
  squint: (s) => ({ w: s.w * 1.02, h: s.h * 0.5, bend: 0.05, slope: 0.35, taper: 0.7, tilt: s.tilt }),
  squint2: (s) => ({ w: s.w * 0.96, h: s.h * 0.44, bend: -0.1, slope: 0.3, taper: 0.8, tilt: s.tilt + 3 }),
  angry: (s) => ({
    w: s.w * 1.02,
    h: s.h * 0.72,
    bend: 0.1,
    slope: -0.5,
    taper: 0.6,
    shift: 0.3,
    tilt: s.tilt,
  }),
  angry2: (s) => ({
    w: s.w * 0.98,
    h: s.h * 0.62,
    bend: 0.05,
    slope: -0.62,
    taper: 0.65,
    shift: 0.35,
    tilt: s.tilt,
  }),
  scan: (s) => ({ w: s.w * 1.3, h: s.h * 0.46, bend: 0, taper: 0.45, tilt: 0 }),
  scan2: (s) => ({ w: s.w * 1.18, h: s.h * 0.56, bend: 0.08, taper: 0.5, tilt: 0 }),
  scan3: (s) => ({ w: s.w * 1.36, h: s.h * 0.38, bend: -0.06, taper: 0.42, tilt: 0 }),
  listen: (s) => ({ w: s.w * 0.78, h: s.h * 1.18, bend: 0, taper: Math.max(s.taper * 0.85, 0.35), tilt: 0 }),
  listen2: (s) => ({
    w: s.w * 0.72,
    h: s.h * 1.08,
    bend: 0.08,
    taper: Math.max(s.taper * 0.85, 0.35),
    tilt: s.tilt,
  }),
  shy: (s) => ({ w: s.w * 0.92, h: s.h * 0.6, bend: -0.18, slope: 0.22, taper: 0.85, tilt: s.tilt + 4 }),
  sad: (s) => ({ w: s.w * 0.95, h: s.h * 0.62, bend: -0.1, slope: 0.45, taper: 0.75, tilt: s.tilt }),
};

export function buildEyePair(slotName: string, style: EyeStyle): EyePair {
  const slotFn = EYE_SLOTS[slotName];
  if (!slotFn) throw new Error(`[MoodMates] Unknown eye slot: ${slotName}`);
  const o = slotFn(style);
  const left = lens(C - style.dx, style.cy, o, 1);
  const right = lens(C + style.dx, style.cy, o, -1);
  return [left, right];
}

export function buildEyeFamily(style: EyeStyle): Record<string, EyePair> {
  const fam: Record<string, EyePair> = {};
  for (const name in EYE_SLOTS) fam[name] = buildEyePair(name, style);
  return fam;
}

function mouthLens(o: MouthLensParams): Ring {
  const w = o.w;
  const h = o.h;
  const bend = (o.bend || 0) * Math.max(h, 4);
  const taper = o.taper != null ? o.taper : 0.8;
  const ring: Ring = [];
  for (let k = 0; k < MOUTH_N; k++) {
    const phi = (TAU * k) / MOUTH_N;
    const u = (1 - Math.cos(phi)) / 2;
    const x = (u - 0.5) * w;
    const arch = Math.sin(Math.PI * u);
    const mid = -bend * arch;
    const th = (h / 2) * arch ** taper;
    const y = Math.sin(phi) >= 0 ? mid - th : mid + th;
    ring.push([r2(x), r2(y)]);
  }
  return ring;
}

const MOUTH_SLOTS: Record<string, (b: MouthBase) => Ring> = {
  smile: (b) => mouthLens({ w: b.w, h: 3.2, bend: -0.9, taper: 0.9 }),
  grin: (b) => mouthLens({ w: b.w * 1.25, h: 11, bend: -0.55, taper: 0.6 }),
  o: (b) => mouthLens({ w: b.w * 0.5, h: b.w * 0.52, bend: 0, taper: 0.4 }),
  flat: (b) => mouthLens({ w: b.w * 0.8, h: 2.6, bend: 0, taper: 0.9 }),
  frown: (b) => mouthLens({ w: b.w * 0.85, h: 3, bend: 0.85, taper: 0.9 }),
  wavy: (b) => mouthLens({ w: b.w, h: 3, bend: -0.15, taper: 0.5 }),
  pout: (b) => mouthLens({ w: b.w * 0.42, h: 3.4, bend: 0.5, taper: 0.5 }),
  open: (b) => mouthLens({ w: b.w * 0.72, h: b.w * 0.5, bend: -0.25, taper: 0.45 }),
  dot: (b) => mouthLens({ w: b.w * 0.2, h: b.w * 0.18, bend: 0, taper: 0.4 }),
};

export function buildMouth(slotName: string, base: MouthBase): Ring {
  const fn = MOUTH_SLOTS[slotName] || (MOUTH_SLOTS.flat as (b: MouthBase) => Ring);
  return fn(base);
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
  const pts: Point[] = [];
  for (let k = 0; k < EYE_N; k++) {
    const phi = -Math.PI / 2 + (TAU * k) / EYE_N;
    const [lx, ly] = eye.ellipse
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

export function buildCustomEyePair(spec: EyeShapeSpec, style: EyeStyle): EyePair {
  if (spec.kind === 'cut') {
    return [cutRing(spec.left, spec.rot, spec.cx, spec.cy), cutRing(spec.right, spec.rot, spec.cx, spec.cy)];
  }
  if (spec.kind === 'lid') {
    return [lidRing(C - style.dx, style.cy, spec, 1), lidRing(C + style.dx, style.cy, spec, -1)];
  }
  const o = spec as Partial<LensParams>;
  const merged = Object.assign(
    { w: style.w, h: style.h, taper: style.taper, tilt: style.tilt, bend: style.bend },
    o,
  ) as LensParams;
  return [lens(C - style.dx, style.cy, merged, 1), lens(C + style.dx, style.cy, merged, -1)];
}

export function buildCustomMouth(o: Partial<MouthLensParams>): Ring {
  return mouthLens(Object.assign({ w: 24, h: 3, bend: 0, taper: 0.8 }, o));
}

export const eyeSlots = Object.keys(EYE_SLOTS);
export const mouthSlots = Object.keys(MOUTH_SLOTS);
export const bodyTypes = Object.keys(BODY_GEN);
