import type { EyePair, Point } from '../../geometry';
import type { SolidSpec } from '../../solid/spec';
import { normalizeRing } from '../grok-rings';
import { palette, rimCharacter, rimEyes, rimSpec } from '../rim';
import { seatEyes } from '../seat';
import { type TraceFrame, tracedBodyRing, tracedPolygon, traceFit, traceView } from '../traced';
import { PATCH_ORIGIN, PATCH_RADII } from './patch';
import { NIMBO_RADII } from './radii';

const UNIT = 100;
const OVAL_POINTS = 96;
const FRAME: TraceFrame = { origin: [354.71, 334.02], reach: 315.24, center: [120, 136], scale: 108 };
const FIT = traceFit(FRAME);
const view = traceView(FRAME);

const EYES: Array<[number, number, number, number]> = [
  [303.1, 356.75, 12.8, 27.75],
  [409.9, 356.75, 12.8, 27.75],
];
const LOBE_RADIUS = 62;
const BALL_RADIUS = 54;
const MARGIN = 2;
const HOLD = 0.4;

const up = ([x, y]: Point): [number, number, number] => [
  (x - FRAME.origin[0]) / FRAME.reach,
  (FRAME.origin[1] - y) / FRAME.reach,
  0,
];

const STEM_BASE: Point = [252, 134];
const STEM_TIP: Point = [187, 60];
const STEM_MID = (t: number): Point => [
  STEM_BASE[0] + (STEM_TIP[0] - STEM_BASE[0]) * t,
  STEM_BASE[1] + (STEM_TIP[1] - STEM_BASE[1]) * t,
];

function oval([x, y, rx, ry]: [number, number, number, number]): number[] {
  return Array.from({ length: OVAL_POINTS }, (_, i) => {
    const t = (2 * Math.PI * i) / OVAL_POINTS;
    return [x + rx * Math.cos(t), y + ry * Math.sin(t)];
  }).flat();
}

function patch(): number[] {
  return PATCH_RADII.flatMap((r, i) => {
    const t = (2 * Math.PI * i) / PATCH_RADII.length;
    return [PATCH_ORIGIN[0] + r * Math.cos(t), PATCH_ORIGIN[1] + r * Math.sin(t)];
  });
}

const BODY = rimSpec({
  ring: tracedBodyRing(NIMBO_RADII, UNIT),
  unit: UNIT,
  depth: 0.8,
  puff: 2.4,
  sigma: 3,
  edge: 0,
  tint: { top: ['#9ADBFF', 0.4], bottom: ['#2C6FCB', 0.3] },
  scale: FRAME.scale,
  center: FRAME.center,
});

const SPEC: SolidSpec = {
  ...BODY,
  stem: {
    base: up(STEM_BASE),
    c1: up(STEM_MID(0.33)),
    c2: up(STEM_MID(0.66)),
    tip: up(STEM_TIP),
    radius: [
      [0, 0.024, 0.024],
      [1, 0.018, 0.018],
    ],
  },
  stemShading: {
    edge: '#60B2F3',
    light: '#60B2F3',
    ball: { radius: BALL_RADIUS / FRAME.reach, light: '#FFE49A', dark: '#F2A339' },
  },
  plate: {
    ring: tracedPolygon(patch(), FRAME),
    top: '#F7F5F1',
    bottom: '#DCD8D0',
    follow: { anchor: view(PATCH_ORIGIN[0], PATCH_ORIGIN[1]), gain: 1, lean: 0.3, limit: [0.26, 0.19, 0.28] },
  },
  stemColor: '#60B2F3',
  capColor: '#60B2F3',
};

const [LEFT, RIGHT] = EYES.map(([x, y]) => view(x, y)) as [Point, Point];

const GROK = rimEyes({
  anchor: [(LEFT[0] + RIGHT[0]) / 2, (LEFT[1] + RIGHT[1]) / 2],
  half: (RIGHT[0] - LEFT[0]) / 2,
  rx: EYES[0][2] * FIT,
  ry: EYES[0][3] * FIT,
  scale: 0.4,
  spread: 0.9,
  reach: 0.1,
  aspect: 0.6,
  minHeight: 20,
  maxGrow: 1.25,
});

const lobe = (centre: Point) => ({ centre, radius: LOBE_RADIUS * FIT });

const SEATED = seatEyes(GROK, [lobe(LEFT), lobe(RIGHT)], { margin: MARGIN, hold: HOLD });

const FACE: Record<string, EyePair> = {
  ...SEATED,
  calm: EYES.map((eye) => normalizeRing(tracedPolygon(oval(eye), FRAME), 192, false)) as EyePair,
};

export const nimbo = rimCharacter({
  id: 'nimbo',
  name: 'Nimbo',
  desc: 'A glossy blue cloud head with a little ball on an antenna, a cream face patch and two small navy eyes, built as a solid that turns in 3D',
  spec: SPEC,
  palette: palette(
    '#3E9BEF',
    '#0B2A66',
    { dim: '#2F7CCB', soft: '#7CC1FF', blush: '#9FB4FF', angry: '#D6483A', alert: '#FFB02E', off: '#7F98B5' },
    '#8CC8FF',
  ),
  rings: FACE,
  fear: [1.1, 1.1],
});
