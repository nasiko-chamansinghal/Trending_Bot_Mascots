import { EMOTION_SEED } from '../../emotion-ball/emotions';
import { RINGS } from '../../emotion-ball/rings';
import type { EyePair, Point, Ring } from '../geometry';
import { solidRestOutline } from '../solid/render';
import type { BodyTint, SolidSpec } from '../solid/spec';
import type { AnimSpec, CharacterRaw, Palette } from '../types';
import { centroid } from '../util';
import { type EyeGrow, type EyeSlots, fxEmotions } from './fx-emotions';
import { grokPairPlacer, normalizeRing } from './grok-rings';
import { grokEmotions } from './pumpkin/emotions';

const RIM_POINTS = 1440;
const RING_POINTS = 192;
const OVAL_POINTS = 96;
const MOTION = 0.62;

export interface RimBody {
  ring: Ring;
  unit: number;
  depth: number;
  puff: number;
  sigma: number;
  edge?: number;
  tint: BodyTint;
  scale: number;
  center: [number, number];
}

function reach(ring: Ring, dx: number, dy: number): number {
  let best = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i] as Point;
    const b = ring[(i + 1) % ring.length] as Point;
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const denom = dx * ey - dy * ex;
    if (Math.abs(denom) < 1e-12) continue;
    const t = (a[0] * ey - a[1] * ex) / denom;
    const u = (a[0] * dy - a[1] * dx) / denom;
    if (t > best && u >= 0 && u <= 1) best = t;
  }
  return best;
}

function soften(table: number[], sigma: number): number[] {
  if (sigma <= 0) return table;
  const n = table.length;
  const span = Math.ceil(sigma * 3);
  const weights = Array.from({ length: 2 * span + 1 }, (_, k) =>
    Math.exp(-((k - span) ** 2) / (2 * sigma * sigma)),
  );
  const total = weights.reduce((a, b) => a + b, 0);
  return table.map((_, i) => {
    let sum = 0;
    for (let k = -span; k <= span; k++)
      sum += (table[(i + k + n) % n] as number) * (weights[k + span] as number);
    return sum / total;
  });
}

export function radialRing(radii: number[], unit: number): Ring {
  return radii.map((r, i): Point => {
    const a = (2 * Math.PI * i) / radii.length;
    return [r * Math.cos(a) * unit, r * Math.sin(a) * unit];
  });
}

