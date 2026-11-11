import type { EyePair, Point, Ring } from '../../geometry';
import type { SolidSpec } from '../../solid/spec';
import { palette, rimCharacter, rimEyes, rimSpec, smoothContour } from '../rim';

type Inside = (x: number, y: number) => boolean;

const UNIT = 100;
const SCALE = 100;
const ORIGIN: Point = [120, 138];
const TOPPER_ORIGIN: Point = [122, 67];
const TOPPER_SMOOTH = 4;
const NECK = { x: 122, top: 66, bottom: 90, narrow: 9, wide: 32 };
const TOPPER_SWAY = 10;
const HULL_POINTS = 1440;
const HULL_OFFSET = 0.37;
const MARCH_STEP = 0.5;
const MARCH_REACH = 200;
const BISECT_STEPS = 8;
const SPOT_STEPS = 72;
const HEAD = { x: 120, y: 142, rx: 78, ry: 64 };
const EARS: Point[] = [
  [46, 124],
  [194, 124],
];
const EAR = { radius: 25, inner: 11 };
const BANANA = {
  from: [92, 55] as Point,
  bend: [122, 80] as Point,
  to: [152, 55] as Point,
  ends: 6.4,
  belly: 4,
  steps: 32,
};
const FACE = { x: 120, y: 142, rx: 66, ry: 46, notch: 0.12, notchWidth: 0.3, points: 240 };
const EYES = { half: 26, y: 138, rx: 13, ry: 16 };

function inCircle(x: number, y: number, cx: number, cy: number, r: number): boolean {
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function bananaSpine(t: number): Point {
  const u = 1 - t;
  return [
    u * u * BANANA.from[0] + 2 * u * t * BANANA.bend[0] + t * t * BANANA.to[0],
    u * u * BANANA.from[1] + 2 * u * t * BANANA.bend[1] + t * t * BANANA.to[1],
  ];
}

const BANANA_BEADS = Array.from({ length: BANANA.steps + 1 }, (_, i) => {
  const t = i / BANANA.steps;
  const [x, y] = bananaSpine(t);
  return { x, y, r: BANANA.ends + BANANA.belly * Math.sin(Math.PI * t) };
});

const insideBody: Inside = (x, y) =>
  ((x - HEAD.x) / HEAD.rx) ** 2 + ((y - HEAD.y) / HEAD.ry) ** 2 <= 1 ||
  EARS.some(([cx, cy]) => inCircle(x, y, cx, cy, EAR.radius));

function inNeck(x: number, y: number): boolean {
  if (y < NECK.top || y > NECK.bottom) return false;
  const half = NECK.narrow + ((y - NECK.top) / (NECK.bottom - NECK.top)) * (NECK.wide - NECK.narrow);
  return Math.abs(x - NECK.x) <= half;
}

const insideTopper: Inside = (x, y) =>
  inNeck(x, y) || BANANA_BEADS.some((b) => inCircle(x, y, b.x, b.y, b.r));

function topperRing(): Ring {
  return smoothContour(hull(insideTopper, TOPPER_ORIGIN), TOPPER_SMOOTH);
}

function faceRing(): Ring {
  return Array.from({ length: FACE.points }, (_, i): Point => {
    const a = (2 * Math.PI * i) / FACE.points;
    const up = Math.atan2(Math.sin(a + Math.PI / 2), Math.cos(a + Math.PI / 2));
    const k = 1 - FACE.notch * Math.exp(-((up / FACE.notchWidth) ** 2));
    return [FACE.x + Math.cos(a) * FACE.rx * k, FACE.y + Math.sin(a) * FACE.ry * k];
  });
}

function hull(inside: Inside, origin: Point): Point[] {
  return Array.from({ length: HULL_POINTS }, (_, i): Point => {
    const a = (2 * Math.PI * (i + HULL_OFFSET)) / HULL_POINTS;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    let last = 0;
    for (let t = MARCH_STEP; t < MARCH_REACH; t += MARCH_STEP) {
      if (inside(origin[0] + dx * t, origin[1] + dy * t)) last = t;
    }
    let lo = last;
    let hi = last + MARCH_STEP;
    for (let s = 0; s < BISECT_STEPS; s++) {
      const mid = (lo + hi) / 2;
      if (inside(origin[0] + dx * mid, origin[1] + dy * mid)) lo = mid;
      else hi = mid;
    }
    return [origin[0] + dx * lo, origin[1] + dy * lo];
  });
}

function bodyRing(): Ring {
  return hull(insideBody, ORIGIN).map(([x, y]): Point => [x - ORIGIN[0], -(y - ORIGIN[1])]);
}

function disc(centre: Point, radius: number, clockwise: boolean): Ring {
  return Array.from({ length: SPOT_STEPS }, (_, i): Point => {
    const t = ((clockwise ? i : -i) * 2 * Math.PI) / SPOT_STEPS;
    return [centre[0] + Math.cos(t) * radius, centre[1] + Math.sin(t) * radius];
  });
}

const BODY = rimSpec({
  ring: bodyRing(),
  unit: UNIT,
  depth: 0.9,
  puff: 2.4,
  sigma: 8,
  edge: 1.5,
  tint: { top: ['#FF7A62', 0.45], bottom: ['#9E1408', 0.5] },
  scale: SCALE,
  center: ORIGIN,
});

const SPEC: SolidSpec = {
  ...BODY,
  body: { ...BODY.body, ribs: 12 },
  topper: { ring: topperRing(), sway: TOPPER_SWAY },
  plate: {
    ring: faceRing(),
    top: '#FFFFFF',
    bottom: '#E8DCD7',
    marks: EARS.map((c) => ({ ring: disc(c, EAR.inner, true), fill: '#F6EFEC' })),
  },
};

const GROK = rimEyes({
  anchor: [120, EYES.y],
  half: EYES.half,
  rx: EYES.rx,
  ry: EYES.ry,
  scale: 0.55,
  spread: 0.6,
  reach: 0.1,
  aspect: 0.6,
  minHeight: 22,
  maxGrow: 1.2,
});

export const mokey = rimCharacter({
  id: 'mokey',
  name: 'Mokey',
  desc: 'A red monkey head with a banana-shaped tuft, round ears with white centres, a white face and two big dark eyes, built as a solid that turns in 3D',
  spec: SPEC,
  palette: palette(
    '#F2301F',
    '#5B1410',
    { dim: '#D9291A', soft: '#F5503E', blush: '#F7685A', angry: '#C41A0C', alert: '#F7442F', off: '#8C5F59' },
    '#F8A99F',
  ),
  rings: GROK as Record<string, EyePair>,
  fear: [1.1, 1.3],
});
