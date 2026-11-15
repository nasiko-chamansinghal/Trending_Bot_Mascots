import type { EyePair, Point, Ring } from '../../geometry';
import type { ShadeSpec } from '../../solid/spec';
import { normalizeRing } from '../grok-rings';
import { palette, rimCharacter, rimEyes, rimSpec } from '../rim';
import { perk } from './clips';
import { INKY_RADII } from './radii';

const UNIT = 100;
const SCALE = 100;
const CENTER: [number, number] = [121.8, 128];
const ORIGIN = { x: 655.959, y: 697.094, reach: 546.24 };
const FIT = SCALE / ORIGIN.reach;
const CROP = 2.5;
const EYE_POINTS = 96;
const EYES = [
  { x: 171.6, y: 285.6, major: 54.5, minor: 26.1, angle: 85 },
  { x: 280.1, y: 283.5, major: 62.2, minor: 29.8, angle: -80 },
];

function view(x: number, y: number): Point {
  return [CENTER[0] + (x - ORIGIN.x) * FIT, CENTER[1] + (y - ORIGIN.y) * FIT];
}

function bodyRing(): Ring {
  const n = INKY_RADII.length;
  return Array.from({ length: n }, (_, i): Point => {
    const r = INKY_RADII[(n - i) % n] as number;
    const a = (2 * Math.PI * (i + 0.37)) / n;
    return [Math.cos(a) * r * UNIT, Math.sin(a) * r * UNIT];
  });
}

function oval(eye: (typeof EYES)[number]): Ring {
  const [cx, cy] = view(eye.x * CROP, eye.y * CROP);
  const a = eye.major * CROP * FIT;
  const b = eye.minor * CROP * FIT;
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
  depth: 0.7,
  puff: 2,
  sigma: 6,
  edge: 0,
  tint: { top: ['#000001', 0.5], bottom: ['#000001', 0.5] },
  scale: SCALE,
  center: CENTER,
});

const SHADES: ShadeSpec[] = [
  {
    color: '#3E2360',
    tone: 'deep',
    from: [0, 0],
    to: [0, 1],
    stops: [
      [0.79, 0],
      [0.815, 0.1],
      [0.838, 0.17],
      [0.861, 0.33],
      [0.884, 0.5],
      [0.907, 0.65],
      [0.93, 0.77],
      [0.954, 1],
      [1, 1],
    ],
  },
  {
    color: '#6E6A78',
    tone: 'light',
    from: [0, 0],
    to: [1, 0],
    stops: [
      [0, 0.45],
      [1, 0.45],
    ],
    rim: { width: 2 * 13 * FIT, blur: 5 * FIT },
  },
  {
    color: '#85808F',
    tone: 'light',
    from: [0, 0],
    to: [1, 0],
    stops: [
      [0, 1],
      [0.16, 1],
      [0.22, 0.55],
      [0.3, 0.12],
      [0.5, 0.05],
      [0.6, 0],
    ],
    rim: { width: 2 * 22 * FIT, blur: 8 * FIT },
  },
  {
    color: '#85808F',
    tone: 'light',
    from: [0.72, 0],
    to: [0.96, 0],
    stops: [
      [0, 0],
      [0.2, 0.5],
      [0.55, 0.6],
      [0.75, 0.15],
      [1, 0],
    ],
    rim: { width: 2 * 18 * FIT, blur: 6 * FIT },
  },
  {
    color: '#85808F',
    tone: 'light',
    from: [0.25, 0.55],
    to: [0, 0.8],
    stops: [
      [0, 0],
      [1, 0.8],
    ],
    rim: { width: 2 * 38 * FIT, blur: 11 * FIT },
  },
  {
    color: '#3E2360',
    tone: 'deep',
    from: [0.4, 0.1],
    to: [1, 0.75],
    stops: [
      [0, 0],
      [0.3, 0.3],
      [0.8, 0.75],
      [1, 1],
    ],
    rim: { width: 2 * 44 * FIT, blur: 26 * FIT },
  },
  {
    color: '#3E2360',
    tone: 'deep',
    from: [0, 0],
    to: [0, 1],
    stops: [
      [0.7, 0],
      [0.86, 1],
      [1, 1],
    ],
    rim: { width: 2 * 50 * FIT, blur: 20 * FIT },
  },
];

const [LEFT, RIGHT] = EYES.map((eye) => view(eye.x * CROP, eye.y * CROP)) as [Point, Point];

const GROK = rimEyes({
  anchor: [(LEFT[0] + RIGHT[0]) / 2, (LEFT[1] + RIGHT[1]) / 2],
  half: (RIGHT[0] - LEFT[0]) / 2,
  rx: 12.8,
  ry: 26.8,
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

export const inky = rimCharacter({
  id: 'inky',
  name: 'Inky',
  desc: 'A glossy ink-black cat head with two pointed ears, a soft purple glow at the bottom and two tall tilted white eyes, built as a solid that turns in 3D',
  spec: { ...BODY, shades: SHADES },
  palette: palette(
    '#000001',
    '#FEFCFF',
    { dim: '#000001', soft: '#0E0A18', blush: '#2E1233', angry: '#2D0808', alert: '#1B1236', off: '#3A3642' },
    '#9C82E6',
  ),
  rings: FACE,
  fear: [1.1, 1.1],
  clips: { perk },
});