export function smoothContour(ring: Ring, sigma: number): Ring {
  const n = ring.length;
  const cum = [0];
  for (let i = 1; i <= n; i++) {
    const a = ring[i - 1] as Point;
    const b = ring[i % n] as Point;
    cum.push((cum[i - 1] as number) + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const total = cum[n] as number;
  const m = Math.round(total);
  const even: Ring = [];
  let j = 0;
  for (let k = 0; k < m; k++) {
    const d = (total * k) / m;
    while (j < n - 1 && (cum[j + 1] as number) < d) j++;
    const a = ring[j] as Point;
    const b = ring[(j + 1) % n] as Point;
    const span = (cum[j + 1] as number) - (cum[j] as number);
    const u = span > 1e-9 ? (d - (cum[j] as number)) / span : 0;
    even.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
  }
  const reach = Math.ceil(sigma * 3);
  const weights = Array.from({ length: 2 * reach + 1 }, (_, k) =>
    Math.exp(-((k - reach) ** 2) / (2 * sigma * sigma)),
  );
  const sum = weights.reduce((a, b) => a + b, 0);
  return even.map((_, i): Point => {
    let x = 0;
    let y = 0;
    for (let k = -reach; k <= reach; k++) {
      const p = even[(i + k + m) % m] as Point;
      const w = weights[k + reach] as number;
      x += p[0] * w;
      y += p[1] * w;
    }
    return [x / sum, y / sum];
  });
}

export function rimSpec(o: RimBody): SolidSpec {
  const exact = Array.from({ length: RIM_POINTS }, (_, i) => {
    const angle = -Math.PI + (2 * Math.PI * i) / RIM_POINTS;
    return reach(o.ring, Math.cos(angle), Math.sin(angle)) / o.unit;
  });
  const rim = soften(exact, o.edge ?? 0);
  return {
    body: {
      ribs: 4,
      sharp: [1, 1],
      radius: [1, 1],
      rim,
      rimSoft: soften(rim, o.sigma),
      puff: o.puff,
      skirt: [0, 0],
      join: 1,
      depth: [0, 0],
      flat: o.depth,
    },
    tint: o.tint,
    rest: { yaw: 0, pitch: 0.05, roll: 0 },
    scale: o.scale,
    stretch: [1, 1],
    center: o.center,
    stemColor: '#000000',
    capColor: '#000000',
    edge: 0.06,
  };
}

export interface RimFace {
  anchor: Point;
  half: number;
  rx: number;
  ry: number;
  scale: number;
  spread: number;
  reach: number;
  aspect: number;
  minHeight: number;
  minLine?: number;
  maxGrow?: number;
}

function heightOf(ring: Ring): number {
  const ys = ring.map((p) => p[1]);
  return Math.max(...ys) - Math.min(...ys);
}

function idleMid(): Point {
  const idle = EMOTION_SEED.find((e) => e.id === '02');
  const [left, right] = RINGS.EXPRESSIONS[idle?.pool?.[0] ?? 0] as [Ring, Ring];
  const [lx, ly] = centroid(left);
  const [rx, ry] = centroid(right);
  return [(lx + rx) / 2, (ly + ry) / 2];
}

export function rimEyes(f: RimFace): Record<string, EyePair> {
  const minLine = f.minLine ?? 16;
  const maxGrow = f.maxGrow ?? 1.4;
  const place = grokPairPlacer({
    anchor: f.anchor,
    idle: idleMid(),
    scale: f.scale,
    spread: f.spread,
    reach: f.reach,
    aspect: f.aspect,
  });
  const oval = (cx: number): Ring =>
    Array.from({ length: OVAL_POINTS }, (_, i) => {
      const t = (i / OVAL_POINTS) * Math.PI * 2;
      return [cx + f.rx * Math.cos(t), f.anchor[1] + f.ry * Math.sin(t)] as Point;
    });
  const grow = (pair: EyePair): EyePair => {
    const tallest = Math.max(heightOf(pair[0]), heightOf(pair[1]));
    const k = tallest < minLine ? 1 : Math.min(maxGrow, Math.max(1, f.minHeight / tallest));
    return pair.map((ring) => {
      const [cx, cy] = centroid(ring);
      return ring.map(([x, y]): Point => [cx + (x - cx) * k, cy + (y - cy) * k]);
    }) as EyePair;
  };
  const rings: Record<string, EyePair> = {
    calm: [oval(f.anchor[0] - f.half), oval(f.anchor[0] + f.half)],
  };
  RINGS.EXPRESSIONS.forEach((pair, i) => {
    rings[`g${i}`] = grow(place(pair));
  });
  return Object.fromEntries(
    Object.entries(rings).map(([slot, [l, r]]) => [
      slot,
      [normalizeRing(l, RING_POINTS, false), normalizeRing(r, RING_POINTS, false)] as EyePair,
    ]),
  );
}

const SLOTS: EyeSlots = {
  calm: 'calm',
  wide: 'g3',
  up: 'g8',
  left: 'g16',
  right: 'g16',
  happy: 'g19',
  squint: 'g7',
};

const BASE_ANIMS: AnimSpec[] = [{ target: 'body', prop: 'rotate', type: 'sine', amp: 0.8, period: 5200 }];

export interface RimCharacter {
  id: string;
  name: string;
  desc: string;
  spec: SolidSpec;
  palette: Palette;
  rings: Record<string, EyePair>;
  fear?: EyeGrow;
}

export function rimCharacter(o: RimCharacter): CharacterRaw {
  const grok = grokEmotions(MOTION);
  return {
    id: o.id,
    name: o.name,
    industry: 'general',
    desc: o.desc,
    body: { type: 'outline', vertices: solidRestOutline(o.spec), radius: 0.5, arcSteps: 2, edgeStep: 6 },
    solid: o.spec,
    material: 'flat',
    face: { x: 0, y: 0, sx: 1, sy: 1, eye: 1, contain: 0 },
    palette: o.palette,
    eyeShapes: {},
    eyeRings: o.rings,
    blink: [],
    blinkStyle: 'open',
    poseDefaults: { body: { turn: 0, pitch: 0 } },
    bounceScale: MOTION,
    gazeRange: [24 * MOTION, 15 * MOTION],
    baseAnims: BASE_ANIMS,
    emotions: { ...grok, '02': { ...grok['02'], pool: ['calm'] }, ...fxEmotions(SLOTS, o.fear) },
  };
}

export function palette(body: string, eye: string, states: Partial<Palette['states']>, zzz: string): Palette {
  return {
    body,
    eye,
    zzz,
    states: {
      base: body,
      dim: body,
      soft: body,
      blush: body,
      angry: body,
      alert: body,
      off: body,
      ...states,
    },
  };
}
