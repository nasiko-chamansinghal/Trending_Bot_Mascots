import type { EyePair, Point } from '../../geometry';
import type { DecalSpec, SolidSpec } from '../../solid/spec';
import { palette, rimCharacter, rimEyes, rimSpec } from '../rim';
import { seatEyes } from '../seat';
import { type TraceFrame, tracedBodyRing, tracedPolygon, traceFit, traceView } from '../traced';

const UNIT = 100;
const RADII_POINTS = 360;
const PATCH_POINTS = 180;
const CHEEK_POINTS = 48;
const BODY = { a: 175, b: 160.4 };
const FRAME: TraceFrame = { origin: [209.5, 179.9], reach: BODY.a, center: [120, 118], scale: 101.5 };
const FIT = traceFit(FRAME);
const view = traceView(FRAME);
const LOBE = { x: 209.4, y: 168.2, gap: 50.8, radius: 65.5 };
const CHEEK = { rx: 35.8, ry: 31, y: 206.4 };
const CHEEKS = [
  { x: 91, angle: 11.1 },
  { x: 328, angle: -11.1 },
];
const SPREAD = 1.13;
const MARGIN = 3;
const HOLD = 0.4;

const RADII = Array.from({ length: RADII_POINTS }, (_, i) => {
  const a = (2 * Math.PI * i) / RADII_POINTS;
  return 1 / Math.hypot(Math.cos(a) / BODY.a, Math.sin(a) / BODY.b) / BODY.a;
});

function patch(): number[] {
  return Array.from({ length: PATCH_POINTS }, (_, i) => {
    const a = (2 * Math.PI * i) / PATCH_POINTS;
    const r = LOBE.gap * Math.abs(Math.cos(a)) + Math.sqrt(LOBE.radius ** 2 - (LOBE.gap * Math.sin(a)) ** 2);
    return [LOBE.x + r * Math.cos(a), LOBE.y + r * Math.sin(a)];
  }).flat();
}

function cheek(x: number, angle: number): number[] {
  const phi = (angle * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  return Array.from({ length: CHEEK_POINTS }, (_, i) => {
    const t = (2 * Math.PI * i) / CHEEK_POINTS;
    const u = CHEEK.rx * Math.cos(t);
    const v = CHEEK.ry * Math.sin(t);
    return [x + u * cos - v * sin, CHEEK.y + u * sin + v * cos];
  }).flat();
}

const DECALS: DecalSpec[] = CHEEKS.map((c) => ({
  ring: tracedPolygon(cheek(c.x, c.angle), FRAME),
  fill: '#F59A98',
  front: true,
  follow: true,
}));

const SPEC: SolidSpec = {
  ...rimSpec({
    ring: tracedBodyRing(RADII, UNIT),
    unit: UNIT,
    depth: 0.8,
    puff: 2,
    sigma: 6,
    edge: 0,
    tint: { top: ['#FF8A70', 0.1], bottom: ['#B3121C', 0.12] },
    scale: FRAME.scale,
    center: FRAME.center,
  }),
  shades: [
    {
      color: '#B3121C',
      tone: 'deep',
      from: [0, 0],
      to: [0, 1],
      stops: [
        [0, 0],
        [0.52, 0],
        [1, 0.5],
      ],
    },
  ],
  plate: {
    ring: tracedPolygon(patch(), FRAME),
    top: '#F6F2E8',
    bottom: '#E3DED5',
    follow: { anchor: view(LOBE.x, LOBE.y), gain: 1, lean: 0.3, limit: [0.26, 0.19, 0.28] },
  },
  decals: DECALS,
};

const [LEFT, RIGHT] = [-1, 1].map((side) => view(LOBE.x + side * LOBE.gap, LOBE.y)) as [Point, Point];

const GROK = rimEyes({
  anchor: view(LOBE.x, LOBE.y),
  half: LOBE.gap * FIT,
  rx: 7.5,
  ry: 11,
  scale: 0.5,
  spread: SPREAD,
  reach: 0.1,
  aspect: 0.6,
  minHeight: 26,
  maxGrow: 1.25,
});

const lobe = (centre: Point) => ({ centre, radius: LOBE.radius * FIT });

const FACE: Record<string, EyePair> = seatEyes(GROK, [lobe(LEFT), lobe(RIGHT)], {
  margin: MARGIN,
  hold: HOLD,
});

export const cheeky = rimCharacter({
  id: 'cheeky',
  name: 'Cheeky',
  desc: 'A round red body with a wide white face patch, pink cheeks and two black eyes that stay in the patch, built as a solid that turns in 3D',
  spec: SPEC,
  palette: palette(
    '#EE3B32',
    '#151213',
    { dim: '#C9302A', soft: '#FF6F62', blush: '#FF8A80', angry: '#C4141E', alert: '#FF8A3A', off: '#B08A86' },
    '#F09A8C',
  ),
  rings: FACE,
  fear: [1.1, 1.1],
});
