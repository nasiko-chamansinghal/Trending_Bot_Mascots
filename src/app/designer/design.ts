import {
  palette,
  rimCharacter,
  rimEyes,
  rimSpec,
  smoothContour,
} from '../../engine/mood-mates/characters/rim';
import type { Point, Ring } from '../../engine/mood-mates/geometry';
import type { CharacterRaw } from '../../engine/mood-mates/types';
import { lerpColor } from '../../engine/shared/math';

export const SHAPES = ['blob', 'squircle', 'polygon', 'star', 'flower', 'ghost', 'drop'] as const;
export type ShapeKind = (typeof SHAPES)[number];

export interface Design {
  v: 1;
  id: string;
  name: string;
  shape: ShapeKind;
  /** Corners, points or petals, depending on the shape. */
  sides: number;
  /** The shape's own feature strength: wobble, squareness, point depth, petal depth, tail wave, tip. */
  amount: number;
  roundness: number;
  seed: number;
  width: number;
  height: number;
  tilt: number;
  size: number;
  thickness: number;
  puff: number;
  body: string;
  top: string;
  bottom: string;
  eyeColor: string;
  eyeX: number;
  eyeY: number;
  eyeGap: number;
  eyeSize: number;
  eyeShape: number;
}

export interface Range {
  min: number;
  max: number;
  step: number;
}

export type NumericKey = {
  [K in keyof Design]: Design[K] extends number ? (K extends 'v' ? never : K) : never;
}[keyof Design];

export const RANGES: Record<NumericKey, Range> = {
  sides: { min: 3, max: 12, step: 1 },
  amount: { min: 0, max: 1, step: 0.01 },
  roundness: { min: 0, max: 1, step: 0.01 },
  seed: { min: 0, max: 99999, step: 1 },
  width: { min: 0.6, max: 1.4, step: 0.01 },
  height: { min: 0.6, max: 1.4, step: 0.01 },
  tilt: { min: -30, max: 30, step: 1 },
  size: { min: 52, max: 84, step: 1 },
  thickness: { min: 0.4, max: 1, step: 0.01 },
  puff: { min: 1.6, max: 3, step: 0.05 },
  eyeX: { min: -0.4, max: 0.4, step: 0.01 },
  eyeY: { min: -0.5, max: 0.3, step: 0.01 },
  eyeGap: { min: 6, max: 30, step: 0.5 },
  eyeSize: { min: 0.6, max: 1.6, step: 0.01 },
  eyeShape: { min: 0.6, max: 1.8, step: 0.01 },
};

export const SHAPE_LABELS: Record<ShapeKind, { name: string; amount: string; sides?: string }> = {
  blob: { name: 'Blob', amount: 'Wobble' },
  squircle: { name: 'Squircle', amount: 'Squareness' },
  polygon: { name: 'Polygon', amount: 'Bulge', sides: 'Corners' },
  star: { name: 'Star', amount: 'Point depth', sides: 'Points' },
  flower: { name: 'Flower', amount: 'Petal depth', sides: 'Petals' },
  ghost: { name: 'Ghost', amount: 'Tail wave', sides: 'Tail lobes' },
  drop: { name: 'Drop', amount: 'Tip' },
};

const UNIT = 100;
const CENTER: [number, number] = [120, 124];
const DENSE = 360;
const HEX = /^#[0-9a-f]{6}$/i;

export const CUSTOM_PREFIX = 'custom-';

