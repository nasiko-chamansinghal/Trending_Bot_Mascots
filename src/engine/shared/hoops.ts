import { mixRgb, oklch, parseHex, type Rgb, toHex, toOklch } from './oklch';
import { el } from './util';

type Pair = [number, number];

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const smooth = (u: number): number => {
  const x = clamp(u, 0, 1);
  return x * x * (3 - 2 * x);
};
const fixed = (n: number): string => {
  const r = Math.round(n * 100) / 100;
  return (Object.is(r, -0) ? 0 : r).toString();
};
const lerp = (range: [number, number], u: number): number => range[0] + (range[1] - range[0]) * u;

export function noise(seed: number, n: number): number {
  let h = (seed ^ Math.imul(n | 0, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function hashString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const DESIGN = 228.541;
const BODY = 80;
const UNIT = BODY / DESIGN;
const RIM_MARGIN = 2;
const RIM_STEPS = 180;
const HOOP_TILT = 0.386;
const HOOP_ROLL = 0.157;
const HOOP_JITTER = 0.24;
const HOOP_TILT_JITTER = 0.08;
const LADDER = 38;
const ARC: [number, number] = [2.2, 3.4];
const FOLLOW: [number, number] = [0.74, 0.94];
const DRIFT: [number, number] = [0.5, 1.1];
const WIDEN = 2.5;
const START = 0.18;
const SIZE_FEW: [number, number] = [8, 10.5];
const SIZE_FOUR: [number, number] = [6.6, 8.6];
const SIZE_MANY: [number, number] = [5.6, 7.4];
const WORK_LANES: [number, number] = [3, 5];
const BRUSH = 1.7 * 1.98;
const FAR = 0.72;
const GROW_S = 0.34;
const STAGGER: [number, number] = [0.055, 0.105];
const SWEEP_RATE: [number, number] = [6.3, 15];
const LANES = 3;
const HOOPS = 3;
const SAMPLES = 24;
const STRETCH = 6;
const SLIVER = 0.02;
const CAP = 7;

const sizeFor = (count: number): [number, number] =>
  count <= 3 ? SIZE_FEW : count === 4 ? SIZE_FOUR : SIZE_MANY;

interface Rim {
  cx: number;
  cy: number;
  at: (angle: number) => number;
  max: number;
}

function reachAlong(outline: Pair[], cx: number, cy: number, angle: number): number {
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  let far = 0;
  for (let i = 0; i < outline.length; i++) {
    const [x1, y1] = outline[i] as Pair;
    const [x2, y2] = outline[(i + 1) % outline.length] as Pair;
    const ex = x2 - x1;
    const ey = y2 - y1;
    const den = ux * ey - uy * ex;
    if (Math.abs(den) < 1e-12) continue;
    const t = ((x1 - cx) * ey - (y1 - cy) * ex) / den;
    const s = ((x1 - cx) * uy - (y1 - cy) * ux) / den;
    if (s >= 0 && s <= 1) far = Math.max(far, Math.abs(t));
  }
  return far;
}

function rayReach(outline: Pair[], cx: number, cy: number, angle: number): number {
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  let far = 0;
  for (let i = 0; i < outline.length; i++) {
    const [x1, y1] = outline[i] as Pair;
    const [x2, y2] = outline[(i + 1) % outline.length] as Pair;
    const ex = x2 - x1;
    const ey = y2 - y1;
    const den = ux * ey - uy * ex;
    if (Math.abs(den) < 1e-12) continue;
    const t = ((x1 - cx) * ey - (y1 - cy) * ex) / den;
    const s = ((x1 - cx) * uy - (y1 - cy) * ux) / den;
    if (t > 0 && s >= 0 && s <= 1) far = Math.max(far, t);
  }
  return far;
}

export function unionOutline(shapes: Pair[][], steps = 360): Pair[] {
  const points = shapes.flat();
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  return Array.from({ length: steps }, (_, i): Pair => {
    const angle = (2 * Math.PI * i) / steps;
    const reach = Math.max(...shapes.map((shape) => rayReach(shape, cx, cy, angle)));
    return [cx + reach * Math.cos(angle), cy + reach * Math.sin(angle)];
  });
}

function rimOf(outline: Pair[], cx: number, cy: number): Rim {
  const at = (angle: number): number => reachAlong(outline, cx, cy, angle);
  const steps = Array.from({ length: RIM_STEPS }, (_, k) => at((k * Math.PI) / RIM_STEPS));
  return { cx, cy, at, max: Math.max(...steps) * 1.02 };
}

function hoopRolls(seed: number): number[] {
  return Array.from(
    { length: HOOPS },
    (_, i) => HOOP_ROLL + (i * Math.PI) / HOOPS + (noise(seed, 450 + i) - 0.5) * HOOP_JITTER,
  );
}

interface Piece {
  d: string;
  front: boolean;
  ribbon: number;
  along: Pair;
  from: Pair;
  to: Pair;
}

function pieces(presence: number, seed: number, sweep: number, cage: number, rim: Rim): Piece[] {
  const k = clamp(presence, 0, 1);
  const more = cage >= 0.5 ? 1 : 0;
  if (k <= 0.01) return [];
  const { cx, cy } = rim;
  const rolls = hoopRolls(seed);
  const cageRing = Math.max(...[0, 1, 2].map((i) => rim.at(rolls[i] as number))) + RIM_MARGIN;
  const dir = sweep < 0 ? -1 : 1;
  const since = Math.abs(sweep) / lerp(SWEEP_RATE, more);
  const out: Piece[] = [];
  for (let i = 0; i < (more ? HOOPS : 1); i++) {
    const roll = rolls[i] as number;
    const tilt = HOOP_TILT + (noise(seed, 460 + i) - 0.5) * HOOP_TILT_JITTER;
    const ring = more ? cageRing : rim.at(roll) + RIM_MARGIN;
    const lanes = i || more > 0 ? LANES : Math.round(lerp(WORK_LANES, noise(seed, 47)));
    for (let l = 0; l < lanes; l++) {
      const n = (m: number): number => noise(seed, 500 + (i * LANES + l) * 11 + m);
      const order = more > 0 ? l * HOOPS + i : l;
      const at = order * lerp(STAGGER, n(7));
      const life = since - at;
      if (life <= 0) continue;
      const before = since > 0 ? Math.abs(sweep) * (at / since) : 0;
      const flat = Math.sin(tilt);
      const depth = Math.cos(tilt);
      const cr = Math.cos(roll);
      const sr = Math.sin(roll);
      const r = ring + (l * LADDER * UNIT) / (lanes - 1) + lerp([0, WIDEN], n(2)) * UNIT * life;
      const travel = (Math.abs(sweep) - before) * lerp(FOLLOW, n(3)) + lerp(DRIFT, n(4)) * life;
      const head = dir * (before + travel - START * n(5));
      const ret = 1 - clamp(k * 1.25, 0, 1);
      const length = Math.min(lerp(ARC, n(6)), travel) * (1 - ret * ret * (3 - 2 * ret));
      if (length <= 0.02) continue;
      const size = lerp(sizeFor(lanes), n(8)) * (1 - more) + lerp(SIZE_MANY, n(8)) * more;
      const nearHead = clamp(Math.cos(head) * depth, 0, 1);
      let full =
        size * BRUSH * UNIT * (FAR + (1 - FAR) * nearHead) * smooth(life / GROW_S) * (1 - 0.72 * ret * ret);
      const lamAt = (u: number): number => head - dir * length * (1 - u);
      const point = (lam: number): Pair => {
        const a = Math.sin(lam);
        const y = -Math.cos(lam) * flat;
        return [cx + r * (a * cr - y * sr), cy + r * (a * sr + y * cr)];
      };
      const along = (lam: number): number => 1 - (head - lam) / (dir * length);
      const sliver = SLIVER / length;
      const ss: number[] = [];
      for (let j = 0; j <= SAMPLES; j++) ss.push(j / SAMPLES);
      const lo = Math.min(head, head - dir * length);
      const hi = Math.max(head, head - dir * length);
      for (let side = Math.ceil((lo - Math.PI / 2) / Math.PI); Math.PI / 2 + side * Math.PI < hi; side++) {
        const u = along(Math.PI / 2 + side * Math.PI);
        for (const d of [-sliver, 0, sliver]) if (u + d > 0 && u + d < 1) ss.push(u + d);
      }
      ss.sort((x, y) => x - y);
      const near = ss.map((u) => Math.cos(lamAt(u) + dir * 1e-6) > 0);
      const mid: Pair[] = [];
      const halfs: number[] = [];
      const norm: Pair[] = [];
      const bend: number[] = [];
      for (const u of ss) {
        const lam = lamAt(u);
        const nx = Math.sin(lam) * flat;
        const ny = -Math.cos(lam);
        const nl = Math.hypot(nx, ny) || 1;
        const ux = nx / nl;
        const uy = ny / nl;
        mid.push(point(lam));
        norm.push([ux * cr - uy * sr, ux * sr + uy * cr]);
        halfs.push(0.5 + 0.5 * u);
        const c = Math.cos(lam);
        const sn = Math.sin(lam);
        bend.push((r * (c * c + flat * flat * sn * sn) ** 1.5) / flat);
      }
      const last = ss.length - 1;
      let onScreen = 0;
      for (let j = 1; j <= last; j++) {
        const a = mid[j] as Pair;
        const b = mid[j - 1] as Pair;
        onScreen += Math.hypot(a[0] - b[0], a[1] - b[1]);
      }
      full = Math.min(full, 0.34 * onScreen);
      for (let j = 0; j <= last; j++)
        halfs[j] = Math.min((halfs[j] as number) * (full / 2), 0.9 * (bend[j] as number));
      const side = (j: number, sign: number): Pair => {
        const m = mid[j] as Pair;
        const nm = norm[j] as Pair;
        const h = halfs[j] as number;
        return [m[0] + sign * nm[0] * h, m[1] + sign * nm[1] * h];
      };
      const cap = (j: number, ahead: boolean): Pair[] => {
        const o = (ahead ? mid[j - 1] : mid[j + 1]) as Pair;
        const m = mid[j] as Pair;
        let tx = ahead ? m[0] - o[0] : o[0] - m[0];
        let ty = ahead ? m[1] - o[1] : o[1] - m[1];
        const tl = Math.hypot(tx, ty) || 1;
        tx /= tl;
        ty /= tl;
        const [nx, ny] = norm[j] as Pair;
        const h = halfs[j] as number;
        const arc: Pair[] = [];
        for (let c = 1; c < CAP; c++) {
          const t = (Math.PI * c) / CAP;
          const e = ahead ? Math.cos(t) : -Math.cos(t);
          const g = ahead ? Math.sin(t) : -Math.sin(t);
          arc.push([m[0] + (nx * e + tx * g) * h, m[1] + (ny * e + ty * g) * h]);
        }
        return arc;
      };
      let from = 0;
      for (let j = 1; j <= last; j++) {
        const turns = j < last && near[j] !== near[from];
        if (j < last && !turns && j - from < STRETCH) continue;
        const to = j;
        const behind = !near[from];
        const end = to < last && (!turns || behind) ? to + 1 : to;
        const start = from > 0 && behind && near[from - 1] ? from - 1 : from;
        const pts: Pair[] = [];
        for (let q = start; q <= end; q++) pts.push(side(q, 1));
        if (end === last) pts.push(...cap(last, true));
        for (let q = end; q >= start; q--) pts.push(side(q, -1));
        if (start === 0) pts.push(...cap(0, false));
        out.push({
          d: `M${pts.map((p) => `${fixed(p[0])} ${fixed(p[1])}`).join('L')}Z`,
          front: near[from] as boolean,
          ribbon: i * LANES + l,
          along: [ss[from] as number, ss[to] as number],
          from: mid[from] as Pair,
          to: mid[to] as Pair,
        });
        from = j;
      }
    }
  }
  return out;
}

const RAMP_LIGHT = 0.09;
const RAMP_HUE = 14;
const RAMP_RANGE = [0.36, 0.9] as const;
const WARM = 100;
const GRADIENT_LIGHT = 0.13;
const GRADIENT_HUE = 25;
const GRADIENT_STOPS = 5;
const NEUTRAL = 0.04;
const NEUTRAL_TINT = 0.025;
const BAND_SHADES = [
  [0, 1, 2],
  [2, 0, 3],
  [1, 2, 0],
] as const;
const FALLBACK_COLOR: Rgb = [255, 106, 26];

function turnToward(h: number, to: number, by: number): number {
  const d = ((to - h + 540) % 360) - 180;
  return (h + Math.sign(d) * Math.min(Math.abs(d), by) + 360) % 360;
}

function runAt(run: Rgb[], t: number): string {
  const x = clamp(t, 0, 1) * (run.length - 1);
  const n = Math.min(Math.floor(x), run.length - 2);
  return toHex(mixRgb(run[n] as Rgb, run[n + 1] as Rgb, x - n));
}

const palettes = new Map<string, Rgb[][]>();

function ribbonPalette(color: string, seed: number): Rgb[][] {
  const key = `${color}|${seed}`;
  const cached = palettes.get(key);
  if (cached) return cached;
  const [light, chroma, hue] = toOklch(parseHex(color) ?? FALLBACK_COLOR);
  const neutral = chroma < NEUTRAL;
  const base = neutral ? (130 + noise(seed, 500) * 310) % 360 : hue;
  const c = neutral ? NEUTRAL_TINT : Math.max(chroma, 0.17);
  const from = Math.min(RAMP_RANGE[1], Math.max(RAMP_RANGE[0], light));
  const steps: number[] = [];
  for (let k = 1; steps.length < 5 && k < 10; k++) {
    for (const step of [k, -k]) {
      const l = from + step * RAMP_LIGHT;
      if (steps.length < 5 && l >= RAMP_RANGE[0] - 1e-9 && l <= RAMP_RANGE[1] + 1e-9) steps.push(step);
    }
  }
  while (steps.length < 5) steps.push(steps[steps.length - 1] ?? 1);
  const shades = steps.map((step) => {
    const l = from + step * RAMP_LIGHT;
    const h = turnToward(base, step > 0 ? WARM : WARM + 180, RAMP_HUE * Math.abs(step));
    const away = step > 0 ? 1 : -1;
    const run = Array.from({ length: GRADIENT_STOPS }, (_, n) => {
      const t = n / (GRADIENT_STOPS - 1);
      const tone = turnToward(h, away > 0 ? WARM : WARM + 180, GRADIENT_HUE * t);
      return oklch(clamp(l + away * GRADIENT_LIGHT * t, 0.26, 0.9), c, tone);
    });
    return { step, run };
  });
  const palette = BAND_SHADES.flatMap((pick) =>
    pick
      .map((n) => shades[n] as (typeof shades)[number])
      .sort((x, y) => y.step - x.step)
      .map(({ run }) => run),
  );
  if (palettes.size >= 64) palettes.clear();
  palettes.set(key, palette);
  return palette;
}

export interface HoopHost {
  defs: SVGElement;
  back: SVGElement;
  front: SVGElement;
  nextUid: () => number;
  id: string;
  outline: () => Array<[number, number]>;
  seed: number;
}

export interface Hoops {
  update: (presence: number, sweep: number, cage: number, color: string) => void;
}

interface Slot {
  path: SVGPathElement;
  gradient: SVGLinearGradientElement;
  stops: SVGStopElement[];
}

interface Stage {
  rim: Rim;
  back: SVGGElement;
  front: SVGGElement;
}

export function createHoops(host: HoopHost): Hoops {
  let stage: Stage | null = null;

  function build(): Stage {
    const outline = host.outline();
    const xs = outline.map((p) => p[0]);
    const ys = outline.map((p) => p[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    const unit = span / BODY;
    const local = outline.map(([x, y]): Pair => [(x - cx) / unit, (y - cy) / unit]);
    const place = `translate(${fixed(cx)} ${fixed(cy)}) scale(${unit.toFixed(5)})`;
    const back = el('g', { transform: place, 'pointer-events': 'none' });
    const front = el('g', { transform: place, 'pointer-events': 'none' });
    host.back.appendChild(back);
    host.front.appendChild(front);
    return { rim: rimOf(local, 0, 0), back, front };
  }

  const behindSlots: Slot[] = [];
  const frontSlots: Slot[] = [];
  let lastPresence = 0;
  let heldSweep = 0;

  function slot(parent: SVGElement, list: Slot[]): Slot {
    const id = `${host.id}hp${host.nextUid()}`;
    const gradient = el('linearGradient', {
      id,
      gradientUnits: 'userSpaceOnUse',
    }) as SVGLinearGradientElement;
    const stops = [0, 0.5, 1].map((offset) => {
      const stop = el('stop', { offset }) as SVGStopElement;
      gradient.appendChild(stop);
      return stop;
    });
    host.defs.appendChild(gradient);
    const path = el('path', { fill: `url(#${id})`, stroke: 'none' }) as SVGPathElement;
    parent.appendChild(path);
    const made = { path, gradient, stops };
    list.push(made);
    return made;
  }

  function update(presence: number, sweep: number, cage: number, color: string): void {
    if (!stage && presence <= 0.01) return;
    stage ??= build();
    const { rim, back, front } = stage;
    if (presence < lastPresence - 1e-4) {
      lastPresence = presence;
    } else {
      lastPresence = presence;
      heldSweep = sweep;
    }
    const list = pieces(presence, host.seed, heldSweep, cage, rim);
    const palette = ribbonPalette(color, host.seed);
    let nb = 0;
    let nf = 0;
    for (const piece of list) {
      const target = piece.front ? front : back;
      const pool = piece.front ? frontSlots : behindSlots;
      const index = piece.front ? nf++ : nb++;
      const s = pool[index] ?? slot(target, pool);
      const run = palette[piece.ribbon] as Rgb[];
      const [s0, s1] = piece.along;
      const colors = [s0, (s0 + s1) / 2, s1].map((t) => runAt(run, t));
      const long = Math.hypot(piece.to[0] - piece.from[0], piece.to[1] - piece.from[1]) > 0.01;
      s.path.setAttribute('d', piece.d);
      s.path.style.display = '';
      s.gradient.setAttribute('x1', fixed(piece.from[0]));
      s.gradient.setAttribute('y1', fixed(piece.from[1]));
      s.gradient.setAttribute('x2', fixed(long ? piece.to[0] : piece.from[0] + 0.01));
      s.gradient.setAttribute('y2', fixed(long ? piece.to[1] : piece.from[1]));
      s.stops.forEach((stop, i) => {
        stop.setAttribute('stop-color', long ? (colors[i] as string) : (colors[1] as string));
      });
    }
    for (let i = nb; i < behindSlots.length; i++) (behindSlots[i] as Slot).path.style.display = 'none';
    for (let i = nf; i < frontSlots.length; i++) (frontSlots[i] as Slot).path.style.display = 'none';
  }

  return { update };
}

export const hoopPieces = pieces;
export const hoopRim = rimOf;
