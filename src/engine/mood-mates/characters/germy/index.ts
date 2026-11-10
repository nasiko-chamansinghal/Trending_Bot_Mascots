import type { EyePair, Point, Ring } from '../../geometry';
import type { SolidSpec } from '../../solid/spec';
import { centroid } from '../../util';
import { palette, rimCharacter, rimEyes, rimSpec } from '../rim';
import { GERM_RADII, PLATE_RADII } from './radii';

const UNIT = 100;
const SCALE = 96;
const CENTER: [number, number] = [112.3, 122.8];
const ORIGIN = { x: 107.932, y: 124.272, reach: 107.889 };
const FIT = SCALE / ORIGIN.reach;
const EYES = { x: 112.1, y: 102.45, half: 32.4, radius: 12.5, tilt: (-10.04 * Math.PI) / 180 };
const RING_SPOT = { x: 92.5, y: 159.5, outer: 13.7, inner: 9.2 };
const DOT_SPOT = { x: 159.5, y: 145, radius: 5.6 };
const MID_SPOT = { x: 126, y: 188, outer: 9.65, inner: 6.5 };
const SPOT_STEPS = 72;
const ROUNDNESS = 0.8;

function view(x: number, y: number): Point {
  return [CENTER[0] + (x - ORIGIN.x) * FIT, CENTER[1] + (y - ORIGIN.y) * FIT];
}

function bodyRing(): Ring {
  const n = GERM_RADII.length;
  return GERM_RADII.map((r, i): Point => {
    const a = (2 * Math.PI * (i + 0.37)) / n;
    return [Math.cos(a) * r * UNIT, Math.sin(a) * r * UNIT];
  });
}

function disc(x: number, y: number, radius: number, clockwise: boolean): Ring {
  const [cx, cy] = view(x, y);
  const r = radius * FIT;
  return Array.from({ length: SPOT_STEPS }, (_, i): Point => {
    const t = ((clockwise ? i : -i) * 2 * Math.PI) / SPOT_STEPS;
    return [cx + Math.cos(t) * r, cy + Math.sin(t) * r];
  });
}

function punch(ring: Ring, hole: Ring): Ring {
  let at = 0;
  let from = 0;
  let best = Number.POSITIVE_INFINITY;
  ring.forEach((p, i) => {
    hole.forEach((q, j) => {
      const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
      if (d < best) {
        best = d;
        at = i;
        from = j;
      }
    });
  });
  const loop = [...hole.slice(from), ...hole.slice(0, from), hole[from] as Point];
  return [...ring.slice(0, at + 1), ...loop, ring[at] as Point, ...ring.slice(at + 1)];
}

function hollow(ring: Ring, spot: { x: number; y: number; outer: number; inner: number }): Ring {
  const rimmed = punch(ring, disc(spot.x, spot.y, spot.outer, true));
  return punch(rimmed, disc(spot.x, spot.y, spot.inner, false));
}

function plateRing(): Ring {
  const n = PLATE_RADII.length;
  const outline = PLATE_RADII.map((r, i): Point => {
    const a = (2 * Math.PI * i) / n;
    return view(ORIGIN.x + Math.cos(a) * r * ORIGIN.reach, ORIGIN.y - Math.sin(a) * r * ORIGIN.reach);
  });
  const withRing = hollow(outline, RING_SPOT);
  const withMiddle = hollow(withRing, MID_SPOT);
  return punch(withMiddle, disc(DOT_SPOT.x, DOT_SPOT.y, DOT_SPOT.radius, true));
}

function roundOff(ring: Ring): Ring {
  const n = ring.length;
  const [cx, cy] = centroid(ring);
  let area = 0;
  for (let i = 0; i < n; i++) {
    const a = ring[i] as Point;
    const b = ring[(i + 1) % n] as Point;
    area += a[0] * b[1] - b[0] * a[1];
  }
  const r = Math.sqrt(Math.abs(area) / 2 / Math.PI);
  return ring.map(([x, y], i): Point => {
    const t = (2 * Math.PI * i) / n;
    return [x + (cx + Math.sin(t) * r - x) * ROUNDNESS, y + (cy - Math.cos(t) * r - y) * ROUNDNESS];
  });
}

function tilted(pair: EyePair, pivot: Point): EyePair {
  const cos = Math.cos(EYES.tilt);
  const sin = Math.sin(EYES.tilt);
  return pair.map((ring) =>
    ring.map(([x, y]): Point => {
      const dx = x - pivot[0];
      const dy = y - pivot[1];
      return [pivot[0] + dx * cos - dy * sin, pivot[1] + dx * sin + dy * cos];
    }),
  ) as EyePair;
}

const BODY = rimSpec({
  ring: bodyRing(),
  unit: UNIT,
  depth: 0.7,
  puff: 1.8,
  sigma: 12,
  edge: 0,
  tint: { top: ['#6FB594', 0.22], bottom: ['#2C6A50', 0.3] },
  scale: SCALE,
  center: CENTER,
});

const SPEC: SolidSpec = {
  ...BODY,
  body: { ...BODY.body, ribs: 12 },
  plate: {
    ring: plateRing(),
    top: '#B3DABB',
    bottom: '#9CCBA7',
    inverse: { top: '#2F6B55', bottom: '#245844' },
  },
};

const ANCHOR = view(EYES.x, EYES.y);

const GROK = rimEyes({
  anchor: ANCHOR,
  half: EYES.half * FIT,
  rx: EYES.radius * FIT,
  ry: EYES.radius * FIT,
  scale: 0.5,
  spread: 0.62,
  reach: 0.1,
  aspect: 0.6,
  minHeight: 22,
  maxGrow: 1.25,
});

const FACE = Object.fromEntries(
  Object.entries(GROK).map(([slot, pair]) => [
    slot,
    tilted(slot === 'calm' ? pair : (pair.map(roundOff) as EyePair), ANCHOR),
  ]),
);

export const germy = rimCharacter({
  id: 'germy',
  name: 'Germy',
  desc: 'A round green germ with a fuzzy ring of tiny spikes, a few dark spots and two big round eyes, built as a solid that turns in 3D',
  spec: SPEC,
  palette: palette(
    '#488B6D',
    '#3A2A12',
    { dim: '#3C7860', soft: '#5BA088', blush: '#6FA58A', angry: '#5E7A3C', alert: '#4FA38A', off: '#6B7F75' },
    '#A8D3B0',
  ),
  rings: FACE,
});