export function newId(): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${CUSTOM_PREFIX}${Date.now().toString(36)}${rand}`;
}

export function isCustomId(id: string): boolean {
  return id.startsWith(CUSTOM_PREFIX);
}

/** A lighter top and deeper bottom in the body's hue family. */
export function autoGradient(body: string): { top: string; bottom: string } {
  return { top: lerpColor(body, '#FFFFFF', 0.45), bottom: lerpColor(body, '#1A1030', 0.32) };
}

function preset(
  name: string,
  shape: ShapeKind,
  body: string,
  extra: Partial<Design> = {},
): Omit<Design, 'id'> {
  return {
    v: 1,
    name,
    shape,
    sides: 5,
    amount: 0.5,
    roundness: 0.45,
    seed: 7,
    width: 1,
    height: 1,
    tilt: 0,
    size: 72,
    thickness: 0.72,
    puff: 2.3,
    body,
    ...autoGradient(body),
    eyeColor: '#1D1A2E',
    eyeX: 0,
    eyeY: -0.12,
    eyeGap: 15,
    eyeSize: 1,
    eyeShape: 1.45,
    ...extra,
  };
}

export const TEMPLATES: Array<Omit<Design, 'id'>> = [
  preset('Puff', 'blob', '#7FD8B4', { amount: 0.55, seed: 42 }),
  preset('Cubo', 'squircle', '#6AA8F7', { amount: 0.55, size: 66, eyeColor: '#0F1B33' }),
  preset('Tri', 'polygon', '#FF8A6B', { sides: 3, amount: 0.25, roundness: 0.6, eyeY: 0.08, size: 76 }),
  preset('Twinkle', 'star', '#FFD25A', { sides: 5, amount: 0.42, roundness: 0.55, eyeY: 0, eyeGap: 12 }),
  preset('Petal', 'flower', '#F59CC5', { sides: 6, amount: 0.38, roundness: 0.35, eyeY: 0, eyeGap: 13 }),
  preset('Boo', 'ghost', '#D9CEF6', { sides: 3, amount: 0.5, eyeY: -0.22, eyeColor: '#2C2358' }),
  preset('Drip', 'drop', '#5CCFE6', { amount: 0.6, height: 1.1, eyeY: 0.12, eyeColor: '#0B2530' }),
];

export function fromTemplate(index: number, name?: string): Design {
  const base = TEMPLATES[index] ?? (TEMPLATES[0] as Omit<Design, 'id'>);
  return { ...base, id: newId(), name: name ?? base.name };
}

function num(value: unknown, key: NumericKey, fallback: number): number {
  const r = RANGES[key];
  const n = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.min(r.max, Math.max(r.min, n));
}

function hex(value: unknown, fallback: string): string {
  return typeof value === 'string' && HEX.test(value) ? value.toUpperCase() : fallback;
}

/** Turns anything parsed from storage or a file into a valid design, or null. */
export function sanitizeDesign(raw: unknown, keepId = true): Design | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const shape = SHAPES.includes(o.shape as ShapeKind) ? (o.shape as ShapeKind) : null;
  if (!shape) return null;
  const base = TEMPLATES[SHAPES.indexOf(shape)] as Omit<Design, 'id'>;
  const id = keepId && typeof o.id === 'string' && isCustomId(o.id) ? o.id : newId();
  const name = typeof o.name === 'string' && o.name.trim() ? o.name.trim().slice(0, 32) : base.name;
  const design = { v: 1, id, name, shape } as Design;
  for (const key of Object.keys(RANGES) as NumericKey[]) {
    design[key] = num(o[key], key, base[key]);
  }
  design.sides = Math.round(design.sides);
  design.body = hex(o.body, base.body);
  design.top = hex(o.top, base.top);
  design.bottom = hex(o.bottom, base.bottom);
  design.eyeColor = hex(o.eyeColor, base.eyeColor);
  return design;
}

function rng(seed: number): () => number {
  let s = (Math.floor(seed) % 2147483647) + 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function radial(fn: (theta: number) => number): Point[] {
  return Array.from({ length: DENSE }, (_, i): Point => {
    const t = (2 * Math.PI * i) / DENSE;
    const r = fn(t);
    return [r * Math.cos(t), r * Math.sin(t)];
  });
}

const UP = -Math.PI / 2;

function cornerRing(n: number, radius: (i: number) => number): Point[] {
  return Array.from({ length: n }, (_, i): Point => {
    const t = UP + (2 * Math.PI * i) / n;
    const r = radius(i);
    return [r * Math.cos(t), r * Math.sin(t)];
  });
}

/** Densifies a polygon so a gentle outward bulge can be applied along each edge. */
function bulged(corners: Point[], bulge: number): Point[] {
  const out: Point[] = [];
  const steps = 24;
  corners.forEach((a, i) => {
    const b = corners[(i + 1) % corners.length] as Point;
    for (let k = 0; k < steps; k++) {
      const u = k / steps;
      const x = a[0] + (b[0] - a[0]) * u;
      const y = a[1] + (b[1] - a[1]) * u;
      const lift = 1 + bulge * Math.sin(Math.PI * u);
      out.push([x * lift, y * lift]);
    }
  });
  return out;
}

function rawShape(d: Design): Point[] {
  const n = d.sides;
  const a = d.amount;
  switch (d.shape) {
    case 'blob': {
      const rand = rng(d.seed);
      const waves = [2, 3, 4, 5].map((k) => ({
        k,
        amp: (0.05 + rand() * 0.07) / (k - 1.2),
        phase: rand() * 6.3,
      }));
      return radial((t) => 1 + a * 2.2 * waves.reduce((s, w) => s + w.amp * Math.cos(w.k * t + w.phase), 0));
    }
    case 'squircle': {
      const p = 2 + a * 6;
      return radial((t) => (Math.abs(Math.cos(t)) ** p + Math.abs(Math.sin(t)) ** p) ** (-1 / p));
    }
    case 'polygon':
      return bulged(
        cornerRing(n, () => 1),
        a * 0.25,
      );
    case 'star': {
      const inner = 1 - (0.15 + a * 0.55);
      return cornerRing(n * 2, (i) => (i % 2 === 0 ? 1 : inner));
    }
    case 'flower':
      return radial((t) => {
        const c = Math.abs(Math.cos((n * (t - UP)) / 2));
        return 1 - a * 0.5 * (1 - c ** 0.7);
      });
    case 'ghost': {
      const pts: Point[] = [];
      const bottom = 1.15;
      const edge = bottom - a * 0.28;
      for (let i = 0; i <= 90; i++) {
        const t = Math.PI + (Math.PI * i) / 90;
        pts.push([Math.cos(t), Math.sin(t)]);
      }
      for (let i = 1; i <= 30; i++) pts.push([1, (edge * i) / 30]);
      const lobes = Math.max(2, Math.min(6, n));
      for (let i = 1; i < 120; i++) {
        const x = 1 - (2 * i) / 120;
        const wave = 0.5 - 0.5 * Math.cos(Math.PI * lobes * (1 - x));
        pts.push([x, bottom + a * 0.28 * (wave - 1)]);
      }
      for (let i = 30; i >= 1; i--) pts.push([-1, (edge * i) / 30]);
      return pts;
    }
    case 'drop': {
      const m = 0.6 + a * 2.4;
      return Array.from({ length: DENSE }, (_, i): Point => {
        const t = (2 * Math.PI * i) / DENSE;
        const x = Math.cos(t);
        const y = Math.sin(t) * Math.abs(Math.sin(t / 2)) ** m;
        return [y, -x];
      });
    }
  }
}

function areaCentroid(ring: Ring): Point {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x0, y0] = ring[i] as Point;
    const [x1, y1] = ring[(i + 1) % ring.length] as Point;
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  if (Math.abs(area) < 1e-9) return [0, 0];
  return [cx / (3 * area), cy / (3 * area)];
}

/** The body outline in engine units (radius UNIT), centred on its area centroid. */
export function outlineOf(d: Design): Ring {
  const tilt = (d.tilt * Math.PI) / 180;
  const cos = Math.cos(tilt);
  const sin = Math.sin(tilt);
  const shaped = rawShape(d).map(([x, y]): Point => {
    const sx = x * d.width;
    const sy = y * d.height;
    return [(sx * cos - sy * sin) * UNIT, (sx * sin + sy * cos) * UNIT];
  });
  const sigma = 1.5 + d.roundness * 22;
  const smooth = smoothContour(shaped, sigma);
  const [mx, my] = areaCentroid(smooth);
  const centred = smooth.map(([x, y]): Point => [x - mx, y - my]);
  const far = Math.max(...centred.map(([x, y]) => Math.hypot(x, y)));
  const k = far > 0 ? UNIT / far : 1;
  return centred.map(([x, y]): Point => [x * k, y * k]);
}

export function outlinePath(d: Design, view = 100): string {
  const ring = outlineOf(d);
  const k = (view * 0.42) / UNIT;
  const c = view / 2;
  return `${ring
    .filter((_, i) => i % 3 === 0)
    .map(([x, y], i) => `${i ? 'L' : 'M'}${(c + x * k).toFixed(1)} ${(c + y * k).toFixed(1)}`)
    .join('')}Z`;
}

function statesFor(body: string) {
  return {
    dim: lerpColor(body, '#000000', 0.14),
    soft: lerpColor(body, '#FFFFFF', 0.22),
    blush: lerpColor(body, '#F48FB1', 0.5),
    angry: lerpColor(body, '#E5484D', 0.55),
    alert: lerpColor(body, '#D92D3A', 0.7),
    off: lerpColor(body, '#9A9AA3', 0.72),
  };
}

/** Compiles a design into a Mood Mates character that gets every built-in emotion. */
export function compileDesign(d: Design): CharacterRaw {
  const spec = rimSpec({
    // The solid renderer reads the rim with y pointing up, so mirror the screen-space outline.
    ring: outlineOf(d).map(([x, y]): Point => [x, -y]),
    unit: UNIT,
    depth: d.thickness,
    puff: d.puff,
    sigma: 34,
    edge: 6,
    tint: { top: [d.top, 0.85], bottom: [d.bottom, 0.85] },
    scale: d.size,
    center: CENTER,
  });
  const rx = 8.5 * d.eyeSize;
  const ry = rx * d.eyeShape;
  const rings = rimEyes({
    anchor: [CENTER[0] + d.eyeX * d.size, CENTER[1] + d.eyeY * d.size],
    half: d.eyeGap,
    rx,
    ry,
    scale: 0.55 * d.eyeSize,
    spread: Math.max(0.3, Math.min(0.85, d.eyeGap / 24)),
    reach: 0.1,
    aspect: 0.58,
    minHeight: ry * 2.2,
    maxGrow: 1.3,
  });
  return rimCharacter({
    id: d.id,
    name: d.name,
    desc: `A custom ${SHAPE_LABELS[d.shape].name.toLowerCase()} mascot designed in Mascot Studio`,
    spec,
    palette: palette(d.body, d.eyeColor, statesFor(d.body), lerpColor(d.body, '#FFFFFF', 0.3)),
    rings,
  });
}
