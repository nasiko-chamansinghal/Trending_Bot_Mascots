import type { EyePair, Point, Ring } from '../../geometry';
import { normalizeRing } from '../grok-rings';
import { palette, rimCharacter, rimEyes, rimSpec } from '../rim';
import { DEWY_RADII } from './radii';

const UNIT = 100;
const SCALE = 108;
const CENTER: [number, number] = [120, 130];
const ORIGIN = { x: 142.386, y: 164.484, reach: 128.661 };
const FIT = SCALE / ORIGIN.reach;
const EYE_POINTS = 96;
const VERTEX_SKEW = 0.37;
const EYE_SIZE = { major: 33.48, minor: 19.74 };
const EYES = [
  { ...EYE_SIZE, x: 113.69, y: 182.66, angle: 88.3 },
  { ...EYE_SIZE, x: 169.3, y: 182.66, angle: 91.7 },
];

function view(x: number, y: number): Point {
  return [CENTER[0] + (x - ORIGIN.x) * FIT, CENTER[1] + (y - ORIGIN.y) * FIT];
}

function radiusAt(u: number): number {
  const n = DEWY_RADII.length;
  const k = Math.floor(u);
  const lo = DEWY_RADII[((k % n) + n) % n] as number;
  const hi = DEWY_RADII[(((k + 1) % n) + n) % n] as number;
  return lo + (hi - lo) * (u - k);
}

function bodyRing(): Ring {
  const n = DEWY_RADII.length;
  return Array.from({ length: n }, (_, i): Point => {
    const r = radiusAt(n - i - VERTEX_SKEW);
    const a = (2 * Math.PI * (i + VERTEX_SKEW)) / n;
    return [Math.cos(a) * r * UNIT, Math.sin(a) * r * UNIT];
  });
}

function oval(eye: (typeof EYES)[number]): Ring {
  const [cx, cy] = view(eye.x, eye.y);
  const a = eye.major * FIT;
  const b = eye.minor * FIT;
  const phi = (eye.angle * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  return Array.from({ length: EYE_POINTS }, (_, i): Point => {
    const t = (2 * Math.PI * i) / EYE_POINTS;
    const x = a * Math.cos(t);
    const y = b * Math.sin(t);
    return [cx + x * cos - y * sin, cy + x * sin + y * cos];
  });
}

const BODY = rimSpec({
  ring: bodyRing(),
  unit: UNIT,
  depth: 0.8,
  puff: 2,
  sigma: 8,
  edge: 0,
  tint: { top: ['#FFFFFF', 0.25], bottom: ['#3E7EF8', 0.3] },
  scale: SCALE,
  center: CENTER,
});

const [LEFT, RIGHT] = EYES.map((eye) => view(eye.x, eye.y)) as [Point, Point];

const GROK = rimEyes({
  anchor: [(LEFT[0] + RIGHT[0]) / 2, (LEFT[1] + RIGHT[1]) / 2],
  half: (RIGHT[0] - LEFT[0]) / 2,
  rx: EYE_SIZE.minor * FIT,
  ry: EYE_SIZE.major * FIT,
  scale: 0.5,
  spread: 0.62,
  reach: 0.1,
  aspect: 0.6,
  minHeight: 30,
  maxGrow: 1.25,
});

const FACE: Record<string, EyePair> = {
  ...GROK,
  calm: EYES.map((eye) => normalizeRing(oval(eye), 192, false)) as EyePair,
};

export const dewy = rimCharacter({
  id: 'dewy',
  name: 'Dewy',
  desc: 'A soft blue water drop with a curled tip and two tall white eyes, built as a solid that turns in 3D',
  spec: BODY,
  palette: palette(
    '#83B2F9',
    '#FFFFFF',
    { dim: '#6E9AE6', soft: '#A2C6FB', blush: '#C3A9F7', angry: '#F2909E', alert: '#7FD0F7', off: '#9AA9C4' },
    '#BFD6FB',
  ),
  rings: FACE,
  fear: [1.1, 1.1],
});
