import type { EyePair, Point } from '../../geometry';
import type { SolidSpec } from '../../solid/spec';
import { normalizeRing } from '../grok-rings';
import { palette, rimCharacter, rimEyes, rimSpec } from '../rim';
import { seatEyes } from '../seat';
import { tiltEyes } from '../tilt';
import { type TraceFrame, tracedBodyRing, tracedPolygon, traceFit, traceView } from '../traced';
import { GOOGLY_RADII } from './radii';

const UNIT = 100;
const DISC_POINTS = 96;
const PLATE_POINTS = 180;
const FRAME: TraceFrame = { origin: [206.8, 206], reach: 163.2, center: [120, 130], scale: 112 };
const FIT = traceFit(FRAME);
const view = traceView(FRAME);

const WHITES: Array<[number, number, number]> = [
  [185.8, 178.8, 51.3],
  [266.1, 162.6, 51.4],
];
const PUPILS: Array<[number, number, number]> = [
  [188.8, 182, 25],
  [269.4, 165.5, 25],
];
const MARGIN = 2;
const HOLD = 0.4;

const MID: Point = [(WHITES[0][0] + WHITES[1][0]) / 2, (WHITES[0][1] + WHITES[1][1]) / 2];
const TILT = Math.atan2(WHITES[1][1] - WHITES[0][1], WHITES[1][0] - WHITES[0][0]);

function disc([x, y, r]: [number, number, number]): number[] {
  return Array.from({ length: DISC_POINTS }, (_, i) => {
    const t = (2 * Math.PI * i) / DISC_POINTS;
    return [x + r * Math.cos(t), y + r * Math.sin(t)];
  }).flat();
}

function exit([px, py]: Point, angle: number, [cx, cy, r]: [number, number, number]): number {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const b = (px - cx) * dx + (py - cy) * dy;
  const c = (px - cx) ** 2 + (py - cy) ** 2 - r * r;
  return -b + Math.sqrt(b * b - c);
}

function plate(): number[] {
  return Array.from({ length: PLATE_POINTS }, (_, i) => {
    const a = (2 * Math.PI * i) / PLATE_POINTS;
    const r = Math.max(...WHITES.map((white) => exit(MID, a, white)));
    return [MID[0] + r * Math.cos(a), MID[1] + r * Math.sin(a)];
  }).flat();
}

const SPEC: SolidSpec = {
  ...rimSpec({
    ring: tracedBodyRing(GOOGLY_RADII, UNIT),
    unit: UNIT,
    depth: 0.8,
    puff: 2,
    sigma: 3,
    edge: 0,
    tint: { top: ['#FFD468', 0.55], bottom: ['#F4560A', 0.5] },
    scale: FRAME.scale,
    center: FRAME.center,
  }),
  plate: {
    ring: tracedPolygon(plate(), FRAME),
    top: '#FFFFFF',
    bottom: '#EFE8DE',
    follow: { anchor: view(MID[0], MID[1]), gain: 1, lean: 0.3, limit: [0.26, 0.19, 0.28] },
  },
};

const [LEFT, RIGHT] = WHITES.map(([x, y]) => view(x, y)) as [Point, Point];
const radius = (r: number) => r * FIT;

const GROK = rimEyes({
  anchor: view(MID[0], MID[1]),
  half: (RIGHT[0] - LEFT[0]) / 2,
  rx: radius(PUPILS[0][2]),
  ry: radius(PUPILS[0][2]),
  scale: 0.6,
  spread: 0.62,
  reach: 0.1,
  aspect: 0.6,
  minHeight: 24,
  maxGrow: 1.25,
});

const SEATED = seatEyes(
  tiltEyes(GROK, view(MID[0], MID[1]), TILT),
  [
    { centre: LEFT, radius: radius(WHITES[0][2]) },
    { centre: RIGHT, radius: radius(WHITES[1][2]) },
  ],
  { margin: MARGIN, hold: HOLD },
);

const FACE: Record<string, EyePair> = {
  ...SEATED,
  calm: PUPILS.map((pupil) => normalizeRing(tracedPolygon(disc(pupil), FRAME), 192, false)) as EyePair,
};

export const googly = rimCharacter({
  id: 'googly',
  name: 'Googly',
  desc: 'A round orange blob with a little curl on its crown and two big googly eyes, built as a solid that turns in 3D',
  spec: SPEC,
  palette: palette(
    '#FF9A1F',
    '#3A150E',
    { dim: '#E57F12', soft: '#FFC15A', blush: '#FF8A5C', angry: '#E8421A', alert: '#FFD23F', off: '#B79A80' },
    '#FFB866',
  ),
  rings: FACE,
  fear: [1.1, 1.1],
});
